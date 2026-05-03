"use client";

interface Props {
  startDate?:       string;
  completionDate?:  string;
  enrollmentTarget?: number;
  locationCount?:   number;
  status:           string;
}

// ── Date parser — handles multiple formats ────────────────────────────────────
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  // "2023-06-01", "2023-06", "June 2023", "2023"
  const clean = dateStr.trim();
  // Year-month only e.g. "2023-06"
  if (/^\d{4}-\d{2}$/.test(clean)) {
    return new Date(`${clean}-01`);
  }
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    year:  "numeric",
  });
}

// ── Smart CTA ─────────────────────────────────────────────────────────────────
function getSmartCTA(
  progress: number,
  status:   string,
  daysLeft: number
): { text: string; color: string; bg: string; icon: string } {
  if (["COMPLETED", "TERMINATED", "WITHDRAWN"].includes(status)) {
    return {
      text:  "Enrollment closed",
      color: "text-gray-500",
      bg:    "bg-gray-100",
      icon:  "✓",
    };
  }
  if (status === "ACTIVE_NOT_RECRUITING") {
    return {
      text:  "Enrollment complete — trial ongoing",
      color: "text-amber-700",
      bg:    "bg-amber-50",
      icon:  "⏳",
    };
  }
  if (status === "NOT_YET_RECRUITING") {
    return {
      text:  "Not yet open — watch this trial",
      color: "text-blue-700",
      bg:    "bg-blue-50",
      icon:  "👀",
    };
  }
  if (status === "SUSPENDED") {
    return {
      text:  "Trial suspended",
      color: "text-red-700",
      bg:    "bg-red-50",
      icon:  "⚠️",
    };
  }
  if (progress >= 90 || daysLeft < 60) {
    return {
      text:  "Closing imminently — refer now",
      color: "text-red-700",
      bg:    "bg-red-50",
      icon:  "🚨",
    };
  }
  if (progress >= 75 || daysLeft < 180) {
    return {
      text:  "Closing soon — enroll now to be eligible",
      color: "text-orange-700",
      bg:    "bg-orange-50",
      icon:  "⚡",
    };
  }
  if (progress >= 50) {
    return {
      text:  "Good window — act within the next few months",
      color: "text-amber-700",
      bg:    "bg-amber-50",
      icon:  "🟡",
    };
  }
  if (progress >= 20) {
    return {
      text:  "Actively enrolling — good time to refer",
      color: "text-emerald-700",
      bg:    "bg-emerald-50",
      icon:  "🟢",
    };
  }
  return {
    text:  "Early stage — ample time to enroll",
    color: "text-emerald-700",
    bg:    "bg-emerald-50",
    icon:  "🟢",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TrialProgress({
  startDate,
  completionDate,
  enrollmentTarget,
  locationCount,
  status,
}: Props) {
  const today = new Date();
  const start = parseDate(startDate);
  const end   = parseDate(completionDate);

  if (!start || !end) return null;

  const totalMs   = Math.max(1, end.getTime() - start.getTime());
  const elapsedMs = today.getTime() - start.getTime();
  const daysLeft  = Math.max(0, (end.getTime() - today.getTime()) / 86400000);
  const progress  = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

  // Estimated enrollment — linear interpolation
  const estimatedEnrolled = enrollmentTarget
    ? Math.round(enrollmentTarget * Math.min(1, progress / 100))
    : null;

  const cta        = getSmartCTA(progress, status, daysLeft);
  const todayPct   = Math.min(97, Math.max(3, progress));
  const isEnded    = progress >= 100;
  const hasntStart = elapsedMs < 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Trial Timeline
        </p>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                          ${cta.color} ${cta.bg}`}>
          {cta.icon} {cta.text}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="relative h-4 mb-2">
          {/* Track */}
          <div className="absolute inset-0 bg-gray-100 rounded-full" />

          {/* Fill */}
          <div
            className="absolute inset-y-0 left-0 bg-gray-700 rounded-full
                       transition-all duration-500"
            style={{ width: `${progress}%` }}
          />

          {/* Today dot */}
          {!isEnded && !hasntStart && (
            <div
              className="absolute top-1/2 w-3.5 h-3.5 bg-blue-500 rounded-full
                         border-2 border-white shadow-md z-10"
              style={{
                left:      `${todayPct}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          )}
        </div>

        {/* Date labels */}
        <div className="relative flex items-start justify-between">
          <p className="text-xs text-gray-400">{formatDateShort(start)}</p>

          {/* Today label — positioned at progress % */}
          {!isEnded && !hasntStart && (
            <div
              className="absolute flex flex-col items-center"
              style={{
                left:      `${todayPct}%`,
                transform: "translateX(-50%)",
                top:       0,
              }}
            >
              <p className="text-xs font-semibold text-blue-500 whitespace-nowrap">
                Today
              </p>
            </div>
          )}

          <p className="text-xs text-gray-400">{formatDateShort(end)}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1
                      pt-2 border-t border-gray-100">

        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-gray-900">
            {Math.round(progress)}%
          </span>
          <span className="text-xs text-gray-400">of timeline elapsed</span>
        </div>

        {estimatedEnrolled != null && enrollmentTarget != null && (
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-gray-900">
              ~{estimatedEnrolled.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">
              / {enrollmentTarget.toLocaleString()} patients est. enrolled
            </span>
          </div>
        )}

        {locationCount != null && locationCount > 0 && (
          <span className="text-xs text-gray-400">
            📍 {locationCount} site{locationCount !== 1 ? "s" : ""}
          </span>
        )}

        {daysLeft > 0 && progress < 100 && (
          <span className="text-xs text-gray-400">
            {Math.round(daysLeft)} days remaining
          </span>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-300">
        Estimated enrollment based on linear interpolation of timeline.
        Actual enrollment may vary.
      </p>

    </div>
  );
}