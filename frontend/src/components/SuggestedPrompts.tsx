import type { SuggestedPrompt } from "../data/pattern-content.ts";

interface SuggestedPromptsProps {
  prompts: SuggestedPrompt[];
  onTryPrompt: (prompt: string) => void;
}

export function SuggestedPrompts({ prompts, onTryPrompt }: SuggestedPromptsProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
        Try it
      </h4>
      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <button
            key={p.prompt}
            type="button"
            onClick={() => onTryPrompt(p.prompt)}
            className="group flex items-center gap-1.5 rounded-lg border border-[var(--color-accent-light)] bg-[var(--color-accent-light)]/30 px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-all duration-150"
            title={p.prompt}
          >
            <span className="truncate max-w-[180px]">{p.label}</span>
            <svg
              className="h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
