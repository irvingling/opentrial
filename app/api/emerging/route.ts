import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

async function searchPubMed(query: string): Promise<string> {
  try {
    const searchUrl =
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` +
      `?db=pubmed&term=${encodeURIComponent(query)}` +
      `&retmax=8&retmode=json&sort=relevance`;

    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!searchRes.ok) return "";

    const searchData = await searchRes.json();
    const ids: string[] = searchData.esearchresult?.idlist ?? [];
    if (ids.length === 0) return "";

    const fetchUrl =
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi` +
      `?db=pubmed&id=${ids.join(",")}&retmode=text&rettype=abstract`;

    const fetchRes = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!fetchRes.ok) return "";

    return (await fetchRes.text()).slice(0, 6000);
  } catch {
    return "";
  }
}

async function searchCTResults(condition: string): Promise<string> {
  try {
    const url =
      `https://clinicaltrials.gov/api/v2/studies` +
      `?query.cond=${encodeURIComponent(condition)}` +
      `&filter.overallStatus=COMPLETED,TERMINATED` +
      `&pageSize=15` +
      `&format=json`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return "";

    const data    = await res.json();
    const studies = data.studies ?? [];

    return studies.slice(0, 10).map((s: any) => {
      const id      = s.protocolSection.identificationModule;
      const status  = s.protocolSection.statusModule;
      const phases  = s.protocolSection.designModule?.phases?.join(", ") ?? "";
      const summary = s.protocolSection.descriptionModule?.briefSummary ?? "";
      return [
        `NCT: ${id.nctId}`,
        `Status: ${status.overallStatus}`,
        `Title: ${id.briefTitle}`,
        `Phase: ${phases}`,
        `Summary: ${summary.slice(0, 300)}`,
      ].join(" | ");
    }).join("\n---\n");
  } catch {
    return "";
  }
}

async function searchSemanticScholar(query: string): Promise<string> {
  try {
    const url =
      `https://api.semanticscholar.org/graph/v1/paper/search` +
      `?query=${encodeURIComponent(query)}` +
      `&limit=5` +
      `&fields=title,abstract,year,venue,externalIds`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return "";

    const data   = await res.json();
    const papers = data.data ?? [];

    return papers.map((p: any) => {
      const pmid = p.externalIds?.PubMed
        ? `PMID:${p.externalIds.PubMed}` : "";
      return [
        `Title: ${p.title}`,
        `Year: ${p.year} | Venue: ${p.venue ?? "Unknown"}${pmid ? ` | ${pmid}` : ""}`,
        `Abstract: ${(p.abstract ?? "").slice(0, 400)}`,
      ].join("\n");
    }).join("\n---\n");
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  const url     = new URL(request.url);
  const q       = url.searchParams.get("q") ?? "";
  const refresh = url.searchParams.get("refresh") === "true";

  if (!q) return NextResponse.json({ error: "No query" }, { status: 400 });

  const cacheKey = `emerging:v3:${q.toLowerCase().trim()
    .replace(/\s+/g, "-").slice(0, 100)}`;

  if (!refresh) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) {
        console.log("[Emerging] Cache hit");
        return NextResponse.json(cached);
      }
    } catch {}
  }

  console.log("[Emerging] Searching for:", q);

  const [pubmedData, ctResults, semanticData, failedData] = await Promise.all([
    searchPubMed(`${q} phase 2 clinical trial efficacy`),
    searchCTResults(q),
    searchSemanticScholar(`${q} phase 2 clinical trial`),
    searchPubMed(`${q} failed discontinued terminated primary endpoint`),
  ]);

  const hasRealData = pubmedData.length > 0
    || ctResults.length > 0
    || semanticData.length > 0;

  const prompt = `You are a clinical evidence synthesis expert analyzing the emerging evidence landscape for: "${q}"

${hasRealData ? `
PUBMED DATA:
${pubmedData || "No results"}

CLINICALTRIALS.GOV COMPLETED/TERMINATED TRIALS:
${ctResults || "No results"}

SEMANTIC SCHOLAR:
${semanticData || "No results"}

