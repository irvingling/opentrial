// components/vantage/FishboneTimeline.tsx
"use client";
import { useState } from "react";
import { DrugReference, TimelineEvent } from "@/lib/vantage/types";
import { getColor } from "@/lib/vantage/colors";
import { LOE_DATA, READOUT_DATA } from "@/lib/vantage/timelineData";

// ── Layout constants ──────────────────────────────────────────────────────────
const TIMELINE_START = 2026;
const TIMELINE_END   = 2042; // extended to avoid clipping long-runway assets
const TIMELINE_SPAN  = TIMELINE_END - TIMELINE_START;
const LABEL_W        = 148;  // px — left column for drug names
const ROW_H          = 44;   // px per lane
const AXIS_H         = 40;   // px for centre axis band
const DOT_R          = 7;    // dot radius px

function pct(year: number) {
  return Math.max(0, Math.min(100, ((year - TIMELINE_START) / TIMELINE_SPAN) * 100));
}

// Year ticks — every 2 years
const TICKS = Array.from(
  { length: Math.floor(TIMELINE_SPAN / 2) + 1 },
  (_, i) => TIMELINE_START + i * 2
);

// ── Data builders ─────────────────────────────────────────────────────────────

function buildApproved(drugs: DrugReference[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const d of drugs) {
    const loe = LOE_DATA[d.name.toLowerCase()];
    if (!loe) continue;
    events.push({
      name: d.name, brandName: d.brandName ?? null, drugClass: d.drugClass,
      tier: "approved",
      year: loe.loeYear, label: loe.loeNotes,
      color: getColor(d.drugClass), sourceUrl: d.sourceUrl ?? null,
    });
  }
  return events.sort((a, b) => a.year - b.year);
}

function buildEmerging(drugs: DrugReference[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const d of drugs) {
    const rd = READOUT_DATA[d.name.toLowerCase()];
    if (!rd) continue;
    events.push({
      name: d.name, brandName: d.brandName ?? null, drugClass: d.drugClass,
      tier: "emerging",
      year: rd.readoutYear, label: rd.readoutLabel,
      color: getColor(d.drugClass), sourceUrl: d.sourceUrl ?? null,
    });
  }
  return events.sort((a, b) => a.year - b.year);
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ ev, side }: { ev: TimelineEvent; side: "above" | "below" }) {
  return (
    <div style={{
      position: "absolute",
      [side === "above" ? "bottom" : "top"]: "calc(100% + 6px)",
      left: "50%", transform: "translateX(-50%)",
      zIndex: 200, pointerEvents: "none",
      background: "white", border: `1.5px solid ${ev.color}`,
      borderRadius: 8, padding: "8px 12px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      minWidth: 200, maxWidth: 260,
      whiteSpace: "normal",
    }}>
      <p style={{ fontWeight: 700, color: ev.color, fontSize: 12, margin: "0 0 3px" }}>
        {ev.name}{ev.brandName ? ` (${ev.brandName})` : ""}
        <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 6 }}>{ev.year}</span>
      </p>
      <p style={{ fontSize: 11, color: "#374151", margin: 0, lineHeight: 1.5 }}>{ev.label}</p>
    </div>
  );
}

// ── Lane row ──────────────────────────────────────────────────────────────────

