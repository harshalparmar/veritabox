import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/VeritaBox/AdminLayout";
import { PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import {
  Code2, Users, Target, Search, Loader2, Plus, Trash2, Edit2,
  CheckCircle2, XCircle, AlertCircle, Save, Award, Info, HelpCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { forgeApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TestCaseInput {
  input: string;
  output: string;
  isHidden: boolean;
}

export default function AdminForge() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"list" | "create" | "analytics">("list");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingAnalyticsId, setViewingAnalyticsId] = useState<string | null>(null);
  const [viewingSubmissionCode, setViewingSubmissionCode] = useState<{ code: string; user: string; language: string; status: string } | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"Rookie" | "Operative" | "Elite">("Operative");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [problemStatement, setProblemStatement] = useState("");
  const [constraints, setConstraints] = useState("");
  const [exampleInput, setExampleInput] = useState("");
  const [exampleOutput, setExampleOutput] = useState("");
  const [testCases, setTestCases] = useState<TestCaseInput[]>([]);
  const [reputationReward, setReputationReward] = useState(50);
  const [activeFrom, setActiveFrom] = useState("");

  // Fetch Challenges
  const { data: challenges, isLoading } = useQuery({
    queryKey: ["admin-challenges"],
    queryFn: () => forgeApi.getAll({ all: true }),
  });

  // Fetch Analytics for Selected Challenge
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["challenge-analytics", viewingAnalyticsId],
    queryFn: () => forgeApi.getAnalytics(viewingAnalyticsId!),
    enabled: !!viewingAnalyticsId && tab === "analytics",
  });

  // Mutators
  const createMutation = useMutation({
    mutationFn: (data: any) => forgeApi.create(data),
    onSuccess: () => {
      toast.success("Challenge uploaded and deployed to operatives.");
      resetForm();
      setTab("list");
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to deploy challenge."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => forgeApi.update(id, data),
    onSuccess: () => {
      toast.success("Challenge matrix restructured.");
      resetForm();
      setTab("list");
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
    },
    onError: (err: any) => toast.error(err.message || "Restructuring failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => forgeApi.delete(id),
    onSuccess: () => {
      toast.success("Challenge purged from the system.");
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
    },
    onError: (err: any) => toast.error(err.message || "Purge execution failed."),
  });

  // Tag helper
  const addTag = () => {
    const tag = tagsInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagsInput("");
    }
  };
  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  // Test Case helpers
  const addTestCase = () => {
    setTestCases([...testCases, { input: "", output: "", isHidden: true }]);
  };
  const updateTestCase = (index: number, field: keyof TestCaseInput, value: any) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };
  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleEdit = (challenge: any) => {
    setEditingId(challenge._id);
    setTitle(challenge.title);
    setDifficulty(challenge.difficulty || "Operative");
    setTags(challenge.tags || []);
    setProblemStatement(challenge.problemStatement);
    setConstraints(challenge.constraints || "");
    setExampleInput(challenge.exampleInput || "");
    setExampleOutput(challenge.exampleOutput || "");
    setTestCases(challenge.testCases || []);
    setReputationReward(challenge.reputationReward || 50);
    setActiveFrom(challenge.activeFrom ? new Date(challenge.activeFrom).toISOString().slice(0, 16) : "");
    setTab("create");
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDifficulty("Operative");
    setTags([]);
    setTagsInput("");
    setProblemStatement("");
    setConstraints("");
    setExampleInput("");
    setExampleOutput("");
    setTestCases([]);
    setReputationReward(50);
    setActiveFrom("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !problemStatement.trim()) {
      toast.error("Complete all required sectors.");
      return;
    }

    const payload = {
      title,
      difficulty,
      tags,
      problemStatement,
      constraints,
      exampleInput,
      exampleOutput,
      testCases,
      reputationReward,
      activeFrom: activeFrom || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = useMemo(() => {
    if (!challenges) return [];
    return challenges.filter(c =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );
  }, [challenges, search]);

  const stats = useMemo(() => {
    if (!challenges) return { rookie: 0, operative: 0, elite: 0 };
    return {
      rookie: challenges.filter(c => c.difficulty === "Rookie").length,
      operative: challenges.filter(c => c.difficulty === "Operative").length,
      elite: challenges.filter(c => c.difficulty === "Elite").length,
    };
  }, [challenges]);

  return (
    <AdminLayout>
      <PageContent>
        <div className="space-y-6">
          
          {/* ── METADATA PANEL ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Rookie Sector", value: stats.rookie, color: "text-info", bg: "bg-info/10 border-info/20" },
              { label: "Operative Sector", value: stats.operative, color: "text-warning", bg: "bg-warning/10 border-warning/20" },
              { label: "Elite Sector", value: stats.elite, color: "text-danger", bg: "bg-danger/10 border-danger/20" },
              { label: "Global Missions", value: challenges?.length || 0, color: "text-primary", bg: "bg-primary/10 border-primary/20" }
            ].map((s) => (
              <div key={s.label} className={cn("rounded-2xl border p-5", s.bg)}>
                <div className="text-[30px] font-black tracking-tight leading-none mb-1">{s.value}</div>
                <div className={cn("text-[9px] uppercase font-black tracking-widest", s.color)}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── TAB & CONTROL BAR ── */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-xl border border-border">
              <button
                onClick={() => { setTab("list"); resetForm(); }}
                className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", tab === "list" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
              >
                Missions List
              </button>
              <button
                onClick={() => setTab("create")}
                className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", tab === "create" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
              >
                {editingId ? "Edit Spec" : "Deploy Challenge"}
              </button>
            </div>

            {tab === "list" && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  placeholder="Filter catalog..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 w-[220px] bg-secondary/30 border border-border rounded-xl text-[12px] outline-none focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>
            )}
          </div>

          {/* ── LIST TAB ── */}
          {tab === "list" && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center gap-3">
                  <div className="h-10 w-10 border-2 border-primary/20 border-t-primary animate-spin rounded-full" />
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Mapping Catalog...</div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center rounded-2xl border border-dashed border-border/60 bg-secondary/5">
                  <AlertCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <h4 className="text-[16px] font-black text-muted-foreground/45 uppercase tracking-widest">Sector Empty</h4>
                  <p className="text-[11.5px] text-muted-foreground/35 mt-0.5">No challenges populated in this sector yet.</p>
                </div>
              ) : (
                <Surface className="overflow-hidden border-border/60">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border/80">
                        <tr>
                          <th className="px-6 py-4 w-28">Ref ID</th>
                          <th className="px-6 py-4">Challenge Spec</th>
                          <th className="px-6 py-4 w-32">Difficulty</th>
                          <th className="px-6 py-4 w-40">Release Date</th>
                          <th className="px-6 py-4">Technology Tags</th>
                          <th className="px-6 py-4 text-center w-32">Bounty</th>
                          <th className="px-6 py-4 text-center w-32">Solved</th>
                          <th className="px-6 py-4 text-right w-[260px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 text-[13px]">
                        {filtered.map((c) => (
                          <tr key={c._id} className="hover:bg-secondary/15 transition-all group">
                            <td className="px-6 py-4 font-mono text-[11px] text-muted-foreground/70">
                              #{c._id?.slice(-6).toUpperCase()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-black text-[14px] leading-snug group-hover:text-primary transition-colors">
                                {c.title}
                              </div>
                              <div className="text-[10px] text-muted-foreground/60 leading-relaxed mt-0.5 line-clamp-1 max-w-[280px]">
                                {c.problemStatement}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Pill variant={c.difficulty === 'Elite' ? 'danger' : c.difficulty === 'Operative' ? 'warning' : 'success'}>
                                {c.difficulty}
                              </Pill>
                            </td>
                            <td className="px-6 py-4 font-mono text-[11px] text-muted-foreground/80">
                              {c.activeFrom ? new Date(c.activeFrom).toLocaleString() : "Immediate"}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-1.5 flex-wrap max-w-[260px]">
                                {c.tags?.map((t: string) => (
                                  <span key={t} className="h-5 px-2 bg-secondary border border-border/60 text-[9px] font-bold text-muted-foreground rounded flex items-center">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center font-mono font-black text-primary">
                              +{c.reputationReward || 50} XP
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-muted-foreground">
                              {c.totalSolved || 0}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => { setViewingAnalyticsId(c._id); setTab("analytics"); }}
                                  className="h-8 px-2.5 bg-primary/10 border border-primary/20 hover:border-primary/50 text-[10px] text-primary font-bold uppercase tracking-widest rounded-lg flex items-center gap-1 transition-all"
                                >
                                  Analytics
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(c)}
                                  className="h-8 px-2.5 bg-secondary border border-border group-hover:border-primary/45 group-hover:text-primary group-hover:bg-primary/5 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-1 transition-all"
                                >
                                  <Edit2 className="h-3 w-3" /> Adjust
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { if (window.confirm("Purge this challenge and all related submission matrices?")) deleteMutation.mutate(c._id); }}
                                  disabled={deleteMutation.isPending}
                                  className="h-8 w-8 flex items-center justify-center bg-secondary border border-border rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Surface>
              )}
            </div>
          )}

          {/* ── CREATE/EDIT TAB ── */}
          {tab === "create" && (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-6 space-y-6">
                
                {/* Section: General Specs */}
                <div className="space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary pb-1 border-b border-border/60 flex items-center gap-2">
                    <Info className="h-4 w-4" /> General Specifications
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Challenge Title *</label>
                      <input
                        required
                        placeholder="e.g., Dijkstra's Route Optimization"
                        className="w-full h-11 px-4 bg-secondary/20 border border-border rounded-xl text-[13px] outline-none focus:border-primary/50 transition-all"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Difficulty *</label>
                        <select
                          className="w-full h-11 px-4 bg-secondary/20 border border-border rounded-xl text-[13px] outline-none focus:border-primary/50 transition-all"
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value as any)}
                        >
                          <option>Rookie</option>
                          <option>Operative</option>
                          <option>Elite</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">REP Reward *</label>
                        <input
                          required
                          type="number"
                          className="w-full h-11 px-4 bg-secondary/20 border border-border rounded-xl text-[13px] outline-none focus:border-primary/50 transition-all"
                          value={reputationReward}
                          onChange={(e) => setReputationReward(parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Scheduled Release Date (Optional)</label>
                      <input
                        type="datetime-local"
                        className="w-full h-11 px-4 bg-secondary/20 border border-border rounded-xl text-[13px] outline-none focus:border-primary/50 transition-all"
                        value={activeFrom}
                        onChange={(e) => setActiveFrom(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Keywords / Tags</label>
                      <div className="flex gap-2">
                        <input
                          placeholder="e.g., Graph, Strings, Dijkstra..."
                          className="flex-1 h-11 px-4 bg-secondary/20 border border-border rounded-xl text-[13px] outline-none focus:border-primary/50 transition-all"
                          value={tagsInput}
                          onChange={(e) => setTagsInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                        />
                        <button type="button" onClick={addTag} className="h-11 w-11 bg-primary/10 border border-primary/25 rounded-xl flex items-center justify-center text-primary">
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tags.map(t => (
                            <span key={t} className="inline-flex items-center gap-1.5 h-6 px-2.5 bg-primary/10 border border-primary/25 rounded-md text-[10px] font-bold text-primary">
                              #{t}
                              <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive text-[11px]">✕</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Sector Constraints</label>
                      <input
                        placeholder="e.g., 1 ≤ N ≤ 10^5, Time Limit: 1.0s"
                        className="w-full h-11 px-4 bg-secondary/20 border border-border rounded-xl text-[13px] outline-none focus:border-primary/50 transition-all"
                        value={constraints}
                        onChange={(e) => setConstraints(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Problem Details */}
                <div className="space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary pb-1 border-b border-border/60 flex items-center gap-2">
                    <Code2 className="h-4 w-4" /> Challenge Description & Brief
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Problem Statement *</label>
                    <textarea
                      required
                      placeholder="Input problem description in detail, specifying required runtime, input stream format, and outputs..."
                      className="w-full px-4 py-3 bg-secondary/20 border border-border rounded-xl text-[13px] outline-none focus:border-primary/50 min-h-[120px] resize-none"
                      value={problemStatement}
                      onChange={(e) => setProblemStatement(e.target.value)}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Example Input</label>
                      <textarea
                        placeholder="Sample input structure..."
                        className="w-full px-4 py-3 bg-secondary/20 border border-border rounded-xl text-[12px] font-mono outline-none focus:border-primary/50 min-h-[80px]"
                        value={exampleInput}
                        onChange={(e) => setExampleInput(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Example Output</label>
                      <textarea
                        placeholder="Sample expected output..."
                        className="w-full px-4 py-3 bg-secondary/20 border border-border rounded-xl text-[12px] font-mono outline-none focus:border-primary/50 min-h-[80px]"
                        value={exampleOutput}
                        onChange={(e) => setExampleOutput(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Smart Test Cases */}
                <div className="space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary pb-1 border-b border-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Unit Test Cases ({testCases.length})</div>
                    <button type="button" onClick={addTestCase} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add Case
                    </button>
                  </div>

                  {testCases.length === 0 ? (
                    <div className="py-6 text-center bg-secondary/5 rounded-xl border border-dashed border-border/60">
                      <p className="text-[11.5px] text-muted-foreground/40 font-mono">No hidden test cases configured. Only the example cases will run.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {testCases.map((tc, idx) => (
                        <div key={idx} className="p-4 bg-secondary/10 border border-border/60 rounded-xl space-y-3 relative">
                          <button
                            type="button"
                            onClick={() => removeTestCase(idx)}
                            className="absolute top-4 right-4 text-[10px] text-destructive font-black hover:underline"
                          >
                            Purge Case
                          </button>
                          
                          <div className="text-[11px] font-black text-primary uppercase tracking-widest">Unit Test Case #{idx + 1}</div>

                          <div className="grid md:grid-cols-2 gap-4 pt-1">
                            <div className="space-y-1.5">
                              <label className="text-[9px] uppercase font-black text-muted-foreground/60 tracking-widest">Input Stream</label>
                              <textarea
                                required
                                placeholder="Raw test input..."
                                className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-lg text-[11px] font-mono min-h-[50px]"
                                value={tc.input}
                                onChange={(e) => updateTestCase(idx, "input", e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] uppercase font-black text-muted-foreground/60 tracking-widest">Expected Output</label>
                              <textarea
                                required
                                placeholder="Expected raw output..."
                                className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-lg text-[11px] font-mono min-h-[50px]"
                                value={tc.output}
                                onChange={(e) => updateTestCase(idx, "output", e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`hide-${idx}`}
                              checked={tc.isHidden}
                              onChange={(e) => updateTestCase(idx, "isHidden", e.target.checked)}
                              className="rounded border-border text-primary focus:ring-primary/20 h-3.5 w-3.5"
                            />
                            <label htmlFor={`hide-${idx}`} className="text-[10px] font-black uppercase text-muted-foreground tracking-widest cursor-pointer select-none">
                              Hide test case from solvers in local logs
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Submit footer */}
              <div className="px-6 py-4 bg-secondary/15 border-t border-border flex items-center justify-between">
                <button type="button" onClick={resetForm} className="h-10 px-5 border border-border rounded-xl text-[11px] font-bold uppercase hover:bg-secondary transition-all">
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="h-10 px-6 bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-widest rounded-xl flex items-center gap-1.5 hover:brightness-110 shadow-lg shadow-primary/20 transition-all disabled:opacity-60"
                >
                  <Save className="h-4 w-4" /> {editingId ? "Recompile Spec" : "Deploy Specs"}
                </button>
              </div>
            </form>
          )}

          {/* ── ANALYTICS TAB ── */}
          {tab === "analytics" && (
            <div className="space-y-6">
              {/* Back to catalog header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <button
                  type="button"
                  onClick={() => { setTab("list"); setViewingAnalyticsId(null); }}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-primary transition-all uppercase tracking-widest"
                >
                  ← Back to list
                </button>
                <div className="text-[12px] font-mono text-muted-foreground">
                  Challenge ID: <span className="font-bold text-foreground">#{viewingAnalyticsId?.slice(-6).toUpperCase()}</span>
                </div>
              </div>

              {isLoadingAnalytics || !analyticsData ? (
                <div className="py-20 flex flex-col items-center gap-3">
                  <div className="h-10 w-10 border-2 border-primary/20 border-t-primary animate-spin rounded-full" />
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">Compiling metrics...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary title */}
                  <div>
                    <h3 className="text-[20px] font-black text-foreground tracking-tight flex items-center gap-2">
                      <Code2 className="h-5 w-5 text-primary" />
                      {analyticsData.challenge.title}
                    </h3>
                    <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-xl">
                      Detailed telemetry analytics, submission outcomes, and language stats for the target sandbox environment.
                    </p>
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      { label: "Total Submissions", value: analyticsData.stats.totalSubmissions, color: "text-primary", bg: "bg-primary/5 border-primary/10" },
                      { label: "Successful Solves", value: analyticsData.stats.acceptedCount, color: "text-success", bg: "bg-success/5 border-success/10" },
                      { label: "Acceptance Rate", value: `${analyticsData.stats.acceptanceRate}%`, color: "text-warning", bg: "bg-warning/5 border-warning/10" },
                      { label: "Avg Execution Time", value: `${analyticsData.stats.avgRuntime}ms`, color: "text-info", bg: "bg-info/5 border-info/10" },
                      { label: "Avg Memory Util", value: `${(analyticsData.stats.avgMemory / 1024).toFixed(1)}MB`, color: "text-danger", bg: "bg-danger/5 border-danger/10" }
                    ].map((s, idx) => (
                      <Surface key={idx} className={cn("p-5 flex flex-col justify-between border-border/80", s.bg)}>
                        <div className="text-[28px] font-mono font-black tracking-tight leading-none text-foreground">{s.value}</div>
                        <div className={cn("text-[9px] uppercase font-black tracking-widest mt-2.5", s.color)}>{s.label}</div>
                      </Surface>
                    ))}
                  </div>

                  {/* Languages Stats and Challenge specs split */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left col: Languages breakdown */}
                    <div className="lg:col-span-1 space-y-4">
                      <Surface className="p-5 border-border/80 bg-secondary/5 space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary pb-1.5 border-b border-border/40">
                          Languages Breakdown
                        </div>
                        <div className="space-y-4">
                          {["JavaScript", "Python", "C++", "C"].map((lang) => {
                            const total = analyticsData.stats.languages[lang] || 0;
                            const accepted = analyticsData.stats.acceptedLanguages[lang] || 0;
                            const totalRuns = analyticsData.stats.totalSubmissions || 1;
                            const share = Math.round((total / totalRuns) * 100);
                            
                            return (
                              <div key={lang} className="space-y-1.5">
                                <div className="flex items-center justify-between text-[11.5px] font-mono">
                                  <span className="font-bold text-foreground">{lang}</span>
                                  <span className="text-muted-foreground text-[10.5px]">
                                    {accepted} Solves / {total} Attempts ({share}%)
                                  </span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                                  <div 
                                    className="h-full bg-success transition-all" 
                                    style={{ width: `${total > 0 ? (accepted / total) * 100 : 0}%` }}
                                    title="Solve rate"
                                  />
                                  <div 
                                    className="h-full bg-warning/50 transition-all" 
                                    style={{ width: `${total > 0 ? ((total - accepted) / total) * 100 : 0}%` }}
                                    title="Fail rate"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Surface>
                    </div>

                    {/* Right col: Challenge Submissions Log table */}
                    <div className="lg:col-span-2 space-y-4">
                      <Surface className="overflow-hidden border-border/80 bg-secondary/5 flex flex-col h-full">
                        <div className="p-5 pb-3 border-b border-border/40 flex items-center justify-between">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                            Sandbox Submissions Log
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Last {analyticsData.submissions.length} updates
                          </span>
                        </div>

                        <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[350px] custom-scrollbar">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-secondary/20 text-[9px] uppercase tracking-[0.15em] text-muted-foreground border-b border-border/40 sticky top-0 backdrop-blur z-10">
                              <tr>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Language</th>
                                <th className="px-4 py-3">Outcome</th>
                                <th className="px-4 py-3 text-center">Runtime</th>
                                <th className="px-4 py-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30 text-[12.5px]">
                              {analyticsData.submissions.map((sub: any) => (
                                <tr key={sub._id} className="hover:bg-secondary/10 transition-colors">
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <div className="h-6 w-6 rounded bg-secondary flex items-center justify-center text-[10px] font-mono font-bold shrink-0 overflow-hidden">
                                        {sub.user?.avatarUrl ? (
                                          <img src={sub.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                          (sub.user?.name?.[0] || 'OP').toUpperCase()
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-bold text-foreground leading-none truncate">{sub.user?.name || "Unknown"}</div>
                                        <div className="text-[9px] text-muted-foreground mt-0.5 leading-none">@{sub.user?.username || "operative"}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 font-mono text-[11.5px] text-muted-foreground">
                                    {sub.language}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={cn(
                                      "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                      sub.status === 'Accepted' ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                                    )}>
                                      {sub.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-center font-mono font-bold text-[11.5px] text-muted-foreground">
                                    {sub.runtime}ms
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setViewingSubmissionCode({
                                        code: sub.code,
                                        user: sub.user?.name || "Operative",
                                        language: sub.language,
                                        status: sub.status
                                      })}
                                      className="text-[10px] font-mono font-bold text-primary hover:underline"
                                    >
                                      Inspect Code
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {analyticsData.submissions.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic text-[11.5px]">
                                    No sandbox submissions registered.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </Surface>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ── CODE VIEWER POPUP MODAL ── */}
          {viewingSubmissionCode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingSubmissionCode(null)}>
              <div 
                className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-border bg-secondary/10 flex items-center justify-between shrink-0">
                  <div>
                    <h4 className="text-[14px] font-black text-foreground">
                      Submission Inspector - {viewingSubmissionCode.user}
                    </h4>
                    <p className="text-[10.5px] text-muted-foreground mt-0.5">
                      Language: <span className="font-mono text-primary font-bold">{viewingSubmissionCode.language}</span> | Verdict:{" "}
                      <span className={cn(
                        "font-black uppercase",
                        viewingSubmissionCode.status === 'Accepted' ? "text-success" : "text-destructive"
                      )}>
                        {viewingSubmissionCode.status}
                      </span>
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setViewingSubmissionCode(null)}
                    className="h-8 w-8 rounded-lg border border-border hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 p-6 overflow-y-auto bg-[#1e1e1e] font-mono text-[12.5px] leading-relaxed text-foreground select-text custom-scrollbar">
                  <pre className="whitespace-pre-wrap">{viewingSubmissionCode.code}</pre>
                </div>
                <div className="p-4 border-t border-border bg-secondary/5 flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(viewingSubmissionCode.code);
                      toast.success("Solution code copied to clipboard.");
                    }}
                    className="h-9 px-4 border border-border hover:bg-secondary text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all"
                  >
                    Copy Source Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingSubmissionCode(null)}
                    className="h-9 px-5 bg-foreground text-background font-black text-[11.5px] uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
                  >
                    Close Inspector
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </PageContent>
    </AdminLayout>
  );
}
