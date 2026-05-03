"use client";

interface Tag {
  label: string;
  color: "blue" | "orange" | "purple" | "green" | "red" | "gray";
}

interface Recommendation {
  label:    string;
  note?:    string;
  detail?:  string;
  dotColor: "green" | "blue" | "orange" | "gray" | "red" | "purple";
}

interface GuidelineSummary {
  sources:         string[];
  keyPoint:        string;
  recommendations: Recommendation[];
  statCallout:     { value: string; description: string } | null;
}

export interface SummaryData {
  tags:             Tag[];
  guidelineSummary: GuidelineSummary;
  whyTrial:         string[];
}

interface Props {
  query:             string;
  summaryData:       SummaryData;
  trialCount:        number;
  searchCount?:      number;
  onBrowseTrials:    () => void;
  onExploreEvidence: () => void;
}

const TAG_STYLES: Record<string, string> = {
  blue:   "bg-blue-50 text-blue-700",
  orange: "bg-orange-50 text-orange-700",
  purple: "bg-purple-50 text-purple-700",
  green:  "bg-green-50 text-green-700",
  red:    "bg-red-50 text-red-700",
  gray:   "bg-gray-100 text-gray-600",
};

const DOT_STYLES: Record<string, string> = {
  green:  "bg-green-500",
  blue:   "bg-blue-500",
  orange: "bg-orange-400",
  gray:   "bg-gray-400",
  red:    "bg-red-400",
  purple: "bg-purple-500",
};

export default function SummaryPage({
  query,
  summaryData,
  trialCount,
  searchCount,
  onBrowseTrials,
  onExploreEvidence,
}: Props) {
  const { tags, guidelineSummary } = summaryData;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

      {/* 1 · Query echo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <p className="text-xs font-medium text-gray-400 uppercase
                      tracking-wide mb-1">
          Your Search
        </p>
        <p className="text-gray-700 text-sm italic">"{query}"</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {tags.map((tag) => (
              <span
                key={tag.label}
                className={`text-xs font-medium px-3 py-1 rounded-full
                            ${TAG_STYLES[tag.color] ?? TAG_STYLES.gray}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2 · Trust signals */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Live data from ClinicalTrials.gov
        </div>
        <span className="text-gray-200">|</span>
        {searchCount && (
          <>
            <div className="text-xs text-gray-400">
              🔍 {searchCount} searches run
            </div>
            <span className="text-gray-200">|</span>
          </>
        )}
        <div className="text-xs text-gray-400">
          📋 {guidelineSummary.sources.join(", ")}
        </div>
      </div>

      {/* 3 · Simplified guideline summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center
                          justify-center text-base flex-shrink-0">
            📋
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">
              Guideline Recommendation
            </h2>
            <p className="text-xs text-gray-400">
              {guidelineSummary.sources.join(" · ")}
            </p>
          </div>
        </div>

        {/* Key point */}
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          {guidelineSummary.keyPoint}
        </p>

        {/* Recommendations as clean pills */}
        <div className="flex flex-wrap gap-2">
          {guidelineSummary.recommendations.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50
                         border border-gray-100 rounded-full"
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0
                                ${DOT_STYLES[item.dotColor] ?? DOT_STYLES.gray}`}
              />
              <span className="text-xs font-medium text-gray-700">
                {item.label}
              </span>
              {item.note && (
                <span className="text-xs text-gray-400">
                  — {item.note}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Stat callout */}
        {guidelineSummary.statCallout && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50
                          rounded-lg">
            <span className="text-2xl font-bold text-blue-700">
              {guidelineSummary.statCallout.value}
            </span>
            <p className="text-xs text-blue-600 leading-relaxed">
              {guidelineSummary.statCallout.description}
            </p>
          </div>
        )}
      </div>

      {/* 4 · Two action paths */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Explore Evidence */}
        <button
          onClick={onExploreEvidence}
          className="flex flex-col items-start p-5 bg-white border
                     border-gray-200 rounded-xl hover:border-purple-300
                     hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center
                          justify-center text-lg mb-3">
            🔬
          </div>
          <p className="font-semibold text-gray-900 text-sm mb-1">
            Explore the Evidence
          </p>
          <p className="text-xs text-gray-400 leading-relaxed mb-2">
            Compare pivotal trial data, efficacy rates and subgroup analyses
            across all approved options
          </p>
          <span className="text-xs text-purple-500 font-medium
                           group-hover:text-purple-700 transition-colors">
            View bar charts & trial data →
          </span>
        </button>

        {/* Find Trials */}
        <button
          onClick={onBrowseTrials}
          className="flex flex-col items-start p-5 bg-gray-900
                     rounded-xl hover:bg-gray-800 transition-all
                     text-left group"
        >
          <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center
                          justify-center text-lg mb-3">
            🔍
          </div>
          <p className="font-semibold text-white text-sm mb-1">
            Find Clinical Trials
          </p>
          <p className="text-xs text-gray-400 leading-relaxed mb-2">
            Browse{" "}
            <span className="font-semibold text-gray-200">
              {trialCount}
            </span>
            {" "}active trials matched to your patient
          </p>
          <span className="text-xs text-gray-400 font-medium
                           group-hover:text-white transition-colors">
            Browse & compare trials →
          </span>
        </button>

      </div>

      {/* 5 · Disclaimer */}
      <p className="text-xs text-gray-400 text-center pb-4">
        AI-generated from {guidelineSummary.sources.join(", ")}.
        Not a substitute for clinical judgment.
      </p>

    </div>
  );
}