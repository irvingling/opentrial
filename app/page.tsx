"use client";

import { FormEvent, useEffect, useState } from "react";

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
  const [query, setQuery] = useState("psoriasis");
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastSearched, setLastSearched] = useState("psoriasis");

  async function runSearch(searchTerm: string) {
    try {
      setLoading(true);
      setError("");

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
    runSearch(query);
  }

  useEffect(() => {
    runSearch("psoriasis");
  }, []);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10">
          <p className="text-sm font-medium text-slate-500">OpenTrial Prototype</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Helping clinicians understand clinical trials faster
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-600">
            Search ClinicalTrials.gov in a more clinician-friendly way.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mb-4 rounded-2xl border border-slate-200 p-4 shadow-sm"
        >
          <label
            htmlFor="search"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Search trials
          </label>

          <div className="flex gap-2">
            <input
              id="search"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try: psoriasis, Crohn disease, bimekizumab, NCT number"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-700"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mb-8 flex flex-wrap gap-2">
          {quickSearches.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setQuery(term);
                runSearch(term);
              }}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
            >
              {term}
            </button>
          ))}
        </div>

        <div className="mb-4 text-sm text-slate-500">
          {loading ? (
            <p>Loading trials...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : (
            <p>
              Showing {trials.length} result{trials.length === 1 ? "" : "s"} for{" "}
              <span className="font-medium text-slate-900">{lastSearched}</span>
            </p>
          )}
        </div>

        <section className="grid gap-4">
          {trials.map((trial) => (
            <a
              key={trial.id}
              href={`https://clinicaltrials.gov/study/${trial.id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-slate-200 p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                  {trial.phase}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                  {trial.status}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                  {trial.mechanism}
                </span>
              </div>

              <h2 className="text-xl font-semibold">{trial.title}</h2>
              <p className="mt-2 text-slate-600 line-clamp-3">{trial.summary}</p>
              <p className="mt-4 text-sm font-medium text-slate-900">
                Open on ClinicalTrials.gov →
              </p>
            </a>
          ))}
        </section>

        {!loading && !error && trials.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-slate-600">
            No trials matched your search. Try a broader term like psoriasis or Crohn disease.
          </div>
        )}
      </div>
    </main>
  );
}