function LaneRow({
  ev, side,
}: {
  ev: TimelineEvent;
  side: "above" | "below";
}) {
  const [hovered, setHovered] = useState(false);
  const dotLeft = pct(ev.year);
  const isLoe   = ev.tier === "approved";

  return (
    <div style={{
      display: "flex", alignItems: "center",
      height: ROW_H, position: "relative",
    }}>
      {/* Drug name label */}
      <div style={{
        width: LABEL_W, flexShrink: 0, paddingRight: 10,
        display: "flex", flexDirection: "column", justifyContent: "center",
      }}>
        <span style={{
          fontSize: 12, fontWeight: 600, color: ev.color,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {ev.name}
        </span>
        {ev.brandName && (
          <span style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap" }}>
            {ev.brandName}
          </span>
        )}
        {ev.tier === "emerging" && (
          <span style={{ fontSize: 9, color: "#9ca3af" }}>readout est.</span>
        )}
      </div>

      {/* Track + dot */}
      <div style={{ flex: 1, position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
        {/* Dashed spine */}
        <div style={{
          position: "absolute", left: 0, right: 0, height: 1,
          borderTop: `1.5px dashed ${ev.color}30`,
        }} />

        {/* Dot anchor */}
        <div
          style={{
            position: "absolute",
            left: `${dotLeft}%`,
            transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center",
            cursor: "pointer",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Vertical drop line to axis */}
          <div style={{
            width: 1.5,
            height: side === "above" ? 22 : 22,
            background: ev.color + "80",
            order: side === "above" ? 1 : -1,
          }} />

          {/* Dot */}
          <div style={{
            width: DOT_R * 2, height: DOT_R * 2,
            borderRadius: "50%",
            background: isLoe ? ev.color : "white",
            border: `2px solid ${ev.color}`,
            boxShadow: hovered ? `0 0 0 3px ${ev.color}30` : "none",
            transition: "box-shadow 0.15s",
            flexShrink: 0,
            order: 0,
          }} />

          {/* Year label below/above the dot */}
          <span style={{
            fontSize: 10, fontWeight: 700, color: ev.color,
            order: side === "above" ? -1 : 1,
            marginTop: side === "below" ? 2 : 0,
            marginBottom: side === "above" ? 2 : 0,
          }}>
            {ev.year}
          </span>

          {/* Hover tooltip */}
          {hovered && <Tooltip ev={ev} side={side} />}
        </div>
      </div>
    </div>
  );
}

// ── Axis band ─────────────────────────────────────────────────────────────────

function AxisBand() {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      height: AXIS_H, position: "relative",
    }}>
      {/* Name column */}
      <div style={{ width: LABEL_W, flexShrink: 0, paddingRight: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: 1 }}>
          PIPELINE ↓
        </span>
      </div>
      {/* Track with year ticks */}
      <div style={{ flex: 1, position: "relative", height: AXIS_H }}>
        {/* Axis line */}
        <div style={{
          position: "absolute", left: 0, right: 0,
          top: "50%", height: 2, background: "#e5e7eb",
        }} />
        {/* NOW line */}
        <div style={{
          position: "absolute",
          left: `${pct(2026)}%`,
          top: 0, bottom: 0, width: 1.5,
          background: "#ef444470",
          borderLeft: "1.5px dashed #ef4444",
        }}>
          <span style={{
            position: "absolute", top: 2, left: 4,
            fontSize: 9, fontWeight: 700, color: "#ef4444", whiteSpace: "nowrap",
          }}>NOW</span>
        </div>
        {/* Year ticks */}
        {TICKS.map((yr) => (
          <div key={yr} style={{
            position: "absolute", left: `${pct(yr)}%`,
            top: 0, bottom: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: 1, flex: 1, background: "#e5e7eb" }} />
            <span style={{
              fontSize: 10, color: "#9ca3af", fontWeight: 500,
              padding: "2px 0", background: "white",
              whiteSpace: "nowrap",
            }}>{yr}</span>
            <div style={{ width: 1, flex: 1, background: "#e5e7eb" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FishboneTimeline({
  approvedDrugs, emergingDrugs,
}: {
  approvedDrugs: DrugReference[];
  emergingDrugs: DrugReference[];
}) {
  const approved = buildApproved(approvedDrugs);
  const emerging = buildEmerging(emergingDrugs);

  if (approved.length === 0 && emerging.length === 0) {
    return (
      <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, padding: "32px 0" }}>
        No LOE or readout data available for the drugs in this query.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { label: "Approved — LOE date", filled: true,  color: "#3b82f6" },
          { label: "Pipeline — data readout",  filled: false, color: "#f59e0b" },
        ].map(({ label, filled, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 12, height: 12, borderRadius: "50%",
              background: filled ? color : "white",
              border: `2px solid ${color}`,
            }} />
            <span style={{ fontSize: 11, color: "#374151" }}>{label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 0, borderTop: "2px dashed #ef4444" }} />
          <span style={{ fontSize: 11, color: "#ef4444" }}>Now (2026)</span>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ minWidth: 680 }}>
        {/* Approved lanes — above axis */}
        {approved.map((ev) => (
          <LaneRow key={ev.name} ev={ev} side="above" />
        ))}

        {/* Centre axis */}
        <AxisBand />

        {/* Emerging lanes — below axis */}
        {emerging.map((ev) => (
          <LaneRow key={ev.name} ev={ev} side="below" />
        ))}
      </div>

      <p style={{ fontSize: 10, color: "#c4c4c4", marginTop: 14 }}>
        LOE dates estimated from composition-of-matter patent expirations and public filings (2026–2042).
        Pipeline readout dates are company guidance or analyst estimates. Hover dots for detail.
      </p>
    </div>
  );
}
