import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/veritabox/UI";
import { useParams, Link } from "react-router-dom";
import { 
  Loader2, GitBranch, Terminal, 
  History, Zap, ArrowLeft, 
  Users, Calendar, ExternalLink,
  ChevronRight, BrainCircuit
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { usersApi, projectsApi } from "@/lib/api";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ProfileProjects() {
  const { username } = useParams();
  
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => usersApi.getProfile(username!),
    enabled: !!username,
  });

  // Fetch projects associated with this user's teams
  // For now, we'll assume the profile object includes a 'projects' array populated by the backend
  const projects = (profile as any)?.projects || [];

  if (loadingProfile) {
    return (
      <VeritaBoxLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
        </div>
      </VeritaBoxLayout>
    );
  }

  if (!profile) return null;

  return (
    <VeritaBoxLayout>
      <PageContent>
        <Link to={`/profile/${username}`} className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-6 transition-all">
          <ArrowLeft className="h-3 w-3" /> Operative Identity
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Summary Stats */}
            <div className="lg:col-span-1 space-y-6">
                <Surface className="p-6 space-y-6 bg-primary/5 border-primary/20">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Mission Intel</div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] text-muted-foreground">Total Projects</span>
                            <span className="text-[14px] font-bold font-mono">{projects.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] text-muted-foreground">Active Squadrons</span>
                            <span className="text-[14px] font-bold font-mono">3</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] text-muted-foreground">Total Commits</span>
                            <span className="text-[14px] font-bold font-mono">142</span>
                        </div>
                    </div>
                </Surface>

                <Surface className="p-6">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Tech Stack Matrix</div>
                    <div className="flex flex-wrap gap-2">
                        {["ROS2", "OpenCV", "SolidWorks", "React", "Node.js", "C++", "Python", "Lidar"].map(t => (
                            <Pill key={t} className="h-6 text-[10px] bg-secondary/50 border-border/50">#{t}</Pill>
                        ))}
                    </div>
                </Surface>
            </div>

            {/* Right: Project List */}
            <div className="lg:col-span-2 space-y-4">
                {projects.length === 0 ? (
                    <div className="py-20 text-center space-y-4 border-2 border-dashed border-border rounded-3xl opacity-50">
                        <BrainCircuit className="h-12 w-12 mx-auto text-muted-foreground/30" />
                        <p className="text-[14px] italic">No missions recorded in the global registry yet.</p>
                    </div>
                ) : (
                    projects.map((p: any) => (
                        <Surface key={p._id} className="p-0 overflow-hidden group hover:border-primary/30 transition-all">
                            <div className="p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-[18px] font-bold group-hover:text-primary transition-colors">{p.title}</h3>
                                            <Pill variant="success" className="h-4 text-[8px] uppercase">{p.status}</Pill>
                                        </div>
                                        <div className="text-[12px] text-muted-foreground flex items-center gap-4">
                                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {p.associatedTeam?.teamName || "Standalone"}</span>
                                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Established {format(new Date(p.createdAt), "MMM yyyy")}</span>
                                        </div>
                                    </div>
                                    <Link to={`/lab/${p._id}`}>
                                        <button className="h-8 w-8 rounded-lg bg-secondary border border-border flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </Link>
                                </div>
                                
                                <p className="text-[14px] text-muted-foreground line-clamp-2 leading-relaxed">
                                    {p.description || "Experimental engineering project focused on hardware-software integration and neural mapping."}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                                    <div className="flex gap-2">
                                        {p.techStack?.slice(0, 3).map((t: string) => (
                                            <Pill key={t} className="text-[9px] bg-secondary/30">#{t}</Pill>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-[12px] font-bold">{p.progressMatrix?.length || 0}</div>
                                            <div className="text-[8px] text-muted-foreground uppercase font-bold">Build Logs</div>
                                        </div>
                                        <div className="h-8 w-px bg-border/50" />
                                        <div className="text-right">
                                            <div className="text-[12px] font-bold">12</div>
                                            <div className="text-[8px] text-muted-foreground uppercase font-bold">Deployments</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Visual Pulse Bar */}
                            <div className="h-1 w-full bg-secondary relative overflow-hidden">
                                <div className="absolute inset-y-0 left-0 bg-primary/40 w-2/3" />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                            </div>
                        </Surface>
                    ))
                )}
            </div>
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
