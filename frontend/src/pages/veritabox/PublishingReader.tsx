import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import { api } from "@/lib/api";
import { PublicShell } from "@/components/VeritaBox/PublicShell";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, Clock, Eye, BookOpen, Bookmark, BookmarkCheck,
  CheckCircle2, ChevronRight, List, Code2, ArrowRight
} from "lucide-react";
import { format } from "date-fns";

interface Article {
  _id: string; title: string; content: string; excerpt?: string;
  difficulty?: string; estimatedReadMinutes?: number;
  createdAt: string; updatedAt?: string; views: number;
  author: { name: string };
  category: { name: string; slug: string };
  tags?: string[]; prerequisites?: string[];
  relatedArticles?: { _id: string; title: string; slug: string; difficulty?: string }[];
  tableOfContents?: { id: string; text: string; level: number }[];
}

interface TocItem { id: string; text: string; level: number; }

const DIFF_MAP: Record<string, { variant: "success" | "warning" | "danger" }> = {
  Beginner: { variant: "success" },
  Intermediate: { variant: "warning" },
  Advanced: { variant: "danger" },
};

export default function PublishingReader() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeHeading, setActiveHeading] = useState("");
  const [readProgress, setReadProgress] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await api.get<Article>(`/api/publishing/articles/${slug}`);
        setArticle(data);
        if (user && data?._id) {
          const state = await api.get<{ bookmarked: boolean; completed: boolean }>(`/api/publishing/user-state/${data._id}`).catch(() => ({ bookmarked: false, completed: false }));
          setBookmarked(state.bookmarked);
          setCompleted(state.completed);
        }
      } catch (error) {
        console.error("Failed to load article", error);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchData();
  }, [slug, user]);

  // Highlight code + extract TOC from rendered HTML
  useEffect(() => {
    if (!article || !contentRef.current) return;

    // Highlight code blocks
    contentRef.current.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });

    // Extract TOC from headings
    const headings = contentRef.current.querySelectorAll("h1, h2, h3");
    const tocItems: TocItem[] = [];
    headings.forEach((heading, i) => {
      const id = `heading-${i}`;
      heading.setAttribute("id", id);
      tocItems.push({
        id,
        text: heading.textContent || "",
        level: parseInt(heading.tagName.charAt(1))
      });
    });
    setToc(tocItems);
  }, [article]);

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setReadProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);

      // Active heading tracking
      if (!contentRef.current) return;
      const headings = contentRef.current.querySelectorAll("[id^='heading-']");
      let current = "";
      headings.forEach(h => {
        if (h.getBoundingClientRect().top <= 100) current = h.id;
      });
      if (current) setActiveHeading(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleBookmark = async () => {
    if (!user || !article) return;
    try {
      const result = await api.post<{ bookmarked: boolean }>(`/api/publishing/bookmark/${article._id}`);
      setBookmarked(result.bookmarked);
    } catch { /* ignore */ }
  };

  const toggleComplete = async () => {
    if (!user || !article) return;
    try {
      const result = await api.post<{ completed: boolean }>(`/api/publishing/progress/${article._id}`);
      setCompleted(result.completed);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <PublicShell>
        <div className="flex items-center justify-center min-h-[50vh]">
          <span className="text-muted-foreground animate-pulse flex items-center gap-2">
            <Code2 className="w-4 h-4" /> Loading...
          </span>
        </div>
      </PublicShell>
    );
  }

  if (!article) {
    return (
      <PublicShell>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <p className="text-destructive text-sm">Tutorial not found.</p>
          <Link to="/tutorials" className="text-primary text-sm hover:underline">&larr; Back to tutorials</Link>
        </div>
      </PublicShell>
    );
  }

  const sanitizedContent = DOMPurify.sanitize(article.content);
  const diff = DIFF_MAP[article.difficulty || "Beginner"] || DIFF_MAP.Beginner;

  return (
    <PublicShell>
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-border">
        <div className="h-full bg-primary transition-all duration-150" style={{ width: `${readProgress}%` }} />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Link to="/tutorials" className="hover:text-primary transition-colors">Tutorials</Link>
          <ChevronRight className="w-3 h-3 opacity-50" />
          <Link to={`/tutorials/category/${article.category.slug}`} className="hover:text-primary transition-colors">
            {article.category.name}
          </Link>
          <ChevronRight className="w-3 h-3 opacity-50" />
          <span className="text-foreground/70 truncate max-w-[250px]">{article.title}</span>
        </div>

        <div className="flex gap-8 items-start">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Pill variant={diff.variant}>{article.difficulty || "Beginner"}</Pill>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3" /> {article.estimatedReadMinutes || 5} min read
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Eye className="w-3 h-3" /> {article.views?.toLocaleString()}
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight leading-tight mb-3">
                {article.title}
              </h1>

              {article.excerpt && (
                <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">{article.excerpt}</p>
              )}

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground pb-4 border-b border-border/50 flex-wrap">
                <span>By {article.author?.name || 'Admin'}</span>
                <span>&middot;</span>
                <span>{format(new Date(article.createdAt), 'MMM dd, yyyy')}</span>
                {article.updatedAt && article.updatedAt !== article.createdAt && (
                  <>
                    <span>&middot;</span>
                    <span>Updated {format(new Date(article.updatedAt), 'MMM dd, yyyy')}</span>
                  </>
                )}

                {/* Action buttons */}
                <div className="ml-auto flex items-center gap-2">
                  {user && (
                    <>
                      <button onClick={toggleBookmark} className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors ${bookmarked ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border hover:border-foreground/30'}`}>
                        {bookmarked ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                        {bookmarked ? "Saved" : "Save"}
                      </button>
                      <button onClick={toggleComplete} className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors ${completed ? 'border-success/30 bg-success/10 text-success' : 'border-border hover:border-foreground/30'}`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {completed ? "Completed" : "Mark Done"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Prerequisites */}
            {article.prerequisites && article.prerequisites.length > 0 && (
              <Surface className="p-4 mb-6 bg-warning/5 border-warning/20">
                <p className="text-[11px] font-medium uppercase tracking-wider text-warning mb-2">Prerequisites</p>
                <ul className="space-y-1">
                  {article.prerequisites.map((p, i) => (
                    <li key={i} className="text-[12px] text-muted-foreground flex items-center gap-2">
                      <span className="text-warning">&rarr;</span> {p}
                    </li>
                  ))}
                </ul>
              </Surface>
            )}

            {/* Content Body */}
            <style dangerouslySetInnerHTML={{__html: `
              .ql-align-center { text-align: center; }
              .ql-align-right { text-align: right; }
              .ql-align-justify { text-align: justify; }
              .ql-indent-1 { padding-left: 3rem; }
              .ql-indent-2 { padding-left: 6rem; }
              .ql-indent-3 { padding-left: 9rem; }
              .ql-indent-4 { padding-left: 12rem; }
            `}} />
            <div
              ref={contentRef}
              className="prose dark:prose-invert prose-slate max-w-none
                prose-headings:font-bold prose-headings:tracking-tight prose-headings:scroll-mt-20
                prose-a:text-primary hover:prose-a:text-primary/80 prose-a:transition-colors
                prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-border/50 prose-pre:rounded-md
                prose-code:text-info prose-code:bg-info/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                prose-img:rounded-md prose-img:border prose-img:border-border/50
                prose-table:border prose-table:border-border/50
                prose-th:bg-secondary/30 prose-th:px-3 prose-th:py-2
                prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-border/50"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border/50">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {article.tags.map(tag => (
                    <Link key={tag} to={`/tutorials?tag=${tag}`} className="text-[11px] text-muted-foreground bg-secondary/50 border border-border/50 px-2 py-0.5 rounded hover:text-primary hover:border-primary/30 transition-colors">
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related Articles */}
            {article.relatedArticles && article.relatedArticles.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border/50">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-foreground/80 mb-3">Related Tutorials</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {article.relatedArticles.map(rel => {
                    const rDiff = DIFF_MAP[rel.difficulty || "Beginner"] || DIFF_MAP.Beginner;
                    return (
                      <Link key={rel._id} to={`/tutorials/${rel.slug}`}>
                        <Surface hover className="p-3 flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium truncate">{rel.title}</p>
                            <Pill variant={rDiff.variant} className="text-[8px] mt-0.5">{rel.difficulty || "Beginner"}</Pill>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
                        </Surface>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Back link */}
            <div className="mt-8 pt-6 border-t border-border flex">
              <Link to={`/tutorials/category/${article.category.slug}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to {article.category.name}
              </Link>
            </div>
          </div>

          {/* TOC Sidebar */}
          {toc.length > 2 && (
            <div className="hidden lg:block w-56 shrink-0 sticky top-16">
              <div className="flex items-center gap-2 mb-3">
                <List className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">On this page</span>
              </div>
              <nav className="space-y-0.5 border-l border-border pl-3">
                {toc.map(item => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`block text-[11.5px] py-0.5 transition-colors truncate ${
                      activeHeading === item.id ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    style={{ paddingLeft: `${(item.level - 1) * 10}px` }}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </div>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
