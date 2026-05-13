import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSlideEvidence } from "@/lib/slideData";

// ── Types ─────────────────────────────────────────────────────────────────────

type Intent = "broad" | "specific_drug" | "post_failure" | "comparison";
type NumericDisclosure = "full" | "partial" | "delta-only" | "none";
type EvidenceLevel =
  | "fda-label" | "publication" | "medical-meeting"
  | "press-release" | "registry-only" | "company-pipeline";

interface DrugReference {
  name: string;
  brandName?: string | null;
  drugClass: string;
  mechanism: string;
  tier: "approved" | "emerging" | "terminated";
  metricLabel: string;
  metricValue: number | null;
  placeboValue: number | null;
  metrics?: Record<string, number | null> | null;
  placeboMetrics?: Record<string, number | null> | null;
  timepoint: string | null;
  comparator?: string | null;
  source: string | null;
  sourceUrl: string | null;
  evidenceLevel: EvidenceLevel;
  numericDisclosure: NumericDisclosure;
  backgroundTherapy?: string | null;
  safetyBullets: string[];
  keyMessage: string | null;
  isDeltaOnly?: boolean;
  primaryMetric?: string | null;
  doses?: Array<{
    dose: string; metric: string; value: number | null;
    deltaValue?: number | null; timepoint?: string;
    note?: string; source?: string | null;
  }>;
}

interface ReferencesBlock { label: string; url: string; type: string; }

interface VantageResponse {
  condition: string; intent: Intent;
  highlightedDrugs: string[]; comparisonDrugs: string[];
  isOralQuery: boolean; guidelineSummary: string;
  ciBullets: string[]; ciCommentary: string;
  safetyBullets: string[]; safetyCommentary: string;
  approvedDrugs: DrugReference[]; emergingDrugs: DrugReference[];
  terminatedDrugs: DrugReference[]; references: ReferencesBlock[];
  suggestTrialMatch: boolean;
}

// ── Static alias map ──────────────────────────────────────────────────────────

const DRUG_ALIASES: Record<string, string> = {
  "dupi": "dupilumab", "dupixent": "dupilumab",
  "nemo": "nemolizumab", "nemluvio": "nemolizumab",
  "tralo": "tralokinumab", "adbry": "tralokinumab", "adtralza": "tralokinumab",
  "lebri": "lebrikizumab", "ebglyss": "lebrikizumab",
  "upa": "upadacitinib", "rinvoq": "upadacitinib",
  "abro": "abrocitinib", "cibinqo": "abrocitinib",
  "bari": "baricitinib", "olumiant": "baricitinib",
  "amlit": "amlitelimab",
  "tilrek": "tilrekimig", "pfizer tri": "tilrekimig", "pfizer trispecific": "tilrekimig",
  "ompe": "ompekimig",
  "galvo": "galvokimig",
  "zumilo": "zumilokibart", "apg777": "zumilokibart",
  "afimk": "afimkibart", "rg6299": "afimkibart",
  "soquel": "soquelitinib",
  "risa": "risankizumab", "skyrizi": "risankizumab",
  "guse": "guselkumab", "tremfya": "guselkumab",
  "tildr": "tildrakizumab", "ilumya": "tildrakizumab",
  "bimek": "bimekizumab", "bimzelx": "bimekizumab",
  "secu": "secukinumab", "cosentyx": "secukinumab",
  "ixek": "ixekizumab", "taltz": "ixekizumab",
  "brod": "brodalumab", "siliq": "brodalumab",
  "deuc": "deucravacitinib", "sotyktu": "deucravacitinib",
  "aprem": "apremilast", "otezla": "apremilast",
  "uste": "ustekinumab", "stelara": "ustekinumab",
  "icot": "icotrokinra", "icotyde": "icotrokinra",
  "zaso": "zasocitinib",
  "envu": "envudeucitinib",
  "orka": "orka-001", "oruka": "orka-001",
  "orka001": "orka-001", "oruka001": "orka-001",
  "oruka therapeutics": "orka-001",
};

function expandAliases(query: string): string {
  let q = query.toLowerCase();
  const sorted = Object.entries(DRUG_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, canonical] of sorted) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    q = q.replace(re, canonical);
  }
  return q;
}

// ── AI fuzzy drug resolution ──────────────────────────────────────────────────

