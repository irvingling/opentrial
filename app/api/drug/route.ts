import { NextRequest, NextResponse } from "next/server";
import { fetchDrugInfo } from "@/lib/fda";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "Drug name is required" },
      { status: 400 }
    );
  }

  try {
    const info = await fetchDrugInfo(name);

    if (info) {
      // Found in one of the databases
      return NextResponse.json({ found: true, ...info });
    }

    // Not found anywhere — drug is likely very experimental
    return NextResponse.json({
      found:   false,
      message: "Not found in FDA, ChEMBL, or PubChem databases.",
    });

  } catch (err) {
    console.error("[API] Drug lookup error:", err);
    return NextResponse.json(
      { error: "Drug lookup failed" },
      { status: 500 }
    );
  }
}