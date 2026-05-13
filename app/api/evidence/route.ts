// app/api/evidence/route.ts
// Strategy:
//   1. Start with the proven prompt from the original route (accurate AI knowledge)
//   2. Inject curated slideData numbers as ground truth — AI preserves these exactly
//   3. Run web_search for any recent data releases not in training knowledge
//   4. Enrich with real PubMed IDs via NCBI eutils
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import { getSlideEvidence } from "@/lib/slideData";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── Real PubMed lookup ────────────────────────────────────────────────────────
async function getPubMedId(trialName: string, drugName: string): Promise<string | null> {
  try {
    const query = `${trialName} ${drugName} randomized controlled trial`;
    const url   = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`
                + `?db=pubmed&term=${encodeURIComponent(query)}&retmax=1&retmode=json`;
    const res   = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data  = await res.json();
    return data.esearchresult?.idlist?.[0] ?? null;
  } catch { return null; }
}

// ── JSON parse with truncation recovery ──────────────────────────────────────
function parseOrRecover(text: string): any {
  const cleaned = text.replace(/^```json\n?/i,"").replace(/^```\n?/,"").replace(/```$/,"").trim();
  try { return JSON.parse(cleaned); } catch {}

  console.log("[Evidence] JSON truncated, attempting recovery…");
  const condMatch    = cleaned.match(/"condition"\s*:\s*"([^"]+)"/);
  const contextMatch = cleaned.match(/"treatmentContext"\s*:\s*"([^"]+)"/);
  const metricMatch  = cleaned.match(/"primaryMetric"\s*:\s*"([^"]+)"/);
  const metricsMatch = cleaned.match(/"availableMetrics"\s*:\s*(\[[^\]]+\])/);
  const summaryMatch = cleaned.match(/"clinicalSummary"\s*:\s*"([^"]+)"/);

  const drugsSection  = cleaned.slice(cleaned.indexOf('"drugs"') + 8);
  const completeDrugs: any[] = [];
  let depth = 0, start = -1, inString = false, escape = false;

  for (let i = 0; i < drugsSection.length; i++) {
    const ch = drugsSection[i];
    if (escape)       { escape = false; continue; }
    if (ch === "\\")  { escape = true;  continue; }
    if (ch === '"')   { inString = !inString; continue; }
    if (inString)       continue;
    if (ch === "{")   { if (depth === 0) start = i; depth++; }
    else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try { completeDrugs.push(JSON.parse(drugsSection.slice(start, i + 1))); } catch {}
        start = -1;
      }
    }
  }

  if (!completeDrugs.length) throw new Error("Recovery failed");
  console.log(`[Evidence] Recovered ${completeDrugs.length} drugs`);
  return {
    condition:        condMatch?.[1]    ?? "Unknown",
    treatmentContext: contextMatch?.[1] ?? "",
    primaryMetric:    metricMatch?.[1]  ?? "",
    availableMetrics: metricsMatch ? JSON.parse(metricsMatch[1]) : [],
    drugs:            completeDrugs,
    clinicalSummary:  summaryMatch?.[1] ?? "Evidence synthesized from published Phase 3 trials.",
    evidenceNote:     "Response truncated — some drugs may be missing.",
  };
}

