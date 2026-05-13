// components/vantage/BarChart.tsx
"use client";
import { useState } from "react";
import { ChartEntry, ViewMode, PosEstimate } from "@/lib/vantage/types";
import { DrugHoverCard } from "./DrugHoverCard";

// ── POS tier config ───────────────────────────────────────────────────────────

const POS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  "High":               { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0", icon: "↑" },
  "Medium":             { bg: "#fefce8", text: "#854d0e", border: "#fde68a", icon: "→" },
  "Low":                { bg: "#fff1f2", text: "#9f1239", border: "#fecdd3", icon: "↓" },
  "Insufficient data":  { bg: "#f8fafc", text: "#64748b", border: "#e2e8f0", icon: "?" },
};

// ── POSBadge ──────────────────────────────────────────────────────────────────

function POSBadge({ pos, drugName }: { pos: PosEstimate; drugName: string }) {
  const cfg = POS_CONFIG[pos.tier] ?? POS_CONFIG["Insufficient data"];

  return (
    <div style={{
      marginTop: 8, marginBottom: 4,
      border: `1px solid ${cfg.border}`,
      borderRadius: 8, overflow: "hidden",
      fontSize: 11,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 12px", background: cfg.bg,
      }}>
        <span style={{
          fontWeight: 700, fontSize: 12,
          background: cfg.border, color: cfg.text,
          padding: "2px 9px", borderRadius: 9999,
        }}>
          {cfg.icon} Ph3 POS: {pos.tier}
          {pos.score !== undefined && (
            <span style={{ fontWeight: 400, marginLeft: 4, opacity: 0.7 }}>
              ({pos.score}/15)
            </span>
          )}
        </span>
        <span style={{ fontSize: 11, color: cfg.text }}>
          {drugName} · Phase 3 probability of success assessment
        </span>
      </div>

      {/* Risk factors — always visible */}
      <div style={{ padding: "10px 14px", background: "white", borderTop: `1px solid ${cfg.border}` }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 7px" }}>
          Risk factor assessment:
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
          {pos.riskFactors.map((rf, i) => (
            <li key={i} style={{ display: "flex", gap: 7, fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>
              <span style={{ color: cfg.text, flexShrink: 0, marginTop: 2 }}>•</span>
              {rf}
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 10, color: "#9ca3af", margin: "8px 0 0", fontStyle: "italic" }}>
          Estimate based on class priors, data quality, and disclosed Ph2 characteristics. Not a clinical or investment recommendation.
        </p>
      </div>
    </div>
  );
}

// ── Shared bar renderer ───────────────────────────────────────────────────────

function renderBar(entry: ChartEntry, viewMode: ViewMode, height = 20, showPlacebo = true) {
  const canAdjust  = viewMode === "adjusted" && entry.treatment !== null && entry.placebo !== null;
  const displayVal = canAdjust
    ? Math.round(((entry.treatment ?? 0) - (entry.placebo ?? 0)) * 10) / 10
    : entry.treatment;
  const treatPct   = entry.notDisclosed || displayVal === null
    ? null : Math.max(0, Math.min(100, displayVal));
  const placeboPct = Math.max(0, Math.min(100, entry.placebo ?? 0));

  return (
    <>
      <div style={{
        position: "relative", height,
        background: "#f9fafb", border: "1px solid #e5e7eb",
        borderRadius: 6, overflow: "hidden",
      }}>
        {entry.notDisclosed ? (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: 8,
            border: "2px dashed #d97706", background: "#fffbeb", borderRadius: 6,
          }}>
            <span style={{ fontSize: 10, color: "#d97706" }}>Met endpoint · rate not disclosed</span>
          </div>
        ) : entry.isDeltaOnly && entry.treatment !== null ? (
          <>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${Math.max(0, Math.min(100, entry.treatment))}%`,
              background: entry.color + "cc", borderRadius: 6, transition: "width 0.4s ease",
            }} />
            <span style={{
              position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
              fontSize: 11, fontWeight: 700, color: "#111827", zIndex: 1,
            }}>Δ{entry.treatment}%</span>
          </>
        ) : treatPct !== null ? (
          <>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${treatPct}%`, background: entry.color,
              borderRadius: 6, transition: "width 0.4s ease",
            }} />
            <span style={{
              position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
              fontSize: 11, fontWeight: 700, color: "#111827", zIndex: 1,
            }}>
              {canAdjust ? `Δ${displayVal}%` : `${entry.treatment}%`}
            </span>
          </>
        ) : (
          <span style={{
            position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
            fontSize: 10, color: "#9ca3af",
          }}>No data</span>
        )}
      </div>

      {showPlacebo && entry.placebo !== null && viewMode === "absolute" && (
        <div style={{
          position: "relative", height: 8, marginTop: 3,
          background: "#f3f4f6", borderRadius: 3,
        }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: `${placeboPct}%`, background: "#d1d5db", borderRadius: 3,
          }} />
          <span style={{
            position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
            fontSize: 9, color: "#9ca3af",
          }}>PBO {entry.placebo}%</span>
        </div>
      )}
    </>
  );
}

