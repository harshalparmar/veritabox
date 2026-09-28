import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { useReveal } from "@/hooks/use-reveal";
import { BanterLoader } from "@/components/BanterLoader";
import { useTheme } from "next-themes";
import {
  ArrowRight, Code2, Trophy, Wrench, Target, BookOpen, Zap,
  GitBranch, Award, Users, ChevronRight, GraduationCap, Calendar,
  Swords, Map, ClipboardCheck, BarChart3, Briefcase, MessageSquare,
  Cpu, FlaskConical, Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ----------------------------- Data ---------------------------------- */

const modules = [
  {
    icon: Trophy,
    title: "Hackathons",
    desc: "Squadron based time bound builds with shared canvas, relay comms and deadline timer.",
    to: "/hackathons",
    accent: "from-amber-500 to-orange-600",
  },
  {
    icon: Swords,
    title: "Competitions",
    desc: "Multi round competitive arenas with live leaderboards and proctored assessments.",
    to: "/competitions",
    accent: "from-red-500 to-rose-600",
  },
  {
    icon: Target,
    title: "Bounties",
    desc: "Earn reputation by completing scoped missions issued by your institute or HQ.",
    to: "/bounties",
    accent: "from-yellow-500 to-amber-600",
  },
  {
    icon: Code2,
    title: "Code Forge",
    desc: "Algorithmic challenges with a Monaco editor, test cases, and a verdict pipeline.",
    to: "/forge",
    accent: "from-cyan-500 to-blue-600",
  },
  {
    icon: Wrench,
    title: "Circuit Lab",
    desc: "Living build logs, schematics, BOM, photos, stages from Planning to Showcase.",
    to: "/lab",
    accent: "from-orange-500 to-red-600",
  },
  {
    icon: BookOpen,
    title: "Knowledge Hub",
    desc: "Field tested articles, learning paths, and technical documentation.",
    to: "/knowledge",
    accent: "from-emerald-500 to-green-600",
  },
  {
    icon: GraduationCap,
    title: "Workshops",
    desc: "Guided hands on learning sessions with registration, materials, and certificates.",
    to: "/workshops",
    accent: "from-violet-500 to-purple-600",
  },
  {
    icon: Calendar,
    title: "Events",
    desc: "Campus wide happenings with digital ID cards, registrations, and attendance.",
    to: "/events",
    accent: "from-pink-500 to-fuchsia-600",
  },
  {
    icon: Map,
    title: "Roadmaps",
    desc: "AI generated personalised learning paths with phased modules and progress tracking.",
    to: "/roadmaps",
    accent: "from-teal-500 to-emerald-600",
  },
  {
    icon: Newspaper,
    title: "Tutorials",
    desc: "Long form published content with categories, learn at your own pace.",
    to: "/tutorials",
    accent: "from-blue-500 to-indigo-600",
  },
  {
    icon: Briefcase,
    title: "Jobs",
    desc: "Career opportunities matched to your skills with recruiter tools and applications.",
    to: "/jobs",
    accent: "from-slate-500 to-zinc-600",
  },
  {
    icon: Users,
    title: "Chapters",
    desc: "Institute level coalitions with leaderboards, management, and chapter commands.",
    to: "/chapters",
    accent: "from-indigo-500 to-violet-600",
  },
];

const stats = [
  { label: "Modules", value: "12+", desc: "integrated surfaces" },
  { label: "Uptime", value: "99.9%", desc: "platform reliability" },
  { label: "Open Source", value: "100%", desc: "transparent stack" },
];

const steps = [
  { icon: GitBranch, num: "01", title: "Enlist", desc: "Sign up, pick your institute, and set your career goal." },
  { icon: Target, num: "02", title: "Take a mission", desc: "Bounties, hackathons, competitions, forge, your choice." },
  { icon: Users, num: "03", title: "Ship together", desc: "Squadron canvas, relay comms, deadline timer." },
  { icon: Award, num: "04", title: "Bank reputation", desc: "Verdicts feed your profile. Rank up. Repeat." },
];

/* --------------------------- Helpers --------------------------------- */

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(className, "transition-all duration-700 ease-out", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

function GlowCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -200, y: -200 });
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseLeave={() => setPos({ x: -200, y: -200 })}
      className={cn("relative bg-card border border-border rounded-lg overflow-hidden transition-all hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-lg", className)}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          background: `radial-gradient(320px circle at ${pos.x}px ${pos.y}px, hsl(var(--primary) / 0.08), transparent 60%)`,
          opacity: pos.x < 0 ? 0 : 1,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ========================= COMPONENT ================================= */

