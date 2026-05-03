"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ── Drug class colors ─────────────────────────────────────────────────────────
const CLASS_COLORS: Record<string, string> = {
  "il-23":          "#3b82f6",
  "il-17":          "#10b981",
  "il-12":          "#8b5cf6",
  "il-4":           "#ec4899",
  "il-13":          "#ec4899",
  "il-6":           "#06b6d4",
  "il-1":           "#0891b2",
  "il-2":           "#0284c7",
  "il-5":           "#7c3aed",
  "il-10":          "#6d28d9",
  "il-15":          "#4f46e5",
  "il-18":          "#2563eb",
  "il-21":          "#1d4ed8",
  "il-22":          "#1e40af",
  "il-25":          "#1e3a8a",
  "il-31":          "#f97316",
  "il-33":          "#ea580c",
  "il-36":          "#c2410c",
  "tyk2":           "#f59e0b",
  "jak":            "#ef4444",
  "ox40":           "#6366f1",
  "btk":            "#0ea5e9",
  "tnf":            "#64748b",
  "integrin":       "#84cc16",
  "s1p":            "#a855f7",
  "baff":           "#d946ef",
  "april":          "#c026d3",
  "tslp":           "#9333ea",
  "fcrl":           "#7e22ce",
  "fcrn":           "#6b21a8",
  "complement":     "#15803d",
  "calcineurin":    "#0d9488",
  "pd-1":           "#dc2626",
  "pd-l1":          "#b91c1c",
  "ctla-4":         "#991b1b",
  "car-t":          "#7f1d1d",
  "cd19":           "#9f1239",
  "cd20":           "#881337",
  "cd38":           "#be185d",
  "cd3":            "#db2777",
  "cd30":           "#ec4899",
  "cd22":           "#f43f5e",
  "cd33":           "#e11d48",
  "her2":           "#c026d3",
  "egfr":           "#9333ea",
  "alk":            "#7c3aed",
  "ros1":           "#6d28d9",
  "met":            "#5b21b6",
  "ret":            "#4c1d95",
  "braf":           "#1d4ed8",
  "mek":            "#1e40af",
  "kras":           "#1e3a8a",
  "ntrk":           "#0369a1",
  "fgfr":           "#0284c7",
  "vegf":           "#0891b2",
  "vegfr":          "#0e7490",
  "pdgfr":          "#155e75",
  "kit":            "#164e63",
  "bcr-abl":        "#065f46",
  "flt3":           "#064e3b",
  "idh1":           "#14532d",
  "idh2":           "#166534",
  "parp":           "#15803d",
  "cdk4":           "#16a34a",
  "cdk6":           "#4d7c0f",
  "pi3k":           "#3f6212",
  "akt":            "#365314",
  "bcl-2":          "#713f12",
  "proteasome":     "#b45309",
  "hdac":           "#d97706",
  "dnmt":           "#ca8a04",
  "ezh2":           "#a16207",
  "smo":            "#854d0e",
  "notch":          "#92400e",
  "wnt":            "#7c2d12",
  "hedgehog":       "#991b1b",
  "bispecific":     "#7e22ce",
  "adc":            "#6b21a8",
  "antibody drug":  "#581c87",
  "t-cell engager": "#4a044e",
  "car":            "#701a75",
  "pcsk9":          "#1e40af",
  "angiotensin":    "#1d4ed8",
  "ace":            "#2563eb",
  "arb":            "#3b82f6",
  "beta blocker":   "#60a5fa",
  "statin":         "#bfdbfe",
  "sglt2":          "#0369a1",
  "glp-1":          "#0284c7",
  "dpp-4":          "#0891b2",
  "amyloid":        "#7c3aed",
  "tau":            "#6d28d9",
  "dopamine":       "#0d9488",
  "serotonin":      "#0f766e",
  "gaba":           "#134e4a",
  "cgrp":           "#1d4ed8",
  "smn":            "#1e3a8a",
  "antisense":      "#713f12",
  "gene therapy":   "#78350f",
  "sirna":          "#78350f",
  "gene editing":   "#713f12",
  "crispr":         "#6b21a8",
  "lama":           "#65a30d",
  "laba":           "#4d7c0f",
  "ics":            "#3f6212",
  "pde4":           "#f59e0b",
  "enzyme replacement": "#0369a1",
};

