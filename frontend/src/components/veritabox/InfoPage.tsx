import { PublicShell } from "./PublicShell";
import { Pill } from "./UI";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useRef, useState } from "react";

/** Page hero with kicker, title, subtitle and a soft scanline backdrop. */
export function InfoHero({
  kicker,
  title,
  subtitle,
  accent = "hsl(var(--primary))",
}: {
  kicker: string;
  title: string;
  subtitle: string;
  accent?: string;
}) {
  return (
    <header className="relative overflow-hidden border-b border-border">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)/.08) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)/.08) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)",
        }}
      />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-[260px] w-[720px] -translate-x-1/2 rounded-full blur-3xl opacity-30"
        style={{ background: `radial-gradient(closest-side, ${accent}, transparent 70%)` }}
      />
      <div className="relative mx-auto max-w-[1100px] px-6 py-16 md:py-24">
        <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
          <span>{kicker}</span>
        </div>
        <h1 className="mt-4 text-[32px] md:text-[48px] font-semibold tracking-tight leading-[1.05] max-w-[820px]">
          {title}
        </h1>
        <p className="mt-4 text-[14.5px] md:text-[16px] text-muted-foreground max-w-[680px] leading-relaxed">
          {subtitle}
        </p>
      </div>
    </header>
  );
}

/** Page wrapper with reveal-on-scroll content blocks. */
export function InfoPage({
  kicker,
  title,
  subtitle,
  accent,
  children,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <PublicShell>
      <InfoHero kicker={kicker} title={title} subtitle={subtitle} accent={accent} />
      <div className="mx-auto max-w-[1100px] px-6 py-12 md:py-16 space-y-14">
        {children}
      </div>
    </PublicShell>
  );
}

/** Reveal-on-scroll wrapper. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Section header with eyebrow + title + optional description. */
export function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <Reveal>
        <div className="mb-6">
          {eyebrow && (
            <div className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-2">
              {eyebrow}
            </div>
          )}
          <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-2 text-[13.5px] text-muted-foreground max-w-[680px]">{description}</p>
          )}
        </div>
      </Reveal>
      {children}
    </section>
  );
}

/** Feature card with icon. */
export function FeatureCard({
  icon: Icon,
  title,
  description,
  accent = "text-primary",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  accent?: string;
}) {
  return (
    <div className="group relative bg-card border border-border rounded-md p-5 transition-all hover:border-foreground/30 hover:-translate-y-0.5">
      <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded border border-border bg-background", accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-3.5 text-[14.5px] font-semibold">{title}</h3>
      <p className="mt-1.5 text-[12.5px] text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

/** Status dot. */
export function StatusDot({ tone = "success" }: { tone?: "success" | "warning" | "danger" | "muted" }) {
  const map = {
    success: "bg-success shadow-[0_0_8px_hsl(var(--success)/.6)]",
    warning: "bg-warning shadow-[0_0_8px_hsl(var(--warning)/.6)]",
    danger: "bg-destructive shadow-[0_0_8px_hsl(var(--destructive)/.6)]",
    muted: "bg-muted-foreground/40",
  } as const;
  return <span className={cn("inline-block h-2 w-2 rounded-full animate-pulse", map[tone])} />;
}

export { Pill };

/** Animated count-up that runs once when scrolled into view. */
export function LiveCounter({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration = 1400,
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal<HTMLSpanElement>(0.4);
  const [n, setN] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(value * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, value, duration]);
  return (
    <span ref={ref} className={cn("tabular-nums font-mono", className)}>
      {prefix}{n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

/** Live "updated N seconds ago" timestamp. */
export function LiveTimestamp({ className }: { className?: string }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const label = t < 60 ? `${t}s ago` : `${Math.floor(t / 60)}m ${t % 60}s ago`;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground", className)}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-success/60 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
      </span>
      Updated {label}
    </span>
  );
}

/** Animated horizontal progress bar that fills when in view. */
export function LiveBar({ percent, tone = "primary" }: { percent: number; tone?: "primary" | "success" | "warning" | "info" | "destructive" }) {
  const { ref, visible } = useReveal<HTMLDivElement>(0.3);
  const tones = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    info: "bg-info",
    destructive: "bg-destructive",
  } as const;
  return (
    <div ref={ref} className="h-1.5 w-full bg-secondary/60 rounded overflow-hidden">
      <div
        className={cn("h-full rounded transition-[width] duration-[1400ms] ease-out", tones[tone])}
        style={{ width: visible ? `${Math.min(100, percent)}%` : "0%" }}
      />
    </div>
  );
}

/** Live ticking marquee of recent events. */
export function LiveTicker({ items }: { items: string[] }) {
  return (
    <div className="relative overflow-hidden border-y border-border bg-card/40 py-2">
      <div className="flex gap-10 whitespace-nowrap animate-[ticker_38s_linear_infinite]">
        {[...items, ...items].map((s, i) => (
          <span key={i} className="text-[11.5px] font-mono text-muted-foreground inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {s}
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
