// lib/vantage/colors.ts
// Drug-class colour palette used across charts and timeline.

export const CLASS_COLORS: Record<string, string> = {
  "IL-4Rα": "#3b82f6",
  "IL-4Rα antagonist": "#3b82f6",
  "JAK1": "#ef4444",
  "Selective JAK1 inhibitor": "#ef4444",
  "JAK1/2": "#dc2626",
  "JAK1/JAK2 inhibitor": "#dc2626",
  "IL-13": "#8b5cf6",
  "IL-13 antagonist": "#8b5cf6",
  "IL-31Rα": "#10b981",
  "IL-31RA antagonist": "#10b981",
  "IL-33": "#f59e0b",
  "TSLP": "#06b6d4",
  "IL-4/IL-13/TSLP": "#6366f1",
  "IL-4 × IL-13 × TSLP trispecific antibody": "#6366f1",
  "IL-4 × IL-13 × IL-33 trispecific antibody": "#f97316",
  "IL-13 × IL-17A/F multispecific antibody-based therapeutic": "#a78bfa",
  "Half-life-extended anti-IL-13 monoclonal antibody": "#8b5cf6",
  "OX40L": "#ec4899",
  "Non-depleting anti-OX40L monoclonal antibody": "#ec4899",
  "OX40": "#f97316",
  "Anti-OX40 monoclonal antibody": "#f97316",
  "PI3Kδ": "#84cc16",
  "Oral ITK inhibitor": "#84cc16",
  "TL1A": "#14b8a6",
  "TL1A-targeted antibody": "#14b8a6",
  "IL-4Rα/TSLPR": "#6366f1",
  "IL-23": "#0ea5e9",
  "IL-23p19": "#0ea5e9",
  "IL-17A": "#f43f5e",
  "IL-17A/F": "#e11d48",
  "IL-17RA": "#be123c",
  "IL-12/23": "#a78bfa",
  "TYK2": "#fb923c",
  "IL-23R": "#22c55e",
  "PDE4": "#64748b",
  "CCR6": "#7c3aed",
  "IL-4Rα × IL-31 bispecific antibody": "#3b82f6",
  "Combination/bispecific strategy targeting IL-13 and OX40L": "#ec4899",
};

export function getColor(cls: string): string {
  if (!cls) return "#9ca3af";
  if (CLASS_COLORS[cls]) return CLASS_COLORS[cls];
  if (cls.toUpperCase().includes("JAK"))   return "#ef4444";
  if (cls.toLowerCase().includes("il-13")) return "#8b5cf6";
  if (cls.toLowerCase().includes("il-4"))  return "#3b82f6";
  if (cls.toLowerCase().includes("il-23")) return "#0ea5e9";
  if (cls.toLowerCase().includes("il-17")) return "#f43f5e";
  if (cls.toLowerCase().includes("tyk2"))  return "#fb923c";
  if (cls.toLowerCase().includes("ox40"))  return "#f97316";
  if (cls.toLowerCase().includes("tslp"))  return "#06b6d4";
  const key = Object.keys(CLASS_COLORS).find(
    (k) => cls.includes(k) || k.includes(cls)
  );
  return key ? CLASS_COLORS[key] : "#9ca3af";
}
