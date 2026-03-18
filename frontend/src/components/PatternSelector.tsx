import { useCallback, useEffect, useState } from "react";
import type { PatternInfo } from "../types.ts";

interface PatternSelectorProps {
  selected: string | null;
  onSelect: (pattern: string) => void;
}

export function PatternSelector({
  selected,
  onSelect,
}: PatternSelectorProps) {
  const [patterns, setPatterns] = useState<PatternInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/patterns");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data: PatternInfo[] = await response.json();
        if (!cancelled) {
          setPatterns(data);
          setLoading(false);
          // Auto-select first pattern if none selected
          if (!selected && data.length > 0 && data[0]) {
            onSelect(data[0].name);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load patterns";
          setError(message);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback(
    (name: string) => {
      if (name !== selected) {
        onSelect(name);
      }
    },
    [selected, onSelect],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
        <span className="h-3 w-3 rounded-full border-2 border-gray-600 border-t-gray-400 animate-spin" />
        Loading patterns...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 text-sm text-amber-400">
        Could not load patterns: {error}
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="px-4 py-3 text-sm text-gray-500">
        No patterns available. Start the server with registered patterns.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
      {patterns.map((pattern) => {
        const isActive = pattern.name === selected;
        return (
          <button
            key={pattern.name}
            type="button"
            onClick={() => handleSelect(pattern.name)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border border-transparent"
            }`}
            title={pattern.description}
          >
            {pattern.name}
          </button>
        );
      })}
    </div>
  );
}