async function aiResolveDrugNames(
  rawQuery: string,
  allDrugNames: string[],
  client: Anthropic
): Promise<string> {
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system: `You resolve informal or abbreviated drug/company names to their canonical names.
Given a user query and a list of known drug names, identify any mentions of drugs (by nickname,
brand name, company name, partial name, or abbreviation) and return the query with those terms
replaced by the exact canonical drug name from the list.

Rules:
- Only replace terms that clearly refer to a drug in the list
- If a company name is used (e.g. "Oruka"), resolve to their drug in the list (e.g. "orka-001")
- Do not change any other words
- Return ONLY the rewritten query, nothing else
- If nothing needs changing, return the original query unchanged`,
      messages: [{
        role: "user",
        content: `Query: "${rawQuery}"\n\nKnown drug names: ${allDrugNames.join(", ")}\n\nReturn the rewritten query:`,
      }],
    });
    const resolved = (response.content[0] as any)?.text?.trim() ?? rawQuery;
    if (resolved.length > rawQuery.length * 3) return rawQuery;
    return resolved;
  } catch {
    return rawQuery;
  }
}

// ── Condition hints ───────────────────────────────────────────────────────────

const CONDITION_HINTS = {
  atd: [
    "atopic dermatitis", "eczema", "atopic", "atd", "easi", "iga", "pp-nrs",
    "dupilumab", "tralokinumab", "lebrikizumab", "nemolizumab",
    "upadacitinib", "abrocitinib", "baricitinib",
    "tilrekimig", "ompekimig", "amlitelimab", "galvokimig", "pfizer trispecific",
    "zumilokibart", "afimkibart", "soquelitinib",
  ],
  pso: [
    "psoriasis", "plaque psoriasis", "pso", "pasi",
    "risankizumab", "guselkumab", "tildrakizumab", "bimekizumab",
    "secukinumab", "ixekizumab", "brodalumab", "deucravacitinib",
    "apremilast", "ustekinumab", "icotrokinra",
    "zasocitinib", "envudeucitinib", "orka-001", "il-23", "il-17",
    "oruka", "orka",
  ],
};

const ORAL_TERMS = [
  "oral", "pill", "tablet", "jak", "tyk2", "pde4", "il-23r",
  "deucravacitinib", "apremilast", "icotrokinra", "baricitinib",
  "abrocitinib", "upadacitinib", "soquelitinib", "zasocitinib", "envudeucitinib",
];

const SCRUB_PATTERNS = [
  /AtD_?\d*/gi, /Pso_?\d*/gi, /\bdeck\b/gi, /\.pptx/gi,
  /internal deck/gi, /slide\s*\d+/gi, /\bAAD\s+\d{4}\b/gi, /\bEADV\s+\d{4}\b/gi,
];

function scrub(text: string): string {
  let t = text;
  for (const p of SCRUB_PATTERNS) t = t.replace(p, "");
  return t.replace(/;\s*;/g, ";").replace(/\s{2,}/g, " ").trim();
}

function norm(v: string | null | undefined) { return (v ?? "").toLowerCase().trim(); }
function titleCase(name: string) {
  return name.split(" ").map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p)).join(" ");
}

// ── Inference helpers ─────────────────────────────────────────────────────────

function inferCondition(q: string): string {
  const qn = norm(q);
  const atd = CONDITION_HINTS.atd.filter((t) => qn.includes(t)).length;
  const pso = CONDITION_HINTS.pso.filter((t) => qn.includes(t)).length;
  return atd >= pso ? "Atopic Dermatitis" : "Plaque Psoriasis";
}

function inferIntent(q: string, allDrugNames: string[]): Intent {
  const qn = norm(q);
  const matched = allDrugNames.filter((d) => qn.includes(norm(d)));
  const cmpWords = [" vs ", " versus ", "compare ", "compared with ", "against ", "how does"];
  if (cmpWords.some((w) => qn.includes(w)) || matched.length >= 2) return "comparison";
  if (qn.includes("failed") || qn.includes("after") || qn.includes("post-")) return "post_failure";
  if (matched.length === 1) return "specific_drug";
  return "broad";
}

function inferIsOralQuery(q: string): boolean {
  return ORAL_TERMS.some((t) => norm(q).includes(t));
}

function extractHighlightedDrugs(q: string, allDrugNames: string[]): string[] {
  const qn = norm(q);
  return allDrugNames.filter((d) => qn.includes(norm(d)));
}

function getComparisonDrugs(q: string, allDrugNames: string[]): string[] {
  return extractHighlightedDrugs(q, allDrugNames).slice(0, 2);
}

