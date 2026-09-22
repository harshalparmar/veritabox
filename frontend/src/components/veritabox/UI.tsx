/** Shared, theme-strict primitives for VeritaBox pages. */
import { cn } from "@/lib/utils";

/** Card surface. */
export function Surface({ 
  children, 
  className = "", 
  hover = false,
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div 
      className={cn(
        "bg-card border border-border rounded-md",
        hover && "transition-colors hover:border-foreground/30",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Stat tile. */
export function Stat({ label, value, hint, accent, dotColor, icon: Icon }: { label: string; value: string | number; hint?: string; accent?: string; dotColor?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <Surface className="p-4">
      <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium flex items-center gap-1.5">
        {dotColor && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />}
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="mt-1.5 text-[22px] font-semibold tracking-tight" style={accent ? { color: accent } : undefined}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </Surface>
  );
}

/** Pill / chip. */
export function Pill({
  children,
  variant = "default",
  className = "",
  style
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple" | "secondary" | "primary" | "destructive";
  className?: string;
  style?: React.CSSProperties;
}) {
  const map = {
    default: "bg-secondary text-secondary-foreground border-border",
    secondary: "bg-secondary text-secondary-foreground border-border",
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    danger: "bg-destructive/10 text-destructive border-destructive/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
    info: "bg-info/10 text-info border-info/30",
    purple: "bg-primary/10 text-primary border-primary/30",
    primary: "bg-primary/10 text-primary border-primary/30",
  };
  return (
    <span style={style} className={cn("inline-flex items-center px-1.5 py-px text-[10px] font-medium uppercase tracking-wide rounded border", map[variant], className)}>
      {children}
    </span>
  );
}

/** Section title within a page. */
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground/80">{children}</h2>
      {action}
    </div>
  );
}

/** Empty state placeholder for less-built pages. */
export function ComingSoon({ title, note }: { title?: string; note?: string }) {
  return (
    <Surface className="p-8 text-center">
      <div className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-border mb-3">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
      </div>
      <h3 className="text-[15px] font-semibold">{title || "Module under construction"}</h3>
      <p className="text-[12.5px] text-muted-foreground mt-1 max-w-md mx-auto">
        {note || "This route is part of the VeritaBox blueprint and will be wired up next. The page shell is here so you can navigate the whole platform."}
      </p>
    </Surface>
  );
}


/** Premium Skill Slider. */
export function SkillSlider({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 100 
}: { 
  label: string; 
  value: number; 
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
        <span className="text-[12px] font-mono text-primary font-bold">{value}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
      />
    </div>
  );
}

/** Premium Toggle Switch. */
export function ToggleSwitch({ 
  checked, 
  onChange, 
  label 
}: { 
  checked: boolean; 
  onChange: (val: boolean) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      {label && <span className="text-[13px] text-muted-foreground">{label}</span>}
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
          checked ? "bg-success" : "bg-border"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-3.5 w-3.5 rounded-full bg-background shadow-lg ring-0 transition-transform",
            checked ? "translate-x-4.5" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}
