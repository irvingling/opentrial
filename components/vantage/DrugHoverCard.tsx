// components/vantage/DrugHoverCard.tsx
import { DrugReference } from "@/lib/vantage/types";

const INTERNAL_PATTERNS = [
  /atd[_\s-]?\d*/gi, /pso[_\s-]?\d*/gi, /\bdeck\b/gi,
  /\.pptx/gi, /internal deck/gi, /slide\s*\d+/gi,
  /AtD_\d+/g, /aad \d{4}/gi, /eadv \d{4}/gi,
];

function scrub(text: string): string {
  let t = text;
  for (const p of INTERNAL_PATTERNS) t = t.replace(p, "");
  return t.replace(/;\s*;/g, ";").replace(/\s{2,}/g, " ").trim();
}

function truncate(text: string, max = 130): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

// Key endpoints to surface in order of priority
const ENDPOINT_ORDER = [
  "PASI 90", "PASI 100", "PASI 75", "IGA 0/1",
  "EASI-75", "EASI-90", "IGA 0", "PP-NRS ≥4",
];

function pickEndpoints(metrics: Record<string, number | null>): [string, number][] {
  const ordered: [string, number][] = [];
  for (const ep of ENDPOINT_ORDER) {
    const v = metrics[ep];
    if (typeof v === "number") ordered.push([ep, v]);
  }
  // Add any remaining numeric endpoints not in the priority list
  for (const [k, v] of Object.entries(metrics)) {
    if (typeof v === "number" && !ENDPOINT_ORDER.includes(k)) {
      ordered.push([k, v]);
    }
  }
  return ordered.slice(0, 5);
}

export function DrugHoverCard({ drug }: { drug: DrugReference }) {
  const isEmerging = drug.tier !== "approved";
  const hasDoses   = Array.isArray(drug.doses) && drug.doses.length > 0;
  const hasTrials  = Array.isArray(drug.trials) && drug.trials.length > 0;

  const cleanMsg = drug.keyMessage &&
    !drug.keyMessage.toLowerCase().startsWith("prior file") &&
    !drug.keyMessage.toLowerCase().startsWith("corrects prior")
      ? truncate(scrub(drug.keyMessage))
      : null;

  const accentColor = isEmerging ? "#fde68a" : "#bfdbfe";
  const headerColor = isEmerging ? "#92400e" : "#1e40af";
  const bgColor     = isEmerging ? "#fffbeb" : "#eff6ff";

  return (
    <div style={{
      position: "absolute", right: 0, top: "calc(100% + 6px)",
      zIndex: 100, pointerEvents: "none", isolation: "isolate",
      background: "#fff",
      border: `1.5px solid ${accentColor}`,
      borderRadius: 10, padding: "10px 12px",
      boxShadow: "0 8px 28px rgba(0,0,0,0.16)",
      width: 320,
    }}>
      {/* Header */}
      <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 1px", color: headerColor }}>
        {drug.name}{drug.brandName ? ` (${drug.brandName})` : ""}
      </p>
      <p style={{ fontSize: 10, color: "#9ca3af", margin: "0 0 8px" }}>
        {drug.drugClass} · {drug.tier === "approved" ? "Approved" : "Pipeline"}
        {drug.timepoint ? ` · ${drug.timepoint}` : ""}
      </p>

      {/* ── Pivotal trials — one block per trial ── */}
      {hasTrials ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 6 }}>
          {drug.trials!.map((trial, i) => {
            const endpoints = trial.allMetrics
              ? pickEndpoints(trial.allMetrics as Record<string, number | null>)
              : [];
            return (
              <div key={i} style={{
                background: bgColor,
                borderRadius: 6, padding: "7px 8px",
                border: `1px solid ${accentColor}`,
              }}>
                {/* Trial name + meta */}
                <p style={{ fontSize: 11, fontWeight: 700, color: headerColor, margin: "0 0 3px" }}>
                  {trial.name}
                  {trial.n ? ` · n=${trial.n}` : ""}
                </p>
                <p style={{ fontSize: 9, color: "#9ca3af", margin: "0 0 5px" }}>
                  {[trial.phase, trial.comparator, trial.timepoint].filter(Boolean).join(" · ")}
                </p>

                {/* Endpoint grid */}
                {endpoints.length > 0 ? (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "2px 8px",
                  }}>
                    {endpoints.map(([ep, val]) => {
                      const pbo = trial.allPlaceboMetrics?.[ep];
                      return (
                        <div key={ep} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: 10, color: "#6b7280" }}>{ep}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>
                            {val}%
                            {typeof pbo === "number" && (
                              <span style={{ fontSize: 9, color: "#9ca3af", fontWeight: 400 }}>
                                {" "}/ {pbo}%
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>No endpoint data</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Fallback: single metric block when no trial data */
        <div style={{ padding: "5px 8px", borderRadius: 6, marginBottom: 6, background: bgColor }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
            {drug.metricLabel}: {drug.metricValue !== null ? `${drug.metricValue}%` : "not disclosed"}
          </span>
          {drug.placeboValue !== null && (
            <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 8 }}>
              PBO {drug.placeboValue}%
            </span>
          )}
        </div>
      )}

      {/* Delta-only dose breakdown (emerging assets like tilrekimig) */}
      {hasDoses && !hasTrials && (
        <div style={{ marginBottom: 6 }}>
          {drug.doses!.slice(0, 3).map((dose, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 10, color: "#374151", padding: "2px 0",
              borderBottom: i < Math.min(drug.doses!.length, 3) - 1 ? "1px solid #f3f4f6" : "none",
            }}>
              <span>{dose.dose}</span>
              <span style={{ fontWeight: 700 }}>
                {dose.deltaValue != null ? `Δ${dose.deltaValue}%`
                  : dose.value != null ? `${dose.value}%`
                  : dose.note ?? "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Key message */}
      {cleanMsg && (
        <p style={{ fontSize: 10, color: "#4b5563", margin: "4px 0 0", lineHeight: 1.4 }}>
          {cleanMsg}
        </p>
      )}

      {/* Source */}
      {drug.sourceUrl && (
        <a href={drug.sourceUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 10, color: "#3b82f6", display: "block", marginTop: 6, pointerEvents: "auto" }}>
          FDA Label / Source ↗
        </a>
      )}
    </div>
  );
}
