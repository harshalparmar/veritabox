import { InfoPage, Section, Reveal, Pill, LiveCounter, LiveTimestamp } from "@/components/veritabox/InfoPage";
import { MessageSquare, HelpCircle, Lightbulb, Megaphone, ArrowRight, MessageCircle, Users, Search, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const categories = [
  { icon: HelpCircle, name: "Q&A / Doubts", desc: "Ask questions, get answers from the community and mentors. No question is too basic.", count: 1247, color: "text-info", slug: "qa" },
  { icon: Lightbulb, name: "Ideas & Feedback", desc: "Suggest new features, share ideas, and vote on what matters most.", count: 342, color: "text-warning", slug: "ideas" },
  { icon: MessageSquare, name: "General Discussion", desc: "Talk about tech, share resources, or just say hello.", count: 864, color: "text-primary", slug: "general" },
  { icon: Megaphone, name: "Announcements", desc: "Official updates, event launches, and platform news from the VeritaBox team.", count: 56, color: "text-success", slug: "announcements" },
];

const initialFeed = [
  { cat: "Q&A", title: "How does the reputation scoring system work?", who: "aarav.k", reply: 12, secs: 840, solved: true },
  { cat: "General", title: "Tips for first-time hackathon participants", who: "priya.m", reply: 28, secs: 3600, solved: false },
  { cat: "Ideas", title: "Feature request: dark mode for certificates", who: "dev.kumar", reply: 4, secs: 10800, solved: false },
  { cat: "Q&A", title: "Can I switch squadrons mid-competition?", who: "s.patel", reply: 19, secs: 21600, solved: true },
  { cat: "General", title: "Resources for learning system design from scratch", who: "n.sharma", reply: 7, secs: 32400, solved: false },
];

const incoming = [
  { cat: "Q&A", title: "What's the deadline for the WebDev Sprint registration?", who: "r.gupta", reply: 0, solved: false },
  { cat: "Ideas", title: "Suggestion: weekly coding challenges in Forge", who: "m.joshi", reply: 1, solved: false },
  { cat: "General", title: "Just completed my first bounty — tips for beginners", who: "a.khan", reply: 2, solved: false },
  { cat: "Q&A", title: "How to link my GitHub profile to VeritaBox?", who: "l.das", reply: 0, solved: false },
];

function fmt(secs: number) {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

export default function Community() {
  const [feed, setFeed] = useState(initialFeed);
  const [online, setOnline] = useState(74);
  const [filter, setFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    const tick = setInterval(() => {
      setFeed(prev => prev.map(p => ({ ...p, secs: p.secs + 1 })));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setOnline(o => Math.max(58, Math.min(98, o + (Math.random() > 0.5 ? 1 : -1))));
      setFeed(prev => {
        const next = incoming[Math.floor(Math.random() * incoming.length)];
        return [{ ...next, reply: next.reply, secs: 0 }, ...prev].slice(0, 8);
      });
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const filteredFeed = feed.filter(r => {
    if (filter !== "all" && r.cat.toLowerCase() !== filter) return false;
    if (searchQ && !r.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  return (
    <InfoPage
      kicker="Community / Forum"
      title="Ask, discuss, and learn together."
      subtitle="A community-driven forum where you can ask doubts, share ideas, and get help from fellow learners and the VeritaBox team."
      accent="hsl(var(--success))"
    >
      <Reveal>
        <div className="bg-card border border-border rounded-md p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success/40 animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
            </span>
            <div>
              <div className="text-[14px] font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-success" />
                <LiveCounter value={online} /> members online now
              </div>
              <div className="text-[11.5px] text-muted-foreground font-mono">Real-time community activity</div>
            </div>
          </div>
          <LiveTimestamp />
        </div>
      </Reveal>

      <Section eyebrow="Categories" title="Browse by topic">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categories.map((c, i) => (
            <Reveal key={c.name} delay={i * 60}>
              <button
                onClick={() => setFilter(filter === c.slug ? "all" : c.slug)}
                className={cn(
                  "w-full text-left bg-card border rounded-md p-5 transition-all hover:border-foreground/30 hover:-translate-y-0.5",
                  filter === c.slug ? "border-foreground/50 -translate-y-0.5" : "border-border"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded border border-border bg-background ${c.color}`}>
                      <c.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-[14.5px] font-semibold">{c.name}</h3>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        <LiveCounter value={c.count} /> threads
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-[12.5px] text-muted-foreground leading-relaxed">{c.desc}</p>
              </button>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section eyebrow="Live" title="Recent threads">
        <Reveal>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search threads..."
                className="w-full bg-card border border-border rounded-md pl-10 pr-4 py-2.5 text-[13px] focus:outline-none focus:border-foreground/40 transition-colors"
              />
            </div>
            <Link
              to="/messages"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-[13px] font-medium hover:brightness-110 transition-all shrink-0"
            >
              <Plus className="h-3.5 w-3.5" /> New Thread
            </Link>
          </div>
        </Reveal>
        <Reveal>
          <div className="bg-card border border-border rounded-md overflow-hidden">
            {filteredFeed.length === 0 ? (
              <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                No threads match your filter. Try a different category or search term.
              </div>
            ) : (
              filteredFeed.map((r, i) => (
                <div key={`${r.title}-${i}`} className={cn(
                  "flex items-center gap-4 px-4 py-3.5 hover:bg-secondary/40 transition-colors cursor-pointer",
                  i < filteredFeed.length - 1 && "border-b border-border/60",
                  r.secs < 5 && "bg-success/5"
                )}>
                  <Pill variant={r.cat === "Q&A" ? "info" : r.cat === "Ideas" ? "warning" : r.cat === "Announcements" ? "success" : "default"}>{r.cat}</Pill>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] truncate flex items-center gap-2">
                      {r.title}
                      {r.secs < 5 && <span className="text-[10px] uppercase font-mono text-success animate-pulse">new</span>}
                      {r.solved && <span className="text-[10px] uppercase font-mono text-success border border-success/30 rounded px-1.5 py-0.5">solved</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">@{r.who} &middot; {fmt(r.secs)} ago</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span className="text-[12px] font-mono">{r.reply}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="Guidelines" title="Community guidelines">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 space-y-3 text-[13px] text-foreground/85 leading-relaxed">
            <p><strong>Be respectful.</strong> Treat everyone with courtesy. No harassment, hate speech, or personal attacks.</p>
            <p><strong>Stay on topic.</strong> Post in the right category. Use Q&A for questions, Ideas for feature requests.</p>
            <p><strong>No spam.</strong> Self-promotion, duplicate posts, and low-effort content will be removed.</p>
            <p><strong>Help others.</strong> If you know the answer, share it. Mark threads as solved when your question is answered.</p>
            <p><strong>Report issues.</strong> Use the <Link to="/contact" className="text-primary hover:underline">Contact page</Link> for platform bugs and support tickets.</p>
          </div>
        </Reveal>
      </Section>
    </InfoPage>
  );
}
