import { NextRequest, NextResponse } from "next/server";
import { fetchTrial } from "@/lib/clinicaltrials";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import { resolveTrialDrugs } from "@/lib/resolveDrug";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { nctIds, patientProfile } = body;

  if (!nctIds?.length || !patientProfile) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  // Cache key based on trials + patient profile
  const cacheKey = `eligibility:v2:${[...nctIds].sort().join(",")}:${JSON.stringify(patientProfile)}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) {
      console.log("[Eligibility] Cache hit");
      return NextResponse.json(cached);
    }
  } catch {}

  // Fetch all trials in parallel
  const trialResults = await Promise.allSettled(
    nctIds.map((id: string) => fetchTrial(id))
  );

  const trials = trialResults
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value);

  if (trials.length === 0) {
    return NextResponse.json({ error: "Could not fetch trials" }, { status: 500 });
  }

const trialData = await Promise.all(trials.map(async (trial: any) => {
  const ps          = trial.protocolSection;
  const id          = ps.identificationModule;
  const eligibility = ps.eligibilityModule;
  const design      = ps.designModule;
  const arms        = ps.armsInterventionsModule;

  // Resolve compound codes
  const interventions = arms?.interventions ?? [];
  const resolvedInterventions = await resolveTrialDrugs(
    interventions.map((i: any) => ({
      name:        i.name,
      description: i.description,
    }))
  );

  return {
    nctId:     id.nctId,
    title:     id.briefTitle,
    phase:     design?.phases?.join(", ") ?? "Unknown",
    criteria:  eligibility?.eligibilityCriteria ?? "Not specified",
    minAge:    eligibility?.minimumAge ?? null,
    maxAge:    eligibility?.maximumAge ?? null,
    sex:       eligibility?.sex ?? null,
    healthyVolunteers:    eligibility?.healthyVolunteers ?? false,
    overallStatus:        ps.statusModule?.overallStatus ?? "",
    resolvedInterventions,
  };
}));

  const prompt = `You are a clinical research coordinator expert at screening patients for trial eligibility.

PATIENT PROFILE:
- Age: ${patientProfile.age ?? "Not specified"}
- Sex: ${patientProfile.sex ?? "Not specified"}
- Diagnosis: ${patientProfile.diagnosis ?? "Not specified"}
- Disease severity: ${patientProfile.severity ?? "Not specified"}
- Prior treatments (failed): ${patientProfile.priorTreatments ?? "Not specified"}
- Current medications: ${patientProfile.currentMedications ?? "Not specified"}
- Key comorbidities / contraindications: ${patientProfile.comorbidities ?? "None specified"}
- Location: ${patientProfile.location ?? "Not specified"}

For each trial below, carefully read the FULL eligibility criteria and determine if this patient qualifies.

${trialData.map((t, i) => `
TRIAL ${i + 1}: ${t.nctId}
Title: ${t.title}
Phase: ${t.phase}
Status: ${t.overallStatus}
Min Age: ${t.minAge ?? "Not specified"}
Max Age: ${t.maxAge ?? "Not specified"}
Interventions (resolved): ${t.resolvedInterventions}
Sex requirement: ${t.sex ?? "All"}
Full eligibility criteria:
${t.criteria}
`).join("\n---\n")}

For each trial return a detailed eligibility assessment.

Return ONLY valid JSON, no markdown:
{
  "results": [
    {
      "nctId": "string",
      "verdict": "QUALIFIES" or "POSSIBLE" or "EXCLUDED",
      "confidence": "HIGH" or "MEDIUM" or "LOW",
      "summary": "One sentence verdict for this specific patient",
      "matchedCriteria": [
        "Specific inclusion criterion this patient meets"
      ],
      "flaggedCriteria": [
        "Specific criterion that needs clarification or may be borderline"
      ],
      "excludingCriteria": [
        "Specific criterion that likely excludes this patient — quote the criterion"
      ],
      "recommendedAction": "What the clinician should do next — e.g. contact site to confirm X, check lab value Y"
    }
  ],
  "overallSummary": "1-2 sentences summarising which trial(s) this patient is best positioned for"
}

Rules:
- verdict QUALIFIES: patient clearly meets inclusion criteria and no obvious exclusions
- verdict POSSIBLE: patient may qualify but one or more criteria need clarification
- verdict EXCLUDED: patient clearly meets one or more exclusion criteria
- Be SPECIFIC — quote actual criteria text when flagging issues
- confidence HIGH: criteria are clear and patient profile is sufficient to determine
- confidence LOW: insufficient patient information to make determination
- If age/sex info not provided by patient — note it needs checking
- matchedCriteria should list 2-4 specific criteria the patient clearly meets
- excludingCriteria should only list criteria with HIGH confidence of exclusion`;

  try {
    const message = await anthropic.messages.create({
      model:       "claude-sonnet-4-5-20250929",
      max_tokens:  3000,
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

    // Cache for 1 hour
    try {
      await kv.set(cacheKey, parsed, { ex: 60 * 60 });
    } catch {}

    return NextResponse.json(parsed);

  } catch (err) {
    console.error("[Eligibility] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}