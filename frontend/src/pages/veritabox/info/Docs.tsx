import { InfoPage, Section, Reveal, LiveCounter, LiveTimestamp } from "@/components/veritabox/InfoPage";
import { BookOpen, Code2, GraduationCap, Rocket, ArrowRight, Search, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

const sections = [
  {
    icon: Rocket, title: "Getting Started", color: "text-success",
    items: [
      { t: "Create your account and set up your profile", time: "3 min" },
      { t: "Join a chapter and explore the dashboard", time: "5 min" },
      { t: "Register for your first hackathon or competition", time: "5 min" },
      { t: "Submit your first bounty or forge challenge", time: "8 min" },
    ],
  },
  {
    icon: BookOpen, title: "Platform Guides", color: "text-warning",
    items: [
      { t: "Understanding squadrons and team formation", time: "6 min" },
      { t: "Knowledge base — writing and publishing articles", time: "8 min" },
      { t: "Earning reputation and climbing the leaderboard", time: "5 min" },
      { t: "Managing events as an organizer", time: "10 min" },
    ],
  },
  {
    icon: Code2, title: "API & Integrations", color: "text-info",
    items: [
      { t: "Authentication — JWT, OAuth, session management", time: "ref" },
      { t: "Event registration and submission endpoints", time: "ref" },
      { t: "Webhooks for real-time event notifications", time: "beta" },
      { t: "Leaderboard and scoring API", time: "ref" },
    ],
  },
  {
    icon: GraduationCap, title: "Learning Paths", color: "text-primary",
    items: [
      { t: "AI-powered roadmap onboarding walkthrough", time: "10 min" },
      { t: "Skill assessments and diagnostic quizzes", time: "15 min" },
      { t: "Daily checklist and progress tracking", time: "5 min" },
      { t: "Building and sharing your project portfolio", time: "12 min" },
    ],
  },
];

const trendingInitial = [
  { t: "Getting started guide", views: 412 },
  { t: "Squadron formation FAQ", views: 289 },
  { t: "Hackathon submission flow", views: 207 },
  { t: "Reputation scoring system", views: 184 },
  { t: "Event organizer handbook", views: 121 },
];

export default function Docs() {
  const [q, setQ] = useState("");
  const [trending, setTrending] = useState(trendingInitial);

  useEffect(() => {
    const id = setInterval(() => {
      setTrending(prev => prev.map(p => ({ ...p, views: p.views + Math.floor(Math.random() * 3) })));
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <InfoPage
      kicker="Support / Documentation"
      title="Everything you need to get started."
      subtitle="From your first sign-up to running your own hackathon — comprehensive guides organized by what you are trying to do."
      accent="hsl(var(--info))"
    >
      <Reveal>
        <div className="bg-card border border-border rounded-md p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: "Guides", v: 48 },
            { l: "Tutorials", v: 24 },
            { l: "API endpoints", v: 67 },
            { l: "Reads today", v: 1284 },
          ].map(s => (
            <div key={s.l}>
              <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono">{s.l}</div>
              <div className="mt-1 text-[20px] font-semibold"><LiveCounter value={s.v} /></div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search docs — e.g. 'hackathon', 'squadron', 'bounty'"
            className="w-full bg-card border border-border rounded-md pl-10 pr-4 py-3 text-[13.5px] focus:outline-none focus:border-foreground/40 transition-colors"
          />
        </div>
      </Reveal>

      <Section eyebrow="Index" title="Browse by topic">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((s, i) => {
            const filtered = s.items.filter(it => it.t.toLowerCase().includes(q.toLowerCase()));
            if (q && filtered.length === 0) return null;
            return (
              <Reveal key={s.title} delay={i * 60}>
                <div className="bg-card border border-border rounded-md p-5 h-full transition-colors hover:border-foreground/30">
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-background ${s.color}`}>
                      <s.icon className="h-4 w-4" />
                    </span>
                    <h3 className="text-[14.5px] font-semibold">{s.title}</h3>
                  </div>
                  <ul className="mt-4 divide-y divide-border/60">
                    {filtered.map(it => (
                      <li key={it.t} className="flex items-center justify-between py-2.5 group cursor-pointer">
                        <span className="text-[13px] text-foreground/85 group-hover:text-foreground">{it.t}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-[10.5px] font-mono text-muted-foreground uppercase tracking-wider">{it.time}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <Section eyebrow="Live" title="Trending right now">
        <Reveal>
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div className="flex items-center gap-2 text-[12px] font-mono uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                Most-read in the last hour
              </div>
              <LiveTimestamp />
            </div>
            {trending.map((t, i) => (
              <div key={t.t} className={`flex items-center gap-4 px-4 py-3 ${i < trending.length - 1 ? "border-b border-border/60" : ""}`}>
                <span className="text-[11px] font-mono text-muted-foreground tabular-nums w-6">#{i + 1}</span>
                <span className="flex-1 text-[13px]">{t.t}</span>
                <span className="text-[12px] font-mono tabular-nums text-foreground/80">{t.views} reads</span>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>
    </InfoPage>
  );
}
