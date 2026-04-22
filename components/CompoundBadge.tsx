"use client";

import { useEffect, useState } from "react";

interface DrugInfo {
  drugClass?: string;
  genericName?: string;
  summary?: string;
  confidence?: string;
}

interface Props {
  code: string; // e.g. "JNJ-2113"
}

export default function CompoundBadge({ code }: Props) {
  const [info, setInfo]       = useState<DrugInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      try {
        const res = await fetch(`/api/drug?name=${encodeURIComponent(code)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.found !== false) setInfo(data);
      } catch {
        // silently fail — just show the code
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    resolve();
    return () => { cancelled = true; };
  }, [code]);

  // Still loading — show code only
  if (loading) {
    return (
      <span className="text-xs px-2.5 py-0.5 bg-gray-100 text-gray-500
                       rounded-full font-mono">
        {code}
      </span>
    );
  }

  // No info found — just show code
  if (!info) {
    return (
      <span className="text-xs px-2.5 py-0.5 bg-gray-100 text-gray-500
                       rounded-full font-mono">
        {code}
      </span>
    );
  }

  // Resolved — show code + common name + class
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5
                     bg-blue-50 text-blue-700 border border-blue-100
                     rounded-full">
      <span className="font-mono text-blue-400">{code}</span>
      {info.genericName && info.genericName.toLowerCase() !== code.toLowerCase() && (
        <>
          <span className="text-blue-300">·</span>
          <span className="font-medium">{info.genericName}</span>
        </>
      )}
      {info.drugClass && (
        <>
          <span className="text-blue-300">·</span>
          <span className="text-blue-500">{info.drugClass}</span>
        </>
      )}
    </span>
  );
}