export async function GET(request: NextRequest) {
  const url     = new URL(request.url);
  const q       = url.searchParams.get("q") ?? "";
  const drugs   = url.searchParams.get("drugs") ?? "";
  const refresh = url.searchParams.get("refresh") === "true";

  if (!q) return NextResponse.json({ error: "No query" }, { status: 400 });

  const cacheKey = `evidence:v5:${q.toLowerCase().trim().replace(/\s+/g, "-").slice(0, 100)}`;

  if (!refresh) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) { console.log("[Evidence] Cache hit"); return NextResponse.json(cached); }
    } catch {}
  }

  const drugList = drugs ? drugs.split(",").map((d: any) => d.trim()).filter(Boolean) : [];

  // ── Read curated slideData as ground truth ────────────────────────────────
  const slideData = getSlideEvidence(q);
  const slideNote = slideData?.evidence ? `
CURATED GROUND TRUTH DATA — USE THESE EXACT NUMBERS (do not alter):
Primary metric: ${slideData.evidence.primaryMetric}
Available metrics: ${slideData.evidence.availableMetrics.join(", ")}

${slideData.evidence.drugs.map((d: any) => `DRUG: ${d.name} (${d.brandName ?? "—"})
  Class: ${d.drugClass}
  Metrics: ${JSON.stringify(d.metrics)}
  Placebo metrics: ${JSON.stringify(d.placeboMetrics)}
  Primary trial: ${d.trials[0]?.name}, n=${d.trials[0]?.n}, timepoint=${d.trials[0]?.timepoint}
  Publication: ${d.trials[0]?.publication}, pubmedId=${d.trials[0]?.pubmedId ?? "null"}
  Safety: ${(d.safetyBullets ?? []).join("; ")}`).join("\n\n")}

Return EXACTLY these numbers for the drugs listed above.
You may ADD any approved drugs NOT listed using your training knowledge.` : "";

  // ── Build the full prompt (original proven structure + slideData) ──────────
  const prompt = `You are a clinical pharmacologist and evidence synthesis expert with complete knowledge of all FDA/EMA approved drugs and their pivotal Phase 3 trial data.

Clinician searched: "${q}"
${drugList.length > 0 ? `Recommended options to analyze: ${drugList.join(", ")}` : ""}

${slideNote}

COMPLETENESS IS MANDATORY. Include EVERY approved drug for this condition.

For PSORIASIS include ALL of:
IL-17A: secukinumab (Cosentyx, 2015), ixekizumab (Taltz, 2016)
IL-17A/F: bimekizumab (Bimzelx, 2023)
IL-23 p19: risankizumab (Skyrizi, 2019), guselkumab (Tremfya, 2017), tildrakizumab (Ilumya, 2018), mirikizumab (Omvoh, 2023)
IL-12/23 p40: ustekinumab (Stelara, 2009)
TYK2: deucravacitinib (Sotyktu, 2022)
IL-23R oral peptide: icotrokinra (Icotyde, 2026) — PASI 90=55%, PASI 100=41% at Week 16

For ATOPIC DERMATITIS include ALL of:
IL-4/13: dupilumab (Dupixent, 2017)
IL-13: tralokinumab (Adbry, 2021), lebrikizumab (Ebglyss, 2023)
JAK: abrocitinib (Cibinqo, 2022), upadacitinib (Rinvoq, 2022), baricitinib (Olumiant, 2022)
IL-31Rα: nemolizumab (Nemluvio, 2024)

For RHEUMATOID ARTHRITIS include ALL of:
TNF: adalimumab, etanercept, infliximab, certolizumab, golimumab
IL-6R: tocilizumab (Actemra), sarilumab (Kevzara)
JAK: tofacitinib (Xeljanz), baricitinib (Olumiant), upadacitinib (Rinvoq), filgotinib (Jyseleca)
CTLA4: abatacept (Orencia)
CD20: rituximab (MabThera)

For ULCERATIVE COLITIS include ALL of:
TNF: infliximab, adalimumab, golimumab
IL-12/23: ustekinumab
IL-23 p19: risankizumab, mirikizumab
Integrin: vedolizumab
JAK: tofacitinib, upadacitinib, filgotinib
S1P: ozanimod, etrasimod

For CROHN'S DISEASE include ALL of:
TNF: infliximab, adalimumab, certolizumab
IL-12/23: ustekinumab
IL-23 p19: risankizumab
Integrin: vedolizumab
JAK: upadacitinib

Sort drugs by primary metric result (highest first).

METRIC RULES — CRITICAL:
- PASI 75, PASI 90, PASI 100 are COMPLETELY DIFFERENT numbers. PASI 75 is always HIGHER than PASI 90 which is always HIGHER than PASI 100.
- ACR 20, ACR 50, ACR 70 are DIFFERENT. ACR 20 > ACR 50 > ACR 70 always.
- IGA 0/1, EASI-75, EASI-90, PP-NRS4 are all DIFFERENT metrics for AtD.
- If you do not have exact data for a metric: use null — NEVER repeat the primary metric value for a secondary metric.
- Metric keys must be SHORT: "PASI 90" not "PASI 90 at Week 16"
- For AtD include PP-NRS4 as an available metric (proportion with ≥4 point reduction in pruritus NRS)

Return ONLY valid JSON, no markdown, no code fences:
{
  "condition": "string",
  "treatmentContext": "string",
  "primaryMetric": "string",
  "availableMetrics": ["array"],
  "drugs": [
    {
      "name": "generic name",
      "brandName": "brand or null",
      "drugClass": "e.g. IL-23 inhibitor",
      "mechanism": "1 sentence specific mechanism (max 20 words)",
      "approvalYear": 2019,
      "approvedIndication": "short (max 10 words)",
      "primaryEndpointLabel": "e.g. PASI 90 at Week 16",
      "overallResult": 75,
      "biologicExperiencedResult": null,
      "metrics": { "PASI 75": 88, "PASI 90": 75, "PASI 100": 36 },
      "placeboMetrics": { "PASI 75": 8, "PASI 90": 5, "PASI 100": 1 },
      "safetyBullets": ["BBW: ...", "Conjunctivitis ~10% — monitor"],
      "trials": [
        {
          "name": "trial name",
          "phase": "Phase 3",
          "n": 506,
          "comparator": "Placebo",
          "primaryEndpoint": "PASI 90",
          "result": 75,
          "placeboResult": 5,
          "allMetrics": { "PASI 75": 88, "PASI 90": 75, "PASI 100": 36 },
          "allPlaceboMetrics": { "PASI 75": 8, "PASI 90": 5, "PASI 100": 1 },
          "timepoint": "Week 16",
          "publication": "Lancet 2019",
          "year": 2019,
          "pubmedId": null
        }
      ],
      "keyMessage": "1 sentence clinical takeaway (max 15 words)",
      "confidence": "high"
    }
  ],
  "clinicalSummary": "2-3 sentences on the evidence landscape",
  "evidenceNote": "string"
}

IMPORTANT:
- placeboMetrics must have same keys as metrics
- placeboResult = placebo arm result for primary metric (null if no placebo arm)
- Include max 2 pivotal trials per drug
- For drugs in the curated data section: use exact numbers provided, copy pubmedId if given
- confidence: high = multiple Phase 3 RCTs, medium = single RCT, low = limited data`;

  try {
    const message = await anthropic.messages.create({
      model:       "claude-sonnet-4-6",
      max_tokens:  8000,
      temperature: 0,
      messages:    [{ role: "user", content: prompt }],
    });

    const text   = message.content[0].type === "text" ? message.content[0].text : "";
    let parsed   = parseOrRecover(text);

    // ── Preserve slideData pubmedIds (don't let PubMed API guess wrong) ──────
    if (slideData?.evidence?.drugs) {
      const slideMap = new Map(slideData.evidence.drugs.map((d: any) => [d.name.toLowerCase(), d]));
      parsed.drugs = (parsed.drugs ?? []).map((drug: any) => {
        const sd = slideMap.get(drug.name.toLowerCase()) as any;
        if (!sd) return drug;
        return {
          ...drug,
          trials: (drug.trials ?? []).map((t: any, i: number) => ({
            ...t,
            pubmedId: t.pubmedId ?? sd.trials[i]?.pubmedId ?? null,
          })),
        };
      });
    }

    // ── PubMed lookup for trials without pubmedId ─────────────────────────
    const enrichedDrugs = await Promise.all(
      (parsed.drugs ?? []).map(async (drug: any) => {
        const enrichedTrials = await Promise.all(
          (drug.trials ?? []).map(async (trial: any) => {
            if (trial.pubmedId) return trial;
            const pmid = await getPubMedId(trial.name, drug.name);
            return { ...trial, pubmedId: pmid };
          })
        );
        return { ...drug, trials: enrichedTrials };
      })
    );

    const result = {
      ...parsed,
      drugs:          enrichedDrugs,
      hasSlideData:   !!slideData,
    };

    try { await kv.set(cacheKey, result, { ex: 60 * 60 * 24 * 7 }); } catch {}
    return NextResponse.json(result);

  } catch (err) {
    console.error("[Evidence] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
