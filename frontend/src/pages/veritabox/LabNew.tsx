import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Stat, Pill } from "@/components/veritabox/UI";
import { 
  Rocket, ArrowLeft, Loader2, 
  Terminal, Zap, CheckCircle2,
  Cpu, Code2, Layers, Info, ShieldCheck, Globe, LockKeyhole
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, hackathonsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function LabNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    tagline: "",
    description: "",
    associatedTeam: "",
    techStack: [] as string[],
    isPublic: false
  });

  const [tagInput, setTagInput] = useState("");

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ["my-teams"],
    queryFn: () => hackathonsApi.getTeamsMe(),
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: () => projectsApi.create(formData),
    onSuccess: (data) => {
      toast.success("PROJECT INITIALIZED", {
        description: data.isPublic
          ? "Your project is now visible on the Mainnet."
          : "Your project is private to your squadron.",
      });
      queryClient.invalidateQueries({ queryKey: ["projects-mainnet"] });
      navigate(`/lab/${data._id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.techStack.includes(tagInput.trim())) {
        setFormData(prev => ({ ...prev, techStack: [...prev.techStack, tagInput.trim()] }));
      }
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, techStack: prev.techStack.filter(t => t !== tag) }));
  };

  return (
    <VeritaBoxLayout>
      <PageContent>
        <Link to="/lab" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-6 transition-all">
          <ArrowLeft className="h-3 w-3" /> Back to Lab
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Surface className="p-8 space-y-8">
               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground ml-1 flex items-center gap-2">
                        <Terminal className="h-3 w-3" /> Mission Title
                    </label>
                    <Input 
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Autonomous Reconnaissance Rover"
                        className="h-12 bg-secondary/40 border-border focus:border-primary/50 text-[16px] font-bold"
                    />
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="ml-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                      Project visibility
                    </legend>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Project visibility">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={formData.isPublic}
                        onClick={() => setFormData(prev => ({ ...prev, isPublic: true }))}
                        className={`flex min-w-0 items-start gap-3 border p-3 text-left transition-colors ${formData.isPublic ? "border-foreground bg-secondary/70" : "border-border hover:bg-secondary/40"}`}
                      >
                        <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-[12px] font-semibold">Public</span>
                          <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">Visible in Circuit Lab to everyone.</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={!formData.isPublic}
                        onClick={() => setFormData(prev => ({ ...prev, isPublic: false }))}
                        className={`flex min-w-0 items-start gap-3 border p-3 text-left transition-colors ${!formData.isPublic ? "border-foreground bg-secondary/70" : "border-border hover:bg-secondary/40"}`}
                      >
                        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-[12px] font-semibold">Private</span>
                          <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">Only squadron members can view it.</span>
                        </span>
                      </button>
                    </div>
                  </fieldset>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground ml-1 flex items-center gap-2">
                        <Zap className="h-3 w-3" /> Tactical Tagline
                    </label>
                    <Input 
                        value={formData.tagline}
                        onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                        placeholder="A short, high-impact summary of the build goal"
                        className="h-11 bg-secondary/40 border-border focus:border-primary/50 text-[14px]"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground ml-1 flex items-center gap-2">
                            <Layers className="h-3 w-3" /> Assigned Squadron
                        </label>
                        <select 
                            value={formData.associatedTeam}
                            onChange={(e) => setFormData(prev => ({ ...prev, associatedTeam: e.target.value }))}
                            className="w-full h-11 bg-secondary/40 border border-border rounded-md px-3 text-sm outline-none focus:border-primary/50"
                        >
                            <option value="">Select Squadron...</option>
                            {teams?.map(t => (
                                <option key={t._id} value={t._id}>{t.teamName}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-muted-foreground italic pl-1">Projects must be tied to a verified squadron.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground ml-1 flex items-center gap-2">
                            <Code2 className="h-3 w-3" /> Tech Stack Matrix
                        </label>
                        <div className="space-y-2">
                            <Input 
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={addTag}
                                placeholder="Add tag (Press Enter)..."
                                className="h-11 bg-secondary/40 border-border focus:border-primary/50 text-[13px]"
                            />
                            <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                                {formData.techStack.map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => removeTag(t)}
                                        className="h-6 px-2 bg-primary/10 border border-primary/30 rounded text-[10px] font-bold text-primary flex items-center gap-1.5 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all"
                                    >
                                        {t} &times;
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground ml-1 flex items-center gap-2">
                        <Info className="h-3 w-3" /> Project Briefing
                    </label>
                    <Textarea 
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Detailed technical specifications and mission objectives..."
                        className="min-h-[150px] bg-secondary/40 border-border focus:border-primary/50 resize-none text-[14px] leading-relaxed"
                    />
                  </div>
               </div>

               <div className="pt-6 border-t border-border flex items-center justify-end gap-4">
                  <Link to="/lab">
                    <button type="button" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Cancel</button>
                  </Link>
                  <button 
                    onClick={() => mutation.mutate()}
                    disabled={mutation.isPending || !formData.title || !formData.associatedTeam || !formData.description}
                    className="h-12 px-8 bg-foreground text-background font-bold uppercase tracking-[0.2em] text-[12px] flex items-center gap-2 hover:brightness-110 transition-all shadow-xl shadow-foreground/10 disabled:opacity-50"
                  >
                    {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Initialize Matrix</>}
                  </button>
               </div>
            </Surface>
          </div>

          <div className="space-y-4">
              <Surface className="p-6 space-y-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border pb-3 flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5" /> Lab Guidelines
                </div>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                       <div className="h-6 w-6 rounded-full bg-warning/10 flex items-center justify-center text-warning text-[10px] font-bold shrink-0">1</div>
                       <p className="text-[12px] text-muted-foreground leading-snug">Project logs are persistent. Ensure technical accuracy.</p>
                    </div>
                    <div className="flex items-start gap-3">
                       <div className="h-6 w-6 rounded-full bg-warning/10 flex items-center justify-center text-warning text-[10px] font-bold shrink-0">2</div>
                       <p className="text-[12px] text-muted-foreground leading-snug">Attach build logs frequently to increase project pulse.</p>
                    </div>
                    <div className="flex items-start gap-3">
                       <div className="h-6 w-6 rounded-full bg-warning/10 flex items-center justify-center text-warning text-[10px] font-bold shrink-0">3</div>
                       <p className="text-[12px] text-muted-foreground leading-snug">Only squadron members can submit updates to this log.</p>
                    </div>
                </div>
              </Surface>


              <div className="p-8 bg-card border border-border rounded-xl flex flex-col items-center justify-center text-center space-y-4 opacity-50 grayscale transition-all hover:grayscale-0 hover:opacity-100 cursor-help">
                 <div className="h-20 w-20 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center">
                    <Rocket className="h-10 w-10 text-muted-foreground" />
                 </div>
                 <div className="space-y-1">
                    <div className="text-[13px] font-bold uppercase tracking-widest">Awaiting Pulse</div>
                    <div className="text-[11px] text-muted-foreground">Complete the form to engage deployment.</div>
                 </div>
              </div>
          </div>
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
