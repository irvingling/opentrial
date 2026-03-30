type TrialRecord = {
  title: string
  phase: string
  status: string
  mechanism: string
  clinicalQuestion: string
  bestFit: string
  practicalNotes: string
}

const trialMap: Record<string, TrialRecord> = {
  "pso-001": {
    title: "Phase 3 Oral TYK2 Inhibitor in Moderate-to-Severe Plaque Psoriasis",
    phase: "Phase 3",
    status: "Recruiting",
    mechanism: "TYK2",
    clinicalQuestion:
      "Can an oral investigational TYK2 therapy improve outcomes in adults with moderate-to-severe plaque psoriasis?",
    bestFit:
      "Adults with moderate-to-severe plaque psoriasis who may be candidates for systemic treatment.",
    practicalNotes:
      "Useful for referral discussion, but exact eligibility and washout details still need source review.",
  },
  "pso-002": {
    title: "IL-23 Biologic Trial in Plaque Psoriasis",
    phase: "Phase 2",
    status: "Active, not recruiting",
    mechanism: "IL-23",
    clinicalQuestion:
      "How effective and safe is an IL-23 biologic in patients with plaque psoriasis?",
    bestFit:
      "Patients with plaque psoriasis being considered for biologic therapy.",
    practicalNotes:
      "Good example of a biologic study design, though not currently recruiting.",
  },
  "pso-003": {
    title: "Biomarker Study of Psoriasis Response",
    phase: "Phase 2",
    status: "Recruiting",
    mechanism: "Biomarker",
    clinicalQuestion:
      "What biological markers correlate with treatment response in plaque psoriasis?",
    bestFit:
      "Clinicians interested in translational science and response prediction.",
    practicalNotes:
      "More scientifically exploratory than directly referral-oriented.",
  },
}

export default async function TrialPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const trial = trialMap[id]

  if (!trial) {
    return <div className="p-10">Trial not found.</div>
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <a href="/" className="text-sm text-slate-600 hover:underline">
          ← Back to search
        </a>

        <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{trial.phase}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{trial.status}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{trial.mechanism}</span>
          </div>

          <h1 className="text-3xl font-bold">{trial.title}</h1>

          <section className="mt-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">What is this trial actually testing?</h2>
              <p className="mt-2 text-slate-700">{trial.clinicalQuestion}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Who is this really for?</h2>
              <p className="mt-2 text-slate-700">{trial.bestFit}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Practical considerations</h2>
              <p className="mt-2 text-slate-700">{trial.practicalNotes}</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