FAILED/DISCONTINUED SEARCH:
${failedData || "No results"}
` : "No real-time data retrieved. Use training knowledge only for well-documented findings."}

Categorize emerging evidence into 4 tiers:

TIER 1 — PUBLISHED: Drugs with actual numbers from peer-reviewed papers or posted results
- Must have REAL numbers (%, p-value, n) you can cite
- Only include if you can name the source

TIER 2 — REPORTED POSITIVE: Company announced positive results but no published numbers yet
- "Met primary endpoint", "positive top-line data" etc
- No invented numbers — just the claim and source

TIER 3 — WATCH LIST: Active Phase 1/2 with readout expected
- No efficacy data yet but mechanistically interesting

TIER 4 — DID NOT PROGRESS: Drugs that failed primary endpoint OR discontinued development
- Phase 2 or 3 trials that missed primary endpoint
- Drugs where company discontinued development after disappointing results
- Include the REASON — was it efficacy failure, safety, or business decision?
- Include clinical insight: what does this teach us about the target/mechanism?
- Examples: drugs that failed in this indication even if approved elsewhere

Return ONLY valid JSON, no markdown:
{
  "condition": "string",
  "lastUpdated": "${new Date().toISOString().split("T")[0]}",
  "published": [
    {
      "drugName": "string",
      "drugClass": "string",
      "phase": "string",
      "mechanism": "string",
      "keyResult": "string — exact stat with context",
      "endpoint": "string",
      "trialName": "string or null",
      "n": number or null,
      "comparator": "string or null",
      "source": "string",
      "pubmedId": "string or null",
      "confidence": "high" or "medium",
      "confidenceReason": "string",
      "sponsorNote": "string or null"
    }
  ],
  "reportedPositive": [
    {
      "drugName": "string",
      "drugClass": "string",
      "mechanism": "string",
      "phase": "string",
      "announcement": "string",
      "trialName": "string or null",
      "announcementDate": "string or null",
      "source": "string",
      "caution": "string",
      "expectedPublicationDate": "string or null"
    }
  ],
  "watchList": [
    {
      "drugName": "string",
      "drugClass": "string",
      "mechanism": "string",
      "phase": "string",
      "nctId": "string or null",
      "rationale": "string",
      "expectedReadout": "string or null",
      "sponsor": "string or null",
      "status": "Recruiting" or "Active" or "Not yet recruiting"
    }
  ],
  "didNotProgress": [
    {
      "drugName": "string",
      "drugClass": "string",
      "mechanism": "string",
      "phase": "string — Phase at which development stopped",
      "reason": "Efficacy failure" or "Safety" or "Business decision" or "Partial response",
      "trialName": "string or null",
      "whatWasTested": "string — brief description of what was being evaluated",
      "outcome": "string — what happened e.g. missed PASI 75 primary endpoint at Week 16",
      "year": "string or null",
      "source": "string",
      "clinicalInsight": "string — what this failure teaches us about this mechanism or target in this disease"
    }
  ],
  "evidenceSummary": "2-3 sentences summarizing the full emerging landscape including failures",
  "dataNote": "string — honest assessment of data quality and what is training knowledge vs retrieved"
}

RULES:
- NEVER invent numbers for published tier
- didNotProgress is IMPORTANT — clinicians need to know what NOT to wait for
- Include drugs discontinued for efficacy OR safety reasons
- clinicalInsight in didNotProgress should be genuinely useful e.g. "This suggests IL-22 may not be the right target in plaque psoriasis" or "Safety signal suggests on-target toxicity of this mechanism"
- If a drug failed in one indication but is approved in another — include it with context
- Be comprehensive — a good failure list is as valuable as the success list`;

  try {
    const message = await anthropic.messages.create({
      model:       "claude-sonnet-4-5-20250929",
      max_tokens:  4000,
      temperature: 0,
      messages:    [{ role: "user", content: prompt }],
    });

    const text    = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text
      .replace(/^```json\n?/i, "")
      .replace(/^```\n?/, "")
      .replace(/```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Cache for 24 hours
    try {
      await kv.set(cacheKey, parsed, { ex: 60 * 60 * 24 });
    } catch {}

    return NextResponse.json(parsed);

  } catch (err) {
    console.error("[Emerging] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}