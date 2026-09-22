import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/VeritaBox/AdminLayout";
import { PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Stat, Pill } from "@/components/VeritaBox/UI";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Eye, Trash2, Plus, Loader2, FolderPlus,
  FileText, Edit, Code2, Clock, TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";

interface Category { _id: string; name: string; slug: string; description?: string; parentCategory?: string; }
interface Article {
  _id: string; title: string; status: string; views: number; createdAt: string;
  category: { _id: string; name: string }; author: { name: string };
  slug: string; difficulty?: string; estimatedReadMinutes?: number;
  tags?: string[]; excerpt?: string;
}
interface Analytics {
  totalArticles: number; publishedCount: number; draftCount: number;
  totalViews: number; totalCategories: number;
  byDifficulty: Record<string, number>; topArticles: { title: string; views: number }[];
  tagCounts: Record<string, number>;
}

export default function AdminPublishing() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [parentCategory, setParentCategory] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catData, artData, analyticsData] = await Promise.all([
        api.get<Category[]>("/api/publishing/categories"),
        api.get<Article[]>("/api/publishing/admin/articles"),
        api.get<Analytics>("/api/publishing/admin/analytics").catch(() => null)
      ]);
      setCategories(catData || []);
      setArticles(artData || []);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error("Failed to load publishing data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const createCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await api.post("/api/publishing/admin/categories", {
        name: newCatName, description: newCatDesc, parentCategory: parentCategory || undefined
      });
      toast({ title: "Success", description: "Category created!" });
      setNewCatName(""); setNewCatDesc(""); setParentCategory("");
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    }
  };

  const updateCategory = async (id: string) => {
    if (!editCatName.trim()) return;
    try {
      await api.put(`/api/publishing/admin/categories/${id}`, { name: editCatName });
      toast({ title: "Success", description: "Category updated!" });
      setEditingCat(null); setEditCatName("");
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    }
  };

  const deleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? It must have no articles or subcategories.`)) return;
    try {
      await api.delete(`/api/publishing/admin/categories/${id}`);
      toast({ title: "Success", description: "Category deleted" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to delete category", variant: "destructive" });
    }
  };

  const deleteArticle = async (id: string, title: string) => {
    if (!confirm(`Permanently delete "${title}"?`)) return;
    try {
      await api.delete(`/api/publishing/admin/articles/${id}`);
      toast({ title: "Success", description: "Article deleted" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete article", variant: "destructive" });
    }
  };

  const filteredArticles = articles.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout>
      <PageContent>
        <div className="space-y-6 pb-20">
          {/* Analytics Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Total Tutorials" value={analytics?.totalArticles?.toString() || articles.length.toString()} icon={FileText} />
            <Stat label="Published" value={analytics?.publishedCount?.toString() || articles.filter(a => a.status === 'published').length.toString()} accent="hsl(var(--success))" icon={Code2} />
            <Stat label="Drafts" value={analytics?.draftCount?.toString() || articles.filter(a => a.status === 'draft').length.toString()} icon={Edit} />
            <Stat label="Total Views" value={analytics?.totalViews?.toLocaleString() || articles.reduce((s, a) => s + (a.views || 0), 0).toLocaleString()} icon={Eye} />
            <Stat label="Categories" value={analytics?.totalCategories?.toString() || categories.length.toString()} icon={FolderPlus} />
          </div>

          {/* Top Articles (if analytics available) */}
          {analytics?.topArticles && analytics.topArticles.length > 0 && (
            <Surface className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-[12px] font-semibold uppercase tracking-wider">Top Tutorials by Views</span>
              </div>
              <div className="space-y-1.5">
                {analytics.topArticles.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 text-[12px]">
                    <span className="text-muted-foreground w-4 text-right font-mono">{i + 1}</span>
                    <span className="flex-1 truncate">{a.title}</span>
                    <span className="text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> {a.views}</span>
                  </div>
                ))}
              </div>
            </Surface>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Articles List */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tutorials..."
                    className="w-full h-9 bg-secondary/30 border border-border pl-9 pr-4 text-[12px] outline-none rounded focus:border-primary/50 transition-all" />
                </div>
                <div className="flex items-center gap-1">
                  {["all", "published", "draft"].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1.5 text-[11px] font-medium rounded transition-colors capitalize ${
                        statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
                <button onClick={() => navigate(`/cmd/publishing/write`)}
                  className="h-9 px-4 bg-primary text-primary-foreground text-[12px] font-medium rounded flex items-center gap-2 hover:bg-primary/90 transition-colors ml-auto">
                  <Plus className="w-3.5 h-3.5" /> New Tutorial
                </button>
              </div>

              <div className="grid gap-2">
                {loading ? (
                  <div className="h-40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : filteredArticles.length > 0 ? (
                  filteredArticles.map(article => (
                    <Surface key={article._id} className="p-3 flex flex-col md:flex-row md:items-center justify-between group hover:border-primary/20 transition-all gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`h-8 w-8 rounded flex items-center justify-center shrink-0 ${article.status === 'published' ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold truncate">{article.title}</span>
                            <Pill className={`text-[8px] h-3.5 ${article.status === 'published' ? 'bg-success/20 text-success border-success/30' : 'bg-warning/20 text-warning border-warning/30'}`}>
                              {article.status.toUpperCase()}
                            </Pill>
                            {article.difficulty && (
                              <Pill variant={article.difficulty === 'Beginner' ? 'success' : article.difficulty === 'Intermediate' ? 'warning' : 'danger'} className="text-[8px] h-3.5">
                                {article.difficulty}
                              </Pill>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{article.category?.name || "Uncategorized"}</span>
                            <span>&middot;</span>
                            <span>{format(new Date(article.createdAt), 'MMM dd, yyyy')}</span>
                            <span>&middot;</span>
                            <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5"/> {article.views}</span>
                            {article.estimatedReadMinutes && (
                              <><span>&middot;</span><span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5"/> {article.estimatedReadMinutes}m</span></>
                            )}
                            {article.tags && article.tags.length > 0 && (
                              <span className="flex items-center gap-1 ml-1">
                                {article.tags.slice(0, 3).map(t => (
                                  <span key={t} className="bg-secondary/80 px-1 py-px rounded text-[9px]">{t}</span>
                                ))}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0">
                        <Link to={`/tutorials/${article.slug}`}>
                          <button className="h-7 px-2.5 flex items-center gap-1.5 bg-secondary border border-border rounded text-[10px] font-medium hover:bg-border transition-colors">
                            <Eye className="h-3 w-3" /> View
                          </button>
                        </Link>
                        <Link to={`/cmd/publishing/edit/${article._id}`}>
                          <button className="h-7 px-2.5 flex items-center gap-1.5 bg-secondary border border-border rounded text-[10px] font-medium hover:bg-border transition-colors">
                            <Edit className="h-3 w-3" /> Edit
                          </button>
                        </Link>
                        <button onClick={() => deleteArticle(article._id, article.title)}
                          className="h-7 w-7 flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/20 rounded hover:bg-destructive/20 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </Surface>
                  ))
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-[12px] border border-dashed border-border rounded">
                    No tutorials found.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Category Management */}
            <div className="w-full lg:w-[300px] shrink-0 space-y-4">
              <Surface className="p-4">
                <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FolderPlus className="w-3.5 h-3.5 text-primary" /> Category Manager
                </h3>
                <div className="flex flex-col gap-2 mb-5">
                  <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Category name" className="w-full bg-background border border-border rounded px-3 py-1.5 text-[12px] outline-none focus:border-primary/50" />
                  <input type="text" value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Description (optional)" className="w-full bg-background border border-border rounded px-3 py-1.5 text-[12px] outline-none focus:border-primary/50" />
                  <select value={parentCategory} onChange={(e) => setParentCategory(e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-1.5 text-[12px] outline-none focus:border-primary/50">
                    <option value="">No Parent (Root)</option>
                    {categories.filter(c => !c.parentCategory).map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  <button onClick={createCategory} disabled={!newCatName.trim()}
                    className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-[12px] font-medium disabled:opacity-50 w-full hover:bg-primary/90 transition-colors">
                    Add Category
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Existing ({categories.length})
                  </div>
                  {categories.map(cat => {
                    const artCount = articles.filter(a => a.category?._id === cat._id).length;
                    return (
                      <div key={cat._id} className="flex items-center gap-2 p-2 rounded bg-secondary/20 border border-border/50 text-[12px] group">
                        {editingCat === cat._id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input value={editCatName} onChange={(e) => setEditCatName(e.target.value)}
                              className="flex-1 bg-background border border-border rounded px-2 py-0.5 text-[11px] outline-none" autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && updateCategory(cat._id)} />
                            <button onClick={() => updateCategory(cat._id)} className="text-primary text-[10px] font-medium">Save</button>
                            <button onClick={() => setEditingCat(null)} className="text-muted-foreground text-[10px]">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 truncate">{cat.name}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{artCount}</span>
                            <button onClick={() => { setEditingCat(cat._id); setEditCatName(cat.name); }}
                              className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit className="w-3 h-3" />
                            </button>
                            <button onClick={() => deleteCategory(cat._id, cat.name)}
                              className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {categories.length === 0 && (
                    <div className="text-[11px] text-muted-foreground italic">No categories yet.</div>
                  )}
                </div>
              </Surface>

              {/* Difficulty distribution */}
              {analytics?.byDifficulty && (
                <Surface className="p-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-3 text-muted-foreground">By Difficulty</h3>
                  <div className="space-y-2">
                    {Object.entries(analytics.byDifficulty).map(([d, count]) => (
                      <div key={d} className="flex items-center gap-2 text-[12px]">
                        <Pill variant={d === 'Beginner' ? 'success' : d === 'Intermediate' ? 'warning' : 'danger'} className="text-[8px] w-20 justify-center">{d}</Pill>
                        <div className="flex-1 h-1.5 bg-secondary rounded overflow-hidden">
                          <div className={`h-full rounded ${d === 'Beginner' ? 'bg-success' : d === 'Intermediate' ? 'bg-warning' : 'bg-destructive'}`}
                            style={{ width: `${articles.length > 0 ? (count / articles.length) * 100 : 0}%` }} />
                        </div>
                        <span className="text-muted-foreground w-6 text-right tabular-nums">{count}</span>
                      </div>
                    ))}
                  </div>
                </Surface>
              )}
            </div>
          </div>
        </div>
      </PageContent>
    </AdminLayout>
  );
}
