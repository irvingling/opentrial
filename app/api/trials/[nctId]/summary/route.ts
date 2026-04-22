import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ nctId: string }> }
) {
  const { nctId } = await params;

  // ── 1. Check cache first ──────────────────────────────────────────────────
  const cacheKey = `summary:v4:${nctId}`;

// ✅ Temporarily disabled to force fresh generation
try {
   const cached = await kv.get(cacheKey);
   if (cached) {
     return NextResponse.json({ ...cached as object, cached: true });
   }
 } catch {
   // Cache miss or error — continue to generate
 }

  // ── 2. Fetch trial data ───────────────────────────────────────────────────
  let trial;
  try {
    const res = await fetch(
      `https://clinicaltrials.gov/api/v2/studies/${nctId}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("Trial not found");
    trial = await res.json();
  } catch {
    return NextResponse.json(
      { error: "Could not fetch trial data" },
      { status: 404 }
    );
  }

  // ── 3. Extract relevant fields ────────────────────────────────────────────
  const ps            = trial.protocolSection;
  const title         = ps.identificationModule?.briefTitle ?? "";
  const summary       = ps.descriptionModule?.briefSummary ?? "";
  const conditions    = ps.conditionsModule?.conditions?.join(", ") ?? "";
  const phases        = ps.designModule?.phases?.join(", ") ?? "";
// ✅ Separate primary drug from comparators
const allInterventions = ps.armsInterventionsModule?.interventions ?? [];

const primaryDrug = allInterventions.find((i: any) =>
  ["DRUG", "BIOLOGICAL"].includes(i.type?.toUpperCase()) &&
  !["PLACEBO", "VEHICLE", "SHAM"].includes(i.name?.toUpperCase())
)?.name ?? "";

const comparators = allInterventions
  .filter((i: any) =>
    ["DRUG", "BIOLOGICAL"].includes(i.type?.toUpperCase()) &&
    i.name !== primaryDrug
  )
  .map((i: any) => i.name)
  .join(", ");

const interventions = allInterventions
  .map((i: any) => `${i.name} (${i.type})`)
  .join(", ") ?? "";
  const eligibility   = ps.eligibilityModule?.eligibilityCriteria ?? "";
  const sponsor       = ps.sponsorCollaboratorsModule?.leadSponsor?.name ?? "";
  const outcomes      = ps.outcomesModule?.primaryOutcomes
    ?.map((o: any) => o.measure)
    .join("; ") ?? "";

  // ── 4. Send to Claude ─────────────────────────────────────────────────────
// ✅ Explicitly identifies primary drug vs comparators
const prompt = `You are a medical writer helping clinicians quickly understand clinical trials.

Here is the trial data:

Title: ${title}
Conditions: ${conditions}
Phase: ${phases}
Primary Investigational Drug: ${primaryDrug}
Comparator Drugs (NOT the focus): ${comparators || "none"}
All Interventions: ${interventions}
Sponsor: ${sponsor}
Summary: ${summary}
Eligibility Criteria: ${eligibility.slice(0, 1500)}
Primary Outcomes: ${outcomes}

CRITICAL: The mechanismOfAction field must describe ONLY the PRIMARY investigational drug "${primaryDrug}".
Do NOT describe the comparator drugs: ${comparators || "none"}.
These are different drugs with different mechanisms.

Please provide a concise clinical summary in the following JSON format:
{
  "trialSummary": "2-3 sentences max. Plain language overview of what this trial is studying and why. No jargon.",
  "mechanismOfAction": "2-3 sentences explaining how ${primaryDrug} specifically works in plain clinical language. Do NOT describe ${comparators}.",
  "targetPopulation": "1 sentence describing who this trial is designed for clinically",
  "whyItMatters": "1-2 sentences on the clinical significance or unmet need this addresses",
  "eligibilityHighlights": {
    "mustHave": ["key inclusion criterion 1", "key inclusion criterion 2", "key inclusion criterion 3"],
    "mustNotHave": ["key exclusion criterion 1", "key exclusion criterion 2", "key exclusion criterion 3"]
  },
  "outcomesSummary": "1-2 sentences explaining what the trial is measuring in plain language a non-specialist could understand",
  "searchTerms": ["term1", "term2", "term3", "term4", "term5"]
}

For searchTerms, provide 5 terms based on ${primaryDrug}'s mechanism and target condition.

Return ONLY valid JSON. No markdown, no explanation, no code blocks.`;

  let aiSummary;
  try {
    const message = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages:   [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text"
      ? message.content[0].text
      : "";

    // Strip markdown code blocks before parsing
    const cleaned = text
      .replace(/^```json\n?/, "")
      .replace(/^```\n?/, "")
      .replace(/```$/, "")
      .trim();

    aiSummary = JSON.parse(cleaned);
  } catch (err) {
    console.error("Claude error:", err);
    return NextResponse.json(
      { error: "Could not generate AI summary", detail: String(err) },
      { status: 500 }
    );
  }

  // ── 5. Cache for 30 days ──────────────────────────────────────────────────
  try {
    await kv.set(cacheKey, aiSummary, { ex: 60 * 60 * 24 * 30 });
  } catch {
    // Cache write failed — still return the result
  }

  return NextResponse.json({ ...aiSummary, cached: false });
}