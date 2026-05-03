"use client";

import { useEffect, useState } from "react";
import EligibilityChecker from "@/components/EligibilityChecker";
import ProgressSteps, { ProgressStep } from "@/components/ProgressSteps";

const COMPARE_STEPS: ProgressStep[] = [
  {
    id:     "fetch",
    label:  "Fetching trial details",
    detail: "Retrieving protocol data for each trial",
    icon:   "🔬",
  },
  {
    id:     "drugs",
    label:  "Resolving drug mechanisms",
    detail: "Identifying compound codes and drug classes",
    icon:   "💊",
  },
  {
    id:     "compare",
    label:  "Comparing trials for your patient",
    detail: "Analysing eligibility, mechanism and dosing",
    icon:   "🤔",
  },
  {
    id:     "rank",
    label:  "Generating recommendation",
    detail: "Ranking by best fit for your patient",
    icon:   "🏆",
  },
];

interface ComparedTrial {
  nctId:                string;
  rank:                 number;
  rankBadge:            string;
  title:                string;
  phase:                string;
  status:               string;
  mechanism:            string;
  route:                string;
  dosingSchedule:       string;
  efficacyHighlight:    string | null;
  keyAdvantage:         string;
  keyConsideration:     string;
  priorBiologicAllowed: boolean | null;
  bestFor:              string;
  locationCount:        number;
}

interface CompareData {
  trials:           ComparedTrial[];
  recommendation:   string;
  followUpQuestion: string;
  patientContext:   string;
}

interface Props {
  nctIds:         string[];
  allRankedIds:   string[];
  query:          string;
  patientContext: string;
  activeRegions:  string[];
  onSelectTrial:  (nctId: string) => void;
  onShowMore:     (ids: string[]) => void;
  refresh?:       boolean;
}

const STATUS_COLORS: Record<string, string> = {
  RECRUITING:            "bg-emerald-50 text-emerald-700 border-emerald-200",
  ACTIVE_NOT_RECRUITING: "bg-amber-50 text-amber-700 border-amber-200",
  NOT_YET_RECRUITING:    "bg-blue-50 text-blue-700 border-blue-200",
};

const STATUS_LABELS: Record<string, string> = {
  RECRUITING:            "Recruiting",
  ACTIVE_NOT_RECRUITING: "Active",
  NOT_YET_RECRUITING:    "Opening Soon",
};

