// app/api/vantage/data/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSlideEvidence } from "@/lib/slideData";

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ error: "No query" }, { status: 400 });
  }

  const data = getSlideEvidence(q);

  if (!data) {
    return NextResponse.json({ error: "No data for this condition" }, { status: 404 });
  }

  return NextResponse.json(data);
}