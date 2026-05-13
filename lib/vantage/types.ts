// lib/vantage/types.ts

export interface PosEstimate {
  tier: "High" | "Medium" | "Low" | "Insufficient data";
  riskFactors: string[];  // 2–4 bullet points explaining the assessment
}

export interface DrugReference {
  name: string;
  brandName?: string | null;
  drugClass: string;
  mechanism: string;
  tier: "approved" | "emerging" | "terminated";
  metricLabel: string;
  metricValue: number | null;
  placeboValue: number | null;
  metrics?: Record<string, number | null> | null;
  placeboMetrics?: Record<string, number | null> | null;
  timepoint: string | null;
  comparator?: string | null;
  source: string | null;
  sourceUrl: string | null;
  evidenceLevel?: string | null;
  numericDisclosure?: string | null;
  backgroundTherapy?: string | null;
  safetyBullets: string[];
  keyMessage: string | null;
  isDeltaOnly?: boolean;
  primaryMetric?: string | null;
  doses?: Array<{
    dose: string;
    metric: string;
    value: number | null;
    deltaValue?: number | null;
    timepoint: string;
    note?: string;
    source?: string;
  }> | null;
  posEstimate?: PosEstimate | null;  // only set for emerging drugs
  trials?: Array<{
    name: string;
    phase: string;
    n?: number | null;
    comparator?: string | null;
    timepoint?: string | null;
    allMetrics?: Record<string, number | null> | null;
    allPlaceboMetrics?: Record<string, number | null> | null;
  }> | null;
}

export interface ChartEntry {
  drug: string;
  treatment: number | null;
  placebo: number | null;
  color: string;
  drugClass: string;
  timepoint: string;
  notDisclosed: boolean;
  isDeltaOnly?: boolean;
  isHighlighted: boolean;
  sourceUrl?: string | null;
  rawData?: DrugReference;
  isEmerging?: boolean;
}

export interface TimelineEvent {
  name: string;
  brandName?: string | null;
  drugClass: string;
  tier: "approved" | "emerging";
  year: number;
  label: string;
  color: string;
  sourceUrl?: string | null;
}

export type ViewMode = "absolute" | "adjusted";
export type ChartView = "bar" | "line";
export type TcsMode  = "mono" | "tcs";
export type MainTab  = "efficacy" | "timeline";