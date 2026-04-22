"use client";

interface Tag {
  label: string;
  color: "blue" | "orange" | "purple" | "green" | "red" | "gray";
}

interface Recommendation {
  label: string;
  note?: string;
  detail?: string;
  dotColor: "green" | "blue" | "orange" | "gray" | "red" | "purple";
}

interface GuidelineSummary {
  sources: string[];
  keyPoint: string;
  recommendations: Recommendation[];
  statCallout: { value: string; description: string } | null;
}

export interface SummaryData {
  tags: Tag[];
  guidelineSummary: GuidelineSummary;
  whyTrial: string[];
}

interface Props {
  query: string;
  summaryData: SummaryData;
  trialCount: number;
  onBrowseTrials: () => void;
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

export default function SummaryPage({ query, summaryData, trialCount, onBrowseTrials }: Props) {
  const { tags, guidelineSummary, whyTrial } = summaryData;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

      {/* 1 · Query echo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
          Your Search
        </p>
        <p className="text-gray-700 text-sm italic">"{query}"</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {tags.map((tag) => (
              <span
                key={tag.label}
                className={`text-xs font-medium px-3 py-1 rounded-full ${TAG_STYLES[tag.color] ?? TAG_STYLES.gray}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2 · Guideline summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-base">
            📋
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Current Standard of Care</h2>
            <p className="text-xs text-gray-400">{guidelineSummary.sources.join(" · ")}</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-3 mb-4">{guidelineSummary.keyPoint}</p>

        <div className="space-y-2">
          {guidelineSummary.recommendations.map((item) => (
            <div key={item.label} className="flex items-start gap-3 bg-gray-50 rounded-lg px-4 py-3">
              <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${DOT_STYLES[item.dotColor] ?? DOT_STYLES.gray}`} />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {item.label}{" "}
                  {item.note && <span className="font-normal text-gray-500 text-xs">— {item.note}</span>}
                </p>
                {item.detail && <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>}
              </div>
            </div>
          ))}
        </div>

        {guidelineSummary.statCallout && (
          <div className="mt-4 bg-blue-50 rounded-lg px-4 py-3 flex items-center gap-4">
            <span className="text-2xl font-bold text-blue-700">{guidelineSummary.statCallout.value}</span>
            <p className="text-xs text-blue-600 leading-relaxed">{guidelineSummary.statCallout.description}</p>
          </div>
        )}
      </div>

      {/* 3 · Why a trial */}
      {whyTrial.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-base">
              🔬
            </div>
            <h2 className="font-semibold text-gray-900 text-sm">Why Consider a Trial?</h2>
          </div>
          <div className="space-y-3">
            {whyTrial.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 text-purple-400 font-bold text-sm flex-shrink-0">→</span>
                <p className="text-sm text-gray-600">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 · CTA */}
      <div className="bg-gray-900 rounded-xl p-6 text-white shadow-md">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-gray-400 text-xs mb-1">Matched to your patient</p>
            <h3 className="text-2xl font-bold">{trialCount} trial{trialCount !== 1 ? "s" : ""} found</h3>
            <p className="text-gray-400 text-xs mt-1">Phase 2–4 · Actively Recruiting</p>
          </div>
          <button
            onClick={onBrowseTrials}
            className="bg-white text-gray-900 font-semibold px-5 py-3 rounded-lg hover:bg-gray-100 transition-colors text-sm whitespace-nowrap"
          >
            Browse Trials →
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center pb-4">
        Guideline summaries are AI-generated from official sources. Not a substitute for clinical judgment.
      </p>
    </div>
  );
}