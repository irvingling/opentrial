"use client";

import { useState, useEffect } from "react";

interface EligibilityHighlights {
  mustHave:    string[];
  mustNotHave: string[];
}

interface AISummaryData {
  trialSummary:          string;
  mechanismOfAction:     string;
  targetPopulation:      string;
  whyItMatters:          string;
  eligibilityHighlights: EligibilityHighlights;
  outcomesSummary:       string;
  searchTerms:           string[];
  cached:                boolean;
}

interface Props {
  nctId: string;
}

export default function AISummary({ nctId }: Props) {
  const [data, setData]       = useState<AISummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/trials/${nctId}/summary`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch {
        setError("Could not generate AI summary.");
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [nctId]);

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-xl bg-white p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🤖</span>
          <h2 className="text-lg font-semibold text-gray-900">AI Summary</h2>
          <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600
                           border border-purple-100 rounded-full">
            Powered by Claude
          </span>
        </div>
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-red-100 rounded-xl bg-red-50 p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <h2 className="text-lg font-semibold text-gray-900">AI Summary</h2>
        <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600
                         border border-purple-100 rounded-full">
          Powered by Claude
        </span>
        {data.cached && (
          <span className="text-xs px-2 py-0.5 bg-gray-50 text-gray-400
                           border border-gray-100 rounded-full">
            Cached
          </span>
        )}
      </div>

      {/* Trial Summary */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase
                       tracking-wider mb-2">
          Overview
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          {data.trialSummary}
        </p>
      </div>

      {/* MoA */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase
                       tracking-wider mb-2">
          Mechanism of Action
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          {data.mechanismOfAction}
        </p>
      </div>

      {/* Target Population + Why It Matters */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-blue-500 uppercase
                         tracking-wider mb-2">
            Target Population
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            {data.targetPopulation}
          </p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-green-500 uppercase
                         tracking-wider mb-2">
            Why It Matters
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            {data.whyItMatters}
          </p>
        </div>
      </div>

      {/* Eligibility Highlights */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase
                       tracking-wider mb-3">
          Key Eligibility
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">

          {/* Must Have */}
          <div>
            <p className="text-xs font-medium text-green-600 mb-2">
              ✅ Must Have
            </p>
            <ul className="space-y-1.5">
              {data.eligibilityHighlights.mustHave.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-700 flex items-start gap-2"
                >
                  <span className="text-green-400 mt-0.5 shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Must Not Have */}
          <div>
            <p className="text-xs font-medium text-red-500 mb-2">
              ❌ Must Not Have
            </p>
            <ul className="space-y-1.5">
              {data.eligibilityHighlights.mustNotHave.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-700 flex items-start gap-2"
                >
                  <span className="text-red-400 mt-0.5 shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Primary Outcomes */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase
                       tracking-wider mb-2">
          What They Are Measuring
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          {data.outcomesSummary}
        </p>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">
        AI-generated summary · Always verify with the full trial record
      </p>

    </div>
  );
}