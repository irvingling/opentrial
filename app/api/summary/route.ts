import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (!q) return NextResponse.json({ error: "No query" }, { status: 400 });

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
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
const text = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
return NextResponse.json(JSON.parse(text));
  } catch (err) {
    console.error("Summary route error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}