function detectDefaultEndpoint(condition: string) {
  return condition === "Atopic Dermatitis" ? "EASI-75" : "PASI 90";
}

// ── Data normalisation ────────────────────────────────────────────────────────

function metricVal(raw: any, ep: string): number | null {
  if (raw?.metrics?.[ep] !== undefined) return raw.metrics[ep];
  if (raw?.primaryMetric === ep && raw?.primaryMetricValue !== undefined) return raw.primaryMetricValue;
  // For delta-only assets (e.g. tilrekimig), find the highest delta for this endpoint
  if (raw?.placeboAdjustedDeltaMetrics) {
    const epNorm = ep.toLowerCase().replace(/[\s-]/g, "");
    const vals = Object.entries(raw.placeboAdjustedDeltaMetrics)
      .filter(([k]) => k.toLowerCase().replace(/[\s-]/g, "").includes(epNorm))
      .map(([, v]) => v)
      .filter((v): v is number => typeof v === "number");
    if (vals.length > 0) return Math.max(...vals);
  }
  return null;
}

function placeboVal(raw: any, ep: string): number | null {
  if (raw?.placeboMetrics?.[ep] !== undefined) return raw.placeboMetrics[ep];
  return raw?.placeboValue ?? null;
}

function inferEvidenceLevel(raw: any): EvidenceLevel {
  const s = norm(raw?.source || raw?.publication || (raw?.sourceNotes ?? []).join(" "));
  if (s.includes("prescribing information") || s.includes("fda label")) return "fda-label";
  if (["nejm", "lancet", "jaad", "jama"].some((k) => s.includes(k))) return "publication";
  if (["aad", "eadv", "ddw", "medical meeting"].some((k) => s.includes(k))) return "medical-meeting";
  if (s.includes("press release")) return "press-release";
  if (s.includes("clinicaltrials") || s.includes("nct")) return "registry-only";
  return "company-pipeline";
}

function inferNumericDisclosure(raw: any, ep: string): NumericDisclosure {
  const v = metricVal(raw, ep);
  const p = placeboVal(raw, ep);
  if (raw?.isDeltaOnly) return "delta-only";
  if (typeof v === "number" && typeof p === "number") return "full";
  if (typeof v === "number") return "partial";
  if (v === -1) return "none";
  if (raw?.doses?.some((d: any) => typeof d?.deltaValue === "number")) return "delta-only";
  return "none";
}

function buildNormalizedDrug(raw: any, ep: string, tier: "approved" | "emerging" | "terminated"): DrugReference {
  const rawSrc = raw?.source || raw?.publication || (raw?.sourceNotes ?? []).join("; ") || null;
  return {
    name: raw.name, brandName: raw.brandName ?? null,
    drugClass: raw.drugClass ?? "", mechanism: raw.mechanism ?? "",
    tier, metricLabel: ep,
    metricValue: metricVal(raw, ep), placeboValue: placeboVal(raw, ep),
    metrics: raw.metrics ?? null, placeboMetrics: raw.placeboMetrics ?? null,
    timepoint: raw.timepoint ?? null, comparator: raw.comparator ?? null,
    source: rawSrc ? scrub(rawSrc) : null, sourceUrl: raw.sourceUrl ?? null,
    evidenceLevel: inferEvidenceLevel(raw),
    numericDisclosure: inferNumericDisclosure(raw, ep),
    backgroundTherapy: raw.backgroundTherapy ?? null,
    safetyBullets: (raw.safetyBullets ?? []).map((b: string) => scrub(b)),
    keyMessage: raw.keyMessage ? scrub(raw.keyMessage) : raw.keyInsight ? scrub(raw.keyInsight) : null,
    isDeltaOnly: raw.isDeltaOnly ?? false,
    primaryMetric: raw.primaryMetric ?? null,
    doses: raw.doses ?? null,
  };
}

function buildDrugLists(slideData: any, ep: string) {
  const approvedRaw: any[] = slideData?.evidence?.drugs ?? slideData?.drugs ?? [];
  const emergingRaw: any[] = slideData?.emerging?.drugs ?? slideData?.emerging ?? [];
  return {
    approvedDrugs: approvedRaw.map((d: any) => buildNormalizedDrug(d, ep, "approved")),
    emergingDrugs: emergingRaw
      .filter((d: any) => !norm(d.tier).includes("terminated") &&
        !norm(d.status).includes("discontinued") && !norm(d.status).includes("terminated"))
      .map((d: any) => buildNormalizedDrug(d, ep, "emerging")),
    terminatedDrugs: emergingRaw
      .filter((d: any) => norm(d.tier).includes("terminated") ||
        norm(d.status).includes("discontinued") || norm(d.status).includes("terminated"))
      .map((d: any) => buildNormalizedDrug(d, ep, "terminated")),
  };
}

