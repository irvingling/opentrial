import { NextRequest, NextResponse } from "next/server";
import { searchTrials, ClinicalTrialsAPIError } from "@/lib/clinicaltrials";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const q = sp.get("q") ?? "";
  const condition = sp.get("condition") ?? undefined;
  const intervention = sp.get("intervention") ?? undefined;
  const pageSize = parseInt(sp.get("pageSize") ?? "10", 10);
  const pageToken = sp.get("pageToken") ?? undefined;
  const status = sp.get("status")?.split(",").filter(Boolean);
  const phase = sp.get("phase")?.split(",").filter(Boolean);

  if (!q && !condition && !intervention) {
    return NextResponse.json(
      { error: "At least one of q, condition, or intervention is required" },
      { status: 400 }
    );
  }

  try {
    const results = await searchTrials(q, {
      pageSize,
      pageToken,
      status,
      phase,
      condition,
      intervention,
    });
    return NextResponse.json(results);
  } catch (err) {
    console.error("[API] /api/trials search error:", err);

    if (err instanceof ClinicalTrialsAPIError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode ?? 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to search trials" },
      { status: 500 }
    );
  }
}
