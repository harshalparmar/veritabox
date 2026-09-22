/** SkillStatusBadge — Renders a badge for any skill verification status */
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  "Not Started":         { label: "Not Started",       className: "bg-secondary text-secondary-foreground border-border" },
  "Self-Reported":       { label: "Self-Reported",     className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30 dark:text-yellow-400" },
  "Assessment Started":  { label: "Assessing",         className: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400" },
  "Partially Verified":  { label: "Partial",           className: "bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400" },
  "Needs Learning":      { label: "Needs Learning",    className: "bg-destructive/10 text-destructive border-destructive/30" },
  "Verified":            { label: "Verified",          className: "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400" },
  "Proficient":          { label: "Proficient",        className: "bg-primary/10 text-primary border-primary/30" },
  "Mastered":            { label: "Mastered",          className: "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400" },
};

export function SkillStatusBadge({
  status,
  className = "",
  showDot = false,
}: {
  status: string;
  className?: string;
  showDot?: boolean;
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["Not Started"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide rounded border",
        config.className,
        className
      )}
    >
      {showDot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {config.label}
    </span>
  );
}

/** Color dot for skill status */
export function SkillStatusDot({ status, className = "" }: { status: string; className?: string }) {
  const dotColors: Record<string, string> = {
    "Not Started":        "bg-muted-foreground",
    "Self-Reported":      "bg-yellow-500",
    "Assessment Started": "bg-blue-500",
    "Partially Verified": "bg-orange-500",
    "Needs Learning":     "bg-destructive",
    "Verified":           "bg-green-500",
    "Proficient":         "bg-primary",
    "Mastered":           "bg-purple-500",
  };
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", dotColors[status] || "bg-muted-foreground", className)}
    />
  );
}
