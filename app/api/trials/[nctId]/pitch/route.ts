import { NextRequest, NextResponse } from "next/server";
import { fetchTrial } from "@/lib/clinicaltrials";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nctId: string }> }
) {
  const { nctId } = await params;

  const cacheKey = `pitch:v4:${nctId}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) {
      console.log(`[Pitch] Cache hit: ${nctId}`);
      return NextResponse.json(cached);
    }
  } catch {}

  let trial;
  try {
    trial = await fetchTrial(nctId);
  } catch {
    return NextResponse.json({ error: "Trial not found" }, { status: 404 });
  }

  const ps            = trial.protocolSection;
  const title         = ps.identificationModule.briefTitle;
  const summary       = ps.descriptionModule?.briefSummary ?? "";
  const detailed      = ps.descriptionModule?.detailedDescription ?? "";
  const eligibility   = ps.eligibilityModule;
  const phases        = ps.designModule?.phases ?? [];
  const interventions = ps.armsInterventionsModule?.interventions ?? [];
  const conditions    = ps.conditionsModule?.conditions ?? [];
  const enrollment    = ps.designModule?.enrollmentInfo?.count ?? "unknown";
  const allocation    = ps.designModule?.designInfo?.allocation ?? "";

  const prompt = `You are a clinical expert helping clinicians evaluate a trial.

Trial: "${title}"
Phase: ${phases.join(", ")}
Conditions: ${conditions.join(", ")}
Enrollment: ${enrollment}
Allocation: ${allocation}
Summary: ${summary.slice(0, 800)}
Eligibility: ${eligibility?.eligibilityCriteria?.slice(0, 1500) ?? "Not specified"}
Interventions: ${interventions.map((i: any) => `${i.name}: ${i.description ?? ""}`).join("\n").slice(0, 400)}

Generate a clinical trial pitch. Be specific, honest and concise.

CRITICAL RULE FOR BULLET POINTS:
- Every bull and bear bullet must be MAX 10 WORDS
- No full sentences — short punchy phrases only
- GOOD: "Highest PASI 100 rate in class"
- GOOD: "Once monthly dosing, convenient for patients"  
- BAD: "This trial offers patients the opportunity to access a novel mechanism that has shown promising results in early phase studies"

Return ONLY valid JSON, no markdown:
{
  "oneLiner": "One sentence — what this trial tests and why it matters",
  "bullCase": [
    "Max 10 words — strongest clinical reason",
    "Max 10 words — practical benefit",
    "Max 10 words — access or novelty angle"
  ],
  "bearCase": [
    "Max 10 words — SPECIFIC safety signal for this drug class",
    "Max 10 words — practical concern e.g. visit burden or placebo",
    "Max 10 words — evidence maturity or eligibility concern"
  ],
  "safetyHighlight": "One specific sentence about the key safety signal for this mechanism — name the AE and mechanism link explicitly",
  "eligibility": {
    "qualifies": [
      "Plain English — who likely qualifies",
      "Criterion 2",
      "Criterion 3"
    ],
    "excluded": [
      "Plain English — who is excluded",
      "Exclusion 2",
      "Exclusion 3"
    ]
  },
  "patientTalkingPoints": "2-3 sentences for the patient — 8th grade reading level, no jargon, mention what drug does and what they commit to"
}

Rules:
- bullCase: exactly 3 bullets, max 10 words each
- bearCase: exactly 3 bullets, max 10 words each, first MUST be safety/MoA specific
- safetyHighlight: specific e.g. "JAK inhibitors carry FDA black box warning for VTE, MACE and malignancy"
- if Phase 1/2 — acknowledge uncertainty
- if placebo arm — mention it`;

  try {
    const message = await anthropic.messages.create({
      model:       "claude-sonnet-4-5-20250929",
      max_tokens:  1200,
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

    try {
      await kv.set(cacheKey, parsed, { ex: 60 * 60 * 24 * 7 });
    } catch {}

    return NextResponse.json(parsed);

  } catch (err) {
    console.error("[Pitch] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}