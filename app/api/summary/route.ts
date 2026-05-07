import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const url     = new URL(request.url);
  const q       = url.searchParams.get("q") ?? "";
  const refresh = url.searchParams.get("refresh") === "true";

  if (!q) return NextResponse.json({ error: "No query" }, { status: 400 });

  const cacheKey = `summary:v1:${q.toLowerCase().trim().replace(/\s+/g, "-").slice(0, 100)}`;

  // Check cache unless refresh requested
  if (!refresh) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) {
        console.log("[Summary] Cache hit:", cacheKey);
        return NextResponse.json(cached);
      }
    } catch {
      // Cache miss — continue
    }
  } else {
    console.log("[Summary] Cache bypassed — refresh requested");
  }

  const prompt = `A clinician searched for clinical trials: "${q}"

Return ONLY raw JSON (no markdown, no code fences) with this exact structure:

{
  "tags": [
    { "label": "string", "color": "blue" }
  ],
  "guidelineSummary": {
    "sources": ["string"],
    "keyPoint": "string",
    "recommendations": [
      { "label": "string", "note": "string", "detail": "string", "dotColor": "green" }
    ],
    "statCallout": { "value": "string", "description": "string" }
  },
  "whyTrial": ["string"]
}

Rules:
- tags: 2-4 tags for key concepts (condition, treatment line, mechanism). color must be one of: blue, orange, purple, green, red, gray
- sources: 2-3 real guideline sources e.g. "NCCN 2024", "AAD-NPF 2023", "ESC 2023"
- keyPoint: one sentence, most critical guideline statement for this situation
- recommendations: 2-4 current approved options in order of preference. dotColor must be one of: green, blue, orange, gray, red, purple
- statCallout: one key efficacy stat if relevant, otherwise null
- whyTrial: 3-4 reasons a trial could benefit this specific patient`;

  try {
    const msg = await client.messages.create({
      model:       "claude-sonnet-4-5-20250929",
      max_tokens:  1024,
      temperature: 0,
      messages:    [{ role: "user", content: prompt }],
    });

    const raw  = msg.content[0].type === "text" ? msg.content[0].text : "";
    const text = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(text);

    // Cache for 6 hours
    try {
      await kv.set(cacheKey, parsed, { ex: 60 * 60 * 6 });
      console.log("[Summary] Cached:", cacheKey);
    } catch {
      // Cache write failed — still return result
    }

    return NextResponse.json(parsed);

  } catch (err) {
    console.error("Summary route error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}