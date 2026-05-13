// app/api/emerging/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import { getSlideEvidence } from "@/lib/slideData";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function GET(request: NextRequest) {
  const url       = new URL(request.url);
  const q         = url.searchParams.get("q") ?? "";
  const refresh   = url.searchParams.get("refresh") === "true";

  if (!q) return NextResponse.json({ error: "No query" }, { status: 400 });

  const cacheKey = `emerging:v3:${q.toLowerCase().trim().replace(/\s+/g, "-").slice(0, 100)}`;

  if (!refresh) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) { console.log("[Emerging] Cache hit"); return NextResponse.json(cached); }
    } catch {}
  }

  // ── SlideData emerging as baseline ────────────────────────────────────────
  const slideData    = getSlideEvidence(q);
  const slideEmerging = slideData?.emerging?.drugs ?? [];
  const slideTerminated = slideData?.emerging?.terminated ?? [];

  const slideContext = slideEmerging.length > 0 ? `
CURATED EMERGING DATA (verified, use exact numbers):
${slideEmerging.map((d: any) => `
- ${d.drugName} (${d.drugClass}, ${d.phase}): ${d.keyResult}
  Metrics: ${JSON.stringify(d.metrics)}
  PBO: ${JSON.stringify(d.placeboMetrics)}
  Source: ${d.source}
  Confidence: ${d.confidence} — ${d.confidenceReason}
  Safety: ${(d.safetyBullets ?? []).join("; ")}
`).join("")}

TERMINATED/DID NOT PROGRESS (verified):
${slideTerminated.map((d: any) => `
- ${d.drugName} (${d.drugClass}): ${d.reason} — ${d.outcome}
  Clinical insight: ${d.clinicalInsight}
`).join("")}
` : "";

  const today = new Date().toISOString().split("T")[0];

  const searchPrompt = `You are a clinical intelligence analyst. Today is ${today}.

Search for the latest clinical trial data for emerging drugs in: "${q}"

Find:
1. Phase 2/2b/3 trials with results announced in the last 18 months
2. Press releases from pharmaceutical companies about trial readouts
3. Conference presentations (AAD, EADV, ACR, DDW, ESMO, ASCO, ASH 2024-2025)
4. New drug approvals or regulatory submissions

${slideContext}

For each emerging drug found (including curated data above), return structured data.
For curated drugs: use the exact numbers provided above.
For newly found drugs: extract exact numbers from the source.

Return ONLY valid JSON:
{
  "condition": "string",
  "lastSearched": "${today}",
  "emerging": [
    {
      "drugName": "string",
      "company": "string",
      "drugClass": "string",
      "mechanism": "1 sentence",
      "phase": "Phase 2b",
      "primaryMetric": "EASI-75",
      "primaryMetricValue": 65,
      "placeboValue": 20,
      "timepoint": "Week 16",
      "trialName": "trial name",
      "n": 240,
      "source": "conference/journal/press release",
      "sourceUrl": "URL if available",
      "announcementDate": "YYYY-MM-DD or null",
      "confidence": "high | medium | low",
      "confidenceReason": "brief reason",
      "keyInsight": "1 sentence clinical interpretation",
      "tier": "published | reported | watchlist",
      "safetyNotes": ["brief safety note"],
      "metrics": { "EASI-75": 65, "IGA 0/1": 42 },
      "placeboMetrics": { "EASI-75": 20, "IGA 0/1": 14 }
    }
  ],
  "terminated": [
    {
      "drugName": "string",
      "drugClass": "string",
      "reason": "Safety | Efficacy failure | Business decision",
      "lastKnownMetrics": { "EASI-75": 36 },
      "lastKnownPlaceboMetrics": { "EASI-75": 13 },
      "lastKnownTimepoint": "Week 24",
      "clinicalInsight": "1 sentence"
    }
  ],
  "searchSummary": "2 sentences on what was found"
}

tier definitions:
- published: peer-reviewed Phase 2/3 data available
- reported: press release / conference — not yet peer-reviewed
- watchlist: recruiting or active, no data yet

Sort by: published first, then reported, then watchlist. Within each tier, sort by primaryMetricValue descending.`;

  try {
    const response = await anthropic.messages.create({
      model:      "claude-opus-4-5",
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
      messages:   [{ role: "user", content: searchPrompt }],
    });

    // Collect all text blocks
    let allText = "";
    for (const block of response.content) {
      if (block.type === "text") allText += block.text + "\n";
    }

    // Parse the JSON from the response
    const cleaned = allText.replace(/^```json\n?/i,"").replace(/^```\n?/,"").replace(/```$/,"").trim();
    let parsed: any;
    try {
      // Find JSON object in the text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    if (!parsed) {
      // Fall back to slideData only if web search parsing fails
      return NextResponse.json({
        condition:     q,
        lastSearched:  today,
        emerging:      slideEmerging.map((d: any) => ({
          drugName:           d.drugName,
          company:            d.sponsorNote ?? "",
          drugClass:          d.drugClass,
          mechanism:          d.mechanism,
          phase:              d.phase,
          primaryMetric:      d.endpoint,
          primaryMetricValue: d.primaryMetricValue,
          placeboValue:       null,
          timepoint:          d.endpoint?.includes("Week") ? d.endpoint.split("at ").pop() ?? "" : "",
          trialName:          d.trialName ?? "",
          n:                  d.n,
          source:             d.source,
          sourceUrl:          null,
          announcementDate:   null,
          confidence:         d.confidence,
          confidenceReason:   d.confidenceReason,
          keyInsight:         d.keyResult,
          tier:               "published",
          safetyNotes:        d.safetyBullets ?? [],
          metrics:            d.metrics ?? {},
          placeboMetrics:     d.placeboMetrics ?? {},
        })),
        terminated:    slideTerminated.map((d: any) => ({
          drugName:             d.drugName,
          drugClass:            d.drugClass,
          reason:               d.reason,
          lastKnownMetrics:     d.lastKnownMetrics ?? {},
          lastKnownPlaceboMetrics: d.lastKnownPlaceboMetrics ?? {},
          lastKnownTimepoint:   d.lastKnownTimepoint ?? "",
          clinicalInsight:      d.clinicalInsight,
        })),
        searchSummary: "Using curated data — web search unavailable.",
        fromSlideDataOnly: true,
      });
    }

    try { await kv.set(cacheKey, parsed, { ex: 60 * 60 * 6 }); } catch {} // 6hr cache for emerging
    return NextResponse.json(parsed);

  } catch (err) {
    console.error("[Emerging] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