export default function VeritaBoxLanding() {
  const { resolvedTheme } = useTheme();
  const [cubeZoom, setCubeZoom] = useState(() => window.innerWidth < 1024 ? 270 : 360);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActiveStep((p) => (p + 1) % 4), 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onResize = () => setCubeZoom(window.innerWidth < 1024 ? 270 : 360);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <PublicShell>
      <style>{`
        @keyframes hero-arrive {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-drift {
          from { transform: translate3d(-1%, 0, 0); }
          to { transform: translate3d(1%, 1.5%, 0); }
        }
        .landing-hero::before {
          content: "";
          position: absolute;
          z-index: 0;
          inset: 0 0 0 auto;
          width: min(58rem, 85vw);
          pointer-events: none;
          background-image:
            linear-gradient(hsl(var(--foreground) / .055) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground) / .055) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: linear-gradient(90deg, transparent, #000 30%, #000 82%, transparent);
          animation: hero-drift 24s ease-in-out infinite alternate;
        }
        .landing-hero-copy > * {
          animation: hero-arrive .8s cubic-bezier(.2, .75, .25, 1) both;
        }
        .landing-hero-copy > :nth-child(1) { animation-delay: 80ms; }
        .landing-hero-copy > :nth-child(2) { animation-delay: 180ms; }
        .landing-hero-copy > :nth-child(3) { animation-delay: 280ms; }
        .landing-hero-copy > :nth-child(4) { animation-delay: 360ms; }
        .hero-stat {
          animation: hero-arrive .7s cubic-bezier(.2, .75, .25, 1) both;
        }
        .hero-cta {
          box-shadow: 0 2px 8px hsl(var(--foreground) / .08);
        }
        .hero-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px hsl(var(--foreground) / .14);
        }
        .hero-cta:focus-visible {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 4px;
        }
        .hero-heading__base,
        .hero-heading__emphasis,
        .hero-heading__accent {
          display: inline;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          background-size: 100% 100%, 240% 100%;
          background-position: 0 0, 100% 0;
          background-repeat: no-repeat;
          animation: hero-heading-glint 8s ease-in-out infinite;
        }
        .hero-heading__base {
          background-image:
            linear-gradient(hsl(var(--foreground)), hsl(var(--foreground))),
            linear-gradient(105deg, transparent 0%, transparent 43%, hsl(158 55% 82% / .3) 47%, hsl(158 55% 90% / .82) 50%, hsl(158 55% 82% / .3) 53%, transparent 57%, transparent 100%);
          text-shadow: 0 0 26px hsl(158 68% 48% / .12), 0 0 64px hsl(158 68% 48% / .07);
        }
        .hero-heading__emphasis {
          background-image:
            linear-gradient(hsl(var(--foreground)), hsl(var(--foreground))),
            linear-gradient(105deg, transparent 0%, transparent 43%, hsl(158 55% 82% / .3) 47%, hsl(158 55% 90% / .82) 50%, hsl(158 55% 82% / .3) 53%, transparent 57%, transparent 100%);
          text-shadow: 0 0 26px hsl(158 68% 48% / .12), 0 0 64px hsl(158 68% 48% / .07);
        }
        .hero-heading__accent {
          background-image:
            linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary)), #10b981),
            linear-gradient(105deg, transparent 0%, transparent 43%, hsl(158 78% 62% / .28) 47%, hsl(158 78% 74% / .72) 50%, hsl(158 78% 62% / .28) 53%, transparent 57%, transparent 100%);
          text-shadow: 0 0 26px hsl(158 78% 48% / .15), 0 0 64px hsl(158 78% 48% / .09);
        }
        @keyframes hero-heading-glint {
          0%, 69% { background-position: 0 0, 100% 0; }
          84%, 100% { background-position: 0 0, 0 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-hero::before,
          .landing-hero-copy > *,
          .hero-stat,
          .hero-heading__base,
          .hero-heading__emphasis,
          .hero-heading__accent {
            animation: none;
          }
          .hero-heading__base,
          .hero-heading__emphasis,
          .hero-heading__accent {
            background-position: 0 0, 100% 0;
          }
          .hero-cta:hover { transform: none; }
        }
        @keyframes pulse-flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-pulse-flow { animation: pulse-flow 3s linear infinite; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>

      {/* ===================== HERO ===================== */}
      <section className="landing-hero relative z-10 pt-16 pb-0 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1200px] relative">
          <div className="pt-[52px] pb-20 relative flex">
            {/* Left  -  text */}
            <div className="landing-hero-copy relative z-[3] flex-1 min-w-0 max-w-[560px]">
              <h1 className="text-[40px] sm:text-[48px] lg:text-[54px] font-[500] leading-[1.08] tracking-normal text-foreground max-w-[560px]">
                <span className="hero-heading__base">One platform for </span>
                <span className="hero-heading__emphasis font-semibold">learning, building &amp; </span>
                <span className="hero-heading__accent font-semibold">competing.</span>
              </h1>

              <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground max-w-[480px]">
                VeritaBox unifies hackathons, competitions, coding challenges, workshops,
                events, learning roadmaps, and career tools into a single identity,
                so institutes and builders can focus on what matters.
              </p>

              <div className="mt-10 flex items-center gap-4 flex-wrap">
                <Link to="/register">
                  <button className="hero-cta group relative inline-flex items-center gap-2 px-6 py-3 text-[14px] font-medium bg-foreground text-background transition-all duration-200 hover:bg-foreground/90 rounded-md">
                    Enlist Now
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </Link>
              </div>

              {/* Inline stats */}
              <div className="mt-12 flex gap-8">
                {stats.map((s) => (
                  <div key={s.label} className="hero-stat" style={{ animationDelay: `${440 + stats.indexOf(s) * 90}ms` }}>
                    <div className="text-[22px] font-semibold tracking-tight text-foreground">{s.value}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>


            {/* Mobile 3D cube */}
            <div className="absolute inset-0 flex items-center justify-center z-[1] opacity-55 dark:opacity-45 md:hidden pointer-events-none">
              <BanterLoader scale={1.8} />
            </div>

            {/* Desktop 3D cube */}
            <div className="hidden md:block flex-1 relative z-[1] pointer-events-none" style={{ minWidth: 0 }}>
              <div className="absolute top-1/2 right-0 flex items-center justify-center" style={{ width: 840, height: 840, transform: "translate(140px, calc(-50% + -80px))" }}>
                <BanterLoader scale={3.5} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 w-full border-t border-border" />

      {/* ===================== MODULE GRID ===================== */}
      <section className="px-6 py-20 border-b border-border">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Platform</div>
                <h2 className="text-[28px] font-semibold tracking-tight mt-1">Everything you need, unified.</h2>
                <p className="text-[14px] text-muted-foreground mt-2 max-w-md">
                  Twelve integrated modules, from competitive arenas to career tools, all connected through a single reputation system.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {modules.map((m, i) => (
              <Reveal key={m.title} delay={i * 50}>
                <Link to={m.to} className="block h-full">
                  <GlowCard className="p-5 h-full group">
                    <div className="flex items-center justify-between">
                      <div className={cn("h-8 w-8 rounded-md flex items-center justify-center bg-gradient-to-br", m.accent)}>
                        <m.icon className="h-4 w-4 text-white" />
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                    </div>
                    <h3 className="mt-3 text-[14px] font-semibold text-foreground">{m.title}</h3>
                    <p className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed">{m.desc}</p>
                  </GlowCard>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>



      {/* ===================== HOW IT WORKS ===================== */}
      <section className="px-6 py-20 border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1100px]">
          <Reveal>
            <div className="text-center mb-14">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Workflow</div>
              <h2 className="text-[28px] font-semibold tracking-tight mt-1">Four steps to get started.</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 relative">
            {/* Connecting line (Desktop only) */}
            <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-[2px] bg-border overflow-hidden rounded-full">
              <div className="h-full bg-primary animate-pulse-flow w-1/3 rounded-full" />
            </div>

            {steps.map((step, i) => {
              const isActive = activeStep === i;
              return (
                <Reveal key={step.num} delay={i * 120}>
                  <div
                    onMouseEnter={() => setActiveStep(i)}
                    className="relative text-left md:text-center"
                  >
                    <div className={cn(
                      "inline-flex items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-xl border transition-all duration-300 md:mx-auto",
                      isActive ? "border-primary bg-primary/10 shadow-sm" : "border-border/50 bg-card/50"
                    )}>
                      <step.icon className={cn("h-5 w-5 md:h-6 md:w-6 transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="mt-4 md:mt-5">
                      <div className="text-[10px] font-mono text-muted-foreground/80 font-medium mb-1">{step.num}</div>
                      <div className="text-[14px] md:text-[15px] font-semibold text-foreground tracking-tight leading-tight">{step.title}</div>
                      <div className="text-[12px] md:text-[12.5px] text-muted-foreground mt-2 leading-relaxed max-w-[90%] md:mx-auto">{step.desc}</div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="relative px-6 py-24 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[600px] rounded-full bg-primary/10 blur-3xl" />

        <Reveal className="relative">
          <div className="mx-auto max-w-[800px] text-center">
            <Zap className="h-6 w-6 text-primary mx-auto animate-float" />
            <h2 className="mt-4 text-[32px] font-semibold tracking-tight">Ready to get started?</h2>
            <p className="mt-3 text-[14px] text-muted-foreground max-w-md mx-auto">
              Join VeritaBox for free. Set up your profile, join a chapter, and start building your reputation today.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
              <Link to="/register">
                <button className="group text-[13px] h-10 px-6 bg-foreground text-background hover:bg-foreground/90 rounded-md inline-flex items-center gap-2 transition-all">
                  Create free account <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </Link>
              <Link to="/about" className="text-[13px] h-10 px-6 border border-border rounded-md inline-flex items-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all">
                Learn more
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </PublicShell>
  );
}
