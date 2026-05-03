import { kv } from "@vercel/kv";
import Anthropic from "@anthropic-ai/sdk";
import { isRealDrugName } from "@/lib/isDrugName";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── Detect compound codes ─────────────────────────────────────────────────────
export function isCompoundCode(name: string): boolean {
  return /^[A-Z]{2,}[-]?\d{3,}/i.test(name.trim());
}

// ── Resolved drug info ────────────────────────────────────────────────────────
export interface ResolvedDrug {
  originalName:      string;
  commonName:        string | null;
  mechanismOfAction: string | null;
  drugClass:         string | null;
  summary:           string | null;
  confidence:        "high" | "medium" | "low" | "none";
}

// ── Search ClinicalTrials with full context ───────────────────────────────────
// Returns data + conditions + titles so Claude can correctly identify the drug
async function searchCTForCompound(name: string): Promise<{
  data:       string;
  conditions: string[];
  titles:     string[];
}> {
  try {
    const url =
      `https://clinicaltrials.gov/api/v2/studies` +
      `?query.intr=${encodeURIComponent(name)}` +
      `&pageSize=5&format=json`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { data: "", conditions: [], titles: [] };

    const json    = await res.json();
    const studies = json.studies ?? [];

    const conditions: string[] = [];
    const titles:     string[] = [];

    const data = studies.map((s: any) => {
      const ps    = s.protocolSection;
      const title = ps.identificationModule?.briefTitle ?? "";
      const sum   = ps.descriptionModule?.briefSummary?.slice(0, 400) ?? "";
      const conds = ps.conditionsModule?.conditions ?? [];
      const intv  = (ps.armsInterventionsModule?.interventions ?? [])
        .find((i: any) =>
          i.name?.toLowerCase().includes(name.toLowerCase())
        );

      titles.push(title);
      conditions.push(...conds);

      return [
        `Trial title: ${title}`,
        `Conditions treated: ${conds.join(", ")}`,
        `Summary: ${sum}`,
        intv?.description
          ? `Intervention description: ${intv.description.slice(0, 400)}`
          : "",
      ].filter(Boolean).join("\n");
    }).join("\n\n---\n\n");

    return {
      data,
      conditions: [...new Set(conditions)],
      titles,
    };
  } catch {
    return { data: "", conditions: [], titles: [] };
  }
}

// ── Resolve a single drug name ────────────────────────────────────────────────
export async function resolveDrug(name: string): Promise<ResolvedDrug> {
  const cacheKey = `drug:resolved:v2:${name.toLowerCase().trim()}`;

  // Check cache first
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return cached as ResolvedDrug;
  } catch {}

  const { data: clinicalData, conditions, titles } =
    await searchCTForCompound(name);

  try {
    // Build context string that explicitly tells Claude what disease this
    // compound is being studied in — prevents misidentification
    const conditionContext = conditions.length > 0
      ? `IMPORTANT CONTEXT: This compound "${name}" appears in clinical trials treating: ${conditions.join(", ")}.
Trial titles: ${titles.slice(0, 3).join("; ")}.
Use this disease context to correctly identify the drug — do NOT confuse with other compounds that have similar codes.`
      : "";

    const prompt = `You are a clinical pharmacologist identifying a drug compound.

Compound: "${name}"

${conditionContext}

${clinicalData
  ? `Real data from ClinicalTrials.gov:\n${clinicalData}`
  : "No ClinicalTrials.gov data found. Use training knowledge only."
}

Based on the disease context and trial data above, identify this specific compound.

For example:
- JNJ-77242113 appears in PSORIASIS trials → it is icotrokinra, an oral IL-23 receptor antagonist
- TAK-279 appears in PSORIASIS trials → it is zasocitinib, a TYK2 inhibitor
- Do NOT confuse with other compounds that have similar alphanumeric codes

Return ONLY valid JSON, no markdown:
{
  "commonName": "The INN/generic name if known e.g. icotrokinra, null if unknown",
  "mechanismOfAction": "Specific mechanism based on the disease context and data e.g. oral IL-23 receptor antagonist peptide. 1-2 sentences. null if unknown",
  "drugClass": "Specific class e.g. Oral IL-23 receptor antagonist. null if unknown",
  "summary": "1 sentence: what this drug is and what condition it treats. null if unknown",
  "confidence": "high if clearly identified from data, medium if partially known, low if uncertain, none if unknown"
}`;

    const message = await anthropic.messages.create({
      model:       "claude-sonnet-4-5-20250929",
      max_tokens:  512,
      temperature: 0,
      messages:    [{ role: "user", content: prompt }],
    });

    const text    = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text
      .replace(/^```json\n?/i, "")
      .replace(/^```\n?/, "")
      .replace(/```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    const result: ResolvedDrug = {
      originalName:      name,
      commonName:        parsed.commonName        ?? null,
      mechanismOfAction: parsed.mechanismOfAction ?? null,
      drugClass:         parsed.drugClass         ?? null,
      summary:           parsed.summary           ?? null,
      confidence:        parsed.confidence        ?? "none",
    };

    // Cache for 30 days
    try {
      await kv.set(cacheKey, result, { ex: 60 * 60 * 24 * 30 });
    } catch {}

    return result;

  } catch {
    return {
      originalName:      name,
      commonName:        null,
      mechanismOfAction: null,
      drugClass:         null,
      summary:           null,
      confidence:        "none",
    };
  }
}

// ── Resolve all interventions in a trial ──────────────────────────────────────
export async function resolveTrialDrugs(
  interventions: Array<{ name: string; description?: string }>
): Promise<string> {
  const resolved = await Promise.allSettled(
    interventions.map(async (inv) => {
      if (!isRealDrugName(inv.name)) {
        return inv.name;
      }

      if (isCompoundCode(inv.name)) {
        const info = await resolveDrug(inv.name);
        return formatResolvedDrug(inv.name, info, inv.description);
      }

      return `${inv.name}${
        inv.description ? `: ${inv.description.slice(0, 200)}` : ""
      }`;
    })
  );

  return resolved
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value)
    .join("\n");
}

// ── Format resolved drug for Claude context ───────────────────────────────────
function formatResolvedDrug(
  code:         string,
  info:         ResolvedDrug,
  description?: string
): string {
  const parts = [code];

  if (info.commonName) {
    parts.push(`(also known as: ${info.commonName})`);
  }
  if (info.drugClass) {
    parts.push(`Class: ${info.drugClass}`);
  }
  if (info.mechanismOfAction) {
    parts.push(`Mechanism: ${info.mechanismOfAction}`);
  }
  if (description) {
    parts.push(`Trial description: ${description.slice(0, 200)}`);
  }

  return parts.join(" · ");
}