// components/vantage/BarChart.tsx
"use client";
import { useState } from "react";
import { ChartEntry, ViewMode } from "@/lib/vantage/types";
import { DrugHoverCard } from "./DrugHoverCard";

// ── Shared bar renderer ───────────────────────────────────────────────────────

function renderBar(
  entry: ChartEntry,
  viewMode: ViewMode,
  height = 20,
  showPlacebo = true
) {
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

      {/* Placebo sub-bar */}
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

// ── BarRow — standard list row ────────────────────────────────────────────────

export function BarRow({
  entry, viewMode = "absolute", dimmed = false,
}: {
  entry: ChartEntry; viewMode?: ViewMode; dimmed?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        marginBottom: 14, position: "relative",
        zIndex: hovered ? 99 : ("auto" as any),
        opacity: dimmed ? 0.55 : 1, transition: "opacity 0.2s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
      {hovered && entry.rawData && <DrugHoverCard drug={entry.rawData} />}
    </div>
  );
}

// ── ComparisonGrouped — side-by-side hero comparison ─────────────────────────
// Shows the two compared drugs as large, visually prominent grouped bars
// with their metric values, placebo, endpoint, and evidence level.

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
        {/* Drug name + class */}
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: entry.color, margin: "0 0 2px" }}>
            {entry.drug}
          </p>
          <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>
            {entry.drugClass} · {entry.timepoint}
          </p>
        </div>

        {/* Big metric number */}
        <div style={{
          display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10,
        }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: "#111827", lineHeight: 1 }}>
            {entry.notDisclosed ? "—"
              : displayVal !== null ? `${displayVal}%`
              : "N/A"}
          </span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {canAdjust ? "Δ vs PBO" : endpoint}
          </span>
        </div>

        {/* Full-width bar */}
        <div style={{ marginBottom: 6 }}>
          {renderBar(entry, viewMode, 22)}
        </div>

        {/* Placebo reference */}
        {entry.placebo !== null && viewMode === "absolute" && (
          <p style={{ fontSize: 10, color: "#9ca3af", margin: "4px 0 0" }}>
            Placebo: {entry.placebo}%
          </p>
        )}

        {/* Evidence badge */}
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
        </div>

        {/* Hover card */}
        {hoveredIdx === idx && entry.rawData && (
          <DrugHoverCard drug={entry.rawData} />
        )}
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: 28,
      background: "white",
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
          fontSize: 10, color: "#9ca3af", marginLeft: "auto",
          fontStyle: "italic",
        }}>Cross-trial comparison — not head-to-head</span>
      </div>

      {/* Side-by-side panels */}
      <div style={{ display: "flex", gap: 12, marginBottom: commentary ? 14 : 0 }}>
        <DrugPanel entry={a} idx={0} />
        {/* VS divider */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, width: 32,
        }}>
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
    </div>
  );
}

// ── BarSection — standard labelled list ───────────────────────────────────────

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
        <span style={{ fontSize: 13, fontWeight: 600, color: dimmed ? "#9ca3af" : "#374151" }}>{title}</span>
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
        {dimmed && (
          <span style={{ fontSize: 10, color: "#9ca3af", fontStyle: "italic" }}>
            landscape context
          </span>
        )}
      </div>
      {bars.map((b, i) => (
        <BarRow key={`${b.drug}-${i}`} entry={b} viewMode={viewMode} dimmed={dimmed} />
      ))}
    </div>
  );
}
