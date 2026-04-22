"use client";

import TrialModal from "@/components/TrialModal";
import SummaryPage, { SummaryData } from "@/components/SummaryPage";
import FilterPage from "@/components/FilterPage";
import { useState } from "react";
import CompoundBadge from "@/components/CompoundBadge";

// Detects strings that look like compound codes
// e.g. JNJ-2113, TAK-279, BMS-986325, VIB7734, CABA-201
function isCompoundCode(name: string): boolean {
  return /^[A-Z]{2,}-?\d{3,}/i.test(name.trim());
}

// Extract intervention names from a trial title
function extractCompoundCodes(title: string): string[] {
  const matches = title.match(/[A-Z]{2,}-?\d{3,}[A-Z0-9-]*/gi) ?? [];
  return [...new Set(matches)];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  ACTIVE_NOT_RECRUITING:   "Active, Not Recruiting",
  COMPLETED:               "Completed",
  ENROLLING_BY_INVITATION: "Enrolling by Invitation",
  NOT_YET_RECRUITING:      "Not Yet Recruiting",
  RECRUITING:              "Recruiting",
  SUSPENDED:               "Suspended",
  TERMINATED:              "Terminated",
  WITHDRAWN:               "Withdrawn",
};

const PHASE_LABELS: Record<string, string> = {
  EARLY_PHASE1: "Early Phase 1",
  PHASE1:       "Phase 1",
  PHASE2:       "Phase 2",
  PHASE3:       "Phase 3",
  PHASE4:       "Phase 4",
  NA:           "N/A",
};

function formatStatus(s: string) { return STATUS_LABELS[s] ?? s; }
function formatPhase(p: string)  { return PHASE_LABELS[p]  ?? p; }

const STATUS_STYLES: Record<string, string> = {
  RECRUITING:            "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED:             "bg-gray-100 text-gray-600 border-gray-200",
  ACTIVE_NOT_RECRUITING: "bg-amber-50 text-amber-700 border-amber-200",
  NOT_YET_RECRUITING:    "bg-blue-50 text-blue-700 border-blue-200",
  TERMINATED:            "bg-red-50 text-red-700 border-red-200",
  SUSPENDED:             "bg-orange-50 text-orange-700 border-orange-200",
  WITHDRAWN:             "bg-red-50 text-red-700 border-red-200",
};

