"use client";

import { useEffect } from "react";

export default function TrialError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Trial page error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-2">
        Error: Failed to load trial
      </h2>
      <p className="text-gray-600 mb-6">{error.message}</p>
      <div className="flex justify-center gap-4">
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try again
        </button>
        <a
          href="/trials"
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Back to search
        </a>
      </div>
    </div>
  );
}
