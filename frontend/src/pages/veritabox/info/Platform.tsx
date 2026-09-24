import { InfoPage, Section, FeatureCard, Reveal, Pill, LiveCounter, LiveTimestamp, LiveBar, LiveTicker } from "@/components/veritabox/InfoPage";
import {
  Activity, Calendar, Users, BookOpen, Shield, Lock, KeyRound, FileSearch,
} from "lucide-react";
import { useEffect, useState } from "react";

const features = [
  { icon: Activity, title: "Real-time Event Dashboard", description: "Live monitoring of hackathons, competitions, and workshops with real-time participant tracking and leaderboards.", accent: "text-success" },
  { icon: Calendar, title: "End-to-End Event Management", description: "From registration to certificate generation — manage the complete lifecycle of any event type.", accent: "text-info" },
  { icon: Users, title: "Teams & Collaboration", description: "Squadron management, chapter networks, and built-in messaging for seamless team coordination.", accent: "text-primary" },
  { icon: BookOpen, title: "Learning & Knowledge Hub", description: "Curated knowledge base, interactive tutorials, AI-powered roadmaps, and skill assessments.", accent: "text-warning" },
];

const security = [
  { icon: Shield, title: "Role-Based Access Control", description: "Granular permissions for students, educators, admins, and super administrators." },
  { icon: Lock, title: "Secure Authentication", description: "Multi-factor auth with Google OAuth, JWT tokens, and session management." },
  { icon: KeyRound, title: "Anti-Cheat Proctoring", description: "Built-in proctoring system for competitions and assessments with violation detection." },
  { icon: FileSearch, title: "Audit Logs", description: "Transparent tracking of administrative actions, submissions, and platform changes." },
];

const roadmap = [
  { v: "v0.7", milestone: "Core platform — hackathons, competitions, knowledge base, bounties.", eta: "Q3 2026", status: "current", progress: 85 },
  { v: "v1.0", milestone: "Public release — polished UX, mobile optimization, API documentation.", eta: "Q4 2026", status: "planned", progress: 30 },
  { v: "v1.5", milestone: "Advanced analytics dashboard and enterprise features.", eta: "Q1 2027", status: "planned", progress: 8 },
  { v: "v2.0", milestone: "AI-powered learning paths, automated grading, and marketplace.", eta: "2027", status: "future", progress: 0 },
];

function LivePlatformStrip() {
  const [vals, setVals] = useState({ events: 24, users: 1842, submissions: 3472, uptime: 99.94 });
  useEffect(() => {
    const id = setInterval(() => {
      setVals(v => ({
        events: 20 + Math.floor(Math.random() * 10),
        users: v.users + Math.floor(Math.random() * 5),
        submissions: v.submissions + Math.floor(10 + Math.random() * 30),
        uptime: +(99.9 + Math.random() * 0.09).toFixed(2),
      }));
    }, 1500);
    return () => clearInterval(id);
  }, []);
  const cells = [
    { label: "Active events", value: vals.events.toString(), tone: "text-success" },
    { label: "Registered users", value: vals.users.toLocaleString(), tone: "text-primary" },
    { label: "Total submissions", value: vals.submissions.toLocaleString(), tone: "text-info" },
    { label: "Uptime (90d)", value: `${vals.uptime}%`, tone: "text-warning" },
  ];
  return (
    <div className="bg-card border border-border rounded-md grid grid-cols-2 md:grid-cols-4 divide-x divide-border/60">
      {cells.map(c => (
        <div key={c.label} className="px-5 py-4">
          <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono">{c.label}</div>
          <div className={`mt-1.5 text-[20px] font-semibold tabular-nums font-mono ${c.tone}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function Platform() {
  return (
    <InfoPage
      kicker="Platform / Overview"
      title="The engine behind VeritaBox."
      subtitle="VeritaBox unifies event management, interactive learning, team collaboration, and community engagement into a single platform — built for educators, organizers, and builders."
      accent="hsl(var(--primary))"
    >
      <Reveal>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Live metrics</div>
          <LiveTimestamp />
        </div>
        <LivePlatformStrip />
      </Reveal>

      <Section eyebrow="01 / Features" title="What the platform does">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <FeatureCard {...f} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section eyebrow="02 / Security" title="Hardened by default" description="User data and competition integrity are non-negotiable. VeritaBox is designed so that the unsafe option is also the inconvenient one.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {security.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <FeatureCard {...s} accent="text-info" />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section eyebrow="03 / Roadmap" title="Where we are headed">
        <Reveal>
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <div className="grid grid-cols-[80px_1fr_120px_110px] px-4 py-2.5 border-b border-border text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono">
              <div>Phase</div><div>Milestone</div><div>Delivery</div><div>Status</div>
            </div>
            {roadmap.map((r, i) => (
              <div key={r.v} className={`px-4 py-3.5 ${i < roadmap.length - 1 ? "border-b border-border/60" : ""}`}>
                <div className="grid grid-cols-[80px_1fr_120px_110px] items-center text-[13px]">
                  <div className="font-mono font-semibold">{r.v}</div>
                  <div className="text-foreground/90 pr-4">{r.milestone}</div>
                  <div className="font-mono text-[12px] text-muted-foreground">{r.eta}</div>
                  <div>
                    {r.status === "current" && <Pill variant="success">In progress</Pill>}
                    {r.status === "planned" && <Pill variant="info">Planned</Pill>}
                    {r.status === "future" && <Pill variant="default">Future</Pill>}
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-[80px_1fr_120px_110px] items-center gap-3">
                  <div />
                  <LiveBar percent={r.progress} tone={r.status === "current" ? "success" : r.status === "planned" ? "info" : "primary"} />
                  <div className="font-mono text-[11px] text-muted-foreground tabular-nums">{r.progress}%</div>
                  <div />
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      <Reveal>
        <div className="space-y-3">
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Live activity</div>
          <LiveTicker
            items={[
              "New hackathon registration — WebDev Sprint 2026",
              "Competition round 3 results published",
              "Knowledge article published: Intro to System Design",
              "Forge challenge completed by @dev.kumar",
              "Chapter Pune crossed 200 members",
              "Workshop certificates issued for React Masterclass",
            ]}
          />
        </div>
      </Reveal>

      <Section eyebrow="By the numbers" title="Platform at a glance">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: "Users", v: 1842, s: "" },
            { l: "Events hosted", v: 47, s: "" },
            { l: "Submissions / day", v: 184, s: "" },
            { l: "Uptime (90 days)", v: 99.94, s: "%", d: 2 },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 60}>
              <div className="bg-card border border-border rounded-md p-5">
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono">{s.l}</div>
                <div className="mt-2 text-[26px] font-semibold">
                  <LiveCounter value={s.v} suffix={s.s} decimals={s.d ?? 0} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </InfoPage>
  );
}
