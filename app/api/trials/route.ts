import { NextRequest, NextResponse } from "next/server";
import { searchTrials, ClinicalTrialsAPIError } from "@/lib/clinicaltrials";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ── Detect if query is natural language ───────────────────────────────────────
function isNaturalLanguage(q: string): boolean {
  const words = q.trim().split(/\s+/);
  const clinicalPhrases = [
    "patient", "failed", "refractory", "intolerant", "naive",
    "what", "which", "options", "looking for", "trial for",
    "moderate", "severe", "mild", "chronic", "acute",
    "IL-", "anti-", "inhibitor", "biologic",
  ];
  const hasClinicalPhrase = clinicalPhrases.some((p) =>
    q.toLowerCase().includes(p.toLowerCase())
  );
  return words.length > 4 || hasClinicalPhrase;
}

// ── Use Claude to generate multiple search strategies ─────────────────────────
async function generateSearchStrategies(naturalQuery: string): Promise<{
  searches: Array<{
    condition: string;
    intervention: string;
    q: string;
  }>;
  reasoning: string;
  patientContext: string;
}> {
  const prompt = `You are a clinical trials search expert working in a healthcare system or large pharma or biotech with comprehensive medical knowledge across all specialties. You need to think of emerging and existing drugs.

A clinician typed: "${naturalQuery}"

REASONING FRAMEWORK — apply this to ANY disease:

STEP 1 — Extract:
- DISEASE: be specific (SLE, lupus nephritis, plaque psoriasis, RA, ANCA vasculitis, etc.)
- FAILED THERAPY: identify it, then ignore it — never search for it
- LINE: first-line, second-line, refractory

STEP 2 — For each relevant mechanism generate TWO searches:
  1. The DRUG CLASS broad — e.g. "SLE BTK inhibitor"
  2. A SPECIFIC DRUG in that class — e.g. "SLE fenebrutinib"
  This catches both class-level and individual drug trials.

STEP 3 — Cover all 4 tiers for whatever disease you identify:

TIER 1 — Approved alternatives with different MOA from what failed
TIER 2 — Late-stage investigational Phase 2/3 for this disease
TIER 3 — Novel cutting-edge mechanisms
  Use your full medical knowledge of the current investigational landscape.
  For ANY disease area, ask yourself:
  - Are there T-cell engagers or CD3 bispecifics being trialed here?
  - Is CAR-T being explored here?
  - Are there anti-CD19, anti-CD20, anti-CD38 approaches?
  - BTK inhibitors? FcRn inhibitors? Complement inhibitors?
  - PROTACs/degraders? Gene therapy? Tolerogenic approaches?
  - Bispecific antibodies targeting two pathways simultaneously?
  - Novel cytokine targets not yet approved?
  These are no longer oncology-only — they are being trialed across
  autoimmune, neurological, renal, and rare diseases. Always consider them.
TIER 4 — Disease synonyms and related manifestations
  Always search at least 2 name variants for the disease

STEP 4 — For REFRACTORY patients weight heavily toward Tier 2 and Tier 3

EXAMPLE of expected depth — for refractory lupus you would generate:
  "SLE BTK inhibitor", "SLE fenebrutinib",
  "lupus T-cell engager", "lupus CD3 bispecific",
  "SLE CAR-T", "lupus anti-CD19",
  "SLE anti-CD38", "lupus daratumumab",
  "SLE FcRn inhibitor", "lupus efgartigimod",
  "lupus complement inhibitor", "lupus nephritis C5",
  "SLE BAFF APRIL", "lupus telitacicept",
  "systemic lupus anifrolumab", "cutaneous lupus JAK"
  — Apply this same depth to WHATEVER disease is presented.

Rules:
- 15-20 searches for refractory/complex patients
- 6-10 searches for straightforward queries
- For each mechanism: 1 broad class + 1 specific drug
- condition: short disease name 1-3 words
- intervention: mechanism or drug, never the failed therapy
- "q" = disease name first + mechanism, 2-4 words max
- GOOD: "RA BTK inhibitor", "Crohn's bispecific", "ANCA CAR-T"
- BAD: "BTK inhibitor", "CAR-T", "RA CD19 CAR-T cell therapy trial"
- Never add "clinical trial", "therapy", "treatment" to q
- Reasoning and patientContext: 1 sentence each
- condition must be the SHORTEST possible disease name: "psoriasis" not "plaque psoriasis", "lupus" not "systemic lupus erythematosus", "Crohn's" not "Crohn's disease"
- Short condition names match more trials in ClinicalTrials.gov

Return ONLY valid JSON, no markdown, no code fences:
{
  "searches": [
    {
      "condition": "string",
      "intervention": "string",
      "q": "string"
    }
  ],
  "reasoning": "string",
  "patientContext": "string"
}`;

  try {
    const message = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      temperature: 0,
      messages:   [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text"
      ? message.content[0].text : "";

    const cleaned = text
      .replace(/^```json\n?/i, "")
      .replace(/^```\n?/, "")
      .replace(/```$/,   "")
      .trim();

    console.log("[Trials] Raw Claude output:", cleaned.slice(0, 500));
    const parsed = JSON.parse(cleaned);
    console.log("[Trials] AI search strategies:", JSON.stringify(parsed.searches));
    return parsed;

  } catch (err) {
    console.error("[Trials] Claude strategy error:", err);
    const fallback = naturalQuery
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .split(" ")
      .filter((w) => w.length > 3)
      .slice(0, 2)
      .join(" ");
    return {
      searches:       [{ condition: "", intervention: "", q: fallback }],
      reasoning:      "Fallback search",
      patientContext: "",
    };
  }
}

// ── Run multiple searches and deduplicate ─────────────────────────────────────
async function multiSearch(
  searches: Array<{ condition: string; intervention: string; q: string }>,
  status?: string[]
): Promise<{ studies: any[]; totalCount: number }> {

  // Retry helper — retries once on failure
async function searchWithRetry(q: string, opts: any) {
  try {
    return await searchTrials(q, opts);
  } catch {
    // Wait 500ms and retry once
    await new Promise((r) => setTimeout(r, 500));
    return await searchTrials(q, opts);
  }
}

const results = await Promise.allSettled(
  searches.map((s) =>
    searchWithRetry(s.q, {
      pageSize: 25,
      status:   status ?? ["RECRUITING", "ACTIVE_NOT_RECRUITING", "NOT_YET_RECRUITING"],
    })
  )
);

  const allStudies: any[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allStudies.push(...(result.value.studies ?? []));
    }
  }

  // Deduplicate by NCT ID
  const seen    = new Set<string>();
  const deduped = allStudies.filter((s) => {
    const nctId = s.protocolSection?.identificationModule?.nctId;
    if (!nctId || seen.has(nctId)) return false;
    seen.add(nctId);
    return true;
  });

  // Disease relevance filter
  const diseaseKeywords = [...new Set(
    searches
      .map((s) => s.condition.toLowerCase().split(" "))
      .flat()
  )].filter((w) => w.length > 3);

  const filtered = diseaseKeywords.length > 0
    ? deduped.filter((s) => {
        const conditions = (
          s.protocolSection?.conditionsModule?.conditions ?? []
        ).join(" ").toLowerCase();
        const title = (
          s.protocolSection?.identificationModule?.briefTitle ?? ""
        ).toLowerCase();
        return diseaseKeywords.some(
          (kw) => conditions.includes(kw) || title.includes(kw)
        );
      })
    : deduped;

  console.log(
    `[Trials] Multi-search: ${allStudies.length} total → ${deduped.length} deduped → ${filtered.length} after disease filter`
  );

  return {
    studies:    filtered,
    totalCount: filtered.length,
  };
}

// ── Main route ────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const q            = sp.get("q") ?? "";
  const condition    = sp.get("condition") ?? undefined;
  const intervention = sp.get("intervention") ?? undefined;
  const pageSize     = parseInt(sp.get("pageSize") ?? "10", 10);
  const pageToken    = sp.get("pageToken") ?? undefined;
  const status       = sp.get("status")?.split(",").filter(Boolean);
  const phase        = sp.get("phase")?.split(",").filter(Boolean);

  if (!q && !condition && !intervention) {
    return NextResponse.json(
      { error: "At least one of q, condition, or intervention is required" },
      { status: 400 }
    );
  }

  // ── Natural language → multi-search ───────────────────────────────────────
  if (q && isNaturalLanguage(q)) {
    console.log("[Trials] Natural language detected:", q);

// Check cache first
const cacheKey = `trials:v1:${q.toLowerCase().trim().replace(/\s+/g, "-").slice(0, 100)}`;
try {
  const cached = await kv.get(cacheKey);
  if (cached) {
    console.log("[Trials] Cache hit:", cacheKey);
    return NextResponse.json(cached);
  }
} catch {
  // Cache miss — continue
}
    const { searches, reasoning, patientContext } =
      await generateSearchStrategies(q);

    try {
      // Step 1 — Extract unique diseases from Claude's searches
      const diseases = [...new Set(
        searches.map((s) => s.condition).filter(Boolean)
      )];

      // Step 2 — Append novel mechanism searches for every disease
      const novelMechanisms = [
        "T-cell engager",
        "CD3 bispecific",
        "bispecific antibody",
        "CAR-T",
        "anti-CD19",
        "anti-CD38",
        "BTK inhibitor",
        "FcRn inhibitor",
        "complement inhibitor",
        "PROTAC degrader",
      ];

      const novelSearches = diseases.flatMap((disease) =>
        novelMechanisms.map((mechanism) => ({
          condition:    disease,
          intervention: mechanism,
          q:            `${disease} ${mechanism}`,
        }))
      );

      // Step 3 — Merge and deduplicate
      const allSearches = [...searches, ...novelSearches].filter(
        (s, index, self) =>
          index === self.findIndex(
            (t) => t.condition === s.condition && t.intervention === s.intervention
          )
      );

      console.log(
        `[Trials] Total searches: ${searches.length} Claude + ${novelSearches.length} novel = ${allSearches.length}`
      );

      // Step 4 — Expand compound codes to common names
      const compoundPattern = /^[A-Z]{2,}-?\d{3,}/i;
      const aliasSearches: typeof searches = [];

      await Promise.allSettled(
        allSearches
          .filter((s) => compoundPattern.test(s.intervention))
          .map(async (s) => {
            try {
              const res = await fetch(
                `${request.nextUrl.origin}/api/drug?name=${encodeURIComponent(s.intervention)}`
              );
              if (!res.ok) return;
              const data = await res.json();
              if (
                data.genericName &&
                data.genericName.toLowerCase() !== s.intervention.toLowerCase()
              ) {
                aliasSearches.push({
                  condition:    s.condition,
                  intervention: data.genericName,
                  q:            `${s.condition} ${data.genericName}`,
                });
              }
            } catch {
              // silently skip
            }
          })
      );

      // Step 5 — Final deduplicated search list
      const finalSearches = [...allSearches, ...aliasSearches].filter(
        (s, index, self) =>
          index === self.findIndex(
            (t) => t.condition === s.condition && t.intervention === s.intervention
          )
      );

      console.log(
        `[Trials] After alias expansion: ${finalSearches.length} total searches`
      );

      const { studies, totalCount } = await multiSearch(finalSearches, status);

      const response = {
  studies,
  totalCount,
  nextPageToken:  null,
  aiExtracted:    true,
  searches:       finalSearches,
  reasoning,
  patientContext,
};

// Cache for 24 hours
try {
  await kv.set(cacheKey, response, { ex: 60 * 60 * 24 });
  console.log("[Trials] Cached:", cacheKey);
} catch {
  // Cache write failed — still return result
}

return NextResponse.json(response);

    } catch (err) {
      console.error("[Trials] Multi-search error:", err);
      return NextResponse.json(
        { error: "Failed to search trials" },
        { status: 500 }
      );
    }
  }

  // ── Standard search ────────────────────────────────────────────────────────
  try {
    const results = await searchTrials(q, {
      pageSize,
      pageToken,
      status,
      phase,
      condition,
      intervention,
    });

    return NextResponse.json(results);

  } catch (err) {
    console.error("[API] /api/trials search error:", err);

    if (err instanceof ClinicalTrialsAPIError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode ?? 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to search trials" },
      { status: 500 }
    );
  }
}