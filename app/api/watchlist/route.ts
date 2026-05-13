// app/api/watchlist/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── ClinicalTrials.gov v2 API ─────────────────────────────────────────────────
// Correct field names from https://clinicaltrials.gov/data-api/api
async function fetchClinicalTrials(condition: string, today: string): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      "query.cond":           condition,
      "filter.overallStatus": "RECRUITING,ACTIVE_NOT_RECRUITING",
      "filter.phase":         "PHASE2,PHASE3",
      "pageSize":             "40",
      "format":               "json",
      "fields":               [
        "NCTId","BriefTitle","Phase","LeadSponsorName","OverallStatus",
        "PrimaryCompletionDate","EnrollmentCount","InterventionName",
        "BriefSummary","PrimaryOutcomeMeasure","StartDate",
      ].join(","),
    });

    const url = `https://clinicaltrials.gov/api/v2/studies?${params.toString()}`;
    console.log("[Watchlist] Fetching:", url);
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error("[Watchlist] CT.gov error:", res.status, await res.text().catch(() => ""));
      return [];
    }

    const data    = await res.json();
    const studies = data.studies ?? [];
    console.log("[Watchlist] Raw studies:", studies.length);

    const todayMs = new Date(today).getTime();

    // Filter: primary completion must be in the future
    return studies.filter((s: any) => {
      const proto = s.protocolSection ?? {};
      const statusMod = proto.statusModule ?? {};
      const rawDate = statusMod.primaryCompletionDateStruct?.date
        ?? statusMod.completionDateStruct?.date;
      if (!rawDate) return true; // include if date unknown
      const ms = new Date(rawDate).getTime();
      return !isNaN(ms) && ms > todayMs;
    });
  } catch (err) {
    console.error("[Watchlist] Fetch error:", err);
    return [];
  }
}

// ── Map query to CT.gov condition string ──────────────────────────────────────
function getCtCondition(q: string): string {
  const qL = q.toLowerCase();
  if (qL.includes("atopic") || qL.includes("eczema")) return "Atopic Dermatitis";
  if (qL.includes("psoriasis") || qL.includes("pso"))  return "Plaque Psoriasis";
  if (qL.includes("crohn"))                            return "Crohn Disease";
  if (qL.includes("colitis"))                          return "Ulcerative Colitis";
  if (qL.includes("rheumatoid") || qL.includes(" ra "))return "Rheumatoid Arthritis";
  if (qL.includes("lupus") || qL.includes("sle"))      return "Systemic Lupus Erythematosus";
  if (qL.includes("psa") || qL.includes("psoriatic arthritis")) return "Psoriatic Arthritis";
  if (qL.includes("asthma"))                           return "Asthma";
  return q; // fallback: use raw query
}

