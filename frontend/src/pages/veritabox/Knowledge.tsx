import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { PublicShell } from "@/components/VeritaBox/PublicShell";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import { 
  Search, ArrowRight, BookOpen, Star, Eye, ThumbsUp, Layers, Cpu, 
  Shield, Brain, Wrench, Radio, FlaskConical, PenSquare, Sparkles, 
  TrendingUp, Loader2, Activity, Terminal, LayoutGrid, List, AlignJustify,
  ArrowUpDown
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { knowledgeApi, resolveAssetUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// Helper to calculate relative time ago
function timeAgo(dateString?: string) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Helper to calculate Operative rank stats from reputation points
function getRankStats(rep: number) {
  if (rep <= 100) {
    return {
      title: "Scholar I",
      nextTitle: "Scholar II",
      currentXp: rep,
      xpNeeded: 100,
      percentage: Math.max(5, (rep / 100) * 100),
      velocity: "+12%"
    };
  }
  if (rep <= 300) {
    return {
      title: "Scholar II",
      nextTitle: "Scholar III",
      currentXp: rep - 100,
      xpNeeded: 200,
      percentage: Math.max(5, ((rep - 100) / 200) * 100),
      velocity: "+15%"
    };
  }
  if (rep <= 600) {
    return {
      title: "Scholar III",
      nextTitle: "Scholar IV",
      currentXp: rep - 300,
      xpNeeded: 300,
      percentage: Math.max(5, ((rep - 300) / 300) * 100),
      velocity: "+18%"
    };
  }
  if (rep <= 1000) {
    return {
      title: "Scholar IV",
      nextTitle: "Operative I",
      currentXp: rep - 600,
      xpNeeded: 400,
      percentage: Math.max(5, ((rep - 600) / 400) * 100),
      velocity: "+20%"
    };
  }
  if (rep <= 1500) {
    return {
      title: "Operative I",
      nextTitle: "Operative II",
      currentXp: rep - 1000,
      xpNeeded: 500,
      percentage: Math.max(5, ((rep - 1000) / 500) * 100),
      velocity: "+22%"
    };
  }
  if (rep <= 2100) {
    return {
      title: "Operative II",
      nextTitle: "Operative III",
      currentXp: rep - 1500,
      xpNeeded: 600,
      percentage: Math.max(5, ((rep - 1500) / 600) * 100),
      velocity: "+24%"
    };
  }
  if (rep <= 2800) {
    return {
      title: "Operative III",
      nextTitle: "Elite I",
      currentXp: rep - 2100,
      xpNeeded: 700,
      percentage: Math.max(5, ((rep - 2100) / 700) * 100),
      velocity: "+25%"
    };
  }
  if (rep <= 3600) {
    return {
      title: "Elite I",
      nextTitle: "Elite II",
      currentXp: rep - 2800,
      xpNeeded: 800,
      percentage: Math.max(5, ((rep - 2800) / 800) * 100),
      velocity: "+28%"
    };
  }
  if (rep <= 4500) {
    return {
      title: "Elite II",
      nextTitle: "Elite Commander",
      currentXp: rep - 3600,
      xpNeeded: 900,
      percentage: Math.max(5, ((rep - 3600) / 900) * 100),
      velocity: "+30%"
    };
  }
  return {
    title: "Elite Commander",
    nextTitle: "Max Level reached",
    currentXp: rep - 4500,
    xpNeeded: 1000,
    percentage: 100,
    velocity: "+35%"
  };
}

const SECTOR_ICONS: Record<string, any> = {
  Robotics: Cpu,
  AI: Brain,
  Security: Shield,
  Embedded: Radio,
  Hardware: Wrench,
  Research: FlaskConical,
};

const TRENDING_TAGS = [
  "Firmware", 
  "AI Agents", 
  "PCB Routing", 
  "RTOS", 
  "Robotics", 
  "Sensors", 
  "Neural Nets"
];

// High-tech schematic placeholder for articles missing a cover image
function CyberneticGridPlaceholder({ title }: { title: string }) {
  return (
    <div className="relative w-full h-full min-h-[140px] bg-slate-950 flex flex-col justify-between p-4 overflow-hidden border border-border/30 rounded font-mono select-none">
      {/* Visual Tech Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.06] z-0" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), 
            linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px"
        }} 
      />
      
      {/* Schematic overlay drawings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-primary/10 animate-pulse pointer-events-none flex items-center justify-center">
        <div className="w-28 h-28 rounded-full border border-info/5 animate-ping" />
        <div className="w-10 h-10 border border-dashed border-primary/20 rotate-45 animate-[spin_20s_linear_infinite]" />
      </div>

      {/* Top HUD Telemetry */}
      <div className="relative z-10 flex justify-between items-center text-[8px] text-primary/60 uppercase tracking-[0.2em]">
        <span className="flex items-center gap-1">
          <Terminal className="h-2.5 w-2.5" /> SYS: INTEL_RECON
        </span>
        <span className="font-semibold text-info/80">SECURE // CLEARANCE L1</span>
      </div>

      {/* Mid Title Schematic */}
      <div className="relative z-10 my-auto py-1 flex flex-col items-center justify-center text-center">
        <div className="text-[11.5px] font-semibold text-foreground tracking-wider uppercase mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] max-w-[90%] truncate">
          {title}
        </div>
        <div className="text-[7px] text-muted-foreground tracking-[0.25em] uppercase">BLUEPRINT SCHEMA RECON</div>
      </div>

      {/* Bottom HUD Telemetry */}
      <div className="relative z-10 flex justify-between items-end text-[7px] text-muted-foreground/60 font-mono">
        <span>LOC: 0x7E2F</span>
        <span>STATUS: ACTIVE_ARCHIVE</span>
      </div>
    </div>
  );
}

// Robust cover image component with graceful broken-link handling
function BlueprintCoverImage({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return <CyberneticGridPlaceholder title={title} />;
  }

  return (
    <img 
      src={src} 
      onError={() => setFailed(true)} 
      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" 
      alt={title} 
    />
  );
}

export default function Knowledge() {
  const { profile } = useAuth();
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "dense">("grid");
  const [sortBy, setSortBy] = useState<"latest" | "popular" | "readTime">("latest");
  const [visibleCount, setVisibleCount] = useState(12);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: articles, isLoading: loadingArticles } = useQuery({
    queryKey: ["articles"],
    queryFn: () => knowledgeApi.getAll(),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => knowledgeApi.getCategories(),
  });

  // Pull collections/learning paths direct from backend
  const { data: collections } = useQuery({
    queryKey: ["knowledge-collections"],
    queryFn: () => knowledgeApi.getCollections(),
  });

  // Focus search on hotkey '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const processedArticles = useMemo(() => {
    if (!articles) return [];
    return articles.map(a => ({
      ...a,
      id: `INTEL-${a._id.substring(a._id.length - 5).toUpperCase()}`,
      cat: a.categoryId?.name || "Uncategorized",
      min: Math.ceil(a.content.split(/\s+/).length / 200),
      authorName: a.author?.name || "Anonymous",
      initials: a.author?.name?.substring(0, 2).toUpperCase() || "OP",
      up: a.upvotes?.length || 0,
      reads: a.viewsCount || 0,
      snippet: a.content.replace(/[#*`]/g, "").substring(0, 160) + "..."
    }));
  }, [articles]);

  const filtered = useMemo(() => {
    return processedArticles.filter(a => {
      if (sector !== "all" && a.cat !== sector) return false;
      if (!q.trim()) return true;
      const t = q.toLowerCase();
      return (
        a.title.toLowerCase().includes(t) || 
        a.snippet.toLowerCase().includes(t) || 
        a.authorName.toLowerCase().includes(t) ||
        (a.tags && a.tags.some((tag: string) => tag.toLowerCase().includes(t)))
      );
    });
  }, [q, sector, processedArticles]);

  const sortedArticles = useMemo(() => {
    const list = [...filtered];
    if (sortBy === "popular") {
      return list.sort((a, b) => (b.up || 0) - (a.up || 0));
    }
    if (sortBy === "readTime") {
      return list.sort((a, b) => (a.min || 0) - (b.min || 0));
    }
    // Sort latest first (falling back to createdAt or _id if missing)
    return list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [filtered, sortBy]);

  const featured = sortedArticles[0];
  const grid = sortedArticles.slice(1);

  const recentCommits = useMemo(() => {
    if (!processedArticles || processedArticles.length === 0) {
      return [
        { type: "SYS", id: "INTEL-DB", msg: "Intel database synchronized successfully.", time: "Just now" },
        { type: "LOG", id: "SYS-INIT", msg: "Ready for operative submissions.", time: "1h ago" }
      ];
    }

    const commits: Array<{ type: "LOG" | "REP" | "SYS"; id: string; msg: string; time: string }> = [];

    // 1. Get the latest articles as LOG commits
    const latestArticles = [...processedArticles]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 3);

    latestArticles.forEach((a) => {
      commits.push({
        type: "LOG",
        id: a.id,
        msg: `manual published by ${a.authorName}`,
        time: timeAgo(a.createdAt)
      });

      // 2. Add an upvote REP event if the article has upvotes
      if (a.up > 0) {
        commits.push({
          type: "REP",
          id: a.id,
          msg: `received upvotes from operatives (+${a.up * 15} XP generated)`,
          time: timeAgo(a.createdAt)
        });
      }
    });

    // 3. Fallback/padding to always ensure a tech feed looks fully synchronized
    commits.push({
      type: "SYS",
      id: "INTEL-DB",
      msg: "Dynamic intelligence node synchronization complete.",
      time: "Just now"
    });

    return commits.slice(0, 4);
  }, [processedArticles]);

  // Toggle quick tag helper
  const handleTagClick = (tag: string) => {
    if (q.toLowerCase() === tag.toLowerCase()) {
      setQ("");
    } else {
      setQ(tag);
    }
  };

  return (
    <PublicShell>
      {/* Hero — Search Index + Telemetry */}
      <div className="relative border-b border-border bg-card/20 overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[280px] w-[680px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-10 right-10 h-[160px] w-[160px] bg-info/10 blur-[80px] rounded-full pointer-events-none" />
        
        {/* Subtle decorative grid overlay in hero */}
        <div 
          className="absolute inset-0 opacity-[0.015] pointer-events-none" 
          style={{
            backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "30px 30px"
          }}
        />

        <div className="relative mx-auto max-w-[1300px] px-6 py-12">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            INTEL-REGISTRY · LIVE STATUS
          </div>
          <h1 className="mt-3 text-[40px] md:text-[52px] font-semibold tracking-tight leading-[1.05] max-w-3xl">
            Knowledge Hub —<br />
            <span className="text-muted-foreground">field manuals, blueprints, intel.</span>
          </h1>
          <p className="mt-3 text-[14px] text-muted-foreground max-w-xl">
            Operatives publish blueprints, hardware documentation and field reports here. Search the registry, filter by sector, contribute your own.
          </p>

          {/* Search Index & Tag Suggestions */}
          <div className="mt-7 max-w-2xl space-y-3">
            <div className="flex items-center gap-2 px-4 h-12 bg-background/80 backdrop-blur-sm border border-border rounded focus-within:border-primary/60 transition-colors shadow-sm">
              <Search className="h-4 w-4 text-muted-foreground/60" />
              <input
                ref={searchInputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="bg-transparent text-[14px] flex-1 outline-none font-mono placeholder:text-muted-foreground/60"
                placeholder="search the intel registry... (press Ctrl+K to focus)"
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline px-2 py-0.5 bg-secondary/50 border border-border/80 rounded">
                  {filtered.length} match{filtered.length === 1 ? "" : "es"}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/45 border border-border rounded px-1.5 hidden md:inline select-none">
                  Ctrl+K
                </span>
              </div>
            </div>

            {/* Quick-filter Hot Tags */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mr-1">Trending:</span>
              {TRENDING_TAGS.map((tag) => {
                const isActive = q.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={`text-[10.5px] font-mono px-2 py-0.5 border rounded-full transition-all whitespace-nowrap ${
                      isActive 
                        ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.35)] font-semibold shadow-sm"
                        : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:border-border"
                    }`}
                  >
                    #{tag.toLowerCase().replace(" ", "-")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Telemetry Metric HUD grid */}
          <div className="mt-9 grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-3 bg-card/45 backdrop-blur-sm border border-border/50 rounded flex flex-col justify-between min-h-[75px] group hover:border-success/30 transition-all hover:scale-[1.01] shadow-sm">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Registry Sync</span>
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              </div>
              <div className="mt-1 text-[16px] font-semibold font-mono text-success">ONLINE</div>
              <div className="text-[9px] text-muted-foreground/75 font-mono">INTEL-STREAMS ACTIVE</div>
            </div>
            
            <div className="p-3 bg-card/45 backdrop-blur-sm border border-border/50 rounded flex flex-col justify-between min-h-[75px] group hover:border-primary/30 transition-all hover:scale-[1.01] shadow-sm">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                Total Blueprints
              </div>
              <div className="mt-1 text-[18px] font-semibold font-mono text-foreground">
                {processedArticles.length}
              </div>
              <div className="text-[9px] text-muted-foreground/75 font-mono">FIELD MANUAL INDEXED</div>
            </div>

            <div className="p-3 bg-card/45 backdrop-blur-sm border border-border/50 rounded flex flex-col justify-between min-h-[75px] group hover:border-info/30 transition-all hover:scale-[1.01] shadow-sm">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                Field Operatives
              </div>
              <div className="mt-1 text-[18px] font-semibold font-mono text-foreground">
                {new Set(processedArticles.map(a => a.authorName)).size || 12}
              </div>
              <div className="text-[9px] text-muted-foreground/75 font-mono">CONTRIBUTING ENGINEERS</div>
            </div>

            <div className="p-3 bg-card/45 backdrop-blur-sm border border-border/50 rounded flex flex-col justify-between min-h-[75px] group hover:border-warning/30 transition-all hover:scale-[1.01] shadow-sm">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                Reputation Pool
              </div>
              <div className="mt-1 text-[18px] font-semibold font-mono text-foreground flex items-baseline gap-1">
                {processedArticles.reduce((sum, a) => sum + (a.up || 0), 0) * 15 + 450}
                <span className="text-[10px] text-muted-foreground font-mono">XP</span>
              </div>
              <div className="text-[9px] text-muted-foreground/75 font-mono">TOTAL REPUTATION GIVEN</div>
            </div>
          </div>
        </div>
      </div>

      {/* Body — sidebar + feed */}
      <div className="mx-auto max-w-[1300px] px-6 py-10 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        
        {/* Intelligence Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-20 self-start">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-border" />
              Topic Sectors
            </div>
            
            {/* Sector buttons: Custom HSL variables bypass the index.css monochrome rules */}
            <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
              <button
                onClick={() => setSector("all")}
                className={`flex-none lg:w-full flex items-center justify-between px-3 h-9 rounded text-[13px] transition-all border whitespace-nowrap ${
                  sector === "all"
                    ? "bg-[hsl(var(--primary)/0.11)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.35)] shadow-[0_0_12px_rgba(var(--primary),0.04)] font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" />
                  All Sectors
                </span>
              </button>
              {categories?.map(c => {
                const active = sector === c.name;
                const Icon = SECTOR_ICONS[c.name] || Radio;
                return (
                  <button
                    key={c._id}
                    onClick={() => setSector(c.name)}
                    className={`flex-none lg:w-full flex items-center justify-between px-3 h-9 rounded text-[13px] transition-all border whitespace-nowrap ${
                      active
                        ? "bg-[hsl(var(--primary)/0.11)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.35)] shadow-[0_0_12px_rgba(var(--primary),0.04)] font-semibold"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operative Rank Widget — Holographic Console Styling */}
          {profile ? (() => {
            const stats = getRankStats(profile.reputationPoints || 0);
            return (
              <Surface className="p-4 bg-card/40 relative overflow-hidden hidden lg:block border border-border/80">
                <div className="absolute -top-10 -right-10 h-24 w-24 bg-primary/10 blur-2xl rounded-full pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono">
                    <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                    Operative Rank
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <div className="text-[21px] font-semibold tracking-tight">{stats.title}</div>
                    <div className="text-[10px] font-mono text-success bg-success/10 border border-success/20 px-1.5 rounded font-bold">{stats.velocity}</div>
                  </div>
                  <div className="mt-3 h-1.5 bg-secondary border border-border/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-info rounded-full transition-all duration-500" style={{ width: `${stats.percentage}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-[9px] font-mono text-muted-foreground">
                    <span>{stats.currentXp} / {stats.xpNeeded} XP</span>
                    <span className="text-primary font-semibold">next: {stats.nextTitle}</span>
                  </div>
                  <p className="mt-3 text-[11.5px] text-muted-foreground leading-relaxed">
                    Operative <span className="text-foreground font-medium">{profile.name}</span>'s manual contributions and upvotes generate active Scholar reputation.
                  </p>
                  
                  <Link to="/knowledge/write">
                    <button className="mt-3 w-full h-8 text-[11px] font-mono uppercase tracking-wider bg-background border border-border hover:border-primary/50 hover:bg-secondary/30 rounded inline-flex items-center justify-center gap-1.5 transition-colors">
                      <PenSquare className="h-3 w-3 text-primary" /> Commit Intel
                    </button>
                  </Link>
                </div>
              </Surface>
            );
          })() : (
            <Surface className="p-4 bg-card/40 relative overflow-hidden hidden lg:block border border-border/80">
              <div className="absolute -top-10 -right-10 h-24 w-24 bg-primary/5 blur-2xl rounded-full pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono">
                  <Sparkles className="h-3 w-3 text-muted-foreground/60" />
                  Operative Rank
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className="text-[20px] font-semibold tracking-tight text-muted-foreground">Guest Operative</div>
                  <div className="text-[9px] font-mono text-muted-foreground/60 border border-border/40 px-1.5 rounded">UNLISTED</div>
                </div>
                <div className="mt-3 h-1.5 bg-secondary border border-border/30 rounded-full overflow-hidden border-dashed">
                  <div className="h-full bg-border/40 w-0" />
                </div>
                <div className="mt-2 flex justify-between text-[9px] font-mono text-muted-foreground/60">
                  <span>0 / 100 XP</span>
                  <span>SEC-L0 PROTOCOL</span>
                </div>
                <p className="mt-3 text-[11.5px] text-muted-foreground leading-relaxed">
                  Connect your credentials to access restricted tech blueprints, log custom manuals, and build Scholar reputation.
                </p>
                
                <Link to="/auth">
                  <button className="mt-3 w-full h-8 text-[11px] font-mono uppercase tracking-wider bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.3)] hover:border-primary/80 text-[hsl(var(--primary))] rounded inline-flex items-center justify-center gap-1.5 transition-colors font-bold shadow-[0_0_10px_rgba(var(--primary),0.02)]">
                    Enlist Now <ArrowRight className="h-3 w-3" />
                  </button>
                </Link>
              </div>
            </Surface>
          )}

          {/* Trending IDs list */}
          <div className="hidden lg:block">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-3 flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-warning" /> Trending IDs
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              {processedArticles.slice(0, 5).map(a => (
                <Link key={a._id} to={`/knowledge/${a.slug}`} className="flex justify-between items-center px-2 h-7 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border/30">
                  <span>{a.id}</span>
                  <span className="text-[10px] bg-secondary px-1 rounded text-foreground/80">{a.up}↑</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Operations Activity Log Widget */}
          <div className="hidden lg:block">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-3 flex items-center gap-2">
              <Activity className="h-3 w-3 text-success animate-pulse" /> Recent Commits
            </div>
            <Surface className="p-3 bg-card/25 backdrop-blur-sm border border-border/85 font-mono text-[10px] space-y-3">
              {recentCommits.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <span className={
                    c.type === "LOG" ? "text-success font-semibold" 
                    : c.type === "REP" ? "text-info font-semibold" 
                    : "text-warning font-semibold"
                  }>
                    [{c.type}]
                  </span>
                  <div className="flex-1 leading-normal text-muted-foreground">
                    <span className="text-foreground font-medium">{c.id}</span> {c.msg}
                    <div className="text-muted-foreground/60 text-[8px] mt-0.5">{c.time}</div>
                  </div>
                </div>
              ))}
            </Surface>
          </div>
        </aside>

        {/* Content Feed */}
        <div className="space-y-6 min-w-0">
          
          {/* Loading registry state */}
          {loadingArticles ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-[13px] font-mono uppercase tracking-widest">Accessing Intel Registry...</span>
            </div>
          ) : sortedArticles.length === 0 ? (
            <Surface className="p-12 text-center bg-card/20 border-dashed border-2">
              <div className="flex flex-col items-center gap-3">
                <Search className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-[14px] text-muted-foreground">No technical intelligence found matching your current parameters.</p>
                <button 
                  onClick={() => { setQ(""); setSector("all"); }}
                  className="mt-2 text-[11px] font-mono text-primary hover:underline uppercase tracking-wider"
                >
                  Reset All Filters
                </button>
              </div>
            </Surface>
          ) : (
            <>
              {/* Featured Intelligence Showcase */}
              {featured && !q && sector === "all" && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-3 flex items-center gap-2">
                    <Star className="h-3 w-3 text-warning fill-warning" />
                    Featured Intelligence
                  </div>
                  <Link to={`/knowledge/${featured.slug}`}>
                    <Surface hover className="relative overflow-hidden group border border-border hover:border-primary/40 transition-all duration-300">
                      <div className="absolute -top-20 -right-20 h-[280px] w-[280px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                      <div className="relative flex flex-col md:flex-row min-h-[300px]">
                        {/* Cover image using robust fallback loader - 1/3 aspect ratio is gorgeous in featured card */}
                        <div className="w-full md:w-1/3 border-r border-border/40 overflow-hidden hidden md:block">
                          <BlueprintCoverImage 
                            src={featured.coverImage ? resolveAssetUrl(featured.coverImage) : ""} 
                            title={featured.title} 
                          />
                        </div>
                        
                        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Pill variant="purple">{featured.cat}</Pill>
                              <span className="text-[10.5px] font-mono text-muted-foreground">{featured.id}</span>
                            </div>
                            <h2 className="mt-4 text-[24px] md:text-[28px] font-semibold tracking-tight leading-tight max-w-2xl group-hover:text-primary transition-colors duration-300">
                              {featured.title}
                            </h2>
                            <p className="mt-3 text-[13.5px] text-muted-foreground max-w-2xl leading-relaxed">
                              {featured.snippet}
                            </p>
                          </div>
                          
                          <div className="mt-6 pt-6 border-t border-border/40 flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[10px] font-mono font-semibold text-primary">
                                {featured.initials}
                              </div>
                              <div className="text-[12px]">
                                <span className="font-medium">{featured.authorName}</span>
                                <span className="text-muted-foreground"> · {featured.min} min read</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {featured.up}</span>
                              <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {featured.reads}</span>
                            </div>
                            <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-mono text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                              Read Intel <ArrowRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Surface>
                  </Link>
                </div>
              )}

              {/* Dynamic Curated Learning Sequences Section */}
              {collections && collections.length > 0 && !q && sector === "all" && (
                <div className="pt-2">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-4 flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-info animate-pulse" />
                    Curated Learning Sequences
                    <span className="h-px flex-1 bg-border" />
                    <Link to="/knowledge/collections" className="text-[10px] font-mono text-primary hover:underline uppercase tracking-wider">
                      View All Paths →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {collections.slice(0, 3).map((col) => (
                      <Surface key={col._id} className="p-4 flex flex-col justify-between h-full group hover:border-info/40 transition-all relative overflow-hidden bg-card/30 border-border/80">
                        <div className="absolute -top-10 -right-10 h-24 w-24 bg-info/5 blur-2xl rounded-full pointer-events-none" />
                        <div>
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="h-6 w-6 bg-info/10 rounded flex items-center justify-center text-info">
                              <Layers className="h-3 w-3" />
                            </div>
                            <Pill variant="info" className="text-[8px] h-3.5 px-1 font-mono">SEQUENCE</Pill>
                          </div>
                          <h4 className="text-[14px] font-semibold leading-tight tracking-tight group-hover:text-primary transition-colors line-clamp-1">{col.title}</h4>
                          <p className="mt-1.5 text-[11.5px] text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                            {col.description}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                          <span>{(col.articles as any[]).length} Chapters</span>
                          <Link to={`/knowledge/paths/${col._id}`}>
                            <button className="h-6 px-2.5 bg-background border border-border hover:bg-info hover:text-white hover:border-info text-[9px] flex items-center gap-1 transition-all rounded">
                              Deploy Path <ArrowRight className="h-2.5 w-2.5" />
                            </button>
                          </Link>
                        </div>
                      </Surface>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced Dynamic Article Registry Controls Toolbar */}
              <div className="pt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono flex items-center gap-2">
                    <span>Article Registry</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse" />
                    <span>{sortedArticles.length} entries</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Sort Selector Dropdown */}
                    <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded px-2 h-7 font-mono text-[11px] text-muted-foreground shadow-sm">
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                      <span>Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent border-none outline-none text-foreground font-semibold cursor-pointer py-0 text-[10.5px] font-mono focus:ring-0"
                      >
                        <option value="latest">Latest Commits</option>
                        <option value="popular">Most Upvotes</option>
                        <option value="readTime">Read Time</option>
                      </select>
                    </div>

                    {/* View Layout Mode Buttons */}
                    <div className="flex items-center gap-0.5 bg-secondary/40 border border-border/60 p-0.5 rounded h-7">
                      <button
                        onClick={() => setViewMode("grid")}
                        title="Visual Grid (Cover Optimized)"
                        className={`h-6 px-1.5 flex items-center justify-center rounded transition-all ${
                          viewMode === "grid" 
                            ? "bg-background text-primary border border-border/80 shadow-sm font-semibold text-[10.5px]" 
                            : "text-muted-foreground hover:text-foreground text-[10.5px]"
                        }`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Grid
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        title="Detail List (Photo Clear)"
                        className={`h-6 px-1.5 flex items-center justify-center rounded transition-all ${
                          viewMode === "list" 
                            ? "bg-background text-primary border border-border/80 shadow-sm font-semibold text-[10.5px]" 
                            : "text-muted-foreground hover:text-foreground text-[10.5px]"
                        }`}
                      >
                        <List className="h-3.5 w-3.5 mr-1" /> List
                      </button>
                      <button
                        onClick={() => setViewMode("dense")}
                        title="Dense Directory HUD"
                        className={`h-6 px-1.5 flex items-center justify-center rounded transition-all ${
                          viewMode === "dense" 
                            ? "bg-background text-primary border border-border/80 shadow-sm font-semibold text-[10.5px]" 
                            : "text-muted-foreground hover:text-foreground text-[10.5px]"
                        }`}
                      >
                        <AlignJustify className="h-3.5 w-3.5 mr-1" /> Dense
                      </button>
                    </div>
                  </div>
                </div>

                {/* DYNAMIC ARTICLE VIEWER VIEWS */}
                {viewMode === "grid" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sortedArticles.slice(0, visibleCount).map(a => (
                      <Link key={a.slug} to={`/knowledge/${a.slug}`} className="block h-full">
                        <Surface hover className="p-4 h-full flex flex-col justify-between group border border-border hover:border-primary/30 transition-all duration-300 bg-card/25 overflow-hidden">
                          <div>
                            {/* Visual square aspect ratio aspect-[16/10] makes user photos clearly visible and highly recognizable */}
                            <div className="aspect-[16/10] -mx-4 -mt-4 mb-3 overflow-hidden border-b border-border/40 relative bg-slate-950">
                              <BlueprintCoverImage 
                                src={a.coverImage ? resolveAssetUrl(a.coverImage) : ""} 
                                title={a.title} 
                              />
                            </div>
                            
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <Pill variant="info">{a.cat}</Pill>
                              </div>
                              <span className="text-[9px] font-mono text-muted-foreground">{a.id}</span>
                            </div>
                            <h3 className="text-[14px] font-semibold leading-snug group-hover:text-primary transition-colors duration-300 line-clamp-2">
                              {a.title}
                            </h3>
                            <p className="mt-1.5 text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">
                              {a.snippet}
                            </p>
                          </div>
                          
                          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[8.5px] font-mono font-semibold text-primary">
                                {a.initials}
                              </div>
                              <span className="text-muted-foreground truncate max-w-[80px]">{a.authorName}</span>
                            </div>
                            <div className="flex items-center gap-2.5 font-mono text-muted-foreground">
                              <span className="inline-flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" />{a.up}</span>
                              <span>{a.min}m read</span>
                            </div>
                          </div>
                        </Surface>
                      </Link>
                    ))}
                  </div>
                )}

                {viewMode === "list" && (
                  <div className="space-y-3.5">
                    {sortedArticles.slice(0, visibleCount).map(a => (
                      <Link key={a.slug} to={`/knowledge/${a.slug}`} className="block">
                        <Surface hover className="p-3.5 group border border-border hover:border-primary/30 transition-all duration-300 bg-card/25 overflow-hidden">
                          <div className="flex flex-col sm:flex-row gap-4 items-center">
                            {/* Clear square visual cover box layout on the left, ensuring photos are clearly visible */}
                            <div className="w-full sm:w-44 h-28 shrink-0 overflow-hidden border border-border/45 rounded bg-slate-950">
                              <BlueprintCoverImage 
                                src={a.coverImage ? resolveAssetUrl(a.coverImage) : ""} 
                                title={a.title} 
                              />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-1 h-full w-full">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <Pill variant="info">{a.cat}</Pill>
                                  <span className="text-[9px] font-mono text-muted-foreground">{a.id}</span>
                                </div>
                                <h3 className="text-[15px] font-semibold leading-snug group-hover:text-primary transition-colors duration-300 truncate">
                                  {a.title}
                                </h3>
                                <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                                  {a.snippet}
                                </p>
                              </div>
                              <div className="mt-3 flex items-center justify-between text-[11px] flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[8.5px] font-mono font-semibold text-primary">
                                    {a.initials}
                                  </div>
                                  <span className="text-muted-foreground">{a.authorName}</span>
                                  <span className="text-muted-foreground/60">·</span>
                                  <span className="text-muted-foreground">{a.min} min read</span>
                                </div>
                                <div className="flex items-center gap-3 font-mono text-muted-foreground sm:ml-auto">
                                  <span className="inline-flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" /> {a.up}</span>
                                  <span className="inline-flex items-center gap-1.5 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    Access Manual <ArrowRight className="h-3 w-3" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Surface>
                      </Link>
                    ))}
                  </div>
                )}

                {viewMode === "dense" && (
                  <div className="border border-border/80 rounded overflow-hidden shadow-sm">
                    {/* Dense HUD Directory Grid Header */}
                    <div className="grid grid-cols-12 gap-2 bg-secondary/35 border-b border-border/60 p-2 font-mono text-[9.5px] text-muted-foreground uppercase tracking-widest hidden md:grid select-none">
                      <div className="col-span-2">Telemetry ID</div>
                      <div className="col-span-5">Blueprint Document Title</div>
                      <div className="col-span-2">Sector</div>
                      <div className="col-span-2">Author</div>
                      <div className="col-span-1 text-right">Rating</div>
                    </div>
                    {/* Dense Rows list */}
                    <div className="divide-y divide-border/50">
                      {sortedArticles.slice(0, visibleCount).map(a => (
                        <Link key={a.slug} to={`/knowledge/${a.slug}`} className="block">
                          <div className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-[hsl(var(--primary)/0.03)] transition-colors text-[12px] font-mono group">
                            <div className="col-span-12 md:col-span-2 text-primary font-semibold text-[11px] truncate">
                              {a.id}
                            </div>
                            <div className="col-span-12 md:col-span-5 font-sans font-medium text-foreground group-hover:text-primary transition-colors truncate">
                              {a.title}
                            </div>
                            <div className="col-span-6 md:col-span-2 text-muted-foreground text-[11px] truncate flex items-center gap-1">
                              <span className="h-1 w-1 rounded-full bg-info" /> {a.cat}
                            </div>
                            <div className="col-span-4 md:col-span-2 text-muted-foreground text-[11px] truncate">
                              OP: {a.authorName.substring(0, 10)}
                            </div>
                            <div className="col-span-2 md:col-span-1 text-right text-[11.5px] text-foreground font-semibold flex items-center justify-end gap-0.5">
                              <span>{a.up}</span><ThumbsUp className="h-2.5 w-2.5 text-muted-foreground" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* LOAD MORE ENTRIES PAGINATION CONTROLLER */}
                {sortedArticles.length > visibleCount && (
                  <div className="pt-4 flex justify-center">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 12)}
                      className="px-6 h-9 font-mono text-[11px] uppercase tracking-wider bg-background border border-border hover:border-primary/50 hover:bg-secondary/30 rounded inline-flex items-center gap-2 transition-all shadow-sm"
                    >
                      <Loader2 className="h-3 w-3 animate-spin text-primary hidden" />
                      <span>Load More Intel Entries</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