// ── BarRow ────────────────────────────────────────────────────────────────────

export function BarRow({
  entry, viewMode = "absolute", dimmed = false,
}: {
  entry: ChartEntry; viewMode?: ViewMode; dimmed?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const pos = entry.rawData?.posEstimate;

  return (
    <div
      style={{
        marginBottom: pos ? 8 : 14, position: "relative",
        zIndex: hovered ? 99 : ("auto" as any),
        opacity: 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Label row */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 13, fontWeight: 500, color: "#1f2937",
          minWidth: 130, cursor: "help", borderBottom: "1px dotted #d1d5db",
        }}>
          {entry.drug}
          <span style={{ fontSize: 9, color: "#9ca3af", marginLeft: 4 }}>▾</span>
        </span>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>{entry.timepoint}</span>
        <span style={{
          fontSize: 10, padding: "1px 6px", borderRadius: 9999, fontWeight: 500,
          background: entry.color + "18", color: entry.color,
        }}>
          {(entry.drugClass ?? "").length > 22
            ? (entry.drugClass ?? "").slice(0, 21) + "…"
            : entry.drugClass}
        </span>
        {entry.sourceUrl && (
          <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, color: "#3b82f6", marginLeft: "auto" }}>
            Source ↗
          </a>
        )}
      </div>

      {renderBar(entry, viewMode)}

      {/* POS badge — only for emerging drugs, not dimmed landscape context */}
      {pos && entry.isEmerging && !dimmed && (
        <POSBadge pos={pos} drugName={entry.drug} />
      )}

      {hovered && entry.rawData && <DrugHoverCard drug={entry.rawData} />}
    </div>
  );
}

// ── ComparisonGrouped ─────────────────────────────────────────────────────────

