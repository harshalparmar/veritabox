import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import { Bookmark, Heart, MessageSquare, ChevronLeft, MoreVertical, Copy, Check, ExternalLink, CheckCircle2, Cpu, Edit, Trash2, Loader2, ArrowLeft, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi, commentsApi, resolveAssetUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Heading = { id: string; level: number; text: string };

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="my-5 border border-border rounded-md bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between px-3 h-8 border-b border-border bg-card/60">
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">{lang || "code"}</span>
        <button onClick={copy} className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">
          {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy Protocol</>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[12.5px] font-mono leading-[1.7] text-foreground/90"><code>{code}</code></pre>
    </div>
  );
}

function renderInline(text: string) {
  // bold, code, link
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2]) nodes.push(<strong key={i++} className="text-foreground font-semibold">{m[2]}</strong>);
    else if (m[3]) nodes.push(<code key={i++} className="px-1.5 py-px rounded bg-primary/10 text-primary border border-primary/20 font-mono text-[12.5px]">{m[3]}</code>);
    else if (m[4] && m[5]) nodes.push(<a key={i++} href={m[5]} target="_blank" rel="noreferrer" className="text-primary hover:underline">{m[4]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function MarkdownRender({ src, onHeadings }: { src: string; onHeadings: (h: Heading[]) => void }) {
  const { blocks, headings } = useMemo(() => {
    const lines = src.split("\n");
    const blocks: React.ReactNode[] = [];
    const headings: Heading[] = [];
    let i = 0; let key = 0;
    while (i < lines.length) {
      const ln = lines[i];
      if (ln.startsWith("```")) {
        const lang = ln.slice(3).trim();
        i++; const buf: string[] = [];
        while (i < lines.length && !lines[i].startsWith("```")) { buf.push(lines[i]); i++; }
        i++;
        blocks.push(<CodeBlock key={key++} lang={lang} code={buf.join("\n")} />);
        continue;
      }
      const h = ln.match(/^(#{1,3})\s+(.*)/);
      if (h) {
        const level = h[1].length;
        const text = h[2];
        const id = slugify(text);
        headings.push({ id, level, text });
        const sizes = { 1: "text-[32px] mt-2", 2: "text-[22px] mt-10", 3: "text-[17px] mt-8" } as const;
        blocks.push(
          <h2 key={key++} id={id} className={cn(
            "font-semibold tracking-tight scroll-mt-24 relative text-foreground",
            sizes[level as 1 | 2 | 3],
            level === 2 && "before:absolute before:-left-4 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:bg-primary before:shadow-[0_0_12px_hsl(var(--primary))]"
          )}>{renderInline(text)}</h2>
        );
        i++; continue;
      }
      if (ln.startsWith("> ")) {
        blocks.push(
          <blockquote key={key++} className="my-5 border-l-2 border-primary bg-card/40 pl-4 pr-3 py-3 font-mono text-[13px] text-foreground/80 relative">
            <span className="text-primary mr-2">$</span>{renderInline(ln.slice(2))}
          </blockquote>
        );
        i++; continue;
      }
      
      const img = ln.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (img) {
        blocks.push(
          <div key={key++} className="my-6 space-y-2">
            <div className="rounded-lg border border-border overflow-hidden bg-card/20 shadow-xl shadow-primary/5">
              <img src={resolveAssetUrl(img[2])} alt={img[1]} className="w-full h-auto max-h-[600px] object-contain mx-auto" />
            </div>
            {img[1] && <div className="text-[11px] text-center text-muted-foreground italic">{img[1]}</div>}
          </div>
        );
        i++; continue;
      }

      if (ln.trim() === "") { i++; continue; }
      blocks.push(<p key={key++} className="my-3 text-[14px] leading-[1.75] text-foreground/85">{renderInline(ln)}</p>);
      i++;
    }
    return { blocks, headings };
  }, [src]);

  useEffect(() => { onHeadings(headings); }, [headings, onHeadings]);
  return <div>{blocks}</div>;
}

export default function KnowledgeArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");
  const [commentText, setCommentText] = useState("");
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["article", slug],
    queryFn: () => knowledgeApi.getBySlug(slug!),
    enabled: !!slug,
  });

  const article = data?.article;
  const collection = data?.parentCollection;

  const { data: comments, isLoading: loadingComments } = useQuery({
    queryKey: ["comments", article?._id],
    queryFn: () => commentsApi.getByArticle(article?._id),
    enabled: !!article?._id,
  });

  const upvoteMutation = useMutation({
    mutationFn: () => knowledgeApi.toggleUpvote(article!._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["article", slug] }),
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => knowledgeApi.toggleBookmark(article!._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["article", slug] }),
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => commentsApi.create(article?._id, text),
    onSuccess: () => {
      setCommentText("");
      toast.success("Intel contribution acknowledged.");
      queryClient.invalidateQueries({ queryKey: ["comments", article?._id] });
    },
  });

  const solutionMutation = useMutation({
    mutationFn: (commentId: string) => knowledgeApi.markAsSolution(commentId),
    onSuccess: () => {
      toast.success("Solution protocol established.");
      queryClient.invalidateQueries({ queryKey: ["comments", article?._id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => knowledgeApi.delete(article?._id),
    onSuccess: () => {
      toast.success("Article purged.");
      navigate("/knowledge");
    },
  });

  useEffect(() => {
    const onScroll = () => {
      let cur = "";
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top < 120) cur = h.id;
      }
      setActive(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Session-based view registry log trigger to prevent duplicate counting on focus, tab-change, or re-render
  useEffect(() => {
    if (!article?._id) return;

    try {
      const viewedStr = sessionStorage.getItem("viewed_articles");
      const viewedList: string[] = viewedStr ? JSON.parse(viewedStr) : [];
      
      if (!viewedList.includes(article._id)) {
        knowledgeApi.registerView(article._id)
          .then((res) => {
            // Update cache viewsCount locally so the UI updates instantly
            queryClient.setQueryData(["article", slug], (oldData: any) => {
              if (!oldData?.article) return oldData;
              return {
                ...oldData,
                article: {
                  ...oldData.article,
                  viewsCount: res.viewsCount
                }
              };
            });
            // Record view in session storage
            viewedList.push(article._id);
            sessionStorage.setItem("viewed_articles", JSON.stringify(viewedList));
          })
          .catch((err) => console.error("Failed to register view telemetry:", err));
      }
    } catch (e) {
      console.error("Session view validation failure:", e);
    }
  }, [article?._id, slug, queryClient]);

  if (isLoading) {
    return (
      <PublicShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </PublicShell>
    );
  }

  if (error || !article) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-[800px] px-6 py-24 text-center">
          <h2 className="text-[20px] font-bold uppercase tracking-widest text-muted-foreground">Article mission failed.</h2>
          <p className="mt-2 text-muted-foreground/60 text-[13px]">The requested intelligence artifact does not exist in this sector.</p>
          <Link to="/knowledge" className="mt-8 h-10 px-6 border border-primary/20 text-primary hover:bg-primary/5 inline-flex items-center gap-2 text-[12px] font-bold uppercase">
             <ArrowLeft className="h-4 w-4" /> Return to Hub
          </Link>
        </div>
      </PublicShell>
    );
  }

  const articleId = `INTEL-${article._id.substring(article._id.length - 5).toUpperCase()}`;
  const isAuthor = user?._id === article.author?._id;
  const isUpvoted = article.upvotes?.includes(user?._id);
  const isBookmarked = article.bookmarks?.includes(user?._id);
  const readingTime = Math.ceil(article.content.split(/\s+/).length / 200);

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/20 relative overflow-hidden">
        <div className="absolute -top-32 left-1/3 h-[280px] w-[480px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative mx-auto max-w-[1300px] px-6 pt-6 pb-2">
          <Link to="/knowledge" className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-3 w-3" /> Return to Repository
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-10">
        <article className="min-w-0 max-w-[760px] mx-auto w-full">
          {/* Action Matrix */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Pill variant="purple">{article.categoryId?.name || "Manual"}</Pill>
              <Pill>Operative</Pill>
              <span className="text-[10px] font-mono text-muted-foreground">{articleId}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => bookmarkMutation.mutate()}
                className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", isBookmarked ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                aria-label="Sync Intel"
                title="Sync Intel (Bookmark)"
              >
                <Bookmark className={cn("h-3.5 w-3.5", isBookmarked && "fill-current")} />
              </button>
              <button
                onClick={() => upvoteMutation.mutate()}
                className={cn("h-9 px-3 inline-flex items-center gap-1.5 rounded border transition-colors text-[12px] font-mono",
                  isUpvoted ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border hover:bg-secondary text-muted-foreground")}
              >
                <Heart className={cn("h-3.5 w-3.5", isUpvoted && "fill-current")} /> {article.upvotes?.length || 0}
              </button>
              <div className="h-9 px-3 inline-flex items-center gap-1.5 rounded border border-border text-[12px] font-mono text-muted-foreground select-none" title="Views Telemetry">
                <Eye className="h-3.5 w-3.5" /> {article.viewsCount || 0}
              </div>
              {isAuthor && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenu(m => !m); }}
                    className="h-9 w-9 inline-flex items-center justify-center rounded border border-border hover:bg-secondary text-muted-foreground"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                  {menu && (
                    <div className="absolute right-0 top-10 z-20 w-44 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                      <Link to={`/knowledge/edit/${slug}`} className="flex items-center gap-2 px-3 h-9 text-[12.5px] hover:bg-secondary">
                        <Edit className="h-3.5 w-3.5" /> Edit Intel
                      </Link>
                      <button 
                        onClick={() => deleteMutation.mutate()}
                        className="w-full flex items-center gap-2 px-3 h-9 text-[12.5px] text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <h1 className="text-[36px] md:text-[42px] font-semibold tracking-tight leading-[1.1]">
            {article.title}
          </h1>
          
          {article.coverImage && (
            <div className="mt-8 relative aspect-[21/9] rounded-lg border border-border overflow-hidden shadow-2xl shadow-primary/5">
              <img 
                src={resolveAssetUrl(article.coverImage)} 
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">
            {article.metaDescription || "Technical intelligence artifact."}
          </p>

          {/* Identity Block */}
          <Surface className="mt-6 p-4 flex items-center gap-3 bg-card/40">
            <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[12px] font-mono font-semibold text-primary">
              {article.author?.name?.substring(0, 2).toUpperCase() || "OP"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13.5px] font-medium">{article.author?.name || "Anonymous"}</span>
                <Pill variant="info">{article.author?.role || "Operative"}</Pill>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                {new Date(article.createdAt).toLocaleDateString()} · IIIT Hyderabad · {readingTime} min read
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider">
              <div className="text-center">
                <div className="text-[15px] font-semibold text-success normal-case tracking-normal">+184</div>
                <div className="text-muted-foreground">30d Rep</div>
              </div>
              <div className="text-center">
                <div className="text-[15px] font-semibold normal-case tracking-normal">12</div>
                <div className="text-muted-foreground">Articles</div>
              </div>
            </div>
          </Surface>

          {/* Markdown */}
          <div className="mt-8">
            <MarkdownRender src={article.content} onHeadings={setHeadings} />
          </div>

          {/* Hardware Integration Card */}
          {article.hardwareUsed?.length > 0 && (
            <Surface className="mt-10 p-5 bg-card/40 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/10 blur-2xl rounded-full" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-3">
                  <Cpu className="h-3 w-3 text-primary" /> Tactical Hardware
                </div>
                <h3 className="text-[15px] font-semibold mb-3">Required Components</h3>
                <div className="space-y-1.5">
                  {article.hardwareUsed.map((h: any, idx: number) => (
                    <a key={`${h.componentName}-${idx}`} href={h.supplierLink} target="_blank" rel="noreferrer"
                       className="flex items-center justify-between px-3 h-10 border border-border rounded hover:border-primary/40 hover:bg-primary/5 transition-colors">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium truncate">{h.componentName}</div>
                        <div className="text-[10.5px] font-mono text-muted-foreground">Supplier Link</div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            </Surface>
          )}

          {/* Intelligence Exchange */}
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em]">Intelligence Exchange · {comments?.length || 0}</h3>
            </div>

            <Surface className="p-4 mb-4">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Drop your feedback, addendum, or counter-intel..."
                rows={3}
                className="w-full bg-transparent text-[13px] outline-none resize-none placeholder:text-muted-foreground/60"
              />
              <div className="flex justify-end">
                <button 
                  onClick={() => commentMutation.mutate(commentText)}
                  disabled={!commentText.trim() || commentMutation.isPending}
                  className="text-[11px] font-mono uppercase tracking-wider h-8 px-3 bg-foreground text-background hover:opacity-90 rounded disabled:opacity-50"
                >
                  {commentMutation.isPending ? "Transmitting..." : "Transmit"}
                </button>
              </div>
            </Surface>

            <div className="space-y-3">
              {comments?.map(c => (
                <div key={c._id} className={cn(
                  "p-4 rounded-md border bg-card",
                  c.isSolution ? "border-success/40 bg-success/5 shadow-[0_0_24px_-12px_hsl(var(--success))]" : "border-border"
                )}>
                  {c.isSolution && (
                    <div className="flex items-center gap-1.5 mb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-success">
                      <CheckCircle2 className="h-3 w-3" /> Solution Verified
                    </div>
                  )}
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-secondary border border-border shrink-0 flex items-center justify-center text-[10px] font-mono font-semibold">
                      {c.author?.name?.substring(0, 2).toUpperCase() || "OP"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium">{c.author?.name || "Anonymous"}</span>
                        <Pill>{c.author?.role || "Operative"}</Pill>
                      </div>
                      <p className="mt-1 text-[13px] text-foreground/85 leading-relaxed">{c.content}</p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                        <button className="hover:text-foreground inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {c.upvotes?.length || 0}</button>
                        <button className="hover:text-foreground">Reply</button>
                        {isAuthor && !c.isSolution && (
                          <button 
                            onClick={() => solutionMutation.mutate(c._id)}
                            className="ml-auto text-success hover:underline inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Mark Verified
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!comments || comments.length === 0) && (
                <div className="py-10 text-center text-muted-foreground/40 text-[12px] font-mono italic">
                  Registry entry is currently silent.
                </div>
              )}
            </div>
          </div>
        </article>

        {/* TOC  -  Intelligence Map */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-border" /> Intelligence Map
            </div>
            <nav className="space-y-1 border-l border-border">
              {headings.map(h => (
                <a key={h.id} href={`#${h.id}`}
                   className={cn(
                     "block pl-3 -ml-px border-l py-1 text-[12px] transition-colors",
                     h.level === 3 && "pl-6",
                     active === h.id
                       ? "border-primary text-primary"
                       : "border-transparent text-muted-foreground hover:text-foreground"
                   )}>
                  {h.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </PublicShell>
);
}