// ── Region → countries mapping ────────────────────────────────────────────────
const REGION_COUNTRIES: Record<string, string[]> = {
  "north-america": [
    "United States", "Canada", "Mexico",
  ],
  "europe": [
    "United Kingdom", "Germany", "France", "Spain", "Italy",
    "Netherlands", "Belgium", "Sweden", "Switzerland", "Denmark",
    "Norway", "Finland", "Austria", "Poland", "Portugal",
    "Czech Republic", "Hungary", "Romania", "Greece", "Ireland",
    "Russia", "Ukraine", "Serbia", "Croatia", "Slovakia",
    "Bulgaria", "Lithuania", "Latvia", "Estonia", "Slovenia",
  ],
  "asia-pacific": [
    "China", "Japan", "South Korea", "Australia", "India",
    "Singapore", "Taiwan", "Hong Kong", "New Zealand", "Thailand",
    "Malaysia", "Indonesia", "Philippines", "Vietnam", "Pakistan",
  ],
  "middle-east-africa": [
    "Israel", "Saudi Arabia", "United Arab Emirates", "Turkey",
    "South Africa", "Egypt", "Jordan", "Lebanon", "Kuwait",
    "Qatar", "Bahrain", "Oman", "Nigeria", "Kenya", "Morocco",
  ],
  "latin-america": [
    "Brazil", "Argentina", "Colombia", "Chile", "Mexico",
    "Peru", "Venezuela", "Ecuador", "Bolivia", "Uruguay",
  ],
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Trial {
  protocolSection: {
    identificationModule:       { nctId: string; briefTitle: string };
    statusModule:               { overallStatus: string };
    conditionsModule?:          { conditions?: string[] };
    designModule?:              { phases?: string[]; enrollmentInfo?: { count: number } };
    descriptionModule?:         { briefSummary?: string };
    sponsorCollaboratorsModule: { leadSponsor: { name: string } };
    contactsLocationsModule?:   {
      locations?: Array<{ country?: string; city?: string; state?: string }>;
    };
  };
}

// ── Filter helper ─────────────────────────────────────────────────────────────
function applyFilters(
  trials: Trial[],
  regions: string[],
  phases: string[]
): Trial[] {
  return trials.filter((trial) => {
    // Phase filter
    if (phases.length > 0) {
      const trialPhases = trial.protocolSection.designModule?.phases ?? [];
      const phaseMatch  = phases.some((p) => trialPhases.includes(p));
      if (!phaseMatch) return false;
    }

// Region filter
if (regions.length > 0) {
  const locations = trial.protocolSection.contactsLocationsModule?.locations ?? [];

  // No location data in bulk search — don't exclude these trials
  if (locations.length > 0) {
    const countries = locations.map((l) => l.country ?? "");
    const regionMatch = regions.some((regionId) => {
      const allowed = REGION_COUNTRIES[regionId] ?? [];
      return countries.some((c) => allowed.includes(c));
    });
    if (!regionMatch) return false;
  }
}

    return true;
  });
}

const PAGE_SIZE = 20;

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [selectedNctId, setSelectedNctId]   = useState<string | null>(null);
  const [query, setQuery]                   = useState("");
  const [allTrials, setAllTrials]           = useState<Trial[]>([]);
  const [trials, setTrials]                 = useState<Trial[]>([]);
  const [displayCount, setDisplayCount]     = useState(PAGE_SIZE);
  const [loading, setLoading]               = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [error, setError]                   = useState("");
  const [lastSearched, setLastSearched]     = useState("");
  const [nextPageToken, setNextPageToken]   = useState<string | null>(null);
  const [totalCount, setTotalCount]         = useState<number | null>(null);
  const [extractedTerms, setExtractedTerms] = useState<any>(null);
  const [step, setStep]                     = useState<"home" | "summary" | "filter" | "trials">("home");
  const [summaryData, setSummaryData]       = useState<SummaryData | null>(null);
  const [activeRegions, setActiveRegions]   = useState<string[]>([]);
  const [activePhases, setActivePhases]     = useState<string[]>([]);

  // ── Search ─────────────────────────────────────────────────────────────────
  async function runSearch(term: string) {
    setLoading(true);
    setError("");
    setStep("home");
    setAllTrials([]);
    setTrials([]);
    setDisplayCount(PAGE_SIZE);
    setNextPageToken(null);
    setTotalCount(null);
    setExtractedTerms(null);
    setSummaryData(null);
    setActiveRegions([]);
    setActivePhases([]);

    try {
      const [summaryRes, trialsRes] = await Promise.all([
        fetch(`/api/summary?q=${encodeURIComponent(term)}`),
        fetch(`/api/trials?q=${encodeURIComponent(term)}&pageSize=20`,
          { cache: "no-store" }),
      ]);

      if (summaryRes.ok) {
        const json = await summaryRes.json();
        setSummaryData(json);
      }

      if (!trialsRes.ok) throw new Error("Search failed");
      const data = await trialsRes.json();

      const studies = data.studies ?? [];
      setAllTrials(studies);
      setTrials(studies.slice(0, PAGE_SIZE));
      setDisplayCount(PAGE_SIZE);
      setNextPageToken(data.nextPageToken ?? null);
      setTotalCount(data.totalCount ?? studies.length ?? 0);
      setLastSearched(term);
      setExtractedTerms(data.extractedTerms ?? null);
      setStep("summary");

    } catch {
      setError("Could not load trials right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Apply filters and go to trials ─────────────────────────────────────────
  function handleApplyFilters(regions: string[], phases: string[]) {
    setActiveRegions(regions);
    setActivePhases(phases);

    const filtered = applyFilters(allTrials, regions, phases);
    setTrials(filtered.slice(0, PAGE_SIZE));
    setDisplayCount(PAGE_SIZE);
    setTotalCount(filtered.length);
    setStep("trials");
  }

  function handleSkipFilters() {
    setTrials(allTrials.slice(0, PAGE_SIZE));
    setDisplayCount(PAGE_SIZE);
    setTotalCount(allTrials.length);
    setStep("trials");
  }

  // ── Load more ───────────────────────────────────────────────────────────────
  function loadMore() {
    const source = activeRegions.length > 0 || activePhases.length > 0
      ? applyFilters(allTrials, activeRegions, activePhases)
      : allTrials;

    const newCount = displayCount + PAGE_SIZE;
    setTrials(source.slice(0, newCount));
    setDisplayCount(newCount);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) runSearch(query.trim());
  }

  // ── Nav ─────────────────────────────────────────────────────────────────────
  const Nav = () => (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm
                    sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => { setStep("home"); setQuery(""); }}
          className="flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center
                          justify-center">
            <span className="text-white text-xs font-bold">OT</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">OpenTrial</span>
        </button>

        <div className="flex items-center gap-4">
          {step === "filter" && (
            <button
              onClick={() => setStep("summary")}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Back to summary
            </button>
          )}
          {step === "trials" && (
            <button
              onClick={() => setStep("filter")}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Back to filters
            </button>
          )}
          <span className="text-xs text-gray-400">
            Powered by ClinicalTrials.gov
          </span>
        </div>
      </div>
    </nav>
  );

  // ── Summary step ────────────────────────────────────────────────────────────
  if (step === "summary" && summaryData && !loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8]">
        <Nav />
        <SummaryPage
          query={lastSearched}
          summaryData={summaryData}
          trialCount={totalCount ?? allTrials.length}
          onBrowseTrials={() => setStep("filter")}
        />
      </div>
    );
  }

  // ── Filter step ─────────────────────────────────────────────────────────────
  if (step === "filter" && !loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8]">
        <Nav />
        <FilterPage
          trialCount={allTrials.length}
          onApplyFilters={handleApplyFilters}
          onSkip={handleSkipFilters}
        />
      </div>
    );
  }

  // ── Home + Trials ────────────────────────────────────────────────────────────
  const showTrials = step === "trials";

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <Nav />

      <main className="max-w-5xl mx-auto px-6">

        {/* Hero */}
        <div className={`transition-all duration-700 ease-in-out ${
          showTrials ? "py-8" : "py-28"
        }`}>
          {!showTrials && (
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5
                              bg-gray-100 rounded-full text-xs text-gray-500
                              font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                AI-powered clinical trial search
              </div>
              <h1 className="text-5xl font-bold text-gray-900 mb-4
                             tracking-tight leading-tight">
                Find the right trial
                <br />
                <span className="text-gray-400">for your patient</span>
              </h1>
              <p className="text-gray-500 text-lg max-w-xl mx-auto">
                Search in plain language. Ask like you would a colleague.
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={`mx-auto transition-all duration-700 ${
              showTrials ? "max-w-3xl" : "max-w-2xl"
            }`}
          >
            <div className="relative flex items-center bg-white border
                            border-gray-200 rounded-2xl shadow-lg shadow-gray-100
                            hover:shadow-xl hover:shadow-gray-200 transition-shadow">
              <div className="pl-5 pr-3 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={showTrials
                  ? "Search again..."
                  : "e.g. IL-23 trials for psoriasis after anti-TNF failure"}
                className="flex-1 py-4 pr-4 text-base bg-transparent
                           text-gray-900 placeholder-gray-300 focus:outline-none"
              />
              <div className="pr-2">
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="px-5 py-2.5 bg-gray-900 text-white text-sm
                             font-medium rounded-xl hover:bg-gray-700
                             disabled:opacity-30 disabled:cursor-not-allowed
                             transition-all"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none"
                        viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Searching
                    </span>
                  ) : "Search"}
                </button>
              </div>
            </div>

            {!showTrials && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {[
                  "psoriasis biologic naive phase 3",
                  "Crohn's disease IL-23 recruiting",
                  "ulcerative colitis JAK inhibitor",
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => { setQuery(example); runSearch(example); }}
                    className="px-3 py-1.5 text-xs text-gray-500 bg-white
                               border border-gray-200 rounded-full
                               hover:border-gray-400 hover:text-gray-700
                               transition-all"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-50 border
                          border-red-100 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Trials view */}
        {showTrials && (
          <>
            {/* Active filter pills */}
            {(activeRegions.length > 0 || activePhases.length > 0) && (
              <div className="max-w-3xl mx-auto mb-4 flex flex-wrap gap-2
                              items-center">
                <span className="text-xs text-gray-400">Filtered by:</span>
                {activeRegions.map((r) => (
                  <span key={r} className="text-xs px-2.5 py-1 bg-gray-900
                                           text-white rounded-full font-medium">
                    {r.replace("-", " ")}
                  </span>
                ))}
                {activePhases.map((p) => (
                  <span key={p} className="text-xs px-2.5 py-1 bg-gray-900
                                           text-white rounded-full font-medium">
                    {PHASE_LABELS[p] ?? p}
                  </span>
                ))}
                <button
                  onClick={() => setStep("filter")}
                  className="text-xs text-gray-400 hover:text-gray-600
                             underline transition-colors"
                >
                  Edit filters
                </button>
              </div>
            )}

            {/* Result count */}
            {!loading && trials.length > 0 && totalCount !== null && (
              <div className="mb-4">
                <p className="text-sm text-gray-400">
                  Showing{" "}
                  <span className="font-medium text-gray-600">
                    {trials.length}
                  </span>
                  {" "}of{" "}
                  <span className="font-medium text-gray-600">
                    {totalCount.toLocaleString()}
                  </span>
                  {" "}trials for{" "}
                  <span className="font-medium text-gray-700">
                    "{lastSearched}"
                  </span>
                </p>
              </div>
            )}

            {/* No results */}
            {!loading && trials.length === 0 && !error && (
              <div className="text-center py-20">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex
                                items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none"
                    stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01
                         M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium mb-1">
                  No trials match these filters
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Try adjusting your region or phase selection
                </p>
                <button
                  onClick={() => setStep("filter")}
                  className="text-sm text-blue-600 hover:underline"
                >
                  ← Adjust filters
                </button>
              </div>
            )}

            {/* Trial cards */}
            {!loading && trials.length > 0 && (
              <div className="space-y-3 pb-16">
                {trials.map((trial) => {
                  const id   = trial.protocolSection.identificationModule;
                  const stat = trial.protocolSection.statusModule;
                  const cond = trial.protocolSection.conditionsModule;
                  const des  = trial.protocolSection.designModule;
                  const desc = trial.protocolSection.descriptionModule;
                  const spon = trial.protocolSection.sponsorCollaboratorsModule;
                  const locs = trial.protocolSection.contactsLocationsModule;

                  // Count unique countries
                  const countries = [...new Set(
                    (locs?.locations ?? []).map((l) => l.country).filter(Boolean)
                  )];

                  return (
                    <div
                      key={id.nctId}
                      onClick={() => setSelectedNctId(id.nctId)}
                      className="bg-white border border-gray-200 rounded-2xl p-5
                                 hover:border-gray-300 hover:shadow-lg
                                 hover:shadow-gray-100 cursor-pointer
                                 transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono text-gray-400">
                              {id.nctId}
                            </span>
                            {des?.phases?.map((p) => (
                              <span key={p}
                                className="text-xs px-2 py-0.5 bg-gray-100
                                           text-gray-600 rounded-full font-medium">
                                {formatPhase(p)}
                              </span>
                            ))}
                          </div>

                          <h2 className="font-semibold text-gray-900 text-sm
                                         leading-snug mb-2
                                         group-hover:text-blue-600
                                         transition-colors">
                            {id.briefTitle}
                          </h2>

                          {desc?.briefSummary && (
                            <p className="text-xs text-gray-500 line-clamp-2
                                          leading-relaxed mb-3">
                              {desc.briefSummary}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-1.5">
                            {cond?.conditions?.slice(0, 3).map((c) => (
                              <span key={c}
                                className="text-xs px-2.5 py-0.5 bg-purple-50
                                           text-purple-700 border border-purple-100
                                           rounded-full">
                                {c}
                              </span>
                            ))}
                            {/* Auto-resolve compound codes from title */}
{extractCompoundCodes(id.briefTitle).map((code) => (
  <CompoundBadge key={code} code={code} />
))}
                            {(cond?.conditions?.length ?? 0) > 3 && (
                              <span className="text-xs text-gray-400 self-center">
                                +{(cond?.conditions?.length ?? 0) - 3} more
                              </span>
                            )}
                            {/* Country count */}
                            {countries.length > 0 && (
                              <span className="text-xs px-2.5 py-0.5
                                               bg-blue-50 text-blue-600
                                               border border-blue-100
                                               rounded-full">
                                🌍 {countries.length} countr{countries.length > 1 ? "ies" : "y"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`text-xs px-2.5 py-1 rounded-full
                                            font-medium border ${
                            STATUS_STYLES[stat.overallStatus] ??
                            "bg-gray-100 text-gray-600 border-gray-200"
                          }`}>
                            {formatStatus(stat.overallStatus)}
                          </span>
                          {des?.enrollmentInfo?.count && (
                            <span className="text-xs text-gray-400">
                              {des.enrollmentInfo.count.toLocaleString()} pts
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4
                                      pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 truncate">
                          {spon.leadSponsor.name}
                        </p>
                        <span className="text-xs text-gray-300
                                         group-hover:text-blue-400
                                         transition-colors shrink-0 ml-2">
                          View details →
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Load more */}
                {displayCount < (
                  activeRegions.length > 0 || activePhases.length > 0
                    ? applyFilters(allTrials, activeRegions, activePhases).length
                    : allTrials.length
                ) && (
                  <div className="pt-4 flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-6 py-3 bg-white border border-gray-200
                                 text-gray-600 text-sm font-medium rounded-xl
                                 hover:border-gray-300 hover:bg-gray-50
                                 disabled:opacity-40 transition-all"
                    >
                      {loadingMore
                        ? "Loading more…"
                        : `Load more trials`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {selectedNctId && (
        <TrialModal
          nctId={selectedNctId}
          onClose={() => setSelectedNctId(null)}
        />
      )}
    </div>
  );
}