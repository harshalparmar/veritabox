import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Stat, Pill } from "@/components/VeritaBox/UI";
import { 
  Terminal, Shield, Zap, Target, Loader2, ArrowRight,
  GitBranch, Globe, Youtube, Cpu, FileText, CheckCircle2,
  AlertTriangle, Save
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function HackathonSubmission() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    repoUrl: "",
    demoUrl: "",
    techStack: "",
    videoUrl: ""
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isValidUrl = (val: string) => !val || /^https?:\/\/.+/.test(val);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!formData.title.trim()) errs.title = "Title is required";
    if (!formData.description.trim()) errs.description = "Description is required";
    if (!formData.repoUrl.trim()) errs.repoUrl = "Repository URL is required";
    else if (!isValidUrl(formData.repoUrl)) errs.repoUrl = "Must be a valid URL (https://...)";
    if (formData.demoUrl && !isValidUrl(formData.demoUrl)) errs.demoUrl = "Must be a valid URL (https://...)";
    if (formData.videoUrl && !isValidUrl(formData.videoUrl)) errs.videoUrl = "Must be a valid URL (https://...)";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData]);

  const { data: hackathon, isLoading: loadingHackathon } = useQuery({
    queryKey: ["hackathon-id", id],
    queryFn: () => hackathonsApi.getById(id!),
    enabled: !!id,
  });

  const { data: teamStatus, isLoading: loadingTeamStatus } = useQuery({
    queryKey: ["team-status", id],
    queryFn: () => hackathonsApi.getTeamStatus(id!),
    enabled: !!id && !!user,
    retry: false,
  });

  useEffect(() => {
    if (teamStatus?.projectSubmission) {
      setFormData({
        title: teamStatus.projectSubmission.title || "",
        description: teamStatus.projectSubmission.description || "",
        repoUrl: teamStatus.projectSubmission.repoUrl || "",
        demoUrl: teamStatus.projectSubmission.demoUrl || "",
        techStack: teamStatus.projectSubmission.techStack?.join(", ") || "",
        videoUrl: teamStatus.projectSubmission.videoUrl || ""
      });
    }
  }, [teamStatus]);

  const submitMutation = useMutation({
    mutationFn: (data: any) => hackathonsApi.submitProject(id!, data),
    onSuccess: () => {
      toast.success("MISSION PAYLOAD TRANSMITTED", {
        description: "Your project has been successfully archived in the matrix.",
      });
      queryClient.invalidateQueries({ queryKey: ["team-status", id] });
      navigate(`/hackathons/${id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    submitMutation.mutate({
      ...formData,
      techStack: formData.techStack.split(",").map(s => s.trim()).filter(Boolean)
    });
  };

  const isLoading = loadingHackathon || loadingTeamStatus;
  const normalizeId = (val: any): string => (val && typeof val === 'object' ? val._id?.toString() : val?.toString()) ?? '';
  const isActiveLeader = normalizeId(teamStatus?.leader) === normalizeId(user?._id);
  const isSubmitted = !!teamStatus?.projectSubmission?.submittedAt;

  if (isLoading) {
    return (
      <VeritaBoxLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </VeritaBoxLayout>
    );
  }

  if (!teamStatus) {
    return (
      <VeritaBoxLayout>
        <div className="mx-auto max-w-md py-20 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">UNAUTHORIZED UPLINK</h2>
          <p className="text-muted-foreground text-sm">You must be part of a squadron to submit a project for this mission.</p>
          <Link to={`/hackathons/${id}/register`} className="text-primary hover:underline">Go to Enlistment</Link>
        </div>
      </VeritaBoxLayout>
    );
  }

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Surface className="p-8 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Target className="h-40 w-40 text-primary" />
                </div>

                {!isActiveLeader && (
                    <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg flex gap-3 text-[13px] text-warning mb-6">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div>
                            <p className="font-bold uppercase tracking-tight">OBSERVATION MODE ACTIVE</p>
                            <p className="opacity-80">Only the Squadron Leader can transmit the final mission payload. You can view the current draft below.</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2 sm:col-span-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground ml-1 flex items-center gap-2">
                                <Terminal className="h-3 w-3" /> Project Designation (Title) *
                            </label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                disabled={!isActiveLeader}
                                className={`h-11 bg-secondary/40 border-border focus:border-primary/50 text-lg font-bold ${fieldErrors.title ? 'border-destructive' : ''}`}
                                placeholder="THE_ULTIMATE_SOLVER"
                            />
                            {fieldErrors.title && <p className="text-[11px] text-destructive ml-1">{fieldErrors.title}</p>}
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground ml-1 flex items-center gap-2">
                                <FileText className="h-3 w-3" /> Technical Brief (Description) *
                            </label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                disabled={!isActiveLeader}
                                className={`min-h-[150px] bg-secondary/40 border-border focus:border-primary/50 resize-none text-[14px] ${fieldErrors.description ? 'border-destructive' : ''}`}
                                placeholder="Detailed operational summary of your build..."
                            />
                            {fieldErrors.description && <p className="text-[11px] text-destructive ml-1">{fieldErrors.description}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground ml-1 flex items-center gap-2">
                                <GitBranch className="h-3 w-3" /> Repository Link *
                            </label>
                            <Input
                                value={formData.repoUrl}
                                onChange={(e) => setFormData(prev => ({ ...prev, repoUrl: e.target.value }))}
                                disabled={!isActiveLeader}
                                className={`h-11 bg-secondary/40 border-border focus:border-primary/50 font-mono text-[13px] ${fieldErrors.repoUrl ? 'border-destructive' : ''}`}
                                placeholder="https://github.com/..."
                            />
                            {fieldErrors.repoUrl && <p className="text-[11px] text-destructive ml-1">{fieldErrors.repoUrl}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground ml-1 flex items-center gap-2">
                                <Globe className="h-3 w-3" /> Live Demo URL
                            </label>
                            <Input
                                value={formData.demoUrl}
                                onChange={(e) => setFormData(prev => ({ ...prev, demoUrl: e.target.value }))}
                                disabled={!isActiveLeader}
                                className={`h-11 bg-secondary/40 border-border focus:border-primary/50 font-mono text-[13px] ${fieldErrors.demoUrl ? 'border-destructive' : ''}`}
                                placeholder="https://..."
                            />
                            {fieldErrors.demoUrl && <p className="text-[11px] text-destructive ml-1">{fieldErrors.demoUrl}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground ml-1 flex items-center gap-2">
                                <Cpu className="h-3 w-3" /> Tech Stack (Comma separated)
                            </label>
                            <Input 
                                value={formData.techStack}
                                onChange={(e) => setFormData(prev => ({ ...prev, techStack: e.target.value }))}
                                disabled={!isActiveLeader}
                                className="h-11 bg-secondary/40 border-border focus:border-primary/50"
                                placeholder="React, Node, Arduino, etc."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground ml-1 flex items-center gap-2">
                                <Youtube className="h-3 w-3" /> Video Demo Link
                            </label>
                            <Input
                                value={formData.videoUrl}
                                onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                                disabled={!isActiveLeader}
                                className={`h-11 bg-secondary/40 border-border focus:border-primary/50 font-mono text-[13px] ${fieldErrors.videoUrl ? 'border-destructive' : ''}`}
                                placeholder="https://youtube.com/watch?v=..."
                            />
                            {fieldErrors.videoUrl && <p className="text-[11px] text-destructive ml-1">{fieldErrors.videoUrl}</p>}
                        </div>
                    </div>

                    {isActiveLeader && (
                        <div className="pt-6 border-t border-border flex items-center justify-end gap-4">
                            <Link to={`/hackathons/${id}`}>
                                <button type="button" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Cancel</button>
                            </Link>
                            <button 
                                type="submit"
                                disabled={submitMutation.isPending}
                                className="h-12 px-8 bg-primary text-primary-foreground font-bold uppercase tracking-[0.2em] text-[12px] flex items-center gap-2 hover:brightness-110 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                            >
                                {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Transmit Payload</>}
                            </button>
                        </div>
                    )}
                </form>
            </Surface>
          </div>

          <div className="space-y-4">
              <Surface className="p-6 space-y-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border pb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5" /> Squadron Status
                    </div>
                    {isSubmitted && (
                        <div className="text-success flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Transmitted
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                    <div>
                        <div className="text-[11px] text-muted-foreground uppercase font-bold mb-1">Squadron Name</div>
                        <div className="text-lg font-mono font-bold text-primary">{teamStatus.teamName}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Personnel</div>
                            <div className="text-xl font-bold">{teamStatus.members.length} / 5</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Mission Score</div>
                            <div className="text-xl font-bold text-success">{teamStatus.score || 0}</div>
                        </div>
                    </div>
                </div>
              </Surface>

              <Surface className="p-6 border-info/30 bg-info/5">
                <div className="flex items-center gap-2 text-info font-bold text-[11px] uppercase mb-3">
                   <Zap className="h-3.5 w-3.5" /> Final Transmission
                </div>
                <div className="text-[12px] text-muted-foreground space-y-3 leading-relaxed italic">
                   <p>Your submission is the culmination of your technical mission. Ensure all links are public and the technical brief is comprehensive.</p>
                   <p>Once transmitted, the payload will be locked for review by HQ Command (Judges).</p>
                </div>
              </Surface>

              <div className="p-4 bg-secondary/20 rounded-lg border border-border">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Need Assistance?</div>
                <p className="text-[11px] text-muted-foreground mb-3 italic">Consult the Knowledge Base for documentation on submission protocols.</p>
                <Link to="/knowledge" className="text-[11px] text-primary hover:underline font-bold uppercase flex items-center gap-1">
                    Knowledge Base <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
          </div>
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
