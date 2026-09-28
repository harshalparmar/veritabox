import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen, ChevronDown, ChevronRight, FileText, Search,
  Clock, Eye, Bookmark, BookmarkCheck,
  Code2, Loader2, CheckCircle2, Menu, X, Filter
} from "lucide-react";
import { SearchField } from "@/components/veritabox/SearchField";

// Types
interface Category { _id: string; name: string; slug: string; description?: string; parentCategory?: string; }
interface Article {
  _id: string; title: string; slug: string; excerpt?: string;
  difficulty?: string; estimatedReadMinutes?: number;
  category: { _id: string; name: string; slug: string };
  tags?: string[]; views: number; createdAt: string;
}

// Difficulty colors
const DIFF_MAP: Record<string, { variant: "success" | "warning" | "danger"; label: string }> = {
  Beginner: { variant: "success", label: "Beginner" },
  Intermediate: { variant: "warning", label: "Intermediate" },
  Advanced: { variant: "danger", label: "Advanced" },
};

export default function TutorialsIndex() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Article[] | null>(null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string>("All");
  const [sort, setSort] = useState<string>("popular");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, artsRes] = await Promise.all([
          api.get<Category[]>("/api/publishing/categories"),
          api.get<Article[]>("/api/publishing/articles"),
        ]);
        setCategories(catsRes || []);
        setArticles(artsRes || []);

        // Fetch user state if logged in
        if (user) {
          const [bookmarks, progress] = await Promise.all([
            api.get<Article[]>("/api/publishing/bookmarks").catch(() => []),
            api.get<any[]>("/api/publishing/progress").catch(() => []),
          ]);
          setBookmarkedIds(new Set((bookmarks || []).map((a: any) => a._id)));
          setCompletedIds(new Set((progress || []).map((p: any) => p.article)));
        }
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Debounced search
  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await api.get<Article[]>(`/api/publishing/search?q=${encodeURIComponent(search)}`);
        setSearchResults(results || []);
      } catch {
        setSearchResults(null);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleBookmark = async (articleId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      const result = await api.post<{ bookmarked: boolean }>(`/api/publishing/bookmark/${articleId}`);
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        if (result.bookmarked) next.add(articleId);
        else next.delete(articleId);
        return next;
      });
    } catch { /* ignore */ }
  };

  const rootCategories = categories.filter(c => !c.parentCategory);
  const getSubCategories = (parentId: string) => categories.filter(c => c.parentCategory === parentId);
  const getArticleCount = (catId: string): number => {
    const direct = articles.filter(a => a.category?._id === catId).length;
    const subCounts = getSubCategories(catId).reduce((s, sub) => s + getArticleCount(sub._id), 0);
    return direct + subCounts;
  };

  // Filter and sort articles
  const displayArticles = useMemo(() => {
    let list = searchResults || articles;

    if (selectedCategory && !searchResults) {
      const subCatIds = getSubCategories(selectedCategory).map(c => c._id);
      list = list.filter(a => a.category?._id === selectedCategory || subCatIds.includes(a.category?._id));
    }

    if (difficulty !== "All") {
      list = list.filter(a => (a.difficulty || "Beginner") === difficulty);
    }

    // Sort
    const sorted = [...list];
    switch (sort) {
      case "popular": sorted.sort((a, b) => (b.views || 0) - (a.views || 0)); break;
      case "newest": sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "oldest": sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case "az": sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
    }
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, searchResults, selectedCategory, difficulty, sort, categories]);

  const toggleCat = (id: string) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderSidebarCategory = (cat: Category, level: number = 0) => {
    const subs = getSubCategories(cat._id);
    const count = getArticleCount(cat._id);
    const isExpanded = expandedCats[cat._id];
    const isSelected = selectedCategory === cat._id;

    return (
      <div key={cat._id}>
        <button
          onClick={() => { setSelectedCategory(isSelected ? null : cat._id); if (subs.length) toggleCat(cat._id); }}
          className={`flex items-center w-full text-left px-2 py-1.5 rounded text-[12.5px] transition-colors ${
            isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-secondary/50'
          }`}
          style={{ paddingLeft: `${(level * 16) + 8}px` }}
        >
          {subs.length > 0 && (
            <span className="mr-1 opacity-50 shrink-0" onClick={(e) => { e.stopPropagation(); toggleCat(cat._id); }}>
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
          )}
          {!subs.length && <span className="w-4 mr-1 shrink-0" />}
          <span className="truncate flex-1">{cat.name}</span>
          <span className="text-[10px] text-muted-foreground ml-1 tabular-nums">{count}</span>
        </button>

        {isExpanded && subs.length > 0 && (
          <div>{subs.map(sub => renderSidebarCategory(sub, level + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <PublicShell>
      {/* Hero */}
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-10">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Technical Archives</div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Tutorials</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground max-w-xl">
            Step-by-step technical guides, code examples, and classified reference documentation directly from the Admin team.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-4 sm:px-6 py-6 sm:py-8 flex flex-col md:flex-row gap-6 sm:gap-8 items-start relative">
        {/* Mobile Toggle */}
        <div className="w-full md:hidden flex items-center justify-between">
          <button 
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="w-full flex items-center justify-center gap-2 text-[13px] font-medium bg-secondary/50 hover:bg-secondary px-4 py-2.5 rounded-md border border-border transition-colors"
          >
            <Filter className="w-4 h-4" />
            {isMobileSidebarOpen ? "Hide Categories & Search" : "Browse Categories & Search"}
          </button>
        </div>

        {/* Sidebar */}
        <div className={`w-full md:w-64 shrink-0 space-y-6 ${isMobileSidebarOpen ? 'block' : 'hidden md:block'}`}>
          {/* Search */}
          <SearchField
            label="tutorials"
            placeholder="Search tutorials..."
            value={search}
            onChange={setSearch}
            isLoading={searchLoading}
          />

          <div className="space-y-4">
            <div className="px-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Categories</span>
              {selectedCategory && (
                <button onClick={() => setSelectedCategory(null)} className="text-[10px] text-primary hover:underline ml-2">Clear</button>
              )}
            </div>
            <div className="space-y-0.5">
              {rootCategories.map(cat => renderSidebarCategory(cat, 0))}
              {rootCategories.length === 0 && !loading && (
                <div className="px-2 py-4 text-[11px] text-muted-foreground text-center border border-dashed border-border rounded">
                  No categories yet.
                </div>
              )}
            </div>

            {/* Bookmarks link */}
            {user && bookmarkedIds.size > 0 && (
              <div className="pt-3 border-t border-border">
                <button
                  onClick={() => { setSelectedCategory(null); setDifficulty("All"); setSort("newest"); }}
                  className="flex items-center gap-2 text-[12px] text-muted-foreground hover:text-primary transition-colors px-2"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Bookmarked ({bookmarkedIds.size})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 w-full">
          {/* Filters bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5 pb-4 border-b border-border/50">
            {/* Difficulty tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide w-full sm:w-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              {["All", "Beginner", "Intermediate", "Advanced"].map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-3 py-1.5 whitespace-nowrap text-[11px] font-medium rounded transition-colors ${
                    difficulty === d
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="sm:ml-auto flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">{displayArticles.length} tutorials</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-secondary/50 border border-border rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-primary/50"
              >
                <option value="popular">Most Popular</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="az">A - Z</option>
              </select>
            </div>
          </div>

          {/* Search results indicator */}
          {searchResults && (
            <div className="mb-4 flex items-center gap-2 text-[12px] text-muted-foreground">
              <Search className="w-3.5 h-3.5" />
              Showing results for &quot;{search}&quot;
              <button onClick={() => { setSearch(""); setSearchResults(null); }} className="text-primary hover:underline ml-1">Clear</button>
            </div>
          )}

          {/* Tutorial cards */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {displayArticles.map((art) => {
                const diff = DIFF_MAP[art.difficulty || "Beginner"] || DIFF_MAP.Beginner;
                const isCompleted = completedIds.has(art._id);
                const isBookmarked = bookmarkedIds.has(art._id);

                return (
                  <Link key={art._id} to={`/tutorials/${art.slug}`}>
                    <Surface hover className="p-4 h-full flex flex-col group">
                      {/* Top row: meta */}
                      <div className="flex items-center gap-2 mb-2">
                        <Pill variant={diff.variant} className="text-[9px]">{diff.label}</Pill>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" /> {art.estimatedReadMinutes || 5} min
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Eye className="w-3 h-3" /> {art.views || 0}
                        </span>
                        {isCompleted && (
                          <span className="flex items-center gap-0.5 text-[10px] text-success ml-auto">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-[14px] font-semibold tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-1">
                        {art.title}
                      </h3>

                      {/* Excerpt */}
                      {art.excerpt && (
                        <p className="text-[12px] text-muted-foreground line-clamp-2 mb-2">{art.excerpt}</p>
                      )}

                      {/* Bottom: tags + bookmark */}
                      <div className="mt-auto pt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground bg-secondary/80 border border-border/50 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                            {art.category?.name || "Uncategorized"}
                          </span>
                          {(art.tags || []).slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        {user && (
                          <button
                            onClick={(e) => toggleBookmark(art._id, e)}
                            className={`p-1 rounded transition-colors ${isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </Surface>
                  </Link>
                );
              })}
              {displayArticles.length === 0 && (
                <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                  <Code2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-[13px]">No tutorials found matching the current criteria.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
