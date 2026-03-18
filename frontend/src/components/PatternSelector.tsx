import { useCallback, useEffect, useState } from "react";
import type { PatternInfo } from "../types.ts";

const PATTERN_ICONS: Record<string, string> = {
  router: "\u2B95",
  pipeline: "\u26D3",
  supervisor: "\uD83D\uDC41",
  debate: "\u2696",
};

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
      <div className="flex items-center gap-2 px-5 py-3 text-sm text-[var(--color-text-tertiary)]">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)] animate-spin-slow" />
        Loading patterns...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-3 text-sm text-amber-600">
        Could not load patterns: {error}
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="px-5 py-3 text-sm text-[var(--color-text-tertiary)]">
        No patterns available. Start the server with registered patterns.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-5 py-2.5 overflow-x-auto">
      {patterns.map((pattern) => {
        const isActive = pattern.name === selected;
        const icon = PATTERN_ICONS[pattern.name.toLowerCase()];
        return (
          <button
            key={pattern.name}
            type="button"
            onClick={() => handleSelect(pattern.name)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "text-[var(--color-text-secondary)] bg-white/60 backdrop-blur-sm border border-white/50 hover:bg-white/80 hover:text-[var(--color-text-primary)]"
            }`}
            title={pattern.description}
          >
            <span className="flex items-center gap-1.5">
              {icon && <span className="text-xs">{icon}</span>}
              {pattern.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
