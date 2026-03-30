"use client";

import { useMemo, useState } from "react";

type Trial = {
  id: string;
  title: string;
  phase: string;
  status: string;
  mechanism: string;
  summary: string;
};

const trials: Trial[] = [
  {
    id: "pso-001",
    title: "Phase 3 Oral TYK2 Inhibitor in Moderate-to-Severe Plaque Psoriasis",
    phase: "Phase 3",
    status: "Recruiting",
    mechanism: "TYK2",
    summary:
      "Evaluates an oral investigational therapy for adults with moderate-to-severe plaque psoriasis.",
  },
  {
    id: "pso-002",
    title: "IL-23 Biologic Trial in Plaque Psoriasis",
    phase: "Phase 2",
    status: "Active, not recruiting",
    mechanism: "IL-23",
    summary:
      "Assesses efficacy and safety of a biologic therapy in patients eligible for systemic treatment.",
  },
  {
    id: "pso-003",
    title: "Biomarker Study of Psoriasis Response",
    phase: "Phase 2",
    status: "Recruiting",
    mechanism: "Biomarker",
    summary:
      "Explores molecular changes associated with treatment response in plaque psoriasis.",
  },
];

export default function HomePage() {
  const [query, setQuery] = useState("");

  const filteredTrials = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return trials;
    }

    return trials.filter((trial) => {
      const searchableText = [
        trial.title,
        trial.phase,
        trial.status,
        trial.mechanism,
        trial.summary,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(lowerQuery);
    });
  }, [query]);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10">
          <p className="text-sm font-medium text-slate-500">OpenTrial Prototype</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Helping clinicians understand clinical trials faster
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-600">
            A simple prototype for exploring psoriasis trials in a more clinician-friendly way.
          </p>
        </header>

        <div className="mb-4 rounded-2xl border border-slate-200 p-4 shadow-sm">
          <label htmlFor="search" className="mb-2 block text-sm font-medium text-slate-700">
            Search trials
          </label>
          <input
            id="search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try: TYK2, recruiting, phase 2, biologic"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
          />
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {["Recruiting", "TYK2", "IL-23", "Biomarker", "Phase 2", "Phase 3"].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setQuery(tag)}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
            >
              {tag}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setQuery("")}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
          >
            Clear
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          Showing {filteredTrials.length} trial{filteredTrials.length === 1 ? "" : "s"}
        </p>

        <section className="grid gap-4">
          {filteredTrials.map((trial) => (
            <a
              key={trial.id}
              href={`/trial/${trial.id}`}
              className="rounded-2xl border border-slate-200 p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{trial.phase}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{trial.status}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{trial.mechanism}</span>
              </div>

              <h2 className="text-xl font-semibold">{trial.title}</h2>
              <p className="mt-2 text-slate-600">{trial.summary}</p>
              <p className="mt-4 text-sm font-medium text-slate-900">View trial brief →</p>
            </a>
          ))}
        </section>

        {filteredTrials.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-slate-600">
            No trials matched your search. Try TYK2, recruiting, or phase 2.
          </div>
        )}
      </div>
    </main>
  );
}
