import { InfoPage, Section, Reveal, Pill, LiveCounter, LiveTimestamp } from "@/components/veritabox/InfoPage";
import { useEffect, useState } from "react";
import { Circle } from "lucide-react";

type Presence = "online" | "away" | "offline";

const board = [
  { name: "A. Iyer", role: "Founding Lead", focus: "Roadmap · Operations", tag: "Founder", presence: "online" as Presence },
  { name: "R. Bose", role: "Founding Lead", focus: "Hardware · Avionics", tag: "Founder", presence: "online" as Presence },
  { name: "K. Tanmay", role: "Technical Architect", focus: "Autonomous systems", tag: "Elite", presence: "away" as Presence },
  { name: "V. Menon", role: "Technical Architect", focus: "Full-stack · Telemetry", tag: "Elite", presence: "online" as Presence },
];

const fleet = [
  { name: "S. Kapoor", role: "Precision Landing (ArUco)", chapter: "HQ", presence: "online" as Presence },
  { name: "N. Pillai", role: "Propulsion · ESCs", chapter: "HQ", presence: "offline" as Presence },
  { name: "M. Sharma", role: "VIO / SLAM", chapter: "Bombay", presence: "online" as Presence },
  { name: "L. Banerjee", role: "Ground Control Station", chapter: "HQ", presence: "away" as Presence },
  { name: "D. Reddy", role: "Swarm coordination", chapter: "Hyderabad", presence: "online" as Presence },
  { name: "P. Ghosh", role: "PCB & power systems", chapter: "HQ", presence: "offline" as Presence },
];

const advisors = [
  { name: "Prof. S. Rao", role: "Faculty Advisor, Robotics", org: "Operative Network" },
  { name: "Dr. Anjali Kumar", role: "Mentor, Aerospace", org: "Industry" },
  { name: "Swakiyam Centre", role: "Incubation support", org: "Operative Network" },
];

const presenceMap: Record<Presence, { color: string; label: string }> = {
  online: { color: "bg-success shadow-[0_0_6px_hsl(var(--success)/.7)]", label: "Online" },
  away: { color: "bg-warning", label: "Away" },
  offline: { color: "bg-muted-foreground/40", label: "Offline" },
};

function Avatar({ name, presence }: { name: string; presence?: Presence }) {
  const initials = name.split(/[ .]/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("");
  return (
    <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-[12px] font-mono font-semibold">
      {initials}
      {presence && (
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${presenceMap[presence].color}`} />
      )}
    </span>
  );
}

export default function Team() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const onlineCount = [...board, ...fleet].filter(m => m.presence === "online").length;

  return (
    <InfoPage
      kicker="Club / Our Team"
      title="The operatives behind the platform."
      subtitle="From founding leads charting the roadmap to the field engineers landing drones on a marker the size of a coaster. These are the people running VeritaBox."
      accent="hsl(var(--primary))"
    >
      <Reveal>
        <div className="bg-card border border-border rounded-md p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Circle className="h-4 w-4 fill-success text-success animate-pulse" />
            <div>
              <div className="text-[14px] font-semibold">
                <LiveCounter value={onlineCount} /> of {board.length + fleet.length} operatives online
              </div>
              <div className="text-[11.5px] text-muted-foreground font-mono">
                Local time at HQ: {now.toLocaleTimeString("en-IN", { hour12: false })} IST
              </div>
            </div>
          </div>
          <LiveTimestamp />
        </div>
      </Reveal>

      <Section eyebrow="Executive Board" title="Founding leads & technical architects">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {board.map((m, i) => (
            <Reveal key={m.name} delay={i * 60}>
              <div className="bg-card border border-border rounded-md p-5 flex items-center gap-4 transition-all hover:border-foreground/30 hover:-translate-y-0.5">
                <Avatar name={m.name} presence={m.presence} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold">{m.name}</h3>
                    <Pill variant={m.tag === "Founder" ? "warning" : "purple"}>{m.tag}</Pill>
                  </div>
                  <div className="text-[12.5px] text-foreground/80 mt-0.5">{m.role}</div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{m.focus}</div>
                </div>
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground">
                  {presenceMap[m.presence].label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section eyebrow="The Fleet" title="Members in the field" description="Precision landing to propulsion, the hands on the hardware.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {fleet.map((m, i) => (
            <Reveal key={m.name} delay={i * 50}>
              <div className="bg-card border border-border rounded-md p-4 flex items-center gap-3 transition-colors hover:border-foreground/30">
                <Avatar name={m.name} presence={m.presence} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">{m.name}</div>
                  <div className="text-[11.5px] text-muted-foreground truncate">{m.role}</div>
                  <div className="text-[10.5px] text-muted-foreground/80 font-mono mt-0.5">{m.chapter}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section eyebrow="Mentors & Advisors" title="The wider circle">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {advisors.map((m, i) => (
            <Reveal key={m.name} delay={i * 60}>
              <div className="bg-card border border-border rounded-md p-5">
                <div className="text-[13.5px] font-semibold">{m.name}</div>
                <div className="text-[12px] text-foreground/80 mt-0.5">{m.role}</div>
                <div className="text-[11px] text-muted-foreground font-mono mt-1.5">{m.org}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </InfoPage>
  );
}
