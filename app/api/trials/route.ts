import { NextResponse } from "next/server";

function guessMechanism(
  interventions: Array<{ name?: string; type?: string }> = []
) {
  const text = interventions
    .map((item) => `${item.name ?? ""} ${item.type ?? ""}`)
    .join(" ")
    .toLowerCase();

  if (text.includes("tyk2")) return "TYK2";
  if (text.includes("il-23")) return "IL-23";
  if (text.includes("il-17")) return "IL-17";
  if (text.includes("tnf")) return "TNF";
  if (text.includes("jak")) return "JAK";

  return "Other";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q") || "psoriasis";
    const query = rawQuery.trim();

    if (!query) {
      return NextResponse.json({
        query: "",
        count: 0,
        trials: [],
      });
    }

    const url =
      `https://clinicaltrials.gov/api/v2/studies` +
      `?query.term=${encodeURIComponent(query)}` +
      `&pageSize=20` +
      `&format=json`;

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        {
          error: `ClinicalTrials.gov returned ${response.status}`,
          details: text,
          attemptedUrl: url,
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const studies = data?.studies ?? [];

    const trials = studies.map((study: any) => {
      const protocol = study?.protocolSection ?? {};

      const id =
        protocol?.identificationModule?.nctId ?? crypto.randomUUID();

      const title =
        protocol?.identificationModule?.briefTitle ?? "Untitled trial";

      const status =
        protocol?.statusModule?.overallStatus ?? "Unknown";

      const phase =
        protocol?.designModule?.phases?.join(", ") ?? "Unspecified";

      const interventions =
        protocol?.armsInterventionsModule?.interventions ?? [];

      const summary =
        protocol?.descriptionModule?.briefSummary ?? "No summary available.";

      return {
        id,
        title,
        phase,
        status,
        mechanism: guessMechanism(interventions),
        summary,
      };
    });

    return NextResponse.json({
      query,
      count: trials.length,
      trials,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch trials",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
