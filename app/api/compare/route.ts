import { NextRequest, NextResponse } from "next/server";
import { fetchTrial } from "@/lib/clinicaltrials";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import { resolveTrialDrugs } from "@/lib/resolveDrug";

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const body = await request.json();
  const {
    nctIds,
    query,
    patientContext,
    refresh,
    activeRegions,
  } = body;

  if (!nctIds?.length) {
    return NextResponse.json({ error: "No trial IDs" }, { status: 400 });
  }

  // Deduplicate input IDs
  const uniqueNctIds = [...new Set<string>(nctIds)];

  const cacheKey = `compare:v4:${[...uniqueNctIds].sort().join(",")}:${
    query?.slice(0, 50) ?? ""}:${(activeRegions ?? []).join(",")}`;

  if (!refresh && !patientContext) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) {
        console.log("[Compare] Cache hit");
        return NextResponse.json(cached);
      }
    } catch {}
  } else {
    console.log("[Compare] Cache bypassed");
  }

  // Fetch all trials in parallel
  const trialResults = await Promise.allSettled(
    uniqueNctIds.map((id: string) => fetchTrial(id))
  );

  const trials = trialResults
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value);

  if (trials.length === 0) {
    return NextResponse.json(
      { error: "Could not fetch trials" },
      { status: 500 }
    );
  }

  // Build summaries — resolve compound codes before sending to Claude
  const summaries = await Promise.all(trials.map(async (trial: any) => {
    const ps          = trial.protocolSection;
    const id          = ps.identificationModule;
    const status      = ps.statusModule;
    const design      = ps.designModule;
    const desc        = ps.descriptionModule;
    const arms        = ps.armsInterventionsModule;
    const eligibility = ps.eligibilityModule;
    const locations   = ps.contactsLocationsModule;

    // Resolve compound codes with per-trial cache
    const interventions   = arms?.interventions ?? [];
    const drugCacheKey    = `drugs:resolved:${id.nctId}`;
    let resolvedInterventions = "";

    try {
      const cached = await kv.get(drugCacheKey);
      if (cached) {
        resolvedInterventions = cached as string;
      } else {
        resolvedInterventions = await resolveTrialDrugs(
          interventions.map((i: any) => ({
            name:        i.name,
            description: i.description,
          }))
        );
        await kv.set(drugCacheKey, resolvedInterventions, {
          ex: 60 * 60 * 24 * 7,
        });
      }
    } catch {
      resolvedInterventions = interventions
        .map((i: any) => i.name)
        .join(", ");
    }

    const countries = (locations?.locations ?? [])
      .map((l: any) => l.country)
      .filter(Boolean);

    return {
      nctId:         id.nctId,
      title:         id.briefTitle,
      phase:         design?.phases?.join(", ") ?? "Unknown",
      status:        status.overallStatus,
      summary:       desc?.briefSummary?.slice(0, 300) ?? "",
      interventions: resolvedInterventions.slice(0, 300),
      eligibility:   eligibility?.eligibilityCriteria?.slice(0, 200) ?? "",
      locationCount: locations?.locations?.length ?? 0,
      enrollment:    design?.enrollmentInfo?.count ?? "Unknown",
      countries:     countries.join(", ") || "Not specified",
    };
  }));

  const regionContext = activeRegions?.length > 0
    ? `Patient region preference: ${activeRegions.join(", ")}.
       Prioritize trials with confirmed sites in this region.
       Do NOT recommend a trial as regionally accessible if its confirmed
       sites are in a different region.`
    : "No region preference specified.";

  const prompt = `You are a clinical expert helping a physician compare clinical trials.

Clinician's search: "${query}"
${patientContext
  ? `Patient context: "${patientContext}"`
  : "No additional patient context."}
${regionContext}

Trials to compare:
${summaries.map((t, i) => `
TRIAL ${i + 1}: ${t.nctId}
Title: ${t.title}
Phase: ${t.phase}
Status: ${t.status}
Countries: ${t.countries}
Enrollment: ${t.enrollment}
Summary: ${t.summary}
Interventions: ${t.interventions}
Eligibility: ${t.eligibility}
`).join("\n---\n")}

Return ONLY valid JSON, no markdown:
{
  "trials": [
    {
      "nctId": "string",
      "rank": 1,
      "rankBadge": "🏆 Best Match",
      "mechanism": "string",
      "route": "Oral or Injection or Infusion",
      "dosingSchedule": "string",
      "efficacyHighlight": "string or null",
      "keyAdvantage": "max 10 words",
      "keyConsideration": "max 10 words",
      "priorBiologicAllowed": true,
      "bestFor": "short phrase"
    }
  ],
  "recommendation": "2-3 sentences — specific to this patient",
  "followUpQuestion": "single most useful clarifying question",
  "patientContext": "one sentence summary of patient"
}

Rules:
- rank 1 = best fit
- keyAdvantage and keyConsideration MUST be max 10 words each
- rankBadge options: "🏆 Best Match", "💊 Oral Option", "⚡ Fastest Clearance",
  "🔬 Novel Mechanism", "📍 Most Sites", "🌟 Phase 3 Gold Standard",
  "🧪 Cutting Edge", "✅ Most Accessible"
- Each trial must have a UNIQUE rankBadge
- Do not include duplicate nctIds in the response`;

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

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Attempt recovery
      const trialsMatch = cleaned.match(/"trials"\s*:\s*(\[[\s\S]*?\}[\s\S]*?\])/);
      if (trialsMatch) {
        try {
          parsed = JSON.parse(
            `{"trials":${trialsMatch[1]},"recommendation":"See individual trial details.","followUpQuestion":"What is your patient's preference for oral vs injectable therapy?","patientContext":"Based on search query."}`
          );
        } catch {
          throw new Error("Could not parse compare response");
        }
      } else {
        throw new Error("Could not parse compare response");
      }
    }

    // Deduplicate trials in response by nctId
    const seenNctIds    = new Set<string>();
    const dedupedTrials = (parsed.trials ?? []).filter((t: any) => {
      if (seenNctIds.has(t.nctId)) return false;
      seenNctIds.add(t.nctId);
      return true;
    });

    // Merge Claude data with original trial metadata
    const enriched = {
      ...parsed,
      trials: dedupedTrials.map((t: any) => {
        const orig = summaries.find((s) => s.nctId === t.nctId);
        return {
          ...t,
          title:         orig?.title         ?? "",
          phase:         orig?.phase         ?? "",
          status:        orig?.status        ?? "",
          locationCount: orig?.locationCount ?? 0,
        };
      }).sort((a: any, b: any) => a.rank - b.rank),
    };

    // Cache only if no extra patient context and not refreshing
    if (!patientContext && !refresh) {
      try {
        await kv.set(cacheKey, enriched, { ex: 60 * 60 * 6 });
        console.log("[Compare] Cached:", cacheKey);
      } catch {}
    }

    return NextResponse.json(enriched);

  } catch (err) {
    console.error("[Compare] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}