// components/vantage/DrugHoverCard.tsx
import { DrugReference } from "@/lib/vantage/types";

const INTERNAL_PATTERNS = [
  /atd[_\s-]?\d*/gi, /pso[_\s-]?\d*/gi, /deck[_\s-]?\d*/gi,
  /\.pptx/gi, /internal deck/gi, /slide\s*\d+/gi,
  /AtD_\d+/g, /aad \d{4}/gi, /eadv \d{4}/gi,
];

function scrub(text: string): string {
  let t = text;
  for (const p of INTERNAL_PATTERNS) t = t.replace(p, "");
  return t.replace(/;\s*;/g, ";").replace(/\s{2,}/g, " ").trim();
}

function truncate(text: string, max = 120): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export function DrugHoverCard({ drug }: { drug: DrugReference }) {
  const isEmerging = drug.tier !== "approved";
  const hasDoses   = Array.isArray(drug.doses) && drug.doses.length > 0;

  // Build a clean key message — strip internal refs, cap length
  const rawMsg = drug.keyMessage ?? "";
  const cleanMsg =
    rawMsg &&
    !rawMsg.toLowerCase().startsWith("prior file") &&
    !rawMsg.toLowerCase().startsWith("corrects prior")
      ? truncate(scrub(rawMsg))
      : null;

  return (
    <div style={{
      position: "absolute", right: 0, top: "calc(100% + 6px)",
      zIndex: 100, pointerEvents: "none", isolation: "isolate",
      background: "#fff",
      border: `1.5px solid ${isEmerging ? "#fde68a" : "#bfdbfe"}`,
      borderRadius: 10, padding: "10px 12px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
      width: 280,
    }}>
      {/* Header */}
      <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 1px",
        color: isEmerging ? "#92400e" : "#1e40af" }}>
        {drug.name}{drug.brandName ? ` (${drug.brandName})` : ""}
      </p>
      <p style={{ fontSize: 10, color: "#9ca3af", margin: "0 0 6px" }}>
        {drug.drugClass} · {drug.tier === "approved" ? "Approved" : "Pipeline"}
      </p>

      {/* Primary metric */}
      <div style={{
        padding: "5px 8px", borderRadius: 6, marginBottom: 5,
        background: isEmerging ? "#fffbeb" : "#eff6ff",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
          {drug.metricLabel}:{" "}
          {drug.metricValue !== null ? `${drug.metricValue}%` : "not disclosed"}
        </span>
        {drug.placeboValue !== null && (
          <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 8 }}>
            PBO {drug.placeboValue}%
          </span>
        )}
        {drug.timepoint && (
          <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>
            {drug.timepoint}
          </p>
        )}
      </div>

      {/* Doses — max 3 rows */}
      {hasDoses && (
        <div style={{ marginBottom: 5 }}>
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

      {/* Key message — scrubbed and capped */}
      {cleanMsg && (
        <p style={{ fontSize: 10, color: "#4b5563", margin: "4px 0 0", lineHeight: 1.4 }}>
          {cleanMsg}
        </p>
      )}

      {/* Source link */}
      {drug.sourceUrl && (
        <a href={drug.sourceUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 10, color: "#3b82f6", display: "block", marginTop: 5, pointerEvents: "auto" }}>
          Source ↗
        </a>
      )}
    </div>
  );
}
