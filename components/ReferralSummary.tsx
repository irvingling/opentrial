"use client";

interface ContactInfo {
  name?:  string;
  role?:  string;
  phone?: string;
  email?: string;
}

interface ReferralProps {
  nctId:         string;
  title:         string;
  phase:         string;
  status:        string;
  sponsor:       string;
  mechanism:     string;
  oneLiner:      string;
  bullCase:      string[];
  eligibility: {
    qualifies: string[];
    excluded:  string[];
  };
  patientTalkingPoints: string;
  contacts:      ContactInfo[];
  sites:         Array<{
    facility?: string;
    city?:     string;
    state?:    string;
    country?:  string;
    status?:   string;
  }>;
  generatedDate: string;
}

export default function ReferralSummary({
  nctId,
  title,
  phase,
  status,
  sponsor,
  mechanism,
  oneLiner,
  bullCase,
  eligibility,
  patientTalkingPoints,
  contacts,
  sites,
  generatedDate,
}: ReferralProps) {
  return (
    <div
      id="referral-print"
      className="bg-white max-w-2xl mx-auto px-8 py-10 font-sans"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-6
                      border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded bg-gray-900 flex items-center
                            justify-center">
              <span className="text-white text-xs font-bold">OT</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">
              OpenTrial
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Clinical Trial Referral Summary · {generatedDate}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-gray-400">{nctId}</p>
          <p className="text-xs text-gray-400">{phase}</p>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-lg font-bold text-gray-900 leading-tight mb-1">
        {title}
      </h1>
      <p className="text-sm text-gray-500 mb-1">{sponsor}</p>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600
                         rounded-full">
          {status}
        </span>
        {mechanism && (
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700
                           rounded-full">
            {mechanism}
          </span>
        )}
      </div>

      {/* One liner */}
      <div className="bg-gray-50 rounded-lg p-4 mb-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide
                      mb-1">
          About this trial
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">"{oneLiner}"</p>
      </div>

      {/* Why consider */}
      <div className="mb-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide
                      mb-2">
          Why consider this trial
        </p>
        <ul className="space-y-1.5">
          {bullCase.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Eligibility */}
      <div className="mb-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide
                      mb-2">
          Eligibility summary
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-green-700 mb-1.5">
              ✅ May qualify if…
            </p>
            <ul className="space-y-1">
              {eligibility.qualifies.map((c, i) => (
                <li key={i}
                  className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-green-400 flex-shrink-0">•</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-red-600 mb-1.5">
              ❌ May be excluded if…
            </p>
            <ul className="space-y-1">
              {eligibility.excluded.map((c, i) => (
                <li key={i}
                  className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-red-400 flex-shrink-0">•</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Patient talking points */}
      <div className="bg-blue-50 rounded-lg p-4 mb-5">
        <p className="text-xs font-medium text-blue-700 uppercase tracking-wide
                      mb-1">
          For the patient
        </p>
        <p className="text-sm text-blue-800 leading-relaxed">
          {patientTalkingPoints}
        </p>
      </div>

      {/* Contact */}
      {contacts.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-400 uppercase
                        tracking-wide mb-2">
            Trial contact
          </p>
          <div className="space-y-2">
            {contacts.slice(0, 2).map((c, i) => (
              <div key={i}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex
                                items-center justify-center text-xs
                                font-medium text-gray-600 flex-shrink-0">
                  {c.name?.charAt(0) ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {c.name ?? "Trial Coordinator"}
                  </p>
                  {c.role && (
                    <p className="text-xs text-gray-400">{c.role}</p>
                  )}
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.email && (
                      <p className="text-xs text-blue-600">{c.email}</p>
                    )}
                    {c.phone && (
                      <p className="text-xs text-gray-500">{c.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sites */}
      {sites.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-400 uppercase
                        tracking-wide mb-2">
            Recruiting sites ({sites.length} total)
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {sites.slice(0, 6).map((site, i) => (
              <div key={i}
                className="p-2.5 bg-gray-50 rounded-lg">
                {site.facility && (
                  <p className="text-xs font-medium text-gray-800 truncate">
                    {site.facility}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  {[site.city, site.state, site.country]
                    .filter(Boolean).join(", ")}
                </p>
                {site.status === "RECRUITING" && (
                  <span className="text-xs text-emerald-600 font-medium">
                    ● Recruiting
                  </span>
                )}
              </div>
            ))}
            {sites.length > 6 && (
              <p className="text-xs text-gray-400 self-center px-2">
                +{sites.length - 6} more sites
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">
              Source: ClinicalTrials.gov · {nctId}
            </p>
            <p className="text-xs text-gray-300">
              Generated by OpenTrial · {generatedDate}
            </p>
          </div>
          <a
            href={`https://clinicaltrials.gov/study/${nctId}`}
            className="text-xs text-blue-600"
          >
            clinicaltrials.gov/study/{nctId}
          </a>
        </div>
        <p className="text-xs text-gray-300 mt-2">
          ⚠ This summary is AI-generated and for informational purposes only.
          Always verify eligibility with trial coordinators before referral.
        </p>
      </div>
    </div>
  );
}