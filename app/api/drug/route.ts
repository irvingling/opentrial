import { NextRequest, NextResponse } from "next/server";
import { fetchDrugInfo } from "@/lib/fda";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ── Step 1: Search ClinicalTrials.gov for drug ────────────────────────────────
async function searchClinicalTrials(drugName: string): Promise<string> {
  try {
    const url = `https://clinicaltrials.gov/api/v2/studies?query.intr=${encodeURIComponent(drugName)}&pageSize=3&fields=BriefTitle,BriefSummary,DetailedDescription,InterventionDescription`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return "";

    const data = await res.json();
    const studies = data.studies ?? [];

    if (studies.length === 0) return "";

    const texts = studies.map((s: any) => {
      const ps            = s.protocolSection;
      const title         = ps.identificationModule?.briefTitle ?? "";
      const summary       = ps.descriptionModule?.briefSummary ?? "";
      const detailed      = ps.descriptionModule?.detailedDescription ?? "";
      const interventions = ps.armsInterventionsModule?.interventions
        ?.filter((i: any) =>
          i.name?.toLowerCase().includes(drugName.toLowerCase())
        )
        ?.map((i: any) => i.description ?? "")
        .join(" ") ?? "";

      return [
        `Trial: ${title}`,
        `Summary: ${summary.slice(0, 500)}`,
        `Detailed: ${detailed.slice(0, 500)}`,
        `Intervention: ${interventions.slice(0, 500)}`,
      ].join("\n");
    });

    return texts.join("\n\n---\n\n");
  } catch (err) {
    console.error("[Drug] ClinicalTrials fetch error:", err);
    return "";
  }
}

// ── Step 2: Search PubMed for drug ────────────────────────────────────────────
async function searchPubMed(drugName: string): Promise<string> {
  try {
    const searchUrl =
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` +
      `?db=pubmed&term=${encodeURIComponent(drugName)}&retmax=5&retmode=json`;

    const searchRes = await fetch(searchUrl, { cache: "no-store" });
    if (!searchRes.ok) return "";

    const searchData = await searchRes.json();
    const ids: string[] = searchData.esearchresult?.idlist ?? [];

    if (ids.length === 0) return "";

    const fetchUrl =
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi` +
      `?db=pubmed&id=${ids.join(",")}&retmode=text&rettype=abstract`;

    const fetchRes = await fetch(fetchUrl, { cache: "no-store" });
    if (!fetchRes.ok) return "";

    const abstracts = await fetchRes.text();
    return abstracts.slice(0, 3000);
  } catch (err) {
    console.error("[Drug] PubMed fetch error:", err);
    return "";
  }
}

