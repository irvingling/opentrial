import atopicDermatitis from "./atopicDermatitis";
import psoriasis from "./psoriasis";

const CONDITION_MAP: Array<{ data: any; keywords: string[] }> = [
  {
    data: atopicDermatitis,
    keywords: [
      "atopic dermatitis", "atopic", "eczema", "ad", "atd",
      "easi", "dupixent", "dupilumab", "abrocitinib",
      "upadacitinib", "lebrikizumab", "tralokinumab",
      "baricitinib", "nemolizumab", "amlitelimab",
      "pp-nrs", "wp-nrs", "pruritus", "tilrekimig", "ompekimig",
      "galvokimig", "zumilokibart", "soquelitinib",
      "cibinqo", "rinvoq", "ebglyss", "adbry", "adtralza",
      "olumiant", "nemluvio", "rocatinlimab",
      "afimkibart", "rg6299", "apg279", "apg777",
      "ox40", "ox40l", "il-33", "tslp", "il-31", "il-31ra",
      "il-13", "il-4", "il-4r", "jak1", "jak", "pfizer", "tilrekimig", "pf-07275315", "ompekimig", "pf-07264660", "pfizer trispecific", "il-4 il-13 tslp", "trispecific",
    ],
  },
  {
    data: psoriasis,
    keywords: [
      "psoriasis", "pso", "plaque", "pasi",
      "skyrizi", "risankizumab", "guselkumab",
      "tildrakizumab", "bimekizumab", "secukinumab",
      "ixekizumab", "deucravacitinib", "ustekinumab",
      "apremilast", "brodalumab", "icotrokinra", "icotyde",
      "cosentyx", "taltz", "tremfya", "ilumya", "bimzelx",
      "stelara", "sotyktu", "otezla", "siliq",
      "oruka", "orka", "zasocitinib", "envudeucitinib",
      "il-17", "il-23", "tyk2", "il-12/23", "il-23r", "dc-806",
    ],
  },
];

// ── Endpoint key normalisation ────────────────────────────────────────────────
// Maps any variant endpoint key → canonical name used in the UI

const ENDPOINT_PATTERNS: Array<[RegExp, string]> = [
  [/pasi[-\s]?75/i,  "PASI 75"],
  [/pasi[-\s]?90/i,  "PASI 90"],
  [/pasi[-\s]?100/i, "PASI 100"],
  [/easi[-\s]?75/i,  "EASI-75"],
  [/easi[-\s]?90/i,  "EASI-90"],
  [/easi[-\s]?100/i, "EASI-100"],
  // IGA / vIGA-AD 0/1
  [/v?iga[-\s]?(?:ad[-\s]?)?0\/1/i, "IGA 0/1"],
  // PP-NRS / WP-NRS / Pruritus NRS / Itch NRS / Worst Daily Pruritus
  [/[pw]p[-\s]?nrs|pruritus[-\s]+nrs|itch[-\s]+nrs|worst[-\s]+daily[-\s]+pruritus/i, "PP-NRS ≥4"],
];

function getEndpointKey(key: string): string | null {
  for (const [pattern, name] of ENDPOINT_PATTERNS) {
    if (pattern.test(key)) return name;
  }
  return null;
}

function isPlaceboKey(key: string): boolean {
  const k = key.toLowerCase();
  // "placebo" in the key but NOT "placebo-adjusted" (those are deltas)
  return k.includes("placebo") && !k.includes("adjusted");
}

function isDeltaKey(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k.includes("placebo-adjusted") ||
    k.includes("placebo adjusted") ||
    k.includes("percent decrease") ||
    k.includes(" delta") ||
    k.includes("adjusted")
  );
}

