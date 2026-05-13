// lib/slideData/types.ts

export type ConfidenceLevel = "high" | "medium" | "low";
export type EvidenceLevel =
  | "fda_label"
  | "peer_reviewed"
  | "medical_meeting"
  | "press_release"
  | "company_pipeline"
  | "registry"
  | "internal_deck";

export type NumericDisclosure =
  | "full"
  | "partial"
  | "delta_only"
  | "none";

export type ComparatorType =
  | "placebo"
  | "active"
  | "placebo_and_active"
  | "single_arm"
  | "unknown";

export type BackgroundTherapy =
  | "monotherapy"
  | "topical_background"
  | "systemic_background"
  | "mixed"
  | "unknown";

export interface SlideTimepoint {
  week: number;
  value: number;
  placeboValue: number | null;
}

export interface SlideTrialData {
  name: string;
  phase: string;
  n: number;
  comparator: string;
  comparatorType?: ComparatorType;
  primaryEndpoint: string;
  result: number;
  placeboResult: number | null;
  allMetrics: Record<string, number | null>;
  allPlaceboMetrics: Record<string, number | null>;
  timepoint: string;
  publication: string;
  year: number;
  pubmedId?: string | null;
  sourceUrl?: string | null;
  evidenceLevel?: EvidenceLevel;
  numericDisclosure?: NumericDisclosure;
  backgroundTherapy?: BackgroundTherapy;
  comparabilityGroup?: string | null;
  timepoints?: SlideTimepoint[];
}

export interface SlideDrugData {
  name: string;
  brandName: string | null;
  drugClass: string;
  mechanism: string;
  approvalYear: number;
  approvedIndication: string;
  primaryEndpointLabel: string;
  overallResult: number;
  biologicExperiencedResult: number | null;
  metrics: Record<string, number | null>;
  placeboMetrics: Record<string, number | null>;
  trials: SlideTrialData[];
  keyMessage: string;
  confidence: ConfidenceLevel;
  safetyBullets: string[];
  sourceUrl?: string | null;
  evidenceLevel?: EvidenceLevel;
  numericDisclosure?: NumericDisclosure;
  backgroundTherapy?: BackgroundTherapy;
  comparabilityGroup?: string | null;
}

export interface SlideEvidenceData {
  condition: string;
  treatmentContext: string;
  primaryMetric: string;
  availableMetrics: string[];
  drugs: SlideDrugData[];
  clinicalSummary: string;
  evidenceNote: string;
}

export interface SlideEmergingDrug {
  drugName: string;
  drugClass: string;
  phase: string;
  mechanism: string;
  keyResult: string;
  endpoint: string;
  trialName: string | null;
  n: number | null;
  comparator: string | null;
  comparatorType?: ComparatorType;
  source: string;
  sourceUrl?: string | null;
  pubmedId: string | null;
  confidence: "high" | "medium";
  confidenceReason: string;
  sponsorNote: string | null;
  metrics: Record<string, number | null>;
  placeboMetrics: Record<string, number | null>;
  primaryMetricValue: number | null;
  evidenceLevel?: EvidenceLevel;
  numericDisclosure?: NumericDisclosure;
  backgroundTherapy?: BackgroundTherapy;
  comparabilityGroup?: string | null;
  timepoint?: string | null;
  timepoints?: SlideTimepoint[];
  safetyBullets?: string[];
}

export interface SlideTerminatedDrug {
  drugName: string;
  drugClass: string;
  mechanism: string;
  phase: string;
  reason: "Safety" | "Efficacy failure" | "Business decision" | "Partial response";
  trialName: string | null;
  whatWasTested: string;
  outcome: string;
  year: string | null;
  source: string;
  sourceUrl?: string | null;
  clinicalInsight: string;
  lastKnownMetrics?: Record<string, number | null>;
  lastKnownPlaceboMetrics?: Record<string, number | null>;
  lastKnownTimepoint?: string;
  evidenceLevel?: EvidenceLevel;
  numericDisclosure?: NumericDisclosure;
}

export interface SlideEmergingData {
  condition: string;
  lastUpdated: string;
  drugs: SlideEmergingDrug[];
  terminated: SlideTerminatedDrug[];
  evidenceSummary: string;
  dataNote: string;
}

export interface SlideConditionData {
  evidence: SlideEvidenceData;
  emerging: SlideEmergingData;
}