import { useCallback, useId, useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const contentId = `${id}-content`;

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <div className="rounded-xl border border-[var(--color-border-light)] glass-card overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-black/[0.02] transition-colors duration-150"
      >
        <span className="text-[var(--color-text-tertiary)] shrink-0">
          {icon}
        </span>
        <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] flex-1">
          {title}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-[var(--color-text-tertiary)] transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={contentId}
          role="region"
          className="animate-fade-in border-t border-[var(--color-border-light)] px-3.5 py-3"
        >
          {children}
        </div>
      )}
    </div>
  );
}