function hashColor(str: string): string {
  const palette = [
    "#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c",
    "#d97706", "#16a34a", "#0891b2", "#0284c7", "#4f46e5",
    "#7e22ce", "#be185d", "#b91c1c", "#c2410c", "#b45309",
    "#15803d", "#0e7490", "#1d4ed8", "#6d28d9", "#9333ea",
    "#c026d3", "#e11d48", "#f97316", "#84cc16", "#0d9488",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return palette[Math.abs(hash) % palette.length];
}

function getClassColor(drugClass: string): string {
  if (!drugClass) return "#94a3b8";
  const lower = drugClass.toLowerCase();
  for (const [key, color] of Object.entries(CLASS_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return hashColor(lower);
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Trial {
  name:              string;
  phase:             string;
  n:                 number;
  comparator:        string;
  primaryEndpoint:   string;
  result:            number;
  placeboResult:     number | null;
  allMetrics:        Record<string, number | null>;
  allPlaceboMetrics: Record<string, number | null>;
  timepoint:         string;
  publication:       string;
  year:              number;
  pubmedId?:         string | null;
}

interface DrugEvidence {
  name:                      string;
  brandName:                 string | null;
  drugClass:                 string;
  mechanism:                 string;
  approvalYear:              number;
  approvedIndication:        string;
  primaryEndpointLabel:      string;
  overallResult:             number;
  biologicExperiencedResult: number | null;
  metrics:                   Record<string, number | null>;
  trials:                    Trial[];
  keyMessage:                string;
  confidence:                "high" | "medium" | "low";
}

interface EvidenceData {
  condition:        string;
  treatmentContext: string;
  primaryMetric:    string;
  availableMetrics: string[];
  drugs:            DrugEvidence[];
  clinicalSummary:  string;
  evidenceNote:     string;
}

interface EmergingPublished {
  drugName:         string;
  drugClass:        string;
  phase:            string;
  mechanism:        string;
  keyResult:        string;
  endpoint:         string;
  trialName:        string | null;
  n:                number | null;
  comparator:       string | null;
  source:           string;
  pubmedId:         string | null;
  confidence:       "high" | "medium";
  confidenceReason: string;
  sponsorNote:      string | null;
}

interface EmergingReported {
  drugName:                string;
  drugClass:               string;
  mechanism:               string;
  phase:                   string;
  announcement:            string;
  trialName:               string | null;
  announcementDate:        string | null;
  source:                  string;
  caution:                 string;
  expectedPublicationDate: string | null;
}

interface EmergingWatchList {
  drugName:        string;
  drugClass:       string;
  mechanism:       string;
  phase:           string;
  nctId:           string | null;
  rationale:       string;
  expectedReadout: string | null;
  sponsor:         string | null;
  status:          string;
}

interface DidNotProgress {
  drugName:        string;
  drugClass:       string;
  mechanism:       string;
  phase:           string;
  reason:          string;
  trialName:       string | null;
  whatWasTested:   string;
  outcome:         string;
  year:            string | null;
  source:          string;
  clinicalInsight: string;
}

interface EmergingData {
  condition:        string;
  lastUpdated:      string;
  published:        EmergingPublished[];
  reportedPositive: EmergingReported[];
  watchList:        EmergingWatchList[];
  didNotProgress:   DidNotProgress[];
  evidenceSummary:  string;
  dataNote:         string;
}

interface ChartEntry {
  id:                  string;
  trialName:           string;
  drugName:            string;
  brandName:           string | null;
  drugClass:           string;
  color:               string;
  placeboValue:        number;
  treatmentExcess:     number;
  totalValue:          number;
  publication:         string;
  n:                   number;
  comparator:          string;
  isFirstForDrug:      boolean;
  drugIndex:           number;
  isPlaceboComparator: boolean;
}

interface Props {
  query:        string;
  summaryDrugs: string[];
  onFindTrials: () => void;
  onBack:       () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTrialMetricValue(trial: Trial, metric: string): number {
  return trial.allMetrics?.[metric] ?? trial.result ?? 0;
}

function getTrialPlaceboValue(trial: Trial, metric: string): number {
  const isPlacebo = trial.comparator?.toLowerCase().includes("placebo")
    || trial.comparator?.toLowerCase().includes("pbo");
  if (!isPlacebo) return 0;
  return trial.allPlaceboMetrics?.[metric] ?? trial.placeboResult ?? 0;
}

function getDrugMetricValue(
  drug:   DrugEvidence,
  metric: string,
  bioExp: boolean
): number | null {
  if (bioExp && drug.biologicExperiencedResult != null) {
    return drug.biologicExperiencedResult;
  }
  if (drug.metrics[metric] != null) return drug.metrics[metric];
  const norm = metric.replace(/ at .+$/i, "").trim().toLowerCase();
  for (const [key, val] of Object.entries(drug.metrics)) {
    if (
      key.replace(/ at .+$/i, "").trim().toLowerCase() === norm &&
      val != null
    ) return val;
  }
  return drug.overallResult ?? null;
}

function getReasonStyle(reason: string): string {
  const lower = reason.toLowerCase();
  if (lower.includes("safety"))   return "bg-red-100 text-red-700";
  if (lower.includes("efficacy")) return "bg-gray-100 text-gray-600";
  if (lower.includes("business")) return "bg-blue-50 text-blue-600";
  if (lower.includes("partial"))  return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: ChartEntry = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3
                    shadow-lg max-w-56 pointer-events-none">
      <p className="font-semibold text-gray-900 text-sm">
        {d.drugName}{d.brandName ? ` (${d.brandName})` : ""}
      </p>
      <p className="text-xs text-gray-400 mb-2">{d.trialName}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: d.color }} />
          <span className="text-xs">
            Treatment: <strong>{d.totalValue}%</strong>
          </span>
        </div>
        {d.isPlaceboComparator && d.placeboValue > 0 && (
          <>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
              <span className="text-xs">
                Placebo: <strong>{d.placeboValue}%</strong>
              </span>
            </div>
            <div className="mt-1 pt-1 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Advantage:{" "}
                <span className="font-semibold" style={{ color: d.color }}>
                  +{d.treatmentExcess}%
                </span>
              </span>
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        {d.publication} · N={d.n?.toLocaleString()}
      </p>
    </div>
  );
}

// ── Custom Y-axis tick ────────────────────────────────────────────────────────
function CustomYAxisTick({
  x, y, payload, chartData,
}: {
  x: number | string;
  y: number | string;
  payload: any;
  chartData: ChartEntry[];
}) {
  const entry = chartData.find((d) => d.id === payload.value);
  if (!entry) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      {entry.isFirstForDrug && entry.drugIndex > 0 && (
        <line x1={-175} y1={-20} x2={8} y2={-20}
          stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 2" />
      )}
      <text x={-8} y={-4} textAnchor="end"
        fontSize={11} fontWeight={600} fill="#1f2937">
        {entry.trialName}
      </text>
      <text x={-8} y={9} textAnchor="end"
        fontSize={10} fill={entry.color}>
        {entry.drugName}
        {entry.brandName ? ` (${entry.brandName})` : ""}
      </text>
    </g>
  );
}

// ── Emerging tab ──────────────────────────────────────────────────────────────
function EmergingTab({ condition }: { condition: string }) {
  const [data, setData]       = useState<EmergingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!condition) return;
    setLoading(true);
    fetch(`/api/emerging?q=${encodeURIComponent(condition)}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(true); else setData(d); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [condition]);

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <div className="w-8 h-8 border-2 border-gray-900
                        border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-gray-600 text-sm font-medium mb-1">
            Searching emerging evidence…
          </p>
          <p className="text-gray-400 text-xs">
            Searching PubMed, conference abstracts and posted results
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        Could not load emerging evidence data.
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Summary */}
      <div className="bg-gray-900 rounded-xl p-5 text-white">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
          Emerging Landscape
        </p>
        <p className="text-sm leading-relaxed">{data.evidenceSummary}</p>
        <p className="text-xs text-gray-500 mt-2">
          Last updated: {data.lastUpdated}
        </p>
      </div>

      {/* Tier 1 — Published */}
      {data.published.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500
                             flex-shrink-0" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Published Data
            </h3>
            <span className="text-xs text-gray-400">
              — Peer-reviewed or posted results with actual numbers
            </span>
          </div>
          <div className="space-y-3">
            {data.published.map((item, i) => {
              const color = getClassColor(item.drugClass);
              return (
                <div key={i}
                  className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-gray-900 text-sm">
                          {item.drugName}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full
                                         font-medium"
                          style={{ backgroundColor: color + "15", color }}>
                          {item.drugClass}
                        </span>
                        <span className="text-xs text-gray-400">
                          {item.phase}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full
                                          border font-medium ${
                          item.confidence === "high"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {item.confidence === "high"
                            ? "✓ High confidence"
                            : "⚠ Medium confidence"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{item.mechanism}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2 mb-2">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">
                      {item.endpoint}
                      {item.trialName ? ` · ${item.trialName}` : ""}
                      {item.n ? ` · N=${item.n}` : ""}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.keyResult}
                    </p>
                  </div>
                  <div className="flex items-center justify-between
                                  flex-wrap gap-2">
                    {item.pubmedId ? (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${item.pubmedId}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline
                                   flex items-center gap-1"
                      >
                        📄 {item.source} ↗
                      </a>
                    ) : (
                      <p className="text-xs text-gray-400">
                        📄 {item.source}
                      </p>
                    )}
                    {item.confidence === "medium" && (
                      <p className="text-xs text-amber-600">
                        ⚠ {item.confidenceReason}
                      </p>
                    )}
                  </div>
                  {item.sponsorNote && (
                    <p className="text-xs text-gray-400 mt-2 pt-2
                                  border-t border-gray-100">
                      💼 {item.sponsorNote}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tier 2 — Reported positive */}
      {data.reportedPositive.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400
                             flex-shrink-0" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Reported Positive
            </h3>
            <span className="text-xs text-gray-400">
              — Company announced success, full data pending
            </span>
          </div>
          <div className="space-y-3">
            {data.reportedPositive.map((item, i) => {
              const color = getClassColor(item.drugClass);
              return (
                <div key={i}
                  className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-gray-900 text-sm">
                          {item.drugName}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full
                                         font-medium"
                          style={{ backgroundColor: color + "15", color }}>
                          {item.drugClass}
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.phase}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{item.mechanism}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 mb-2">
                    <p className="text-xs font-medium text-amber-700 mb-0.5">
                      {item.trialName ? `${item.trialName} · ` : ""}
                      {item.announcementDate ?? ""}
                    </p>
                    <p className="text-sm text-gray-800">{item.announcement}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 flex-shrink-0 text-xs mt-0.5">
                      ⚠
                    </span>
                    <div>
                      <p className="text-xs text-amber-700">{item.caution}</p>
                      {item.expectedPublicationDate && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Full data expected: {item.expectedPublicationDate}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 pt-2
                                border-t border-amber-100">
                    Source: {item.source}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tier 3 — Watch list */}
      {data.watchList.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400
                             flex-shrink-0" />
            <h3 className="font-semibold text-gray-900 text-sm">
              👀 Watch List
            </h3>
            <span className="text-xs text-gray-400">
              — Active Phase 1/2, readout pending
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {data.watchList.map((item, i) => {
              const color = getClassColor(item.drugClass);
              return (
                <div key={i}
                  className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {item.drugName}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full
                                       font-medium"
                        style={{ backgroundColor: color + "15", color }}>
                        {item.drugClass}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full
                                      font-medium flex-shrink-0 ml-2 ${
                      item.status === "Recruiting"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{item.mechanism}</p>
                  <p className="text-xs text-blue-700 mb-2">{item.rationale}</p>
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      {item.nctId && (
                        <a
                          href={`https://clinicaltrials.gov/study/${item.nctId}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          {item.nctId} ↗
                        </a>
                      )}
                      {item.sponsor && (
                        <span className="text-xs text-gray-400">
                          {item.sponsor}
                        </span>
                      )}
                    </div>
                    {item.expectedReadout && (
                      <span className="text-xs text-gray-500 font-medium">
                        📅 {item.expectedReadout}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tier 4 — Did not progress */}
      {data.didNotProgress?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400
                             flex-shrink-0" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Development Not Progressed
            </h3>
            <span className="text-xs text-gray-400">
              — Failed endpoint or discontinued
            </span>
          </div>
          <div className="space-y-3">
            {data.didNotProgress.map((item, i) => {
              const color = getClassColor(item.drugClass);
              return (
                <div key={i}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-gray-700 text-sm">
                          {item.drugName}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full
                                         font-medium opacity-75"
                          style={{ backgroundColor: color + "15", color }}>
                          {item.drugClass}
                        </span>
                        <span className="text-xs text-gray-400">
                          {item.phase}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full
                                          font-medium ${
                          getReasonStyle(item.reason)
                        }`}>
                          {item.reason}
                        </span>
                        {item.year && (
                          <span className="text-xs text-gray-400">
                            {item.year}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{item.mechanism}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 mb-2
                                  border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">
                      {item.trialName ? `${item.trialName} · ` : ""}
                      {item.whatWasTested}
                    </p>
                    <p className="text-sm text-gray-700">{item.outcome}</p>
                  </div>
                  <div className="flex items-start gap-2 pt-2 border-t
                                  border-gray-100">
                    <span className="text-gray-400 flex-shrink-0 text-xs mt-0.5">
                      💡
                    </span>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">
                        Clinical insight
                      </p>
                      <p className="text-xs text-gray-600">
                        {item.clinicalInsight}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 pt-2
                                border-t border-gray-100">
                    Source: {item.source}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data note */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <span className="text-amber-500 flex-shrink-0">⚠️</span>
          <p className="text-xs text-amber-700 leading-relaxed">
            {data.dataNote}
          </p>
        </div>
      </div>

    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EvidencePage({
  query,
  summaryDrugs,
  onFindTrials,
  onBack,
}: Props) {
  const [data, setData]                     = useState<EvidenceData | null>(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(false);
  const [selectedMetric, setSelectedMetric] = useState("");
  const [showBioExp, setShowBioExp]         = useState(false);
  const [expandedDrug, setExpandedDrug]     = useState<string | null>(null);
  const [activeTab, setActiveTab]           = useState<"approved" | "emerging">("approved");
  const drugRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setLoading(true);
    setError(false);

    const params = new URLSearchParams({
      q:     query,
      drugs: summaryDrugs.join(","),
    });

    fetch(`/api/evidence?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(true);
        else {
          setData(d);
          const primaryNorm = (d.primaryMetric ?? "")
            .replace(/ at .+$/i, "").trim();
          const matched = (d.availableMetrics ?? []).find((m: string) =>
            m.replace(/ at .+$/i, "").trim().toLowerCase() ===
            primaryNorm.toLowerCase()
          ) ?? d.availableMetrics?.[0] ?? "";
          setSelectedMetric(matched);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [query]);

  function handleBarClick(drugName: string) {
    setExpandedDrug(drugName);
    setTimeout(() => {
      drugRefs.current[drugName]?.scrollIntoView({
        behavior: "smooth",
        block:    "start",
      });
    }, 150);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 flex flex-col
                      items-center gap-4">
        <div className="w-10 h-10 border-2 border-gray-900
                        border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-gray-600 text-sm font-medium mb-1">
            Synthesizing evidence…
          </p>
          <p className="text-gray-400 text-xs">
            Reviewing FDA labels, EMA data and published Phase 3 trials
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-gray-500 mb-4">
          Could not load evidence. Please try again.
        </p>
      </div>
    );
  }

  const sortedDrugs = [...data.drugs].sort((a, b) => {
    const av = getDrugMetricValue(a, selectedMetric, showBioExp) ?? 0;
    const bv = getDrugMetricValue(b, selectedMetric, showBioExp) ?? 0;
    return bv - av;
  });

  const chartData: ChartEntry[] = sortedDrugs.flatMap((drug, drugIndex) => {
    const color = getClassColor(drug.drugClass);
    return (drug.trials ?? []).map((trial, trialIndex) => {
      const isPlacebo = !!trial.comparator?.toLowerCase().includes("placebo")
        || !!trial.comparator?.toLowerCase().includes("pbo");
      const totalValue      = getTrialMetricValue(trial, selectedMetric);
      const placeboValue    = isPlacebo
        ? (getTrialPlaceboValue(trial, selectedMetric) ?? 0) : 0;
      const treatmentExcess = Math.max(0, totalValue - placeboValue);
      return {
        id:                  `${drug.name}||${trial.name}`,
        trialName:           trial.name,
        drugName:            drug.name,
        brandName:           drug.brandName,
        drugClass:           drug.drugClass,
        color,
        placeboValue,
        treatmentExcess,
        totalValue,
        publication:         trial.publication,
        n:                   trial.n,
        comparator:          trial.comparator,
        isFirstForDrug:      trialIndex === 0,
        drugIndex,
        isPlaceboComparator: isPlacebo,
      };
    });
  });

  const chartHeight   = Math.max(chartData.length * 52 + 60, 200);
  const hasAnyPlacebo = chartData.some((d) => d.placeboValue > 0);
  const uniqueClasses = [...new Set(data.drugs.map((d) => d.drugClass))];

  return (
    <div className="px-6 py-6 space-y-6">

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("approved")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "approved"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ✅ Approved Drugs
        </button>
        <button
          onClick={() => setActiveTab("emerging")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "emerging"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🔬 Emerging Evidence
        </button>
      </div>

      {/* ── Approved tab ── */}
      {activeTab === "approved" && (
        <div className="space-y-6">

          {/* Summary */}
          <div className="bg-gray-900 rounded-xl p-5 text-white">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              Evidence Summary
            </p>
            <p className="text-sm leading-relaxed">{data.clinicalSummary}</p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {data.availableMetrics.length > 1 && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {data.availableMetrics.map((metric) => (
                  <button key={metric}
                    onClick={() => setSelectedMetric(metric)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium
                                transition-all ${
                      selectedMetric === metric
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}>
                    {metric}
                  </button>
                ))}
              </div>
            )}
            {data.drugs.some((d) => d.biologicExperiencedResult != null) && (
              <button
                onClick={() => setShowBioExp((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl
                            text-xs font-medium border transition-all ${
                  showBioExp
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}>
                <span className={`w-2 h-2 rounded-full ${
                  showBioExp ? "bg-emerald-400" : "bg-gray-300"
                }`} />
                Biologic-experienced
              </button>
            )}
          </div>

          {/* Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-400 uppercase
                          tracking-wide mb-1">
              {selectedMetric} Response Rate — per pivotal trial
            </p>
            <p className="text-xs text-gray-300 mb-1">
              Click any bar to expand trial details
            </p>
            {hasAnyPlacebo && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-slate-300" />
                  <span className="text-xs text-gray-400">Placebo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-blue-500" />
                  <span className="text-xs text-gray-400">
                    Treatment excess above placebo
                  </span>
                </div>
              </div>
            )}

            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart layout="vertical" data={chartData}
                margin={{ top: 5, right: 70, left: 175, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false}
                  stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="id" width={170}
                  tick={(props) => (
                    <CustomYAxisTick {...props} chartData={chartData} />
                  )}
                  axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />}
                  cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="placeboValue" stackId="stack" fill="#cbd5e1"
                  name="Placebo" cursor="pointer" maxBarSize={32}
                  onClick={(d: any) => handleBarClick(d.drugName)} />
                <Bar dataKey="treatmentExcess" stackId="stack" name="Treatment"
                  cursor="pointer" maxBarSize={32} radius={[0, 6, 6, 0]}
                  onClick={(d: any) => handleBarClick(d.drugName)}>
                  <LabelList dataKey="totalValue" position="right"
                    formatter={(v: any) => `${v}%`}
                    style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }} />
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap gap-3 mt-4 pt-4
                            border-t border-gray-100">
              {uniqueClasses.map((cls) => (
                <div key={cls} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: getClassColor(cls) }} />
                  <span className="text-xs text-gray-500">{cls}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Drug cards */}
          <div className="space-y-3">
            {sortedDrugs.map((drug, index) => {
              const isExpanded    = expandedDrug === drug.name;
              const displayResult = getDrugMetricValue(
                drug, selectedMetric, showBioExp
              );
              const color = getClassColor(drug.drugClass);

              return (
                <div key={drug.name}
                  ref={(el) => { drugRefs.current[drug.name] = el; }}
                  className="bg-white border border-gray-200 rounded-xl
                             overflow-hidden">

                  <button
                    onClick={() =>
                      setExpandedDrug(isExpanded ? null : drug.name)
                    }
                    className="w-full flex items-start justify-between
                               px-5 py-4 hover:bg-gray-50 transition-colors
                               text-left"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center
                                       justify-center text-xs font-bold
                                       flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: color + "20", color }}>
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="font-semibold text-gray-900 text-sm">
                            {drug.name}
                          </p>
                          {drug.brandName && (
                            <p className="text-xs text-gray-400">
                              ({drug.brandName})
                            </p>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full
                                           font-medium"
                            style={{ backgroundColor: color + "15", color }}>
                            {drug.drugClass}
                          </span>
                          {drug.approvalYear > 0 && (
                            <span className="text-xs text-gray-400">
                              FDA {drug.approvalYear}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {drug.keyMessage}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <div className="text-right">
                        <p className="text-xl font-bold" style={{ color }}>
                          {displayResult ?? drug.overallResult}%
                        </p>
                        <p className="text-xs text-gray-400">
                          {selectedMetric}
                        </p>
                      </div>
                      <span className="text-gray-400 text-xs">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4
                                    space-y-4">

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-400
                                      uppercase tracking-wide mb-1">
                          Mechanism
                        </p>
                        <p className="text-sm text-gray-700">
                          {drug.mechanism}
                        </p>
                      </div>

                      {Object.keys(drug.metrics).length > 1 && (
                        <div>
                          <p className="text-xs font-medium text-gray-400
                                        uppercase tracking-wide mb-2">
                            Efficacy Endpoints
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(drug.metrics).map(
                              ([metric, value]) =>
                                value != null ? (
                                  <button key={metric}
                                    onClick={() => setSelectedMetric(metric)}
                                    className={`p-3 rounded-lg text-center
                                                border transition-all ${
                                      metric === selectedMetric
                                        ? "border-gray-900 bg-gray-900"
                                        : "border-gray-100 bg-gray-50 hover:border-gray-300"
                                    }`}>
                                    <p className={`text-lg font-bold ${
                                      metric === selectedMetric
                                        ? "text-white" : "text-gray-900"
                                    }`}>
                                      {value}%
                                    </p>
                                    <p className={`text-xs ${
                                      metric === selectedMetric
                                        ? "text-gray-300" : "text-gray-400"
                                    }`}>
                                      {metric}
                                    </p>
                                  </button>
                                ) : null
                            )}
                          </div>
                        </div>
                      )}

                      {drug.biologicExperiencedResult != null && (
                        <div className="p-3 bg-blue-50 rounded-lg flex
                                        items-center gap-3">
                          <span className="text-2xl font-bold text-blue-700">
                            {drug.biologicExperiencedResult}%
                          </span>
                          <div>
                            <p className="text-xs font-medium text-blue-800">
                              {selectedMetric} in biologic-experienced
                            </p>
                            <p className="text-xs text-blue-600">
                              Published subgroup analysis
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-medium text-gray-400
                                      uppercase tracking-wide mb-2">
                          Pivotal Trials ({drug.trials.length})
                        </p>
                        <div className="space-y-2">
                          {drug.trials.map((trial, i) => {
                            const isPlacebo =
                              trial.comparator?.toLowerCase().includes("placebo")
                              || trial.comparator?.toLowerCase().includes("pbo");
                            const trialResult  = getTrialMetricValue(
                              trial, selectedMetric
                            );
                            const trialPlacebo = isPlacebo
                              ? getTrialPlaceboValue(trial, selectedMetric)
                              : null;

                            return (
                              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-start justify-between
                                                gap-2 mb-1.5">
                                  <div>
                                    <div className="flex items-center gap-2
                                                    flex-wrap">
                                      <p className="font-semibold text-gray-900
                                                    text-sm">
                                        {trial.pubmedId ? (
                                          <a
                                            href={`https://pubmed.ncbi.nlm.nih.gov/${trial.pubmedId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-blue-600
                                                       transition-colors"
                                            onClick={(e) =>
                                              e.stopPropagation()
                                            }
                                          >
                                            {trial.name} ↗
                                          </a>
                                        ) : trial.name}
                                      </p>
                                      <span className="text-xs text-gray-400">
                                        {trial.phase}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {trial.publication}
                                      {" · "}N={trial.n?.toLocaleString()}
                                      {trial.comparator
                                        ? ` · vs ${trial.comparator}` : ""}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-base font-bold"
                                      style={{ color }}>
                                      {trialResult}%
                                    </p>
                                    {trialPlacebo != null &&
                                     trialPlacebo > 0 && (
                                      <p className="text-xs text-gray-400">
                                        vs {trialPlacebo}% PBO
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-400">
                                      {trial.timepoint}
                                    </p>
                                  </div>
                                </div>

                                {trial.allMetrics &&
                                 Object.keys(trial.allMetrics).length > 1 && (
                                  <div className="flex flex-wrap gap-2 mt-2
                                                  pt-2 border-t border-gray-200">
                                    {Object.entries(trial.allMetrics).map(
                                      ([m, v]) => v != null ? (
                                        <div key={m}
                                          className="flex items-center gap-1">
                                          <span className="text-xs text-gray-400">
                                            {m}:
                                          </span>
                                          <span className="text-xs font-semibold"
                                            style={{ color }}>
                                            {v}%
                                          </span>
                                          {trial.allPlaceboMetrics?.[m] !=
                                           null && (
                                            <span className="text-xs text-gray-300">
                                              (PBO {trial.allPlaceboMetrics[m]}%)
                                            </span>
                                          )}
                                        </div>
                                      ) : null
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <span className={`inline-flex text-xs px-2.5 py-1
                                        rounded-full font-medium border ${
                        drug.confidence === "high"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : drug.confidence === "medium"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-red-50 text-red-600 border-red-200"
                      }`}>
                        {drug.confidence === "high"
                          ? "✓ High confidence — multiple Phase 3 RCTs"
                          : drug.confidence === "medium"
                          ? "⚠ Moderate confidence — single RCT"
                          : "⚠ Limited data"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Evidence note */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 flex-shrink-0 text-sm">⚠️</span>
              <div>
                <p className="text-xs font-medium text-amber-800 mb-1">
                  Data sources & verification
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {data.evidenceNote}
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── Emerging tab ── */}
      {activeTab === "emerging" && (
        <EmergingTab condition={data.condition} />
      )}

      <p className="text-xs text-gray-300 text-center pb-2">
        Approved evidence from FDA labels and published Phase 3 trials.
        Emerging evidence from PubMed, conference abstracts and posted results.
        Always verify before clinical use.
      </p>

    </div>
  );
}