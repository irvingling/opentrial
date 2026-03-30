"use client";

import { FormEvent, useState } from "react";

type Trial = {
  id: string;
  title: string;
  phase: string;
  status: string;
  mechanism: string;
  summary: string;
};

const quickSearches = [
  "psoriasis",
  "Crohn disease",
  "ulcerative colitis",
  "bimekizumab",
  "deucravacitinib",
  "NCT06220604",
];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastSearched, setLastSearched] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  async function runSearch(searchTerm: string) {
    try {
      setLoading(true);
      setError("");
      setHasSearched(true);

      const response = await fetch(
        `/api/trials?q=${encodeURIComponent(searchTerm)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Search request failed");
      }

      const data = await response.json();
      setTrials(data.trials ?? []);
      setLastSearched(searchTerm);
    } catch {
      setError("Could not load trials right now.");
      setTrials([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    runSearch(trimmedQuery);
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
        <section className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-3xl">
            <div className="mb-10 text-center">
              <p className="text-sm font-medium tracking-wide text-slate-500">
                OpenTrial
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Clinical trial search,
                <br />
                built for clinicians
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Search ClinicalTrials.gov by condition, therapy, mechanism, sponsor,
                or NCT number.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="search"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search trials..."
                  className="h-14 w-full rounded-2xl border border-slate-200 px-5 text-base outline-none focus:border-slate-400"
                />
                <button
                  type="submit"
                  className="h-14 rounded-2xl bg-slate-900 px-6 text-base font-medium text-white transition hover:bg-slate-700"
                >
                  Search
                </button>
              </div>
            </form>

            {!hasSearched && (
              <div className="mt-10 text-center text-sm text-slate-500">
                Try a disease, drug name, mechanism, or study ID.
              </div>
            )}
          </div>
        </section>

        {hasSearched && (
          <section className="mx-auto w-full max-w-4xl pb-16">
            <div className="mb-6 border-t border-slate-200 pt-6">
              {loading ? (
                <p className="text-sm text-slate-500">Loading trials...</p>
              ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : (
                <p className="text-sm text-slate-500">
                  {trials.length} result{trials.length === 1 ? "" : "s"} for{" "}
                  <span className="font-medium text-slate-900">{lastSearched}</span>
                </p>
              )}
            </div>

            <div className="grid gap-4">
              {trials.map((trial) => (
                <a
                  key={trial.id}
                  href={`https://clinicaltrials.gov/study/${trial.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {trial.phase}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {trial.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {trial.mechanism}
                    </span>
                  </div>

                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                    {trial.title}
                  </h2>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {trial.summary}
                  </p>

                  <p className="mt-5 text-sm font-medium text-slate-900">
                    Open on ClinicalTrials.gov →
                  </p>
                </a>
              ))}
            </div>

            {!loading && !error && trials.length === 0 && (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
                No trials matched your search. Try a broader term or a different
                spelling.
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
