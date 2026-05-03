import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

async function getPubMedId(
  trialName: string,
  drugName:  string
): Promise<string | null> {
  try {
    const query = `${trialName} ${drugName} randomized controlled trial`;
    const url   = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`
                + `?db=pubmed&term=${encodeURIComponent(query)}`
                + `&retmax=1&retmode=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.esearchresult?.idlist?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const url     = new URL(request.url);
  const q       = url.searchParams.get("q") ?? "";
  const drugs   = url.searchParams.get("drugs") ?? "";
  const refresh = url.searchParams.get("refresh") === "true";

  if (!q) return NextResponse.json({ error: "No query" }, { status: 400 });

  const cacheKey = `evidence:v3:${q.toLowerCase().trim()
    .replace(/\s+/g, "-").slice(0, 100)}`;

  if (!refresh) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) {
        console.log("[Evidence] Cache hit");
        return NextResponse.json(cached);
      }
    } catch {}
  }

  const drugList = drugs
    ? drugs.split(",").map((d) => d.trim()).filter(Boolean)
    : [];

  const prompt = `You are a clinical pharmacologist and evidence synthesis expert with complete knowledge of all FDA/EMA approved drugs and their pivotal Phase 3 trial data.

Clinician searched: "${q}"
${drugList.length > 0 ? `Recommended options to analyze: ${drugList.join(", ")}` : ""}

COMPLETENESS IS MANDATORY. You MUST include EVERY approved drug. Do NOT omit any.

For PSORIASIS include ALL of:
IL-17A: secukinumab (Cosentyx, 2015), ixekizumab (Taltz, 2016)
IL-17A/F: bimekizumab (Bimzelx, 2023)
IL-23 p19: risankizumab (Skyrizi, 2019), guselkumab (Tremfya, 2017), tildrakizumab (Ilumya, 2018), mirikizumab (Omvoh, 2023)
IL-12/23 p40: ustekinumab (Stelara, 2009)
TYK2: deucravacitinib (Sotyktu, 2022)

For ATOPIC DERMATITIS include ALL of:
IL-4/13: dupilumab (Dupixent, 2017)
IL-13: tralokinumab (Adbry, 2021), lebrikizumab (Ebglyss, 2023)
JAK: abrocitinib (Cibinqo, 2022), upadacitinib (Rinvoq, 2022), baricitinib (Olumiant, 2022)
IL-31: nemolizumab (Nemluvio, 2024)

For RHEUMATOID ARTHRITIS include ALL of:
TNF: adalimumab, etanercept, infliximab, certolizumab, golimumab
IL-6: tocilizumab (Actemra), sarilumab (Kevzara)
JAK: tofacitinib (Xeljanz), baricitinib (Olumiant), upadacitinib (Rinvoq), filgotinib (Jyseleca)
CTLA4: abatacept (Orencia)

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

For other conditions include ALL approved options using your complete training knowledge.

Sort drugs by primary metric result (highest first).

METRIC RULES — CRITICAL:
- PASI 75, PASI 90, PASI 100 are DIFFERENT numbers. PASI 75 > PASI 90 > PASI 100 always.
- ACR 20, ACR 50, ACR 70 are DIFFERENT numbers. ACR 20 > ACR 50 > ACR 70 always.
- IGA 0/1 and EASI-75 and EASI-90 are DIFFERENT numbers.
- If you do not have exact data for a metric, use null — do NOT repeat the primary metric value.
- Metric keys must be SHORT: "PASI 90" not "PASI 90 at Week 16", "ACR 50" not "ACR 50 response"

Return ONLY valid JSON, no markdown, no code fences:
{
  "condition": "string",
  "treatmentContext": "string",
  "primaryMetric": "string — e.g. PASI 90",
  "availableMetrics": ["PASI 75", "PASI 90", "PASI 100"],
  "drugs": [
    {
      "name": "string — generic name only e.g. risankizumab",
      "brandName": "string or null e.g. Skyrizi",
      "drugClass": "string — e.g. IL-23 inhibitor",
      "mechanism": "string — 1 sentence specific mechanism",
      "approvalYear": 2019,
      "approvedIndication": "string",
      "primaryEndpointLabel": "string — e.g. PASI 90 at Week 16",
      "overallResult": 75,
      "biologicExperiencedResult": null,
      "metrics": {
        "PASI 75": 88,
        "PASI 90": 75,
        "PASI 100": 36
      },
      "trials": [
        {
          "name": "ULTIMMA-1",
          "phase": "Phase 3",
          "n": 506,
          "comparator": "Placebo",
          "primaryEndpoint": "PASI 90",
          "result": 75,
          "placeboResult": 5,
          "allMetrics": {
            "PASI 75": 88,
            "PASI 90": 75,
            "PASI 100": 36
          },
          "allPlaceboMetrics": {
            "PASI 75": 8,
            "PASI 90": 5,
            "PASI 100": 1
          },
          "timepoint": "Week 16",
          "publication": "Lancet 2019",
          "year": 2019
        }
      ],
      "keyMessage": "string — 1 sentence clinical takeaway",
      "confidence": "high"
    }
  ],
  "clinicalSummary": "2-3 sentences summarizing the evidence landscape",
  "evidenceNote": "string — verification note"
}

IMPORTANT:
- allMetrics and allPlaceboMetrics must have the same keys as availableMetrics
- placeboResult = placebo arm result for primary metric (0 if active comparator only)
- allPlaceboMetrics = placebo rates for each metric (null if no placebo arm)
- If a trial had active comparator (e.g. adalimumab) not placebo: placeboResult = null
- Include max 2 pivotal trials per drug — the most important ones only
- Keep keyMessage under 15 words
- Keep mechanism under 20 words
- Keep approvedIndication under 10 words
- confidence: high = multiple Phase 3 RCTs, medium = single RCT, low = limited data`;

  try {
    const message = await anthropic.messages.create({
      model:       "claude-sonnet-4-5-20250929",
      max_tokens:  8000,
      temperature: 0,
      messages:    [{ role: "user", content: prompt }],
    });

    const text    = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text
      .replace(/^```json\n?/i, "")
      .replace(/^```\n?/, "")
      .replace(/```$/, "")
      .trim();

    let parsed;
try {
  parsed = JSON.parse(cleaned);
} catch {
  // JSON truncated — try to salvage drugs array
  console.log("[Evidence] JSON truncated, attempting recovery...");
  try {
    // Extract complete drug objects only
    const drugsMatch = cleaned.match(/"drugs"\s*:\s*\[/);
    if (drugsMatch) {
      const drugsStart = cleaned.indexOf('"drugs"');
      const partial    = cleaned.slice(0, drugsStart);
      // Extract condition and metrics from start
      const condMatch    = cleaned.match(/"condition"\s*:\s*"([^"]+)"/);
      const contextMatch = cleaned.match(/"treatmentContext"\s*:\s*"([^"]+)"/);
      const metricMatch  = cleaned.match(/"primaryMetric"\s*:\s*"([^"]+)"/);
      const metricsMatch = cleaned.match(/"availableMetrics"\s*:\s*(\[[^\]]+\])/);
      const summaryMatch = cleaned.match(/"clinicalSummary"\s*:\s*"([^"]+)"/);

      // Extract complete drug objects — find each complete {...} block
      const drugsSection = cleaned.slice(
        cleaned.indexOf('"drugs"') + 8
      );
      const completeDrugs: any[] = [];
      let depth = 0;
      let start = -1;
      let inString = false;
      let escape = false;

      for (let i = 0; i < drugsSection.length; i++) {
        const ch = drugsSection[i];
        if (escape) { escape = false; continue; }
        if (ch === "\\") { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === "{") {
          if (depth === 0) start = i;
          depth++;
        } else if (ch === "}") {
          depth--;
          if (depth === 0 && start !== -1) {
            try {
              const drugObj = JSON.parse(drugsSection.slice(start, i + 1));
              completeDrugs.push(drugObj);
            } catch { /* skip malformed drug */ }
            start = -1;
          }
        }
      }

      if (completeDrugs.length > 0) {
        parsed = {
          condition:        condMatch?.[1] ?? "Unknown condition",
          treatmentContext: contextMatch?.[1] ?? "",
          primaryMetric:    metricMatch?.[1] ?? completeDrugs[0]?.primaryEndpointLabel ?? "",
          availableMetrics: metricsMatch ? JSON.parse(metricsMatch[1]) : [],
          drugs:            completeDrugs,
          clinicalSummary:  summaryMatch?.[1] ?? "Evidence synthesized from published Phase 3 trials.",
          evidenceNote:     "Response was truncated. Showing recovered drug data. Some drugs may be missing.",
        };
        console.log(`[Evidence] Recovered ${completeDrugs.length} drugs from truncated response`);
      } else {
        throw new Error("Could not recover any drugs from truncated JSON");
      }
    } else {
      throw new Error("Could not find drugs array in response");
    }
  } catch (recoveryErr) {
    console.error("[Evidence] Recovery failed:", recoveryErr);
    throw new Error("JSON parse failed and recovery unsuccessful");
  }
}

    // Enrich with PubMed IDs
    const enrichedDrugs = await Promise.all(
      (parsed.drugs ?? []).map(async (drug: any) => {
        const enrichedTrials = await Promise.all(
          (drug.trials ?? []).map(async (trial: any) => {
            const pmid = await getPubMedId(trial.name, drug.name);
            return { ...trial, pubmedId: pmid };
          })
        );
        return { ...drug, trials: enrichedTrials };
      })
    );

    const result = { ...parsed, drugs: enrichedDrugs };

    try {
      await kv.set(cacheKey, result, { ex: 60 * 60 * 24 * 7 });
    } catch {}

    return NextResponse.json(result);

  } catch (err) {
    console.error("[Evidence] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}