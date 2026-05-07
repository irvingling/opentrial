"use client";

import TrialModal from "@/components/TrialModal";
import TrialCompare from "@/components/TrialCompare";
import ProgressSteps, { ProgressStep } from "@/components/ProgressSteps";
import EvidencePage from "@/components/EvidencePage";
import {
  extractCountryFromText,
  filterTrialIdsByCountry,
  getNeighborCountries,
} from "@/lib/locationUtils";
import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SummaryData {
  tags: Array<{ label: string; color: string }>;
  guidelineSummary: {
    sources:         string[];
    keyPoint:        string;
    recommendations: Array<{
      label:    string;
      note?:    string;
      detail?:  string;
      dotColor: string;
    }>;
    statCallout: { value: string; description: string } | null;
  };
  whyTrial: string[];
}

interface CompareData {
  trials:           any[];
  recommendation:   string;
  followUpQuestion: string;
  patientContext:   string;
}

interface Trial {
  protocolSection: {
    identificationModule:       { nctId: string; briefTitle: string };
    statusModule:               { overallStatus: string };
    conditionsModule?:          { conditions?: string[] };
    designModule?:              {
      phases?: string[];
      enrollmentInfo?: { count: number };
    };
    descriptionModule?:         { briefSummary?: string };
    sponsorCollaboratorsModule: { leadSponsor: { name: string } };
    contactsLocationsModule?:   {
      locations?: Array<{
        country?: string;
        city?:    string;
        state?:   string;
      }>;
    };
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SEARCH_STEPS: ProgressStep[] = [
  {
    id:     "understand",
    label:  "Understanding your query",
    detail: "Extracting condition, treatment history and patient context",
    icon:   "🔍",
  },
  {
    id:     "strategy",
    label:  "Building search strategy",
    detail: "Identifying mechanisms, drug classes and synonyms",
    icon:   "🧬",
  },
  {
    id:     "search",
    label:  "Searching ClinicalTrials.gov",
    detail: "Running parallel searches across all relevant mechanisms",
    icon:   "🏥",
  },
  {
    id:     "guidelines",
    label:  "Reviewing treatment guidelines",
    detail: "Cross-referencing AAD, EULAR, NCCN and disease-specific guidelines",
    icon:   "📋",
  },
  {
    id:     "rank",
    label:  "Ranking best matches",
    detail: "Scoring trials by relevance, phase and patient fit",
    icon:   "🏆",
  },
];

const PHASE_PILLS = [
  { id: "PHASE3",       label: "Phase 3",  desc: "Large-scale · Strongest evidence" },
  { id: "PHASE2",       label: "Phase 2",  desc: "Mid-stage · Promising data" },
  { id: "PHASE1",       label: "Phase 1",  desc: "Early · Novel access" },
  { id: "EARLY_PHASE1", label: "Phase 1b", desc: "First-in-human" },
  { id: "PHASE4",       label: "Phase 4",  desc: "Post-approval" },
];

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

const PHASE_SCORE: Record<string, number> = {
  PHASE4: 5, PHASE3: 4, PHASE2: 3, PHASE1: 2, EARLY_PHASE1: 1, NA: 0,
};

const STATUS_SCORE: Record<string, number> = {
  RECRUITING: 3, NOT_YET_RECRUITING: 2, ACTIVE_NOT_RECRUITING: 1,
};

const STATUS_STYLES: Record<string, string> = {
  RECRUITING:            "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED:             "bg-gray-100 text-gray-600 border-gray-200",
  ACTIVE_NOT_RECRUITING: "bg-amber-50 text-amber-700 border-amber-200",
  NOT_YET_RECRUITING:    "bg-blue-50 text-blue-700 border-blue-200",
  TERMINATED:            "bg-red-50 text-red-700 border-red-200",
  SUSPENDED:             "bg-orange-50 text-orange-700 border-orange-200",
  WITHDRAWN:             "bg-red-50 text-red-700 border-red-200",
};

const PAGE_SIZE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatStatus(s: string) { return STATUS_LABELS[s] ?? s; }
function formatPhase(p: string)  { return PHASE_LABELS[p]  ?? p; }

function rankTrials(trials: Trial[]): Trial[] {
  return [...trials].sort((a, b) => {
    const scoreOf = (t: Trial) => {
      const phases = t.protocolSection.designModule?.phases ?? [];
      const status = t.protocolSection.statusModule.overallStatus;
      const phase  = Math.max(...phases.map((p) => PHASE_SCORE[p] ?? 0), 0);
      const stat   = STATUS_SCORE[status] ?? 0;
      return phase * 3 + stat * 2;
    };
    return scoreOf(b) - scoreOf(a);
  });
}

function applyPhaseFilter(trials: Trial[], phases: string[]): Trial[] {
  if (phases.length === 0) return trials;
  return trials.filter((t) => {
    const trialPhases = t.protocolSection.designModule?.phases ?? [];
    return phases.some((p) => trialPhases.includes(p));
  });
}

function applyLocationToTrials(
  ranked:        Trial[],
  targetCountry: string | null
): {
  filteredIds:       string[];
  exactCount:        number;
  noDataCount:       number;
  nearbyCountries:   string[];
  hasLocationFilter: boolean;
} {
  if (!targetCountry) {
    return {
      filteredIds:       ranked.map((t) => t.protocolSection.identificationModule.nctId),
      exactCount:        0,
      noDataCount:       0,
      nearbyCountries:   [],
      hasLocationFilter: false,
    };
  }

  const input = ranked.map((t) => ({
    nctId:     t.protocolSection.identificationModule.nctId,
    locations: t.protocolSection.contactsLocationsModule?.locations ?? [],
  }));

  const { exactIds, noDataIds, nearbyIds, nearbyCountriesFound } =
    filterTrialIdsByCountry(input, targetCountry);

  const exactSet  = new Set(exactIds);
  const noDataSet = new Set(noDataIds);
  const nearbySet = new Set(nearbyIds);

  const orderedExact  = ranked.filter((t) => exactSet.has(t.protocolSection.identificationModule.nctId));
  const orderedNoData = ranked.filter((t) => noDataSet.has(t.protocolSection.identificationModule.nctId));
  const orderedNearby = ranked.filter((t) => nearbySet.has(t.protocolSection.identificationModule.nctId));

  let finalList: Trial[];
  if (exactIds.length > 0) {
    finalList = [...orderedExact, ...orderedNoData];
  } else if (nearbyIds.length > 0 || noDataIds.length > 0) {
    finalList = [...orderedNoData, ...orderedNearby];
  } else {
    finalList = ranked;
  }

  return {
    filteredIds:       finalList.map((t) => t.protocolSection.identificationModule.nctId),
    exactCount:        exactIds.length,
    noDataCount:       noDataIds.length,
    nearbyCountries:   nearbyCountriesFound,
    hasLocationFilter: true,
  };
}

// ── Clarify step ──────────────────────────────────────────────────────────────
function ClarifyStep({
  query,
  clarifyInput,
  setClarifyInput,
  selectedPhases,
  togglePhase,
  onSubmit,
  onSkip,
  inputRef,
}: {
  query:           string;
  clarifyInput:    string;
  setClarifyInput: (v: string) => void;
  selectedPhases:  string[];
  togglePhase:     (id: string) => void;
  onSubmit:        () => void;
  onSkip:          () => void;
  inputRef:        React.RefObject<HTMLTextAreaElement | null>;
}) {
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-12">

      {/* Query echo */}
      <div className="flex justify-end mb-6">
        <div className="bg-gray-900 text-white rounded-2xl rounded-tr-sm
                        px-4 py-3 max-w-sm">
          <p className="text-sm">{query}</p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm
                      overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center
                            justify-center text-sm font-bold text-gray-600">
              OT
            </div>
            <p className="text-sm font-semibold text-gray-900">
              Tell me about your patient
            </p>
          </div>
          <p className="text-xs text-gray-400 ml-11">
            Optional — helps personalise results. Or skip to see all matches.
          </p>
        </div>

        {/* Patient details */}
        <div className="px-6 pt-4 pb-3">
          <textarea
            ref={inputRef}
            value={clarifyInput}
            onChange={(e) => setClarifyInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 52yo female, based in London, prefers oral, mild renal impairment…"
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-gray-200
                       rounded-xl bg-gray-50 focus:outline-none
                       focus:border-gray-400 focus:bg-white text-gray-800
                       placeholder-gray-300 resize-none transition-colors"
          />
        </div>

        {/* Phase pills */}
        <div className="px-6 pb-5">
          <p className="text-xs text-gray-400 mb-2.5">
            Trial phase preference
            <span className="ml-1.5 text-gray-300">(leave blank = show all)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {PHASE_PILLS.map((phase) => {
              const selected = selectedPhases.includes(phase.id);
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => togglePhase(phase.id)}
                  className={`flex flex-col px-3 py-2 rounded-xl border text-left
                              transition-all ${
                    selected
                      ? "border-gray-900 bg-gray-900"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <span className={`text-xs font-semibold ${
                    selected ? "text-white" : "text-gray-700"
                  }`}>
                    {phase.label}
                  </span>
                  <span className="text-xs text-gray-400">{phase.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-4
                        border-t border-gray-100 bg-gray-50">
          <button
            onClick={onSkip}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip — show all results
          </button>
          <button
            onClick={onSubmit}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gray-900
                       text-white text-sm font-medium rounded-xl
                       hover:bg-gray-700 transition-colors"
          >
            Search
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-300 text-center mt-3">
        Press Enter to search · Shift+Enter for new line
      </p>
    </main>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [step, setStep] = useState<"home" | "clarify" | "loading" | "results">("home");

  const [query, setQuery]                   = useState("");
  const [patientContext, setPatientContext] = useState("");
  const [clarifyInput, setClarifyInput]     = useState("");
  const [selectedPhases, setSelectedPhases] = useState<string[]>([]);
  const clarifyInputRef                     = useRef<HTMLTextAreaElement | null>(null);
  const prefetchDone                        = useRef(false);
  const [searchStep, setSearchStep]         = useState(0);
  const [compareData, setCompareData]       = useState<CompareData | null>(null);

  const [allTrials, setAllTrials]       = useState<Trial[]>([]);
  const [trials, setTrials]             = useState<Trial[]>([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [totalCount, setTotalCount]     = useState<number | null>(null);
  const [lastSearched, setLastSearched] = useState("");
  const [summaryData, setSummaryData]   = useState<SummaryData | null>(null);
  const [allRankedIds, setAllRankedIds] = useState<string[]>([]);
  const [topPicksIds, setTopPicksIds]   = useState<string[]>([]);
  const [trialsTab, setTrialsTab]       = useState<"compare" | "all">("compare");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError]               = useState("");
  const [selectedNctId, setSelectedNctId] = useState<string | null>(null);

  const [extractedCountry, setExtractedCountry]     = useState<string | null>(null);
  const [locationExactCount, setLocationExactCount] = useState(0);
  const [locationNearby, setLocationNearby]         = useState<string[]>([]);
  const [hasLocationFilter, setHasLocationFilter]   = useState(false);

  const [bottomPanel, setBottomPanel] = useState<null | "guidelines" | "evidence">(null);

  // ── Apply location + phase filters ───────────────────────────────────────
  function applyFiltersAndSetIds(
    ranked:   Trial[],
    context:  string,
    queryStr: string,
    phases:   string[]
  ) {
    const country = extractCountryFromText(context) ??
                    extractCountryFromText(queryStr);
    setExtractedCountry(country);

    const phaseFiltered = applyPhaseFilter(ranked, phases);

    const {
      filteredIds,
      exactCount,
      nearbyCountries,
      hasLocationFilter: hasFilter,
    } = applyLocationToTrials(phaseFiltered, country);

    setLocationExactCount(exactCount);
    setLocationNearby(nearbyCountries);
    setHasLocationFilter(hasFilter && country !== null);
    setAllRankedIds(filteredIds);
    setTopPicksIds(filteredIds.slice(0, 5));
  }

  // ── Prefetch ──────────────────────────────────────────────────────────────
  async function prefetchSearch(term: string) {
    prefetchDone.current = false;
    setCompareData(null);
    try {
      const [summaryRes, trialsRes] = await Promise.all([
        fetch(`/api/summary?q=${encodeURIComponent(term)}`),
        fetch(`/api/trials?q=${encodeURIComponent(term)}&pageSize=20`, { cache: "no-store" }),
      ]);

      if (summaryRes.ok) setSummaryData(await summaryRes.json());
      if (!trialsRes.ok) return;

      const data    = await trialsRes.json();
      const studies = data.studies ?? [];
      const ranked  = rankTrials(studies);

      setAllTrials(ranked);
      setTrials(ranked.slice(0, PAGE_SIZE));
      setDisplayCount(PAGE_SIZE);
      setTotalCount(data.totalCount ?? studies.length ?? 0);
      setLastSearched(term);
      setTrialsTab("compare");

      const allIds = ranked.map((t) => t.protocolSection.identificationModule.nctId);
      setAllRankedIds(allIds);
      setTopPicksIds(allIds.slice(0, 5));
      prefetchDone.current = true;

      // Pre-fetch compare in background while clinician is on clarify screen
      const top5 = allIds.slice(0, 5);
      if (top5.length > 0) {
        fetch("/api/compare", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ nctIds: top5, query: term }),
        })
          .then((r) => r.json())
          .then((d) => { if (!d.error) setCompareData(d); })
          .catch(() => {});
      }
    } catch {}
  }

  // ── Full search (used when prefetch missed or user added context) ─────────
  async function runSearch(
    term:    string,
    context: string,
    phases:  string[],
    refresh = false
  ) {
    setStep("loading");
    setSearchStep(0);
    setError("");
    setAllTrials([]);
    setTrials([]);
    setDisplayCount(PAGE_SIZE);
    setTotalCount(null);
    setSummaryData(null);
    setAllRankedIds([]);
    setTopPicksIds([]);
    setBottomPanel(null);
    setExtractedCountry(null);
    setHasLocationFilter(false);
    setCompareData(null);
    prefetchDone.current = false;

    try {
      setSearchStep(0);
      await new Promise((r) => setTimeout(r, 500));
      setSearchStep(1);
      await new Promise((r) => setTimeout(r, 500));
      setSearchStep(2);

      const phaseContext = phases.length > 0
        ? `. Preferred phases: ${phases.map((p) => PHASE_LABELS[p] ?? p).join(", ")}`
        : "";

      const enrichedQuery = context
        ? `${term}. Additional patient context: ${context}${phaseContext}`
        : term + phaseContext;

      const refreshParam = refresh ? "&refresh=true" : "";

      const [summaryRes, trialsRes] = await Promise.all([
        fetch(`/api/summary?q=${encodeURIComponent(enrichedQuery)}${refreshParam}`),
        fetch(`/api/trials?q=${encodeURIComponent(enrichedQuery)}&pageSize=20${refreshParam}`, { cache: "no-store" }),
      ]);

      setSearchStep(3);
      if (summaryRes.ok) setSummaryData(await summaryRes.json());
      if (!trialsRes.ok) throw new Error("Search failed");

      const data    = await trialsRes.json();
      const studies = data.studies ?? [];

      setSearchStep(4);
      await new Promise((r) => setTimeout(r, 400));

      const ranked = rankTrials(studies);
      setAllTrials(ranked);
      setTrials(ranked.slice(0, PAGE_SIZE));
      setDisplayCount(PAGE_SIZE);
      setTotalCount(data.totalCount ?? studies.length ?? 0);
      setLastSearched(term);
      setPatientContext(context);
      setTrialsTab("compare");
      applyFiltersAndSetIds(ranked, context, term, phases);
      setStep("results");

    } catch {
      setError("Could not load trials. Please try again.");
      setStep("home");
    }
  }

  // ── Event handlers ────────────────────────────────────────────────────────
  function startSearch(term: string) {
    setClarifyInput("");
    setSelectedPhases([]);
    setAllTrials([]);
    setSummaryData(null);
    setCompareData(null);
    prefetchDone.current = false;
    setExtractedCountry(null);
    setHasLocationFilter(false);
    setStep("clarify");
    prefetchSearch(term);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    startSearch(query);
  }

  function handleClarifySubmit() {
    setPatientContext(clarifyInput);
    if (prefetchDone.current) {
      applyFiltersAndSetIds(allTrials, clarifyInput, query, selectedPhases);
      // If user added context, clear prefetched compare so it re-runs with context
      if (clarifyInput.trim()) setCompareData(null);
      setStep("results");
    } else {
      runSearch(query, clarifyInput, selectedPhases);
    }
  }

  function handleSkip() {
    setPatientContext("");
    if (prefetchDone.current) {
      applyFiltersAndSetIds(allTrials, "", query, []);
      setStep("results");
    } else {
      runSearch(query, "", []);
    }
  }

  function togglePhase(phaseId: string) {
    setSelectedPhases((prev) =>
      prev.includes(phaseId) ? prev.filter((p) => p !== phaseId) : [...prev, phaseId]
    );
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    setCompareData(null);
    await runSearch(lastSearched, patientContext, selectedPhases, true);
    setIsRefreshing(false);
  }

  function loadMore() {
    const newCount = displayCount + PAGE_SIZE;
    setTrials(allTrials.slice(0, newCount));
    setDisplayCount(newCount);
  }

  function clearLocationFilter() {
    setExtractedCountry(null);
    setHasLocationFilter(false);
    const filtered = applyPhaseFilter(allTrials, selectedPhases);
    const allIds   = filtered.map((t) => t.protocolSection.identificationModule.nctId);
    setAllRankedIds(allIds);
    setTopPicksIds(allIds.slice(0, 5));
  }

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (step === "home") {
    return (
      <div className="min-h-screen bg-[#fafaf8]">
        <Nav onHome={() => {}} />
        <main className="max-w-5xl mx-auto px-6 py-28">
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

          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <SearchBar
              value={query}
              onChange={setQuery}
              loading={false}
              placeholder="e.g. severe psoriasis failed anti-TNF, what trial options?"
            />
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {[
                "psoriasis biologic naive phase 3",
                "Crohn's disease IL-23 recruiting",
                "refractory lupus failed biologic",
              ].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => { setQuery(ex); startSearch(ex); }}
                  className="px-3 py-1.5 text-xs text-gray-500 bg-white
                             border border-gray-200 rounded-full
                             hover:border-gray-400 hover:text-gray-700
                             transition-all"
                >
                  {ex}
                </button>
              ))}
            </div>
          </form>
        </main>
      </div>
    );
  }

  // ── CLARIFY ───────────────────────────────────────────────────────────────
  if (step === "clarify") {
    return (
      <div className="min-h-screen bg-[#fafaf8]">
        <Nav onHome={() => { setStep("home"); setQuery(""); }} />
        <ClarifyStep
          query={query}
          clarifyInput={clarifyInput}
          setClarifyInput={setClarifyInput}
          selectedPhases={selectedPhases}
          togglePhase={togglePhase}
          onSubmit={handleClarifySubmit}
          onSkip={handleSkip}
          inputRef={clarifyInputRef}
        />
      </div>
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-[#fafaf8]">
        <Nav onHome={() => { setStep("home"); setQuery(""); }} />
        <main className="max-w-2xl mx-auto px-6">
          <ProgressSteps
            steps={SEARCH_STEPS}
            currentStep={searchStep}
            query={query}
            title="Searching for trials…"
          />
        </main>
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  const summaryDrugs = summaryData?.guidelineSummary?.recommendations.map((r) => r.label) ?? [];

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <Nav onHome={() => { setStep("home"); setQuery(""); }} />

      <main className="max-w-5xl mx-auto px-6 pb-16">

        {/* Compact search bar */}
        <div className="py-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) startSearch(query);
            }}
            className="max-w-3xl mx-auto"
          >
            <SearchBar
              value={query}
              onChange={setQuery}
              loading={false}
              placeholder="Search again…"
              compact
            />
          </form>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mb-4 p-4 bg-red-50 border
                          border-red-100 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Active filters */}
        {(patientContext || selectedPhases.length > 0 || hasLocationFilter) && (
          <div className="max-w-3xl mx-auto mb-4 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400">Active:</span>
            {extractedCountry && (
              <span className="text-xs px-2.5 py-1 bg-emerald-50
                               text-emerald-700 rounded-full font-medium">
                📍 {extractedCountry}
              </span>
            )}
            {selectedPhases.map((p) => (
              <span key={p}
                className="text-xs px-2.5 py-1 bg-gray-900 text-white
                           rounded-full font-medium">
                {PHASE_LABELS[p] ?? p}
              </span>
            ))}
            {patientContext && (
              <span className="text-xs text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full">
                ✓ Personalised
              </span>
            )}
            <button
              onClick={() => setStep("clarify")}
              className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
            >
              Edit
            </button>
          </div>
        )}

        {/* Location banner */}
        {hasLocationFilter && extractedCountry && (
          <div className="max-w-3xl mx-auto mb-4">
            {locationExactCount > 0 ? (
              <div className="flex items-center gap-2 px-4 py-3
                              bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-emerald-600 text-sm">📍</span>
                <p className="text-sm text-emerald-800">
                  <span className="font-semibold">
                    {locationExactCount} trial{locationExactCount !== 1 ? "s" : ""}
                  </span>
                  {" "}confirmed in{" "}
                  <span className="font-semibold">{extractedCountry}</span>
                  {" "}· Trials without location data also shown
                </p>
                <button
                  onClick={clearLocationFilter}
                  className="ml-auto text-xs text-emerald-600 hover:text-emerald-800
                             underline flex-shrink-0"
                >
                  Show all regions
                </button>
              </div>
            ) : locationNearby.length > 0 ? (
              <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 text-sm flex-shrink-0">📍</span>
                  <div className="flex-1">
                    <p className="text-sm text-amber-800 font-medium mb-1">
                      No confirmed trials found in {extractedCountry}
                    </p>
                    <p className="text-xs text-amber-700 mb-1">
                      Showing nearest countries with active sites:{" "}
                      <span className="font-semibold">{locationNearby.join(", ")}</span>
                    </p>
                    <p className="text-xs text-amber-600">
                      Trials without location data also included
                    </p>
                  </div>
                  <button
                    onClick={clearLocationFilter}
                    className="text-xs text-amber-600 hover:text-amber-800
                               underline flex-shrink-0 ml-2"
                  >
                    Show all
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 bg-gray-50 border border-gray-200
                              rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">📍</span>
                  <div>
                    <p className="text-sm text-gray-700 font-medium">
                      No confirmed trials near {extractedCountry}
                    </p>
                    <p className="text-xs text-gray-500">
                      Showing trials without confirmed location data
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearLocationFilter}
                  className="text-xs text-gray-500 hover:text-gray-700
                             underline flex-shrink-0 ml-4"
                >
                  Show all regions
                </button>
              </div>
            )}
          </div>
        )}

        {/* Guidelines + Evidence */}
        <div className="max-w-3xl mx-auto mb-6 space-y-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setBottomPanel(bottomPanel === "guidelines" ? null : "guidelines")}
              className="w-full flex items-center justify-between px-5 py-4
                         hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center
                                justify-center text-base">📋</div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm">Clinical Guidelines</p>
                  <p className="text-xs text-gray-400">
                    {summaryData?.guidelineSummary.sources.join(" · ") ?? "Loading…"}
                  </p>
                </div>
              </div>
              <span className="text-gray-400 text-xs">
                {bottomPanel === "guidelines" ? "▲ Hide" : "▼ Show"}
              </span>
            </button>

            {bottomPanel === "guidelines" && summaryData && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed my-4">
                  {summaryData.guidelineSummary.keyPoint}
                </p>
                <div className="flex flex-wrap gap-2">
                  {summaryData.guidelineSummary.recommendations.map((rec) => (
                    <span
                      key={rec.label}
                      className="flex items-center gap-1.5 px-3 py-1.5
                                 bg-gray-50 border border-gray-100
                                 rounded-full text-xs text-gray-700"
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        rec.dotColor === "green"  ? "bg-green-500"  :
                        rec.dotColor === "blue"   ? "bg-blue-500"   :
                        rec.dotColor === "orange" ? "bg-orange-400" :
                        rec.dotColor === "red"    ? "bg-red-400"    :
                        rec.dotColor === "purple" ? "bg-purple-500" :
                        "bg-gray-400"
                      }`} />
                      <span className="font-medium">{rec.label}</span>
                      {rec.note && <span className="text-gray-400">— {rec.note}</span>}
                    </span>
                  ))}
                </div>
                {summaryData.guidelineSummary.statCallout && (
                  <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-2xl font-bold text-blue-700">
                      {summaryData.guidelineSummary.statCallout.value}
                    </span>
                    <p className="text-xs text-blue-600 leading-relaxed">
                      {summaryData.guidelineSummary.statCallout.description}
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-4">
                  Source: {summaryData.guidelineSummary.sources.join(", ")} ·
                  AI-generated · not a substitute for clinical judgment
                </p>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setBottomPanel(bottomPanel === "evidence" ? null : "evidence")}
              className="w-full flex items-center justify-between px-5 py-4
                         hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center
                                justify-center text-base">🔬</div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm">Evidence Review</p>
                  <p className="text-xs text-gray-400">
                    Approved drugs · Emerging data · Phase 3 trial results
                  </p>
                </div>
              </div>
              <span className="text-gray-400 text-xs">
                {bottomPanel === "evidence" ? "▲ Hide" : "▼ Show"}
              </span>
            </button>

            {bottomPanel === "evidence" && summaryData && (
              <div className="border-t border-gray-100">
                <EvidencePage
                  query={lastSearched}
                  summaryDrugs={summaryDrugs}
                  onFindTrials={() => setBottomPanel(null)}
                  onBack={() => setBottomPanel(null)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Tab switcher + refresh */}
        <div className="max-w-3xl mx-auto mb-5 flex items-center
                        justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setTrialsTab("compare")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                trialsTab === "compare"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🏆 Top Picks
            </button>
            <button
              onClick={() => setTrialsTab("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                trialsTab === "all"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              All Trials
              {totalCount !== null && (
                <span className="ml-1.5 text-xs text-gray-400">({totalCount})</span>
              )}
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs text-gray-400
                       hover:text-gray-600 transition-colors disabled:opacity-40"
          >
            <svg
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11
                   11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Phase nudge */}
        {trialsTab === "compare" && topPicksIds.length === 0 && allTrials.length > 0 && (
          <div className="max-w-3xl mx-auto mb-6">
            <PhaseNudge
              selectedPhases={selectedPhases}
              allTrials={allTrials}
              onExpand={(newPhases) => {
                setSelectedPhases(newPhases);
                applyFiltersAndSetIds(allTrials, patientContext, query, newPhases);
              }}
            />
          </div>
        )}

        {/* Top Picks tab */}
        {trialsTab === "compare" && topPicksIds.length > 0 && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-400">
                Showing top{" "}
                <span className="font-medium text-gray-600">{topPicksIds.length}</span>
                {" "}of{" "}
                <span className="font-medium text-gray-600">{allRankedIds.length}</span>
                {" "}ranked trials
                {extractedCountry && (
                  <span className="ml-1.5 text-emerald-600 font-medium">
                    · {extractedCountry}
                  </span>
                )}
              </p>
            </div>
            <TrialCompare
              nctIds={topPicksIds}
              allRankedIds={allRankedIds}
              query={lastSearched}
              patientContext={patientContext}
              activeRegions={[]}
              onSelectTrial={(nctId) => setSelectedNctId(nctId)}
              onShowMore={(newIds) => setTopPicksIds(newIds)}
              refresh={isRefreshing}
              prefetchedData={compareData}
            />
          </div>
        )}

        {/* All Trials tab */}
        {trialsTab === "all" && (
          <div className="max-w-3xl mx-auto">
            {trials.length > 0 && totalCount !== null && (
              <div className="mb-4">
                <p className="text-sm text-gray-400">
                  Showing{" "}
                  <span className="font-medium text-gray-600">{trials.length}</span>
                  {" "}of{" "}
                  <span className="font-medium text-gray-600">
                    {totalCount.toLocaleString()}
                  </span>
                  {" "}trials for{" "}
                  <span className="font-medium text-gray-700">"{lastSearched}"</span>
                </p>
              </div>
            )}

            {trials.length === 0 && !error && (
              <div className="text-center py-20">
                <p className="text-gray-700 font-medium mb-1">No trials found</p>
                <p className="text-gray-400 text-sm">
                  Try a different search or broaden your query
                </p>
              </div>
            )}

            <div className="space-y-3">
              {trials.map((trial) => {
                const id   = trial.protocolSection.identificationModule;
                const stat = trial.protocolSection.statusModule;
                const cond = trial.protocolSection.conditionsModule;
                const des  = trial.protocolSection.designModule;
                const desc = trial.protocolSection.descriptionModule;
                const spon = trial.protocolSection.sponsorCollaboratorsModule;
                const locs = trial.protocolSection.contactsLocationsModule;

                const trialCountries = (locs?.locations ?? [])
                  .map((l: any) => l.country ?? "")
                  .filter(Boolean);
                const isExact  = extractedCountry ? trialCountries.includes(extractedCountry) : false;
                const isNoData = trialCountries.length === 0;
                const isNearby = !isExact && !isNoData && extractedCountry
                  ? trialCountries.some((c: string) =>
                      getNeighborCountries(extractedCountry).includes(c)
                    )
                  : false;

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
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-mono text-gray-400">
                            {id.nctId}
                          </span>
                          {des?.phases?.map((p: string) => (
                            <span key={p}
                              className="text-xs px-2 py-0.5 bg-gray-100
                                         text-gray-600 rounded-full font-medium">
                              {formatPhase(p)}
                            </span>
                          ))}
                          {extractedCountry && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              isExact   ? "bg-emerald-50 text-emerald-700"
                              : isNearby ? "bg-amber-50 text-amber-700"
                              : isNoData ? "bg-gray-100 text-gray-400"
                              : "bg-red-50 text-red-500"
                            }`}>
                              {isExact   ? `📍 ${extractedCountry}`
                               : isNearby ? "📍 Nearby"
                               : isNoData ? "📍 Location TBC"
                               : "📍 Other region"}
                            </span>
                          )}
                        </div>
                        <h2 className="font-semibold text-gray-900 text-sm
                                       leading-snug mb-2 group-hover:text-blue-600
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
                          {cond?.conditions?.slice(0, 3).map((c: string) => (
                            <span key={c}
                              className="text-xs px-2.5 py-0.5 bg-purple-50
                                         text-purple-700 border border-purple-100
                                         rounded-full">
                              {c}
                            </span>
                          ))}
                          {(cond?.conditions?.length ?? 0) > 3 && (
                            <span className="text-xs text-gray-400 self-center">
                              +{(cond?.conditions?.length ?? 0) - 3} more
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

              {displayCount < allTrials.length && (
                <div className="pt-4 flex justify-center">
                  <button
                    onClick={loadMore}
                    className="px-6 py-3 bg-white border border-gray-200
                               text-gray-600 text-sm font-medium rounded-xl
                               hover:border-gray-300 hover:bg-gray-50 transition-all"
                  >
                    Load more trials
                  </button>
                </div>
              )}
            </div>
          </div>
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

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav({ onHome }: { onHome: () => void }) {
  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm
                    sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <button onClick={onHome} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">OT</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">OpenTrial</span>
        </button>
        <span className="text-xs text-gray-400">Powered by ClinicalTrials.gov</span>
      </div>
    </nav>
  );
}

// ── Search bar ────────────────────────────────────────────────────────────────
function SearchBar({
  value,
  onChange,
  loading,
  placeholder,
  compact = false,
}: {
  value:       string;
  onChange:    (v: string) => void;
  loading:     boolean;
  placeholder: string;
  compact?:    boolean;
}) {
  return (
    <div className={`relative flex items-center bg-white border border-gray-200
                     rounded-2xl transition-shadow ${
      compact
        ? "shadow-sm hover:shadow-md"
        : "shadow-lg shadow-gray-100 hover:shadow-xl hover:shadow-gray-200"
    }`}>
      <div className="pl-5 pr-3 text-gray-400">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`flex-1 pr-4 text-base bg-transparent text-gray-900
                   placeholder-gray-300 focus:outline-none ${
          compact ? "py-3" : "py-4"
        }`}
      />
      <div className="pr-2">
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className={`px-5 bg-gray-900 text-white text-sm font-medium rounded-xl
                     hover:bg-gray-700 disabled:opacity-30
                     disabled:cursor-not-allowed transition-all ${
            compact ? "py-2" : "py-2.5"
          }`}
        >
          {loading ? "…" : "Search"}
        </button>
      </div>
    </div>
  );
}

// ── Phase nudge ───────────────────────────────────────────────────────────────
function PhaseNudge({
  selectedPhases,
  allTrials,
  onExpand,
}: {
  selectedPhases: string[];
  allTrials:      Trial[];
  onExpand:       (phases: string[]) => void;
}) {
  const phasesWithResults = ["PHASE4", "PHASE3", "PHASE2", "PHASE1", "EARLY_PHASE1"].filter(
    (phase) => allTrials.some(
      (t) => (t.protocolSection.designModule?.phases ?? []).includes(phase)
    )
  );

  const suggestions: Array<{ phases: string[]; label: string; description: string }> = [];

  if (
    selectedPhases.includes("PHASE3") &&
    !selectedPhases.includes("PHASE2") &&
    phasesWithResults.includes("PHASE2")
  ) {
    suggestions.push({
      phases:      [...selectedPhases, "PHASE2"],
      label:       "Include Phase 2 trials",
      description: "Earlier stage but promising — may have novel mechanisms not yet in Phase 3",
    });
  }

  if (
    selectedPhases.includes("PHASE2") &&
    !selectedPhases.includes("PHASE1") &&
    phasesWithResults.includes("PHASE1")
  ) {
    suggestions.push({
      phases:      [...selectedPhases, "PHASE1"],
      label:       "Include Phase 1 trials",
      description: "First-in-human — highest novelty, earliest access",
    });
  }

  if (selectedPhases.length > 0 && phasesWithResults.length > 0) {
    suggestions.push({
      phases:      [],
      label:       "Show all phases",
      description: `${allTrials.length} trials available across all phases`,
    });
  }

  if (suggestions.length === 0) return null;

  const currentPhaseLabel = selectedPhases.map((p) => PHASE_LABELS[p] ?? p).join(", ");

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center
                      justify-center flex-shrink-0 text-sm font-bold text-gray-600 mt-0.5">
        OT
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm
                      px-5 py-4 flex-1 shadow-sm">
        <p className="text-sm text-gray-700 mb-1">
          {selectedPhases.length > 0 ? (
            <>No <span className="font-semibold">{currentPhaseLabel}</span> trials found matching your patient.</>
          ) : (
            "No trials found matching your current criteria."
          )}
        </p>
        <p className="text-sm text-gray-500 mb-4">Would you like to broaden the search?</p>
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onExpand(s.phases)}
              className="w-full flex items-start gap-3 px-4 py-3 bg-gray-50
                         border border-gray-200 rounded-xl hover:bg-gray-900
                         hover:border-gray-900 transition-all text-left group"
            >
              <span className="text-gray-400 group-hover:text-white flex-shrink-0 mt-0.5 text-sm">→</span>
              <div>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-white">
                  {s.label}
                </p>
                <p className="text-xs text-gray-400 group-hover:text-gray-300">
                  {s.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