/** Parse any raw metrics object into normalised endpoint → value maps. */
function parseMetrics(raw: Record<string, any> | null | undefined): {
  metrics: Record<string, number | null>;
  placeboMetrics: Record<string, number | null>;
} {
  const metrics: Record<string, number | null> = {};
  const placeboMetrics: Record<string, number | null> = {};
  const deltaMetrics: Record<string, number | null> = {};

  if (!raw) return { metrics, placeboMetrics };

  for (const [key, val] of Object.entries(raw)) {
    if (typeof val !== "number") continue;
    const ep = getEndpointKey(key);
    if (!ep) continue;

    if (isDeltaKey(key)) {
      // Store delta separately — will be used to derive placebo below
      deltaMetrics[ep] = val;
    } else if (isPlaceboKey(key)) {
      if (!(ep in placeboMetrics) || val < (placeboMetrics[ep] ?? Infinity)) {
        placeboMetrics[ep] = val;
      }
    } else {
      // Treatment value — keep highest when same key appears in multiple doses
      if (!(ep in metrics) || val > (metrics[ep] ?? -Infinity)) {
        metrics[ep] = val;
      }
    }
  }

  // Derive placebo = treatment − delta when explicit placebo is missing
  for (const [ep, delta] of Object.entries(deltaMetrics)) {
    if (delta === null) continue;
    if (!(ep in placeboMetrics) && ep in metrics && metrics[ep] !== null) {
      const derived = Math.round(((metrics[ep] ?? 0) - delta) * 10) / 10;
      if (derived >= 0) placeboMetrics[ep] = derived;
    }
  }

  return { metrics, placeboMetrics };
}

// ── Terminated drug detection ─────────────────────────────────────────────────

const TERMINATED_PATTERNS = [
  "discontinued", "terminated", "withdrew",
  "discontinue", "program terminated",
];

function isTerminatedDrug(drug: any): boolean {
  const status = (drug.status ?? "").toLowerCase();
  return TERMINATED_PATTERNS.some((k) => status.includes(k));
}

// ── Normalise approved drug ───────────────────────────────────────────────────

function normalizeApprovedDrug(drug: any): any {
  const { metrics } = parseMetrics(drug.metrics);

  // Find the monotherapy trial for placebo reference
  const allTrials: any[] = Array.from((drug.trials ?? []) as any[]);
  const monoTrial =
    allTrials.find(
      (t: any) =>
        !(t.backgroundTherapy ?? "").toLowerCase().includes("tcs") &&
        !(t.comparator ?? "").toLowerCase().includes("tcs")
    ) ?? allTrials[0];

  // Try to find the trial whose allMetrics match drug.metrics (correct placebo pairing)
  const firstMetricKey = Object.keys(drug.metrics ?? {})[0];
  const normalizedFirstKey = firstMetricKey ? getEndpointKey(firstMetricKey) : null;
  const representativeTrial =
    normalizedFirstKey
      ? allTrials.find((t: any) => {
          const { metrics: trialMetrics } = parseMetrics(t.allMetrics);
          return trialMetrics[normalizedFirstKey] === metrics[normalizedFirstKey];
        }) ?? monoTrial
      : monoTrial;

  const { metrics: placeboMetrics } = parseMetrics(
    representativeTrial?.allPlaceboMetrics ?? monoTrial?.allPlaceboMetrics
  );

  return {
    ...drug,
    metrics:        Object.keys(metrics).length        > 0 ? metrics        : null,
    placeboMetrics: Object.keys(placeboMetrics).length > 0 ? placeboMetrics : null,
  };
}

// ── Normalise emerging drug ───────────────────────────────────────────────────

