"use client";

import { useState, useEffect } from "react";
import type { DrugLabelInfo } from "@/lib/fda";

interface Props {
  interventions: Array<{ name: string; type: string }>;
}

interface DrugResult {
  name:  string;
  found: boolean;
  info:  DrugLabelInfo | null;
  error: boolean;
}

// ── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source: DrugLabelInfo["source"] }) {
  const styles: Record<DrugLabelInfo["source"], string> = {
    fda:       "bg-blue-50 text-blue-700 border-blue-100",
    chembl:    "bg-purple-50 text-purple-700 border-purple-100",
    pubchem:   "bg-green-50 text-green-700 border-green-100",
    wikipedia: "bg-gray-50 text-gray-600 border-gray-200",
    ai:        "bg-violet-50 text-violet-700 border-violet-100",
  };
  const labels: Record<DrugLabelInfo["source"], string> = {
    fda:       "FDA Label",
    chembl:    "ChEMBL",
    pubchem:   "PubChem",
    wikipedia: "Wikipedia",
    ai:        "AI Generated",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[source]}`}>
      {labels[source]}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MechanismOfAction({ interventions }: Props) {
  const [results, setResults]   = useState<DrugResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null); // ✅ use index

  // ✅ Deduplicate by name before fetching
  const drugInterventions = Array.from(
    new Map(
      interventions
        .filter((i) =>
          ["DRUG", "BIOLOGICAL", "COMBINATION_PRODUCT"].includes(
            i.type.toUpperCase()
          )
        )
        .map((i) => [i.name.toLowerCase(), i])
    ).values()
  );

  useEffect(() => {
    if (drugInterventions.length === 0) return;
    loadAllDrugs();
  }, []);

  async function loadAllDrugs() {
    setLoading(true);

    const promises = drugInterventions.map(async (intervention) => {
      try {
        const res  = await fetch(
          `/api/drug?name=${encodeURIComponent(intervention.name)}`
        );
        const data = await res.json();
        return {
          name:  intervention.name,
          found: data.found ?? false,
          info:  data.found ? (data as DrugLabelInfo) : null,
          error: false,
        } as DrugResult;
      } catch {
        return {
          name:  intervention.name,
          found: false,
          info:  null,
          error: true,
        } as DrugResult;
      }
    });

    const allResults = await Promise.all(promises);
    setResults(allResults);
    setLoading(false);

    // ✅ Auto-open using index instead of name
    const firstFoundIndex = allResults.findIndex((r) => r.found);
    if (firstFoundIndex !== -1) setExpanded(firstFoundIndex);
  }

  if (drugInterventions.length === 0) return null;

  return (
    <section className="border border-gray-200 rounded-xl bg-white p-6">

      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        🔬 Mechanism of Action
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Sourced from FDA, ChEMBL, PubChem, and Wikipedia — no AI used
      </p>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600
                          rounded-full animate-spin shrink-0" />
          Looking up drug information…
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {results.map((result, index) => ( // ✅ added index
            <div
              key={`${result.name}-${index}`} // ✅ unique key
              className="border border-gray-100 rounded-lg overflow-hidden"
            >

              {/* ── Drug name row — always visible ── */}
              <button
                onClick={() =>
                  setExpanded(expanded === index ? null : index) // ✅ use index
                }
                className="w-full flex items-center justify-between p-4
                           hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">
                    {result.name}
                  </span>

                  {result.info?.drugClass && (
                    <span className="text-xs px-2 py-0.5 bg-indigo-50
                                     text-indigo-700 border border-indigo-100
                                     rounded-full">
                      {result.info.drugClass.replace(/\[EPC\]/g, "").trim()}
                    </span>
                  )}

                  {result.info?.source && (
                    <SourceBadge source={result.info.source} />
                  )}

                  {result.info?.source === "wikipedia" && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-50
                                     text-yellow-700 border border-yellow-100
                                     rounded-full">
                      Investigational
                    </span>
                  )}

                  {!result.found && !result.error && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-50
                                     text-yellow-700 border border-yellow-100
                                     rounded-full">
                      Investigational
                    </span>
                  )}

                  {result.error && (
                    <span className="text-xs text-red-400">
                      Lookup failed
                    </span>
                  )}
                </div>

                <span className="text-gray-400 text-xs shrink-0 ml-2">
                  {expanded === index ? "▲ Hide" : "▼ Show"} // ✅ use index
                </span>
              </button>

              {/* ── Expanded panel ── */}
              {expanded === index && ( // ✅ use index

                <div className="border-t border-gray-100">

                 {/* ── CASE 1: Found in FDA / ChEMBL / PubChem / AI ── */}
{result.found && result.info && result.info.source !== "wikipedia" && (
                    <div className="px-4 pb-4 space-y-4 bg-gray-50">

                      {result.info.summary && (
                        <div className="pt-4 pb-3 border-b border-gray-200">
                          <h3 className="text-xs font-semibold text-gray-500
                                         uppercase tracking-wider mb-2">
                            What is this drug?
                          </h3>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {result.info.summary}
                          </p>
                        </div>
                      )}

                      {result.info.mechanismOfAction && (
                        <div className={result.info.summary ? "" : "pt-4"}>
                          <h3 className="text-xs font-semibold text-gray-500
                                         uppercase tracking-wider mb-2">
                            Mechanism of Action
                          </h3>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {result.info.mechanismOfAction}
                          </p>
                        </div>
                      )}

                      {result.info.pharmacodynamics && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500
                                         uppercase tracking-wider mb-2">
                            Pharmacodynamics
                          </h3>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {result.info.pharmacodynamics}
                          </p>
                        </div>
                      )}

                      {!result.info.mechanismOfAction &&
                        result.info.indications && (
                        <div className={result.info.summary ? "" : "pt-4"}>
                          <h3 className="text-xs font-semibold text-gray-500
                                         uppercase tracking-wider mb-2">
                            Pharmacology Notes
                          </h3>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {result.info.indications}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 pt-2 text-xs
                                      text-gray-400 border-t border-gray-200">
                        {result.info.brandName && (
                          <span>
                            Brand:{" "}
                            <span className="text-gray-600 font-medium">
                              {result.info.brandName}
                            </span>
                          </span>
                        )}
                        {result.info.genericName && (
                          <span>
                            Generic:{" "}
                            <span className="text-gray-600 font-medium">
                              {result.info.genericName}
                            </span>
                          </span>
                        )}
                        {result.info.labelerName && (
                          <span>
                            Manufacturer:{" "}
                            <span className="text-gray-600 font-medium">
                              {result.info.labelerName}
                            </span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-400">
                        Source: {result.info.sourceLabel}
                      </p>
                    </div>
                  )}
{/* AI disclaimer */}
{result.info?.source === "ai" && (
  <div className="pt-3 pb-2 px-3 bg-violet-50 border border-violet-100
                  rounded-lg text-xs text-violet-700 flex items-start gap-2">
    <span className="shrink-0">⚠️</span>
    <span>
      AI-generated from training data including published literature,
      patents, and clinical trial records. Always verify with primary
      sources before clinical use.
    </span>
  </div>
)}

                  {/* ── CASE 2: Wikipedia only ── */}
                  {result.found &&
                    result.info &&
                    result.info.source === "wikipedia" && (
                    <div className="px-4 py-4 bg-amber-50 space-y-3">
                      <div>
                        <h3 className="text-xs font-semibold text-amber-700
                                       uppercase tracking-wider mb-2">
                          About this drug
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {result.info.summary}
                        </p>
                      </div>

                      <p className="text-xs text-amber-700">
                        No entry found in FDA, ChEMBL, or PubChem — this is
                        likely an investigational compound.
                      </p>

                      <div>
                        <p className="text-xs font-medium text-amber-800 mb-2">
                          Search for more detail:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(result.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 bg-white border
                                       border-amber-300 rounded-lg text-amber-800
                                       hover:bg-amber-100 transition-colors"
                          >
                            PubChem ↗
                          </a>
                          <a
                            href={`https://www.ebi.ac.uk/chembl/g/#search_results/compounds/${encodeURIComponent(result.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 bg-white border
                                       border-amber-300 rounded-lg text-amber-800
                                       hover:bg-amber-100 transition-colors"
                          >
                            ChEMBL ↗
                          </a>
                          <a
                            href={`https://en.wikipedia.org/wiki/${encodeURIComponent(result.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 bg-white border
                                       border-amber-300 rounded-lg text-amber-800
                                       hover:bg-amber-100 transition-colors"
                          >
                            Wikipedia ↗
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── CASE 3: Not found ── */}
                  {!result.found && !result.error && (
                    <div className="px-4 py-4 bg-yellow-50">
                      <p className="text-sm text-yellow-800 mb-1">
                        <span className="font-medium">{result.name}</span> was
                        not found in any database.
                      </p>
                      <p className="text-sm text-yellow-700 mb-3">
                        This may be a very early-stage or proprietary compound.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(result.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 bg-white border
                                     border-yellow-300 rounded-lg text-yellow-800
                                     hover:bg-yellow-100 transition-colors"
                        >
                          PubChem ↗
                        </a>
                        <a
                          href={`https://www.ebi.ac.uk/chembl/g/#search_results/compounds/${encodeURIComponent(result.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 bg-white border
                                     border-yellow-300 rounded-lg text-yellow-800
                                     hover:bg-yellow-100 transition-colors"
                        >
                          ChEMBL ↗
                        </a>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(result.name + " mechanism of action")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 bg-white border
                                     border-yellow-300 rounded-lg text-yellow-800
                                     hover:bg-yellow-100 transition-colors"
                        >
                          Google ↗
                        </a>
                      </div>
                    </div>
                  )}

                  {/* ── CASE 4: Error ── */}
                  {result.error && (
                    <div className="px-4 py-3 bg-red-50">
                      <p className="text-sm text-red-700">
                        Could not retrieve data for {result.name}.
                        Please try again.
                      </p>
                    </div>
                  )}

                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
          Data from FDA openFDA, EMBL-EBI ChEMBL, NIH PubChem, and Wikipedia.
          All free — no tokens used.
        </p>
      )}

    </section>
  );
}