// ── Step 3: Claude synthesizes from real data ─────────────────────────────────
async function fetchFromClaude(drugName: string) {
  const cacheKey = `drug:ai:v4:${drugName.toLowerCase().replace(/\s+/g, "-")}`;

  // Check cache first
  try {
    const cached = await kv.get(cacheKey);
    if (cached) {
      console.log(`[Drug] Cache hit for: ${drugName}`);
      return { ...cached as object, cached: true };
    }
  } catch {
    // Cache miss — continue
  }

  // Fetch real data in parallel
  console.log(`[Drug] Fetching real data from ClinicalTrials + PubMed for: ${drugName}`);
  const [clinicalTrialsData, pubmedData] = await Promise.all([
    searchClinicalTrials(drugName),
    searchPubMed(drugName),
  ]);

  console.log(`[Drug] ClinicalTrials data length: ${clinicalTrialsData.length}`);
  console.log(`[Drug] PubMed data length: ${pubmedData.length}`);

  const hasRealData = clinicalTrialsData.length > 0 || pubmedData.length > 0;

  const prompt = hasRealData
    ? `You are a clinical pharmacologist. Based on the following REAL data from ClinicalTrials.gov and PubMed, provide an accurate summary of "${drugName}".

REAL DATA FROM CLINICALTRIALS.GOV:
${clinicalTrialsData || "No data found"}

REAL DATA FROM PUBMED:
${pubmedData || "No data found"}

CRITICAL RULES:
1. Only use the information in the real data above
2. Only describe "${drugName}" — not other drugs mentioned alongside it
3. Be specific about the exact molecular target based on what the data says
4. Do NOT infer or guess beyond what the data states
5. If the data mentions a specific target (e.g. IL-23 receptor, TYK2, JAK1) use that exact term

Return ONLY valid JSON:
{
  "mechanismOfAction": "Based on clinical trial data and published literature, [specific 2-3 sentence explanation of EXACTLY how ${drugName} works, naming the specific molecular target from the data]",
  "drugClass": "Specific class based on the data e.g. IL-23 receptor antagonist peptide",
  "summary": "1-2 sentences describing what ${drugName} is and what condition it targets",
  "confidence": "high if data clearly describes MoA, medium if partially described, low if inferred",
  "evidenceBasis": "ClinicalTrials.gov and/or PubMed data"
}

Return ONLY valid JSON. No markdown, no explanation, no code blocks.`

    : `You are a clinical pharmacologist. No real-time data was found for "${drugName}" in ClinicalTrials.gov or PubMed.

CRITICAL RULES:
1. Only describe "${drugName}" specifically
2. Do NOT confuse with other drugs in the same trial
3. Be specific about molecular target if known
4. If uncertain, say "limited published data available"

Return ONLY valid JSON:
{
  "mechanismOfAction": "Based on available literature, [what is known about ${drugName}] — or null if truly unknown",
  "drugClass": "Specific class if known — or null",
  "summary": "1-2 sentences — or null if unknown",
  "confidence": "high, medium, low, or none",
  "evidenceBasis": "Source of information or No published information found"
}

Return ONLY valid JSON. No markdown, no explanation, no code blocks.`;

  try {
    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages:   [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text"
      ? message.content[0].text
      : "";

    console.log(`[Drug] Claude raw response: ${text}`);

    const cleaned = text
      .replace(/^```json\n?/, "")
      .replace(/^```\n?/, "")
      .replace(/```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    console.log(`[Drug] Confidence: ${parsed.confidence}`);

    if (!parsed.mechanismOfAction && parsed.confidence === "none") {
      return null;
    }

    const result = {
      found:             true,
      brandName:         null,
      genericName:       drugName,
      summary:           parsed.summary,
      mechanismOfAction: parsed.mechanismOfAction,
      pharmacodynamics:  null,
      indications:       null,
      drugClass:         parsed.drugClass,
      labelerName:       null,
      source:            "ai",
      sourceLabel:       `AI Generated · ${parsed.evidenceBasis}`,
      confidence:        parsed.confidence,
      evidenceBasis:     parsed.evidenceBasis,
      cached:            false,
    };

    // Cache for 30 days
    try {
      await kv.set(cacheKey, result, { ex: 60 * 60 * 24 * 30 });
    } catch {
      // Cache write failed — still return result
    }

    return result;

  } catch (err) {
    console.error("[Drug] Claude error:", err);
    return null;
  }
}

// ── Main route ────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "Drug name is required" },
      { status: 400 }
    );
  }

  try {
    // ── 1. Try databases first ───────────────────────────────────────────────
    const info = await fetchDrugInfo(name);
    if (info) {
      return NextResponse.json({ found: true, ...info });
    }

    // ── 2. Fall back to Claude with real data ────────────────────────────────
    console.log(`[Drug] Not found in databases, fetching real data + Claude for: ${name}`);
    const aiResult = await fetchFromClaude(name);

    if (aiResult) {
      // ✅ If confidence is low and we found an alias, search again with alias
      if (
        (aiResult as any).confidence === "low" &&
        (aiResult as any).summary
      ) {
        const alias = extractAlias((aiResult as any).summary);
        if (alias && alias.toLowerCase() !== name.toLowerCase()) {
          console.log(`[Drug] Low confidence — retrying with alias: ${alias}`);
          const aliasResult = await fetchFromClaude(alias);
          if (aliasResult && (aliasResult as any).confidence !== "low") {
            return NextResponse.json({
              ...aliasResult,
              genericName:   name,
              aliasSearched: alias,
            });
          }
        }
      }
      return NextResponse.json(aiResult);
    }

    // ── 3. Nothing found anywhere ────────────────────────────────────────────
    return NextResponse.json({
      found:   false,
      message: "Not found in any database or published literature.",
    });

  } catch (err) {
    console.error("[API] Drug lookup error:", err);
    return NextResponse.json(
      { error: "Drug lookup failed" },
      { status: 500 }
    );
  }
}

// ── Extract alias from summary text ──────────────────────────────────────────
function extractAlias(summary: string): string | null {
  // Look for patterns like "also referred to as X" or "also known as X"
  const patterns = [
    /also referred to as ([a-zA-Z0-9-]+)/i,
    /also known as ([a-zA-Z0-9-]+)/i,
    /brand name[:\s]+([a-zA-Z0-9-]+)/i,
    /\(([a-zA-Z]{2,}[a-zA-Z0-9-]*)\)/,  // e.g. "(icotrokinra)"
  ];

  for (const pattern of patterns) {
    const match = summary.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}