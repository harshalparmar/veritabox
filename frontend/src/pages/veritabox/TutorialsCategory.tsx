import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Eye, Clock, ChevronRight, Code2, Loader2, Bookmark, BookmarkCheck, CheckCircle2 } from "lucide-react";

interface Article {
  _id: string; title: string; slug: string; excerpt?: string;
  difficulty?: string; estimatedReadMinutes?: number;
  views: number; createdAt: string; tags?: string[];
  author?: { name: string };
}

const DIFF_MAP: Record<string, { variant: "success" | "warning" | "danger"; label: string }> = {
  Beginner: { variant: "success", label: "Beginner" },
  Intermediate: { variant: "warning", label: "Intermediate" },
  Advanced: { variant: "danger", label: "Advanced" },
};

export default function TutorialsCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.get<Article[]>(`/api/publishing/categories/${slug}/articles`);
        setArticles(data || []);
        if (user) {
          const [bookmarks, progress] = await Promise.all([
            api.get<any[]>("/api/publishing/bookmarks").catch(() => []),
            api.get<any[]>("/api/publishing/progress").catch(() => []),
          ]);
          setBookmarkedIds(new Set((bookmarks || []).map((a: any) => a._id)));
          setCompletedIds(new Set((progress || []).map((p: any) => p.article)));
        }
      } catch (error) {
        console.error("Failed to load articles", error);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchData();
  }, [slug, user]);

  const toggleBookmark = async (articleId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) return;
    try {
      const result = await api.post<{ bookmarked: boolean }>(`/api/publishing/bookmark/${articleId}`);
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        result.bookmarked ? next.add(articleId) : next.delete(articleId);
        return next;
      });
    } catch { /* ignore */ }
  };

  const formattedCategoryName = slug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <PublicShell>
      <div className="max-w-[1300px] mx-auto px-6 py-8">
        <div className="mb-6 flex items-center text-[12px] text-muted-foreground">
          <Link to="/tutorials" className="hover:text-primary flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Tutorials
          </Link>
          <ChevronRight className="w-3.5 h-3.5 mx-2 opacity-50" />
          <span className="text-foreground">{formattedCategoryName}</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">{formattedCategoryName}</h1>
          <p className="text-[13px] text-muted-foreground mt-1">{articles.length} tutorial{articles.length !== 1 ? 's' : ''} in this category</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((art) => {
              const diff = DIFF_MAP[art.difficulty || "Beginner"] || DIFF_MAP.Beginner;
              const isCompleted = completedIds.has(art._id);
              const isBookmarked = bookmarkedIds.has(art._id);
              return (
                <Link key={art._id} to={`/tutorials/${art.slug}`}>
                  <Surface hover className="h-full flex flex-col p-4 group">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill variant={diff.variant} className="text-[9px]">{diff.label}</Pill>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" /> {art.estimatedReadMinutes || 5} min
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                        <Eye className="w-3 h-3" /> {art.views}
                      </span>
                    </div>
                    <h2 className="text-[14px] font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-2">{art.title}</h2>
                    {art.excerpt && <p className="text-[12px] text-muted-foreground line-clamp-2 mb-2">{art.excerpt}</p>}
                    <div className="mt-auto pt-2 flex items-center justify-between border-t border-border/30">
                      <div className="flex items-center gap-1.5">
                        {(art.tags || []).slice(0, 2).map(t => (
                          <span key={t} className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                        {isCompleted && <CheckCircle2 className="w-3 h-3 text-success" />}
                      </div>
                      {user && (
                        <button onClick={(e) => toggleBookmark(art._id, e)} className={`p-1 rounded ${isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                          {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </Surface>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-lg">
            <Code2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-[13px]">No tutorials published in this category yet.</p>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
