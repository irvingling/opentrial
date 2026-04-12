import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const nctId =
    request.nextUrl.searchParams.get("id") ?? "NCT04280705";
  const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();

  return NextResponse.json({
    status: res.status,
    ok: res.ok,
    url,
    preview: text.slice(0, 500),
  });
}