export function ComparisonGrouped({
  entries, drugNames, endpoint, viewMode, commentary,
}: {
  entries: ChartEntry[];
  drugNames: string[];
  endpoint: string;
  viewMode: ViewMode;
  commentary?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  if (entries.length < 2) return null;

  const a = entries[0];
  const b = entries[1];

  // Collect POS for any emerging drugs in the comparison
  const posEntries = entries.filter((e) => e.isEmerging && e.rawData?.posEstimate);

  function DrugPanel({ entry, idx }: { entry: ChartEntry; idx: number }) {
    const canAdjust  = viewMode === "adjusted" && entry.treatment !== null && entry.placebo !== null;
    const displayVal = canAdjust
      ? Math.round(((entry.treatment ?? 0) - (entry.placebo ?? 0)) * 10) / 10
      : entry.treatment;

    return (
      <div
        style={{
          flex: 1, position: "relative",
          background: entry.color + "08",
          border: `1.5px solid ${entry.color}30`,
          borderRadius: 10, padding: "14px 16px",
          cursor: "help",
        }}
        onMouseEnter={() => setHoveredIdx(idx)}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: entry.color, margin: "0 0 2px" }}>
            {entry.drug}
          </p>
          <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>
            {entry.drugClass} · {entry.timepoint}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: "#111827", lineHeight: 1 }}>
            {entry.notDisclosed ? "—"
              : displayVal !== null ? `${displayVal}%`
              : "N/A"}
          </span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {canAdjust ? "Δ vs PBO" : endpoint}
          </span>
        </div>

        <div style={{ marginBottom: 6 }}>
          {renderBar(entry, viewMode, 22, false)}
        </div>

        {entry.placebo !== null && viewMode === "absolute" && (
          <p style={{ fontSize: 10, color: "#9ca3af", margin: "4px 0 0" }}>
            Placebo: {entry.placebo}%
          </p>
        )}

        <div style={{ marginTop: 10 }}>
          {entry.rawData?.evidenceLevel && (
            <span style={{
              fontSize: 9, padding: "2px 7px", borderRadius: 9999, fontWeight: 600,
              background: entry.rawData.evidenceLevel === "fda-label" ? "#dcfce7" : "#fef9c3",
              color: entry.rawData.evidenceLevel === "fda-label" ? "#166534" : "#854d0e",
            }}>
              {entry.rawData.evidenceLevel === "fda-label" ? "FDA Label"
                : entry.rawData.evidenceLevel === "press-release" ? "Sponsor Topline"
                : entry.rawData.evidenceLevel === "publication" ? "Published"
                : entry.rawData.evidenceLevel}
            </span>
          )}
          {entry.rawData?.numericDisclosure === "delta-only" && (
            <span style={{
              fontSize: 9, padding: "2px 7px", borderRadius: 9999, fontWeight: 600,
              background: "#fef2f2", color: "#991b1b", marginLeft: 4,
            }}>Δ only — absolute not disclosed</span>
          )}
          {/* Inline POS tier badge in the panel header area */}
          {entry.isEmerging && entry.rawData?.posEstimate && (
            <span style={{
              fontSize: 9, padding: "2px 7px", borderRadius: 9999, fontWeight: 600,
              background: POS_CONFIG[entry.rawData.posEstimate.tier]?.bg ?? "#f8fafc",
              color: POS_CONFIG[entry.rawData.posEstimate.tier]?.text ?? "#64748b",
              border: `1px solid ${POS_CONFIG[entry.rawData.posEstimate.tier]?.border ?? "#e2e8f0"}`,
              marginLeft: 4,
            }}>
              Ph3 POS: {entry.rawData.posEstimate.tier}
            </span>
          )}
        </div>

        {hoveredIdx === idx && entry.rawData && (
          <DrugHoverCard drug={entry.rawData} />
        )}
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: 28, background: "white",
      border: "1.5px solid #e5e7eb",
      borderRadius: 12, padding: "16px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 16 }}>⚖</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
          {drugNames[0]} vs {drugNames[1]}
        </span>
        <span style={{
          fontSize: 11, background: "#f3f4f6", color: "#6b7280",
          padding: "2px 8px", borderRadius: 9999,
        }}>{endpoint}</span>
        <span style={{
          fontSize: 10, color: "#9ca3af", marginLeft: "auto", fontStyle: "italic",
        }}>Cross-trial — not head-to-head</span>
      </div>

      {/* Side-by-side panels */}
      <div style={{ display: "flex", gap: 12 }}>
        <DrugPanel entry={a} idx={0} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 32 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#d1d5db" }}>VS</span>
        </div>
        <DrugPanel entry={b} idx={1} />
      </div>

      {/* AI commentary */}
      {commentary && (
        <div style={{
          marginTop: 12, padding: "10px 12px",
          background: "#f8fafc", borderRadius: 8,
          borderLeft: "3px solid #3b82f6",
          fontSize: 12, color: "#374151", lineHeight: 1.6,
        }}>
          {commentary}
        </div>
      )}

      {/* POS detail section — shown below comparison when at least one drug is emerging */}
      {posEntries.length > 0 && (
        <div style={{ marginTop: 16, borderTop: "1px solid #f3f4f6", paddingTop: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#374151", margin: "0 0 10px" }}>
            Phase 3 Probability of Success
          </p>
          {posEntries.map((e) => (
            e.rawData?.posEstimate && (
              <POSBadge key={e.drug} pos={e.rawData.posEstimate} drugName={e.drug} />
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ── BarSection ────────────────────────────────────────────────────────────────

export function BarSection({
  title, count, bars, accentColor, badge, viewMode, dimmed,
}: {
  title: string; count: number; bars: ChartEntry[];
  accentColor: string; badge?: string; viewMode?: ViewMode; dimmed?: boolean;
}) {
  if (bars.length === 0) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 4, height: 20, borderRadius: 2, background: accentColor, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{title}</span>
        <span style={{
          fontSize: 11, background: "#f3f4f6", color: "#6b7280",
          padding: "1px 7px", borderRadius: 9999,
        }}>{count}</span>
        {badge && (
          <span style={{
            fontSize: 10, background: "#dbeafe", color: "#1d4ed8",
            padding: "1px 7px", borderRadius: 9999,
          }}>{badge}</span>
        )}
      </div>
      {bars.map((b, i) => (
        <BarRow key={`${b.drug}-${i}`} entry={b} viewMode={viewMode} dimmed={dimmed} />
      ))}
    </div>
  );
}
