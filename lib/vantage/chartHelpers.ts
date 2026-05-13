// lib/vantage/chartHelpers.ts
// Pure functions that convert DrugReference objects into ChartEntry objects
// for bar chart rendering. No React — safe to import anywhere.

import { DrugReference, ChartEntry } from "./types";
import { getColor } from "./colors";

// ── Monotherapy / standard path ───────────────────────────────────────────────

export function drugRefToEntry(
  d: DrugReference,
  selectedEndpoint: string
): ChartEntry {
  // Delta-only drug on a mismatched endpoint — return a null-value entry
  if (d.isDeltaOnly && d.primaryMetric && selectedEndpoint !== d.primaryMetric) {
    return {
      drug: d.name, treatment: null, placebo: null,
      color: getColor(d.drugClass), drugClass: d.drugClass ?? "",
      timepoint: d.timepoint ?? "TBD", notDisclosed: false,
      isDeltaOnly: true, isHighlighted: true,
      sourceUrl: null, rawData: d, isEmerging: true,
    };
  }

  let treatment: number | null = null;
  let notDisclosed = false;

  if (d.metrics && selectedEndpoint) {
    const raw = d.metrics[selectedEndpoint];
    if      (raw === undefined) treatment = d.tier === "approved" ? d.metricValue : null;
    else if (raw === null)      treatment = null;
    else if (raw === -1)        { treatment = null; notDisclosed = true; }
    else                        treatment = raw;
  } else {
    treatment = d.metricValue;
  }

  let placebo: number | null = null;
  if (d.placeboMetrics && selectedEndpoint) {
    const rawPbo = d.placeboMetrics[selectedEndpoint];
    placebo = rawPbo === undefined ? d.placeboValue : rawPbo;
  } else {
    placebo = d.placeboValue;
  }

  return {
    drug: d.name, treatment, placebo,
    color: getColor(d.drugClass), drugClass: d.drugClass ?? "",
    timepoint: d.timepoint ?? "TBD",
    notDisclosed,
    isDeltaOnly: d.isDeltaOnly ?? false,
    isHighlighted: true,
    sourceUrl: d.sourceUrl ?? null,
    rawData: d,
    isEmerging: d.tier !== "approved",
  };
}

// ── TCS concomitant path ──────────────────────────────────────────────────────
// Returns null when no TCS data exists for the drug — callers filter these out
// so only drugs with actual published concomitant-TCS data appear in TCS mode.
//
// Approved drugs: reads deckConcomitantTcsDeltas from trials[].
// Emerging drugs: reads tcsStudy.deckConcomitantTcsDeltas at the top level.

export function drugRefToTcsEntry(
  d: DrugReference,
  rawApproved: any[],
  rawEmerging: any[],
  selectedEndpoint: string
): ChartEntry | null {
  const allRaw = [...rawApproved, ...rawEmerging];
  const raw = allRaw.find(
    (r: any) => r.name?.toLowerCase() === d.name.toLowerCase()
  );
  if (!raw) return null;

  // Approved path
  const tcsTrial = (raw.trials ?? []).find(
    (t: any) =>
      t.deckConcomitantTcsDeltas &&
      Object.keys(t.deckConcomitantTcsDeltas).length > 0
  );

  // Emerging path
  const emergingTcsDeltas: Record<string, number> | null =
    raw.deckConcomitantTcsDeltas ??
    raw.tcsStudy?.deckConcomitantTcsDeltas ??
    null;

  if (!tcsTrial && !emergingTcsDeltas) return null;

  const deltas: Record<string, number> = tcsTrial
    ? (tcsTrial.deckConcomitantTcsDeltas as Record<string, number>)
    : (emergingTcsDeltas as Record<string, number>);

  const timepointLabel =
    tcsTrial?.timepoint ?? raw.tcsStudy?.timepoint ?? "Week 16";
  const studySuffix = tcsTrial
    ? " + TCS"
    : ` (${raw.tcsStudy?.study ?? "TCS study"})`;

  // Loose endpoint match — handles multi-dose keys like "EASI-75 15 mg"
  const epNorm = selectedEndpoint.toLowerCase().replace(/[\s-]/g, "");
  const matchingVals = Object.entries(deltas)
    .filter(([k]) => k.toLowerCase().replace(/[\s-]/g, "").includes(epNorm))
    .map(([, v]) => v)
    .filter((v): v is number => typeof v === "number");

  if (matchingVals.length === 0) return null;

  return {
    drug: d.name,
    treatment: Math.max(...matchingVals), // highest dose delta
    placebo: null,
    color: getColor(d.drugClass),
    drugClass: d.drugClass ?? "",
    timepoint: `${timepointLabel}${studySuffix}`,
    notDisclosed: false,
    isDeltaOnly: true,
    isHighlighted: true,
    sourceUrl: d.sourceUrl ?? null,
    rawData: d,
    isEmerging: d.tier !== "approved",
  };
}