function normalizeEmergingDrug(drug: any): any {
  // ── Case 1: delta-only (tilrekimig) — only placebo-adjusted deltas known ──
  if (drug.placeboAdjustedDeltaMetrics) {
    const deltas = drug.placeboAdjustedDeltaMetrics as Record<string, number>;

    const doses = Object.entries(deltas).map(([key, val]) => {
      const doseLabel = key
        .replace(/easi-75\s*/i, "")
        .replace(/\s*week\s*\d+/i, "")
        .trim();
      const label = doseLabel.charAt(0).toUpperCase() + doseLabel.slice(1);
      return {
        dose:       `${label} dose (monthly)`,
        metric:     "EASI-75",
        value:      null as number | null,
        deltaValue: val,
        timepoint:  "Week 16",
        note:       `Δ${val}% vs placebo — absolute rate not disclosed`,
        source:     (drug.sourceNotes as string[] | undefined)?.[0] ?? "",
      };
    });

    // Use the HIGHEST delta as the bar value
    const easi75Vals = Object.entries(deltas)
      .filter(([k]) => /easi[-\s]?75/i.test(k))
      .map(([, v]) => v)
      .filter((v): v is number => typeof v === "number");
    const maxDelta = easi75Vals.length > 0 ? Math.max(...easi75Vals) : null;

    return {
      ...drug,
      tier:               "emerging",
      primaryMetric:      "EASI-75",
      primaryMetricValue: maxDelta,
      placeboValue:       null,
      // Use real value not -1 sentinel — displayed with Δ prefix in UI
      metrics:            maxDelta !== null ? { "EASI-75": maxDelta } : null,
      placeboMetrics:     null,
      isDeltaOnly:        true,
      numericDisclosure:  "delta_only",
      doses,
    };
  }

// ── Case 2: has a metrics object ─────────────────────────────────────────
  if (drug.metrics) {
    const { metrics, placeboMetrics: derivedPlacebo } = parseMetrics(drug.metrics);

    // Also parse the explicit placeboMetrics field (e.g. ORKA-001 in psoriasis.ts)
   const directPlacebo: Record<string, number | null> = {};
    const rawPboField = drug.placeboMetrics as Record<string, any> | null | undefined;
    if (rawPboField && typeof rawPboField === "object" && !Array.isArray(rawPboField)) {
      for (const [key, val] of Object.entries(rawPboField)) {
        const ep = getEndpointKey(key);
        if (!ep) continue;
        if (typeof val === "number") directPlacebo[ep] = val;
        else if (val === null)       directPlacebo[ep] = null;
      }
    }
    const placeboMetrics = Object.keys(directPlacebo).length > 0 ? directPlacebo : derivedPlacebo;

    const preferredOrder = [
      "EASI-75", "EASI-90", "IGA 0/1", "PP-NRS ≥4",
      "PASI 90", "PASI 100", "PASI 75",
    ];
    const primaryEp =
      preferredOrder.find((ep) => ep in metrics && metrics[ep] !== null) ??
      Object.keys(metrics).find((k) => metrics[k] !== null) ??
      null;
    const primaryVal = primaryEp ? (metrics[primaryEp] ?? null) : null;
    const pboVal     = primaryEp ? (placeboMetrics[primaryEp] ?? null) : null;

    return {
      ...drug,
      tier:               "emerging",
      primaryMetric:      primaryEp,
      primaryMetricValue: primaryVal,
      placeboValue:       pboVal,
      metrics:            Object.keys(metrics).length        > 0 ? metrics        : null,
      placeboMetrics:     Object.keys(placeboMetrics).length > 0 ? placeboMetrics : null,
      isDeltaOnly:        false,
      doses:              drug.doses ?? null,
    };
  }

  // ── Case 3: no numeric data yet ────────────────────────────────────────────
  return {
    ...drug,
    tier:               "emerging",
    primaryMetric:      null,
    primaryMetricValue: null,
    placeboValue:       null,
    metrics:            null,
    placeboMetrics:     null,
    isDeltaOnly:        false,
    doses:              drug.doses ?? null,
  };
}

// ── normalizeSlideData ────────────────────────────────────────────────────────

function normalizeSlideData(raw: any): any {
  if (!raw) return null;

  // Already in nested format — return as-is
  if (raw.evidence && raw.emerging && !Array.isArray(raw.emerging)) {
    return raw;
  }

  const rawDrugs: any[]    = Array.from((raw.drugs    ?? []) as any[]);
  const rawEmerging: any[] = Array.from((raw.emerging ?? []) as any[]);

  const emergingActive     = rawEmerging.filter((e) => !isTerminatedDrug(e));
  const emergingTerminated = rawEmerging.filter((e) =>  isTerminatedDrug(e));

  return {
    condition: raw.condition,
    evidence: {
      condition:       raw.condition,
      drugs:           rawDrugs.map(normalizeApprovedDrug),
      primaryEndpoints: Array.from(
        (raw.primaryEndpoints as any[] | undefined) ?? []
      ),
    },
    emerging: {
      drugs:      emergingActive.map(normalizeEmergingDrug),
      terminated: emergingTerminated.map(normalizeEmergingDrug),
    },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getSlideEvidence(query: string): any | null {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  for (const entry of CONDITION_MAP) {
    if (entry.keywords.some((k: string) => q.includes(k.toLowerCase()))) {
      return normalizeSlideData(entry.data as any);
    }
  }
  return null;
}

export { getSlideEvidence as getSlideEmerging };