export default function TrialCompare({
  nctIds,
  allRankedIds,
  query,
  patientContext,
  activeRegions,
  onSelectTrial,
  onShowMore,
  refresh = false,
}: Props) {
  const [data, setData]               = useState<CompareData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [compareStep, setCompareStep] = useState(0);

  useEffect(() => {
    if (!nctIds.length) return;
    setLoading(true);
    setError(false);
    setData(null);
    setCompareStep(0);

    const t1 = setTimeout(() => setCompareStep(1), 1500);
    const t2 = setTimeout(() => setCompareStep(2), 3000);
    const t3 = setTimeout(() => setCompareStep(3), 5000);

    fetch("/api/compare", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        nctIds,
        query,
        patientContext: patientContext || undefined,
        refresh,
        activeRegions,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(true);
        else setData(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [nctIds.join(","), query, patientContext, refresh]);

  const currentCount = nctIds.length;
  const totalCount   = allRankedIds.length;
  const canShowMore  = currentCount < totalCount;
  const nextBatchIds = allRankedIds.slice(currentCount, currentCount + 5);

  if (loading) {
    return (
      <ProgressSteps
        steps={COMPARE_STEPS}
        currentStep={compareStep}
        title="Finding best trial matches…"
        subtitle="This takes 5–10 seconds"
      />
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        Could not generate comparison. Try refreshing.
      </div>
    );
  }

  // Deduplicate trials by nctId
  const seenIds     = new Set<string>();
  const uniqueTrials = data.trials.filter((t) => {
    if (seenIds.has(t.nctId)) return false;
    seenIds.add(t.nctId);
    return true;
  });

  const trialTitles = Object.fromEntries(
    uniqueTrials.map((t) => [t.nctId, t.title])
  );

  return (
    <div className="space-y-5">

      {/* Patient context banner */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
          Based on
        </p>
        <p className="text-sm text-gray-700">{data.patientContext}</p>
      </div>

      {/* Recommendation */}
      <div className="bg-gray-900 rounded-xl p-5 text-white">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
          Clinical Recommendation
        </p>
        <p className="text-sm leading-relaxed">{data.recommendation}</p>
      </div>

      {/* Trial cards */}
      <div className="space-y-3">
        {uniqueTrials.map((trial, index) => (
          <TrialCard
            key={`${trial.nctId}-${index}`}
            trial={trial}
            isTop={trial.rank === 1}
            onClick={() => onSelectTrial(trial.nctId)}
          />
        ))}
      </div>

      {/* Show more */}
      {canShowMore && (
        <button
          onClick={() => onShowMore([...nctIds, ...nextBatchIds])}
          className="w-full py-3 border border-dashed border-gray-300
                     text-gray-500 text-sm font-medium rounded-xl
                     hover:border-gray-400 hover:text-gray-700
                     hover:bg-gray-50 transition-all"
        >
          Show {nextBatchIds.length} more top picks
          <span className="ml-1.5 text-gray-300">
            ({currentCount} of {totalCount} shown)
          </span>
        </button>
      )}

      {/* Eligibility checker */}
      <EligibilityChecker
        nctIds={nctIds}
        query={query}
        trialTitles={trialTitles}
      />

    </div>
  );
}

function TrialCard({
  trial,
  isTop,
  onClick,
}: {
  trial:   ComparedTrial;
  isTop:   boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border cursor-pointer transition-all
                  duration-200 hover:shadow-md group ${
        isTop
          ? "border-gray-900 bg-white shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      {/* Top bar */}
      <div className={`px-4 py-2 rounded-t-xl flex items-center
                       justify-between ${
        isTop ? "bg-gray-900" : "bg-gray-50"
      }`}>
        <span className={`text-xs font-medium ${
          isTop ? "text-white" : "text-gray-500"
        }`}>
          {trial.rankBadge}
        </span>
        <span className={`text-xs font-mono ${
          isTop ? "text-gray-400" : "text-gray-300"
        }`}>
          {trial.nctId}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug
                         line-clamp-2 group-hover:text-blue-600
                         transition-colors">
            {trial.title}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full border
                            font-medium flex-shrink-0 ${
            STATUS_COLORS[trial.status] ??
            "bg-gray-100 text-gray-600 border-gray-200"
          }`}>
            {STATUS_LABELS[trial.status] ?? trial.status}
          </span>
        </div>

        {/* Attributes grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { label: "Mechanism", value: trial.mechanism },
            { label: "Route",     value: trial.route },
            { label: "Dosing",    value: trial.dosingSchedule },
            { label: "Phase",     value: trial.phase },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg px-2.5 py-2">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="text-xs font-medium text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        {/* Efficacy highlight */}
        {trial.efficacyHighlight && (
          <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs text-blue-700">
              📊 {trial.efficacyHighlight}
            </p>
          </div>
        )}

        {/* Advantage / Consideration */}
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          <div className="flex items-start gap-2">
            <span className="text-green-500 text-xs mt-0.5 flex-shrink-0">
              ✓
            </span>
            <p className="text-xs font-medium text-gray-700">
              {trial.keyAdvantage}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-xs mt-0.5 flex-shrink-0">
              ⚠
            </span>
            <p className="text-xs font-medium text-gray-700">
              {trial.keyConsideration}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2
                        border-t border-gray-100">
          <span className="text-xs text-gray-400">
            Best for:{" "}
            <span className="text-gray-600 font-medium">
              {trial.bestFor}
            </span>
          </span>
          <div className="flex items-center gap-2">
            {trial.priorBiologicAllowed === true && (
              <span className="text-xs text-green-600 font-medium">
                ✅ Prior biologic OK
              </span>
            )}
            {trial.locationCount > 0 && (
              <span className="text-xs text-gray-400">
                📍 {trial.locationCount} sites
              </span>
            )}
            <span className="text-xs text-gray-300
                             group-hover:text-blue-400 transition-colors">
              View →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}