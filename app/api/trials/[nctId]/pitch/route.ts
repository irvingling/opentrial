import { NextRequest, NextResponse } from "next/server";
import { fetchTrial } from "@/lib/clinicaltrials";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nctId: string }> }
) {
  const { nctId } = await params;

  // Check cache
  const cacheKey = `pitch:v2:${nctId}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) {
      console.log(`[Pitch] Cache hit: ${nctId}`);
      return NextResponse.json(cached);
    }
  } catch {
    // cache miss — continue
  }

  // Fetch trial data
  let trial;
  try {
    trial = await fetchTrial(nctId);
  } catch {
    return NextResponse.json({ error: "Trial not found" }, { status: 404 });
  }

  const ps           = trial.protocolSection;
  const title        = ps.identificationModule.briefTitle;
  const summary      = ps.descriptionModule?.briefSummary ?? "";
  const detailed     = ps.descriptionModule?.detailedDescription ?? "";
  const eligibility  = ps.eligibilityModule;
  const phases       = ps.designModule?.phases ?? [];
  const interventions = ps.armsInterventionsModule?.interventions ?? [];
  const conditions   = ps.conditionsModule?.conditions ?? [];
  const enrollment   = ps.designModule?.enrollmentInfo?.count ?? "unknown";
  const allocation   = ps.designModule?.designInfo?.allocation ?? "";

  const prompt = `You are a clinical expert helping clinicians evaluate trials for their patients.

Trial: "${title}"
Phase: ${phases.join(", ")}
Conditions: ${conditions.join(", ")}
Enrollment: ${enrollment} patients
Allocation: ${allocation}
Summary: ${summary.slice(0, 1000)}
Detailed description: ${detailed.slice(0, 500)}
Eligibility criteria: ${eligibility?.eligibilityCriteria?.slice(0, 2000) ?? "Not specified"}
Interventions: ${interventions.map((i: any) => `${i.name}: ${i.description ?? ""}`).join("\n").slice(0, 500)}

Generate a clinical trial "pitch deck" that helps a clinician quickly decide if this trial is right for their patient. Think like Robinhood's bull/bear case for stocks — honest, specific, and useful.

Return ONLY valid JSON, no markdown, no code fences:
{
  "oneLiner": "One compelling sentence explaining what this trial tests and why it matters — written so a clinician could say it to their patient",
  "bullCase": [
    "Specific reason 1 to enroll — cite data or mechanism if available",
    "Specific reason 2",
    "Specific reason 3",
    "Specific reason 4"
  ],
  "bearCase": [
    "Honest concern 1 — phase uncertainty, placebo arm, visit burden, etc",
    "Honest concern 2",
    "Honest concern 3",
    "Honest concern 4 if relevant"
  ],
  "eligibility": {
    "qualifies": [
      "Plain English criterion — who likely qualifies",
      "Plain English criterion 2",
      "Plain English criterion 3"
    ],
    "excluded": [
      "Plain English exclusion 1 — who is likely excluded",
      "Plain English exclusion 2",
      "Plain English exclusion 3"
    ]
  },
  "patientTalkingPoints": "2-3 sentences a clinician could say directly to a patient to explain this trial — 8th grade reading level, no jargon"
}

Rules:
- bullCase and bearCase must be SPECIFIC to this trial, never generic
- eligibility must be plain English, no medical acronyms without explanation
- oneLiner should be honest but compelling
- if this is Phase 1 or 2 — acknowledge the uncertainty in bearCase
- if there is a placebo arm — mention it in bearCase
- patientTalkingPoints should mention what the drug does and what the patient would need to do`;

  try {
    const message = await anthropic.messages.create({
      model:       "claude-sonnet-4-5-20250929",
      max_tokens:  1500,
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

    // Cache for 7 days
    try {
      await kv.set(cacheKey, parsed, { ex: 60 * 60 * 24 * 7 });
    } catch {
      // cache write failed — still return
    }

    return NextResponse.json(parsed);

  } catch (err) {
    console.error("[Pitch] Error:", err);
    return NextResponse.json({ error: "Failed to generate pitch" }, { status: 500 });
  }
}