export async function GET(request: NextRequest) {
  const url     = new URL(request.url);
  const q       = url.searchParams.get("q") ?? "";
  const refresh = url.searchParams.get("refresh") === "true";

  if (!q) return NextResponse.json({ error: "No query" }, { status: 400 });

  const today    = new Date().toISOString().split("T")[0];
  const cacheKey = `watchlist:v3:${q.toLowerCase().trim().replace(/\s+/g, "-").slice(0, 80)}`;

  if (!refresh) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) { console.log("[Watchlist] Cache hit"); return NextResponse.json(cached); }
    } catch {}
  }

  const ctCondition = getCtCondition(q);
  console.log("[Watchlist] Searching CT.gov for:", ctCondition);

  const rawStudies = await fetchClinicalTrials(ctCondition, today);
  console.log("[Watchlist] Studies after date filter:", rawStudies.length);

  if (!rawStudies.length) {
    return NextResponse.json({
      condition: q, today, trials: [],
      message: `No active Phase 2/3 trials found for "${ctCondition}" with future readout dates.`,
    });
  }

  // ── Extract readable trial data from raw studies ───────────────────────────
  const trialsText = rawStudies.slice(0, 25).map((s: any) => {
    const proto      = s.protocolSection ?? {};
    const ident      = proto.identificationModule ?? {};
    const status     = proto.statusModule ?? {};
    const sponsor    = proto.sponsorCollaboratorsModule ?? {};
    const design     = proto.designModule ?? {};
    const outcomes   = proto.outcomesModule ?? {};
    const arms       = proto.armsInterventionsModule ?? {};
    const nctId      = ident.nctId ?? "unknown";

    return `NCT: ${nctId}
Title: ${ident.briefTitle ?? ""}
Phase: ${(design.phases ?? []).join(", ")}
Sponsor: ${sponsor.leadSponsor?.name ?? ""}
Status: ${status.overallStatus ?? ""}
Primary Completion: ${status.primaryCompletionDateStruct?.date ?? "not specified"}
Enrollment: ${design.enrollmentInfo?.count ?? "N/A"}
Primary Outcome: ${outcomes.primaryOutcomes?.[0]?.measure ?? "N/A"}
Interventions: ${(arms.interventions ?? []).slice(0,3).map((i: any) => i.name).join(", ")}
Summary: ${(ident.briefSummary ?? "").slice(0, 150)}`;
  }).join("\n---\n");

  // ── AI extraction ─────────────────────────────────────────────────────────
  const extractPrompt = `Today is ${today}. These are active/recruiting Phase 2-3 clinical trials for "${q}":

${trialsText}

Extract the most significant DRUG trials — biologics and targeted small molecules only.
Exclude: topical agents, steroids, phototherapy, device trials, dietary supplements, already-approved drugs in routine use.
Focus on: novel mechanisms, biologic or targeted therapy, immune-mediated diseases.

Return ONLY valid JSON:
{
  "condition": "${q}",
  "today": "${today}",
  "trials": [
    {
      "nctId": "NCT...",
      "drugName": "generic drug name being tested",
      "drugClass": "specific class e.g. IL-23 inhibitor, JAK1 inhibitor",
      "sponsor": "company name",
      "phase": "Phase 2 | Phase 2b | Phase 3",
      "trialName": "acronym if known, else brief title shortened",
      "status": "Recruiting | Active, not recruiting",
      "primaryEndpoint": "e.g. EASI-75 at Week 16",
      "estimatedReadout": "YYYY-MM-DD",
      "enrollmentN": 240,
      "rationale": "1 sentence — why this trial is competitively significant",
      "sourceUrl": "https://clinicaltrials.gov/study/NCT..."
    }
  ]
}

Max 15 trials. Sort by estimatedReadout ascending (soonest first).
sourceUrl must be https://clinicaltrials.gov/study/ + nctId (e.g. https://clinicaltrials.gov/study/NCT04995133)
estimatedReadout: use the primary completion date from the data. If only year/month given, use YYYY-MM-01 format.`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5", max_tokens: 3000, temperature: 0,
      messages: [{ role: "user", content: extractPrompt }],
    });

    const text    = msg.content[0].type === "text" ? msg.content[0].text : "{}";
    const cleaned = text.replace(/^```json\n?/i,"").replace(/^```\n?/,"").replace(/```$/,"").trim();

    let parsed: any = { trials: [] };
    try {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch { parsed = { trials: [] }; }

    const result = { ...parsed, condition: q, today, totalFound: rawStudies.length };
    try { await kv.set(cacheKey, result, { ex: 60 * 60 * 24 }); } catch {}
    return NextResponse.json(result);

  } catch (err) {
    console.error("[Watchlist] AI error:", err);
    // Return raw data without AI extraction as fallback
    return NextResponse.json({
      condition: q, today,
      trials: rawStudies.slice(0, 10).map((s: any) => {
        const proto = s.protocolSection ?? {};
        const ident = proto.identificationModule ?? {};
        const status = proto.statusModule ?? {};
        const nctId  = ident.nctId ?? "";
        return {
          nctId,
          drugName:         ident.briefTitle ?? "",
          drugClass:        "",
          sponsor:          proto.sponsorCollaboratorsModule?.leadSponsor?.name ?? "",
          phase:            (proto.designModule?.phases ?? []).join(", "),
          trialName:        ident.briefTitle ?? "",
          status:           status.overallStatus ?? "",
          primaryEndpoint:  proto.outcomesModule?.primaryOutcomes?.[0]?.measure ?? "",
          estimatedReadout: status.primaryCompletionDateStruct?.date ?? "",
          enrollmentN:      proto.designModule?.enrollmentInfo?.count ?? null,
          rationale:        "",
          sourceUrl:        `https://clinicaltrials.gov/study/${nctId}`,
        };
      }),
    });
  }
}