function filterOral(drugs: DrugReference[]) {
  return drugs.filter((d) => {
    const hay = `${d.drugClass} ${d.mechanism} ${d.name}`.toLowerCase();
    return ORAL_TERMS.some((t) => hay.includes(t));
  });
}

function collectReferences(drugs: DrugReference[]): ReferencesBlock[] {
  const seen = new Set<string>();
  return drugs.filter((d) => d.sourceUrl).map((d) => ({
    label: `${titleCase(d.name)}${d.source ? ` — ${d.source}` : ""}`,
    url: d.sourceUrl as string, type: d.evidenceLevel,
  })).filter((r) => { if (seen.has(r.url)) return false; seen.add(r.url); return true; });
}

function buildGuidelineSummary(condition: string, isOralQuery: boolean) {
  if (condition === "Atopic Dermatitis") {
    return isOralQuery
      ? "For moderate-to-severe atopic dermatitis, biologics remain the usual foundational systemic option; oral JAK-pathway therapies are generally reserved for faster onset, oral route preference, or after biologic experience."
      : "For moderate-to-severe atopic dermatitis, endpoint, timepoint, safety profile, and topical-background context must be kept separate when comparing trials.";
  }
  return isOralQuery
    ? "For moderate-to-severe plaque psoriasis, oral options carry distinct mechanisms and safety classes — they should be compared within their own endpoint frame."
    : "For moderate-to-severe plaque psoriasis, treatment selection is driven by endpoint depth, onset, safety class, route, and durability.";
}

function buildFallbackBullets(
  condition: string, approvedDrugs: DrugReference[], emergingDrugs: DrugReference[],
  endpoint: string, isOralQuery: boolean, intent: Intent, highlightedDrugs: string[]
): string[] {
  const bullets: string[] = [];
  const all = [...approvedDrugs, ...emergingDrugs];
  const focus = highlightedDrugs.length > 0
    ? all.filter((d) => highlightedDrugs.some((h) => norm(h) === norm(d.name)))
    : approvedDrugs.filter((d) => typeof d.metricValue === "number")
        .sort((a, b) => (b.metricValue ?? 0) - (a.metricValue ?? 0)).slice(0, 2);
  const lead = focus[0];
  if (lead?.metricValue != null) {
    const tp = lead.timepoint ? ` at ${lead.timepoint}` : "";
    bullets.push(`${titleCase(lead.name)} achieves ${endpoint} of ${lead.metricValue}%${tp}.`);
  }
  const partial = emergingDrugs.find((d) => d.numericDisclosure === "delta-only");
  if (partial) bullets.push(`${titleCase(partial.name)} has only disclosed placebo-adjusted deltas — absolute rates are not yet public.`);
  if (condition === "Atopic Dermatitis") {
    bullets.push("Monotherapy and concomitant-TCS results reflect different patient contexts and cannot be compared directly.");
  } else {
    bullets.push("PASI 75, 90, and 100 represent different response depths — endpoint choice matters for competitive assessment.");
  }
  return bullets.slice(0, 4);
}

// ── AI commentary ─────────────────────────────────────────────────────────────

