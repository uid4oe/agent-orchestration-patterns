import { LearnView } from "./LearnView.tsx";

interface RightPanelProps {
  selectedPattern: string | null;
  onTryPrompt: (prompt: string) => void;
}

export function RightPanel({
  selectedPattern,
  onTryPrompt,
}: RightPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <LearnView
        selectedPattern={selectedPattern}
        onTryPrompt={onTryPrompt}
      />
    </div>
  );
}
