import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import { 
  Search, ArrowRight, BookOpen, Star, Eye, ThumbsUp, Layers, Cpu, 
  Shield, Brain, Wrench, Radio, FlaskConical, PenSquare, Sparkles, 
  TrendingUp, Loader2, Terminal, LayoutGrid, List, AlignJustify,
  ArrowUpDown
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { knowledgeApi, resolveAssetUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// Helper to calculate relative time ago
function timeAgo(dateString?: string) {
  if (!dateString) return "Date unavailable";
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

const SECTOR_ICONS: Record<string, any> = {
  Robotics: Cpu,
  AI: Brain,
  Security: Shield,
  Embedded: Radio,
  Hardware: Wrench,
  Research: FlaskConical,
};

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

  const { data: articles, isLoading: loadingArticles, isError: articlesError } = useQuery({
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
      keywords: a.keywords || [],
      snippet: a.content.replace(/[#*`]/g, "").substring(0, 160) + "..."
    }));
  }, [articles]);

  const trendingTags = useMemo(() => {
    const counts = new Map<string, number>();
    processedArticles.forEach(article => {
      article.keywords.forEach((keyword: string) => {
        const tag = keyword.trim();
        if (tag) counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });
    return [...counts.entries()]
      .sort(([tagA, countA], [tagB, countB]) => countB - countA || tagA.localeCompare(tagB))
      .slice(0, 7)
      .map(([tag]) => tag);
  }, [processedArticles]);

  const filtered = useMemo(() => {
    return processedArticles.filter(a => {
      if (sector !== "all" && a.cat !== sector) return false;
      if (!q.trim()) return true;
      const t = q.toLowerCase();
      return (
        a.title.toLowerCase().includes(t) || 
        a.snippet.toLowerCase().includes(t) || 
        a.authorName.toLowerCase().includes(t) ||
        (a.keywords && a.keywords.some((keyword: string) => keyword.toLowerCase().includes(t)))
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

  const trendingArticles = useMemo(() => [...processedArticles]
    .sort((a, b) => b.up - a.up || b.reads - a.reads)
    .slice(0, 5), [processedArticles]);

  const recentArticles = useMemo(() => [...processedArticles]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4), [processedArticles]);

  const contributingAuthors = new Set(processedArticles.map(article => article.author?._id).filter(Boolean)).size;
  const totalUpvotes = processedArticles.reduce((total, article) => total + article.up, 0);

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
      {/* Hero  -  Search Index + Telemetry */}
      <div className="relative overflow-hidden border-b border-border bg-card/30">
        
        {/* Subtle decorative grid overlay in hero */}
        <div 
          className="absolute inset-0 opacity-[0.015] pointer-events-none" 
          style={{
            backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "30px 30px"
          }}
        />

        <div className="relative mx-auto max-w-[1300px] px-6 py-9 md:py-10">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Knowledge base / published articles
          </div>
          <h1 className="mt-3 max-w-3xl text-[34px] font-semibold leading-tight tracking-tight md:text-[42px]">
            Knowledge Hub
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            Browse technical articles, learning collections, and practical documentation from across the community.
          </p>

          {/* Search Index & Tag Suggestions */}
          <div className="mt-6 max-w-3xl space-y-3">
            <div className="flex h-11 items-center gap-2 border border-border bg-background px-4 transition-colors focus-within:border-primary/60">
              <Search className="h-4 w-4 text-muted-foreground/60" />
              <input
                ref={searchInputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search Knowledge Hub articles"
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
                placeholder="Search articles, topics, and authors"
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
            <div className="flex flex-wrap items-center gap-2 pb-1 select-none">
              {trendingTags.length > 0 && <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mr-1">Trending:</span>}
              {trendingTags.map((tag) => {
                const isActive = q.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={`text-[10.5px] font-mono px-2 py-1 border transition-colors whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
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
          <div className="mt-8 grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4">
            <div className="flex min-h-[72px] flex-col justify-between bg-background/90 p-3 transition-colors hover:bg-card">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Article Registry</span>
                <span className={`h-1.5 w-1.5 rounded-full ${loadingArticles ? "bg-warning" : articlesError ? "bg-danger" : "bg-success"}`} />
              </div>
              <div className={`mt-1 text-[16px] font-semibold font-mono ${loadingArticles ? "text-warning" : articlesError ? "text-danger" : "text-success"}`}>
                {loadingArticles ? "SYNCING" : articlesError ? "UNAVAILABLE" : "LOADED"}
              </div>
              <div className="text-[9px] text-muted-foreground/75 font-mono">{processedArticles.length} PUBLISHED ARTICLES</div>
            </div>
            
            <div className="flex min-h-[72px] flex-col justify-between bg-background/90 p-3 transition-colors hover:bg-card">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                Published Articles
              </div>
              <div className="mt-1 text-[18px] font-semibold font-mono text-foreground">
                {processedArticles.length}
              </div>
              <div className="text-[9px] text-muted-foreground/75 font-mono">FROM ARTICLE REGISTRY</div>
            </div>

            <div className="flex min-h-[72px] flex-col justify-between bg-background/90 p-3 transition-colors hover:bg-card">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                Contributing Authors
              </div>
              <div className="mt-1 text-[18px] font-semibold font-mono text-foreground">
                {contributingAuthors}
              </div>
              <div className="text-[9px] text-muted-foreground/75 font-mono">CONTRIBUTING ENGINEERS</div>
            </div>

            <div className="flex min-h-[72px] flex-col justify-between bg-background/90 p-3 transition-colors hover:bg-card">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                Article Upvotes
              </div>
              <div className="mt-1 text-[18px] font-semibold font-mono text-foreground flex items-baseline gap-1">
                {totalUpvotes}
                <span className="text-[10px] text-muted-foreground font-mono">VOTES</span>
              </div>
              <div className="text-[9px] text-muted-foreground/75 font-mono">ON PUBLISHED ARTICLES</div>
            </div>
          </div>
        </div>
      </div>

      {/* Body  -  sidebar + feed */}
      <div className="mx-auto grid min-w-0 max-w-[1300px] grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-7 xl:py-10">
        
        {/* Intelligence Sidebar */}
        <aside className="min-w-0 space-y-6 self-start lg:sticky lg:top-20">
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

          {profile ? (
            <Surface className="hidden border border-border/80 bg-card/40 p-4 lg:block">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono">Your Reputation</div>
              <div className="mt-2 text-[21px] font-semibold">{(profile.reputationPoints || 0).toLocaleString()} points</div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">Current reputation from your profile.</p>
              <Link to="/knowledge/write">
                <button className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded border border-border bg-background text-[11px] font-mono uppercase tracking-wider transition-colors hover:border-primary/50 hover:bg-secondary/30">
                  <PenSquare className="h-3 w-3 text-primary" /> Write Article
                </button>
              </Link>
            </Surface>
          ) : (
            <Surface className="hidden border border-border/80 bg-card/40 p-4 lg:block">
              <p className="text-[12px] text-muted-foreground">Sign in to publish an article.</p>
              <Link to="/auth">
                <button className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded border border-border bg-background text-[11px] font-mono uppercase tracking-wider transition-colors hover:bg-secondary/30">
                  Sign In <ArrowRight className="h-3 w-3" />
                </button>
              </Link>
            </Surface>
          )}

          {/* Trending IDs list */}
          <div className="hidden lg:block">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-3 flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-warning" /> Trending IDs
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              {trendingArticles.length ? trendingArticles.map(a => (
                <Link key={a._id} to={`/knowledge/${a.slug}`} className="flex justify-between items-center px-2 h-7 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border/30">
                  <span className="truncate">{a.id}</span>
                  <span className="text-[10px] bg-secondary px-1 rounded text-foreground/80">{a.up}↑</span>
                </Link>
              )) : <p className="px-2 text-[11px] text-muted-foreground">No published articles yet.</p>}
            </div>
          </div>

          {/* Recent published articles */}
          <div className="hidden lg:block">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-3 flex items-center gap-2">
              <BookOpen className="h-3 w-3 text-success" /> Recent Articles
            </div>
            <Surface className="p-3 bg-card/25 backdrop-blur-sm border border-border/85 font-mono text-[10px] space-y-3">
              {recentArticles.length ? recentArticles.map(article => (
                <Link key={article._id} to={`/knowledge/${article.slug}`} className="block leading-normal text-muted-foreground hover:text-foreground">
                  <span className="block truncate font-medium text-foreground">{article.title}</span>
                  <span className="text-muted-foreground/70">{article.authorName} · {timeAgo(article.createdAt)}</span>
                </Link>
              )) : <p className="text-muted-foreground">No published articles yet.</p>}
            </Surface>
          </div>
        </aside>

        {/* Content Feed */}
        <div className="space-y-6 min-w-0">
          
          {/* Loading registry state */}
          {loadingArticles ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-[13px]">Loading published articles...</span>
            </div>
          ) : articlesError ? (
            <Surface className="border border-dashed border-border p-10 text-center">
              <BookOpen className="mx-auto mb-3 h-7 w-7 text-muted-foreground/50" />
              <p className="text-[14px] font-medium text-foreground">Articles are unavailable right now</p>
              <p className="mt-1 text-[12px] text-muted-foreground">The Knowledge Hub could not load its article registry.</p>
            </Surface>
          ) : sortedArticles.length === 0 ? (
            <Surface className="border-2 border-dashed border-border bg-card/20 p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <Search className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-[14px] font-medium text-foreground">No matching articles</p>
                <p className="max-w-md text-[12px] text-muted-foreground">Try a different search or topic, or reset your filters.</p>
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
                    Latest Article
                  </div>
                  <Link to={`/knowledge/${featured.slug}`}>
                    <Surface hover className="relative overflow-hidden group border border-border hover:border-primary/40 transition-all duration-300">
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                    {collections.slice(0, 3).map((col) => (
                      <Surface key={col._id} className="p-4 flex flex-col justify-between h-full group hover:border-info/40 transition-all relative overflow-hidden bg-card/30 border-border/80">
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
                        <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-[10px] font-mono text-muted-foreground">
                          <span>{(col.articles as any[]).length} Chapters</span>
                          <Link to={`/knowledge/paths/${col._id}`} className="inline-flex h-7 items-center gap-1 border border-border bg-background px-2.5 text-[9px] font-medium text-foreground transition-colors hover:border-info hover:bg-info hover:text-white">
                              View path <ArrowRight className="h-2.5 w-2.5" />
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                    {sortedArticles.slice(0, visibleCount).map(a => (
                      <Link key={a.slug} to={`/knowledge/${a.slug}`} className="block h-full rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        <Surface hover className="group flex h-full flex-col justify-between overflow-hidden border border-border bg-card/25 p-4 transition-all duration-300 hover:border-primary/30">
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
                    <div className="hidden grid-cols-12 gap-2 bg-secondary/35 border-b border-border/60 p-2 font-mono text-[9.5px] text-muted-foreground uppercase tracking-widest md:grid select-none">
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