async function generateAICommentary(
  rawQuery: string, condition: string, intent: Intent, endpoint: string,
  isOralQuery: boolean, highlightedDrugs: string[], comparisonDrugs: string[],
  approvedDrugs: DrugReference[], emergingDrugs: DrugReference[],
  client: Anthropic
): Promise<{ ciBullets: string[]; ciCommentary: string; safetyCommentary: string } | null> {

  const approvedFacts = approvedDrugs.slice(0, 8).map((d) => ({
    name: d.name, brandName: d.brandName, drugClass: d.drugClass,
    endpoint, value: d.metricValue, placebo: d.placeboValue,
    timepoint: d.timepoint, evidenceLevel: d.evidenceLevel,
    numericDisclosure: d.numericDisclosure, backgroundTherapy: d.backgroundTherapy,
  }));

  const emergingFacts = emergingDrugs.slice(0, 6).map((d) => ({
    name: d.name, drugClass: d.drugClass, endpoint,
    value: d.metricValue, numericDisclosure: d.numericDisclosure,
    timepoint: d.timepoint, doses: d.doses?.slice(0, 3) ?? null,
  }));

  const focusDrugs = [...approvedDrugs, ...emergingDrugs]
    .filter((d) => highlightedDrugs.length === 0 ||
      highlightedDrugs.some((h) => norm(h) === norm(d.name)))
    .slice(0, 4);

  const safetyFacts = focusDrugs.map((d) => ({
    name: d.name, safetyBullets: d.safetyBullets.slice(0, 2),
  }));

  const systemPrompt = `You are a clinical intelligence analyst for a pharma competitive-intelligence platform.
Write clear, precise commentary based ONLY on the structured facts provided.

STRICT RULES:
1. NEVER invent or estimate any efficacy number not in the facts.
2. NEVER compare drugs across different endpoints or timepoints without flagging it.
3. NEVER reference internal decks, AAD, EADV, or ".pptx".
4. If numericDisclosure is "delta-only", only state placebo-adjusted deltas are public. Never present as absolute.
5. If numericDisclosure is "none", say data are not yet public.
6. No "best", "superior", "leading" without head-to-head data in the facts.
7. ciCommentary only when intent is "comparison". Empty string otherwise.
8. Write for CSO / medical director audience.

Respond ONLY with valid JSON (no markdown fences):
{"ciBullets":["...","...","...","..."],"ciCommentary":"...","safetyCommentary":"..."}`;

  const userPrompt = `Query: "${rawQuery}"
Condition: ${condition} | Intent: ${intent} | Endpoint: ${endpoint} | Oral: ${isOralQuery}
Highlighted: ${highlightedDrugs.join(", ") || "none"}
Comparison: ${comparisonDrugs.join(" vs ") || "none"}

APPROVED FACTS:
${JSON.stringify(approvedFacts, null, 2)}

EMERGING FACTS:
${JSON.stringify(emergingFacts, null, 2)}

SAFETY FACTS:
${JSON.stringify(safetyFacts, null, 2)}

Write:
- ciBullets: 3–4 bullets. Lead with the most clinically relevant insight. Mention specific drug names and numbers where disclosed. Complete actionable sentences.
- ciCommentary: Only if comparison intent — 2–3 sentences with caveats about cross-trial limits. Empty string otherwise.
- safetyCommentary: 1–2 sentences on mechanism-class safety differences.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });
    const text = response.content.filter((b) => b.type === "text").map((b) => (b as any).text).join("");
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      ciBullets:        Array.isArray(parsed.ciBullets) ? parsed.ciBullets.slice(0, 4) : [],
      ciCommentary:     typeof parsed.ciCommentary === "string" ? parsed.ciCommentary : "",
      safetyCommentary: typeof parsed.safetyCommentary === "string" ? parsed.safetyCommentary : "",
    };
  } catch {
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body     = await request.json();
    const rawQuery = String(body?.query ?? "").trim();
    if (!rawQuery) return NextResponse.json({ error: "No query provided." }, { status: 400 });

    const client = new Anthropic();

    // Step 1: Static alias expansion
    const aliasExpanded = expandAliases(rawQuery);

    // Step 2: Condition + drug name list
    const conditionGuess = inferCondition(aliasExpanded);
    const slideData = getSlideEvidence(conditionGuess) ?? getSlideEvidence(aliasExpanded);
    if (!slideData) return NextResponse.json({ error: "No slideData found." }, { status: 404 });

    const approvedNames: string[] = (slideData?.evidence?.drugs ?? slideData?.drugs ?? []).map((d: any) => d.name);
    const emergingNames: string[] = (slideData?.emerging?.drugs ?? slideData?.emerging ?? []).map((d: any) => d.name);
    const allDrugNames = [...approvedNames, ...emergingNames];

    // Step 3: AI fuzzy resolution if needed
    const staticMatched = extractHighlightedDrugs(aliasExpanded, allDrugNames);
    const hasComparisonWords = [" vs ", " versus ", "compare ", "against ", "how does"].some(
      (w) => aliasExpanded.toLowerCase().includes(w)
    );
    let resolvedQuery = aliasExpanded;
    // Only call AI resolution if static expansion didn't already resolve at least one drug
    // AND the query has comparison intent. Never call it if static already found matches —
    // the AI may override correct static resolutions with wrong training-data associations.
    const alreadyResolved = staticMatched.length >= 1;
    if (hasComparisonWords && !alreadyResolved) {
      resolvedQuery = await aiResolveDrugNames(rawQuery, allDrugNames, client);
      resolvedQuery = expandAliases(resolvedQuery);
    }

    // Step 4: Final inference
    const condition        = inferCondition(resolvedQuery);
    const intent           = inferIntent(resolvedQuery, allDrugNames);
    const highlightedDrugs = extractHighlightedDrugs(resolvedQuery, allDrugNames);
    const comparisonDrugs  = getComparisonDrugs(resolvedQuery, allDrugNames);
    const isOralQuery      = inferIsOralQuery(resolvedQuery);
    const isPso            = condition === "Plaque Psoriasis";
    let endpoint           = detectDefaultEndpoint(condition);

    // Step 5: Auto-select best shared endpoint for comparison queries
    // Do this BEFORE buildDrugLists so numericDisclosure is computed correctly
    if (intent === "comparison" && comparisonDrugs.length >= 2) {
      const preferred = isPso
        ? ["PASI 100", "PASI 90", "PASI 75", "IGA 0/1"]
        : ["EASI-75", "EASI-90", "IGA 0/1", "PP-NRS ≥4"];
      const allRaw = [
        ...(slideData?.evidence?.drugs ?? slideData?.drugs ?? []),
        ...(slideData?.emerging?.drugs ?? slideData?.emerging ?? []),
      ];
      const rawA = allRaw.find((d: any) => norm(d.name) === norm(comparisonDrugs[0]));
      const rawB = allRaw.find((d: any) => norm(d.name) === norm(comparisonDrugs[1]));
      if (rawA && rawB) {
        const shared = preferred.find((ep) =>
          typeof rawA.metrics?.[ep] === "number" &&
          typeof rawB.metrics?.[ep] === "number"
        );
        if (shared) endpoint = shared;
      }
    }

    // Step 6: Build drug lists with the correct endpoint
    let { approvedDrugs, emergingDrugs, terminatedDrugs } = buildDrugLists(slideData, endpoint);

    // Only apply oral filter on broad queries — don't drop non-oral drugs
    // when a specific non-oral drug is part of a comparison
    const hasNonOralHighlight = highlightedDrugs.some((h) =>
      !ORAL_TERMS.some((t) => h.toLowerCase().includes(t))
    );
    if (isOralQuery && !hasNonOralHighlight) {
      approvedDrugs   = filterOral(approvedDrugs);
      emergingDrugs   = filterOral(emergingDrugs);
      terminatedDrugs = filterOral(terminatedDrugs);
    }

    const guidelineSummary = buildGuidelineSummary(condition, isOralQuery);
    const references       = collectReferences([...approvedDrugs, ...emergingDrugs, ...terminatedDrugs]);

    const focusDrugs = highlightedDrugs.length > 0
      ? [...approvedDrugs, ...emergingDrugs].filter((d) =>
          highlightedDrugs.some((h) => norm(h) === norm(d.name)))
      : isOralQuery ? filterOral([...approvedDrugs, ...emergingDrugs])
      : approvedDrugs.slice(0, 3);

    const safetyBullets = focusDrugs
      .flatMap((d) => d.safetyBullets.slice(0, 2).map((b) => `${titleCase(d.name)}: ${b}`))
      .slice(0, 6);

    const aiResult = await generateAICommentary(
      rawQuery, condition, intent, endpoint, isOralQuery,
      highlightedDrugs, comparisonDrugs, approvedDrugs, emergingDrugs, client
    );

    const ciBullets = aiResult?.ciBullets.length
      ? aiResult.ciBullets
      : buildFallbackBullets(condition, approvedDrugs, emergingDrugs, endpoint,
          isOralQuery, intent, highlightedDrugs);

    const result: VantageResponse = {
      condition, intent, highlightedDrugs, comparisonDrugs,
      isOralQuery, guidelineSummary,
      ciBullets,
      ciCommentary:     aiResult?.ciCommentary     ?? "",
      safetyBullets,
      safetyCommentary: aiResult?.safetyCommentary ?? "",
      approvedDrugs, emergingDrugs, terminatedDrugs,
      references,
      suggestTrialMatch: intent === "post_failure",
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to process Vantage query." }, { status: 500 });
  }
}