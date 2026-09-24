import { AdminLayout } from "@/components/veritabox/AdminLayout";
import { PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Stat, Pill } from "@/components/veritabox/UI";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, knowledgeApi, KnowledgeArticle } from "@/lib/api";
import { 
  BookOpen, Search, Filter, Check, X, 
  Trash2, Eye, Loader2, MoreHorizontal,
  ChevronRight, AlertCircle, FileText, Plus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function AdminKnowledge() {
  const [activeTab, setActiveTab] = useState<"articles" | "sectors">("articles");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Published" | "Draft">("All");
  
  const [newSectorName, setNewSectorName] = useState("");
  const [newSectorSlug, setNewSectorSlug] = useState("");

  const queryClient = useQueryClient();

  const { data: articles, isLoading } = useQuery({
    queryKey: ["admin-knowledge"],
    queryFn: () => adminApi.getKnowledgeArticles(),
  });

  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => knowledgeApi.getCategories(),
    enabled: activeTab === "sectors",
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => 
      adminApi.publishKnowledgeArticle(id, isPublished),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-knowledge"] });
      toast.success("Publication status updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update publication status");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteKnowledgeArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-knowledge"] });
      toast.success("Article removed from registry");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete article");
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; slug: string }) => knowledgeApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Topic Sector created successfully");
      setNewSectorName("");
      setNewSectorSlug("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create Topic Sector");
    }
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectorName || !newSectorSlug) {
      toast.error("Name and slug are required");
      return;
    }
    createCategoryMutation.mutate({ name: newSectorName, slug: newSectorSlug });
  };

  const filteredArticles = articles?.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) || 
                         (a.author?.name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "All" || 
                         (statusFilter === "Published" ? a.isPublished : !a.isPublished);
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to permanently delete "${title}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <AdminLayout>
      <PageContent>
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-border pb-4">
            <button
              onClick={() => setActiveTab("articles")}
              className={`text-[13px] font-medium px-4 py-2 rounded-t transition-colors ${
                activeTab === "articles" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              Articles
            </button>
            <button
              onClick={() => setActiveTab("sectors")}
              className={`text-[13px] font-medium px-4 py-2 rounded-t transition-colors ${
                activeTab === "sectors" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              Topic Sectors
            </button>
          </div>

          {activeTab === "articles" && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Stat label="Total Articles" value={articles?.length?.toString() || "0"} />
                <Stat label="Published" value={articles?.filter(a => a.isPublished).length?.toString() || "0"} accent="hsl(var(--success))" />
                <Stat label="Drafts / Pending" value={articles?.filter(a => !a.isPublished).length?.toString() || "0"} accent="hsl(var(--warning))" />
                <Stat label="Total Knowledge Share" value={articles ? (articles.length * 5).toString() : "0"} hint="Reputation injected" />
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title or author..." 
                    className="w-full h-10 bg-secondary/30 border border-border pl-10 pr-4 text-[13px] outline-none rounded focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="flex gap-1 bg-secondary/30 p-1 rounded border border-border">
                  {(["All", "Published", "Draft"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${ statusFilter === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Articles List */}
              <div className="grid gap-3">
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredArticles && filteredArticles.length > 0 ? (
                  filteredArticles.map((article) => (
                    <Surface key={article._id} className="p-4 flex flex-col md:flex-row md:items-center justify-between group hover:border-primary/30 transition-all gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`h-10 w-10 rounded flex items-center justify-center shrink-0 ${article.isPublished ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-semibold">{article.title}</span>
                            {article.isPublished ? (
                              <Pill className="bg-success/20 text-success border-success/30 text-[9px] h-4">PUBLISHED</Pill>
                            ) : (
                              <Pill className="bg-warning/20 text-warning border-warning/30 text-[9px] h-4">DRAFT</Pill>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 uppercase tracking-wider">
                            <span>{article.author?.name || "Unknown Author"}</span>
                            <span>•</span>
                            <span>{format(new Date(article.createdAt), 'MMM dd, yyyy')}</span>
                            <span>•</span>
                            <span className="text-info">/{article.slug}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <Link to={`/knowledge/${article.slug}`}>
                          <button className="h-8 px-3 flex items-center justify-center gap-2 bg-secondary border border-border rounded text-[11px] font-medium hover:bg-border transition-colors">
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                        </Link>
                        
                        {article.isPublished ? (
                          <button 
                            onClick={() => publishMutation.mutate({ id: article._id, isPublished: false })}
                            disabled={publishMutation.isPending}
                            className="h-8 px-3 flex items-center justify-center gap-2 bg-warning/10 text-warning border border-warning/20 rounded text-[11px] font-medium hover:bg-warning/20 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" /> Unpublish
                          </button>
                        ) : (
                          <button 
                            onClick={() => publishMutation.mutate({ id: article._id, isPublished: true })}
                            disabled={publishMutation.isPending}
                            className="h-8 px-3 flex items-center justify-center gap-2 bg-success/10 text-success border border-success/20 rounded text-[11px] font-medium hover:bg-success/20 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" /> Publish
                          </button>
                        )}

                        <button 
                          onClick={() => handleDelete(article._id, article.title)}
                          disabled={deleteMutation.isPending}
                          className="h-8 w-8 flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/20 rounded hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Surface>
                  ))
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-[13px] border border-dashed border-border rounded">
                    <AlertCircle className="h-5 w-5 mb-2 opacity-50" />
                    No articles found in the registry.
                  </div>
                )}
              </div>
              
              <div className="py-4 border-t border-border flex justify-between items-center text-[12px] text-muted-foreground">
                <div>Showing {filteredArticles?.length || 0} of {articles?.length || 0} intelligence entries</div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 border border-border rounded hover:bg-secondary">Previous</button>
                  <button className="px-3 py-1 border border-border rounded hover:bg-secondary">Next</button>
                </div>
              </div>
            </>
          )}

          {activeTab === "sectors" && (
            <div className="space-y-6">
              <Surface className="p-4">
                <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> Create New Topic Sector
                </h3>
                <form onSubmit={handleCreateCategory} className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground">Sector Name</label>
                    <input
                      value={newSectorName}
                      onChange={(e) => {
                        setNewSectorName(e.target.value);
                        setNewSectorSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                      }}
                      placeholder="e.g. Frontend Architecture"
                      className="w-full h-10 bg-secondary/30 border border-border px-3 text-[13px] outline-none rounded focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground">URL Slug</label>
                    <input
                      value={newSectorSlug}
                      onChange={(e) => setNewSectorSlug(e.target.value)}
                      placeholder="e.g. frontend-architecture"
                      className="w-full h-10 bg-secondary/30 border border-border px-3 text-[13px] outline-none rounded focus:border-primary/50 transition-all font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={createCategoryMutation.isPending}
                    className="h-10 px-6 bg-primary text-primary-foreground font-medium text-[13px] rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {createCategoryMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                    Create Sector
                  </button>
                </form>
              </Surface>

              <div className="grid gap-3">
                <h3 className="text-[14px] font-semibold mb-2">Existing Topic Sectors</h3>
                {isCategoriesLoading ? (
                  <div className="h-32 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : categories && categories.length > 0 ? (
                  categories.map((category: any) => (
                    <Surface key={category._id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded flex items-center justify-center bg-secondary">
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-[14px] font-semibold">{category.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">/{category.slug}</div>
                        </div>
                      </div>
                      <Pill className="bg-secondary text-muted-foreground">ID: {category._id.substring(0, 6)}...</Pill>
                    </Surface>
                  ))
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-[13px] border border-dashed border-border rounded">
                    <AlertCircle className="h-5 w-5 mb-2 opacity-50" />
                    No topic sectors found. Create one above.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </PageContent>
    </AdminLayout>
  );
}
