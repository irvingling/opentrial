import { NextRequest, NextResponse } from "next/server";
import { fetchTrial, ClinicalTrialsAPIError } from "@/lib/clinicaltrials";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ nctId: string }> }
) {
  const { nctId } = await params;

  if (!nctId) {
    return NextResponse.json(
      { error: "NCT ID is required" },
      { status: 400 }
    );
  }

  try {
    const trial = await fetchTrial(nctId);
    return NextResponse.json(trial);
  } catch (err) {
    console.error(`[API] /api/trials/${nctId} error:`, err);

    if (err instanceof ClinicalTrialsAPIError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode ?? 500 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error loading trial" },
      { status: 500 }
    );
  }
}