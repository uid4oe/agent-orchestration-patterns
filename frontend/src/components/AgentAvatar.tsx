const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  router: { bg: "bg-blue-100", text: "text-blue-700" },
  classifier: { bg: "bg-blue-100", text: "text-blue-700" },
  specialist: { bg: "bg-emerald-100", text: "text-emerald-700" },
  reviewer: { bg: "bg-amber-100", text: "text-amber-700" },
  supervisor: { bg: "bg-purple-100", text: "text-purple-700" },
  debater: { bg: "bg-rose-100", text: "text-rose-700" },
  judge: { bg: "bg-orange-100", text: "text-orange-700" },
  pipeline: { bg: "bg-cyan-100", text: "text-cyan-700" },
  worker: { bg: "bg-teal-100", text: "text-teal-700" },
};

const DEFAULT_COLORS = { bg: "bg-gray-100", text: "text-gray-600" };

export function getAgentColors(role: string): { bg: string; text: string } {
  return ROLE_COLORS[role.toLowerCase()] ?? DEFAULT_COLORS;
}

interface AgentAvatarProps {
  name: string;
  role: string;
  size?: "sm" | "md";
}

export function AgentAvatar({ name, role, size = "md" }: AgentAvatarProps) {
  const colors = getAgentColors(role);
  const initial = name.charAt(0).toUpperCase();

  const sizeClasses =
    size === "sm"
      ? "h-6 w-6 text-[10px]"
      : "h-8 w-8 text-xs";

  return (
    <div
      className={`${sizeClasses} ${colors.bg} ${colors.text} rounded-full flex items-center justify-center font-semibold shrink-0 select-none`}
      title={`${name} (${role})`}
    >
      {initial}
    </div>
  );
}
