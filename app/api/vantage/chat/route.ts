// app/api/vantage/chat/route.ts

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSlideEvidence } from "@/lib/slideData";

type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

function buildApprovedContext(slideData: ReturnType<typeof getSlideEvidence>) {
  if (!slideData) return "No curated data loaded.";

  return slideData.evidence.drugs
    .map((drug: any) => {
      const metricPairs = Object.entries(drug.metrics)
        .filter(([, value]) => typeof value === "number")
        .map(([metric, value]) => `${metric}=${value}%`)
        .join(", ");

      const placeboPairs = Object.entries(drug.placeboMetrics)
        .filter(([, value]) => typeof value === "number")
        .map(([metric, value]) => `${metric} placebo=${value}%`)
        .join(", ");

      const sourceBits = [
        drug.evidenceLevel ? `evidence=${drug.evidenceLevel}` : null,
        drug.numericDisclosure ? `disclosure=${drug.numericDisclosure}` : null,
        drug.backgroundTherapy ? `background=${drug.backgroundTherapy}` : null,
        drug.sourceUrl ? `url=${drug.sourceUrl}` : null,
      ].filter(Boolean);

      return [
        `${drug.name} (${drug.brandName ?? "no brand"}, ${drug.drugClass})`,
        `primaryLabel=${drug.primaryEndpointLabel}`,
        metricPairs || "no numeric metrics",
        placeboPairs || "no placebo metrics",
        sourceBits.join(" | "),
      ].join(" | ");
    })
    .join("\n");
}

function buildEmergingContext(slideData: ReturnType<typeof getSlideEvidence>) {
  if (!slideData) return "No curated emerging data loaded.";

  return slideData.emerging.drugs
    .map((drug: any) => {
      const metricPairs = Object.entries(drug.metrics)
        .filter(([, value]) => typeof value === "number" && value !== -1)
        .map(([metric, value]) => `${metric}=${value}%`)
        .join(", ");

      const placeboPairs = Object.entries(drug.placeboMetrics)
        .filter(([, value]) => typeof value === "number")
        .map(([metric, value]) => `${metric} placebo=${value}%`)
        .join(", ");

      const sourceBits = [
        drug.evidenceLevel ? `evidence=${drug.evidenceLevel}` : null,
        drug.numericDisclosure ? `disclosure=${drug.numericDisclosure}` : null,
        drug.backgroundTherapy ? `background=${drug.backgroundTherapy}` : null,
        drug.sourceUrl ? `url=${drug.sourceUrl}` : null,
      ].filter(Boolean);

      return [
        `${drug.drugName} (${drug.drugClass}, ${drug.phase})`,
        `endpoint=${drug.endpoint}`,
        metricPairs || "numeric rates not fully disclosed",
        placeboPairs || "no placebo values disclosed",
        sourceBits.join(" | "),
      ].join(" | ");
    })
    .join("\n");
}

function buildTerminatedContext(slideData: ReturnType<typeof getSlideEvidence>) {
  if (!slideData) return "No terminated-program data loaded.";

  return slideData.emerging.terminated
    .map((drug: any) => {
      const sourceBits = [
        drug.evidenceLevel ? `evidence=${drug.evidenceLevel}` : null,
        drug.numericDisclosure ? `disclosure=${drug.numericDisclosure}` : null,
        drug.sourceUrl ? `url=${drug.sourceUrl}` : null,
      ].filter(Boolean);

      return [
        `${drug.drugName} (${drug.drugClass}, ${drug.phase})`,
        `reason=${drug.reason}`,
        `outcome=${drug.outcome}`,
        sourceBits.join(" | "),
      ].join(" | ");
    })
    .join("\n");
}

export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const body = await request.json();
  const {
    message,
    condition,
    currentFilter,
    history = [],
  }: {
    message?: string;
    condition?: string;
    currentFilter?: unknown;
    history?: ChatHistoryItem[];
  } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "No message" }, { status: 400 });
  }

  const slideData = condition ? getSlideEvidence(condition) : null;

  const approvedContext = buildApprovedContext(slideData);
  const emergingContext = buildEmergingContext(slideData);
  const terminatedContext = buildTerminatedContext(slideData);

  const systemPrompt = `
You are Vantage, an AI assistant for a clinical drug landscape tool.

You MUST follow these rules:
1. Only use facts present in the curated context below.
2. Do not invent efficacy, safety, comparator, placebo, or timepoint values.
3. Do not rank drugs unless they are directly comparable on the same endpoint and timepoint.
4. Never compare different endpoints as if they are equivalent.
5. If emerging data are partial, press-release-only, or missing placebo/raw values, say that clearly.
6. If a source URL is present in the context, mention that a source link is available.
7. Keep answers short and concrete.
8. If the user asks to show, filter, or highlight drugs, return a chartUpdate object.
9. If a question cannot be answered from the curated context, say so plainly.

Current filter:
${JSON.stringify(currentFilter ?? "showing all drugs")}

Approved data:
${approvedContext}

Emerging data:
${emergingContext}

Terminated programs:
${terminatedContext}

Return ONLY valid JSON in this shape:
{
  "text": "short answer grounded only in provided data",
  "chartUpdate": {
    "highlightedDrugs": ["drug names"] | null,
    "showTerminated": true | false | null,
    "activeMetric": "metric name" | null,
    "filterDescription": "short description" | null
  } | null
}
`.trim();

  const messages = [
    ...history.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    { role: "user" as const, content: message.trim() },
  ];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      temperature: 0,
      system: systemPrompt,
      messages,
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        text: "I could not safely format a structured response from the curated data.",
        chartUpdate: null,
      });
    }
  } catch (error) {
    console.error("[Vantage Chat] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}