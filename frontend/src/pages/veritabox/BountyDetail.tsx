import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Pill, Stat } from "@/components/veritabox/UI";
import { 
  ArrowLeft, Loader2, Award, 
  Terminal, Zap, CheckCircle2,
  Cpu, Code2, Info, History,
  Plus, Calendar, User, ExternalLink,
  MessageSquare, Share2, AlertCircle,
  ShieldCheck, Clock, Check, X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bountiesApi, BountySubmission } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function BountyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [proof, setProof] = useState("");
  const [links, setLinks] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const { data: bounty, isLoading, error } = useQuery({
    queryKey: ["bounty", id],
    queryFn: () => bountiesApi.getById(id!),
    enabled: !!id,
  });

  const { data: submissions, isLoading: loadingSubmissions } = useQuery({
    queryKey: ["bounty-submissions", id],
    queryFn: () => bountiesApi.getSubmissions(id!),
    enabled: !!id && (user?.role === 'Admin' || user?.role === 'Founder' || bounty?.assignedTo?._id === user?._id),
  });

  const claimMutation = useMutation({
    mutationFn: () => bountiesApi.claim(id!),
    onSuccess: () => {
      toast.success("BOUNTY CLAIMED", {
        description: "Protocol initiated. You are now the primary operative for this mission.",
      });
      queryClient.invalidateQueries({ queryKey: ["bounty", id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const submitMutation = useMutation({
    mutationFn: () => bountiesApi.submit(id!, { 
      proofOfWork: proof, 
      links: links.split(",").map(l => l.trim()).filter(Boolean)
    }),
    onSuccess: () => {
      toast.success("PROOF SUBMITTED", {
        description: "Your work has been queued for administrative review.",
      });
      setProof("");
      setLinks("");
      queryClient.invalidateQueries({ queryKey: ["bounty", id] });
      queryClient.invalidateQueries({ queryKey: ["bounty-submissions", id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ subId, status }: { subId: string; status: 'Approved' | 'Rejected' }) => 
      bountiesApi.reviewSubmission(subId, status, adminNote),
    onSuccess: (_, variables) => {
      toast.success(`SUBMISSION ${variables.status.toUpperCase()}`, {
        description: variables.status === 'Approved' ? "Reputation awarded and bounty resolved." : "Operative notified of rejection.",
      });
      setAdminNote("");
      queryClient.invalidateQueries({ queryKey: ["bounty", id] });
      queryClient.invalidateQueries({ queryKey: ["bounty-submissions", id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <VeritaBoxLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </VeritaBoxLayout>
    );
  }

  if (error || !bounty) {
    return (
      <VeritaBoxLayout>
        <div className="mx-auto max-w-md py-20 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">BOUNTY REDACTED</h2>
          <p className="text-muted-foreground text-sm">The target objective is no longer active in the registry.</p>
          <Link to="/bounties" className="text-primary hover:underline">Return to Bounties</Link>
        </div>
      </VeritaBoxLayout>
    );
  }

  const isAssignedToMe = bounty.assignedTo?._id === user?._id;
  const isAdmin = user?.role === 'Admin' || user?.role === 'Founder';

  return (
    <VeritaBoxLayout>
      <PageContent>
        <Link to="/bounties" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-6 transition-all">
          <ArrowLeft className="h-3 w-3" /> Mission Board
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Mission Brief */}
            <Surface className="p-8 space-y-6">
                <div className="flex flex-wrap gap-2">
                    <Pill variant={bounty.status === 'Open' ? 'success' : bounty.status === 'Assigned' ? 'warning' : 'default'} className="h-6 font-bold uppercase tracking-widest text-[10px]">
                        {bounty.status}
                    </Pill>
                    <Pill variant="info" className="h-6 font-bold uppercase tracking-widest text-[10px]">{bounty.difficulty}</Pill>
                    {bounty.techStack?.map(t => (
                        <Pill key={t} className="h-6 font-bold uppercase tracking-widest text-[10px]">{t}</Pill>
                    ))}
                </div>
                <div className="prose dark:prose-invert max-w-none">
                    <p className="text-[15px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
                        {bounty.description}
                    </p>
                </div>
                
                <div className="pt-6 border-t border-border/50 flex flex-wrap gap-6 text-[12px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span>Issued By: <strong className="text-foreground">{bounty.createdBy?.name}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>Posted: {format(new Date(bounty.createdAt), "MMM dd, yyyy")}</span>
                    </div>
                </div>
            </Surface>

            {/* Claim / Submit Section */}
            {bounty.status === 'Open' && (
                <Surface className="p-8 border-success/20 bg-success/5 flex flex-col items-center text-center space-y-4">
                    <Zap className="h-10 w-10 text-success animate-pulse" />
                    <div className="space-y-1">
                        <h3 className="text-[18px] font-bold uppercase tracking-widest">Available Mission</h3>
                        <p className="text-[13px] text-muted-foreground">This bounty is open for enlistment. Claim it to begin the protocol.</p>
                    </div>
                    <button 
                        onClick={() => claimMutation.mutate()}
                        disabled={claimMutation.isPending}
                        className="h-12 px-10 bg-success text-white font-bold uppercase tracking-[0.2em] text-[12px] flex items-center gap-2 hover:brightness-110 transition-all rounded shadow-xl shadow-success/20"
                    >
                        {claimMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Claim Bounty</>}
                    </button>
                </Surface>
            )}

            {isAssignedToMe && bounty.status === 'Assigned' && (
                <Surface className="p-8 border-primary/20 bg-primary/5 space-y-6">
                    <div className="flex items-center gap-3 text-primary">
                        <Terminal className="h-6 w-6" />
                        <h3 className="text-[16px] font-bold uppercase tracking-widest">Submission Protocol</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Technical Summary / Proof of Work</label>
                            <Textarea 
                                value={proof}
                                onChange={(e) => setProof(e.target.value)}
                                placeholder="Describe your solution, implementation details, and how to verify it..."
                                className="min-h-[120px] bg-background/50 border-border focus:border-primary/50 text-[14px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">External Links (Comma-Separated URLs)</label>
                            <Input 
                                value={links}
                                onChange={(e) => setLinks(e.target.value)}
                                placeholder="GitHub PR, Repo URL, Hosted Demo Link..."
                                className="h-11 bg-background/50 border-border focus:border-primary/50"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button 
                                onClick={() => submitMutation.mutate()}
                                disabled={submitMutation.isPending || !proof.trim()}
                                className="h-11 px-8 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[11px] flex items-center gap-2 hover:brightness-110 transition-all rounded shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Proof"}
                            </button>
                        </div>
                    </div>
                </Surface>
            )}

            {/* Submissions Review (Admin) */}
            {(isAdmin || isAssignedToMe) && submissions && submissions.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-[14px] font-bold uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                        <History className="h-4 w-4 text-info" /> Submission History
                    </h3>
                    <div className="space-y-4">
                        {submissions.map((sub: BountySubmission) => (
                            <Surface key={sub._id} className={cn(
                                "p-6 space-y-4 border-l-4",
                                sub.status === 'Pending' ? "border-l-warning" : sub.status === 'Approved' ? "border-l-success" : "border-l-destructive"
                            )}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded bg-secondary border border-border flex items-center justify-center text-[10px] font-bold">
                                            {sub.userId?.name?.substring(0, 1)}
                                        </div>
                                        <div>
                                            <div className="text-[13px] font-bold">{sub.userId?.name}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase font-mono">{format(new Date(sub.createdAt), "MMM dd, yyyy · HH:mm")}</div>
                                        </div>
                                    </div>
                                    <Pill variant={sub.status === 'Pending' ? 'warning' : sub.status === 'Approved' ? 'success' : 'danger'} className="text-[9px] uppercase font-bold tracking-widest">
                                        {sub.status}
                                    </Pill>
                                </div>
                                <div className="p-4 bg-secondary/30 rounded border border-border/50 text-[13px] text-foreground/80 whitespace-pre-wrap font-mono">
                                    {sub.proofOfWork}
                                </div>
                                {sub.links && sub.links.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {sub.links.map((link, idx) => (
                                            <a 
                                                key={idx} 
                                                href={link.startsWith('http') ? link : `https://${link}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded text-[11px] text-primary hover:bg-primary/20 transition-all"
                                            >
                                                <ExternalLink className="h-3 w-3" /> Link {idx + 1}
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {sub.status === 'Pending' && isAdmin && (
                                    <div className="pt-4 border-t border-border/50 space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin Decision Note</label>
                                            <Input 
                                                value={adminNote}
                                                onChange={(e) => setAdminNote(e.target.value)}
                                                placeholder="Reason for approval/rejection..."
                                                className="h-10 bg-background/50 border-border"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => reviewMutation.mutate({ subId: sub._id, status: 'Approved' })}
                                                disabled={reviewMutation.isPending}
                                                className="flex-1 h-10 bg-success text-white font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:brightness-110 rounded"
                                            >
                                                <Check className="h-3.5 w-3.5" /> Approve & Award
                                            </button>
                                            <button 
                                                onClick={() => reviewMutation.mutate({ subId: sub._id, status: 'Rejected' })}
                                                disabled={reviewMutation.isPending}
                                                className="flex-1 h-10 bg-destructive text-white font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:brightness-110 rounded"
                                            >
                                                <X className="h-3.5 w-3.5" /> Reject
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {sub.adminNote && (
                                    <div className="p-3 bg-secondary/50 rounded text-[11px] text-muted-foreground italic flex items-start gap-2">
                                        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                        Admin Note: {sub.adminNote}
                                    </div>
                                )}
                            </Surface>
                        ))}
                    </div>
                </div>
            )}
          </div>

          <div className="space-y-6">
              {/* Rewards */}
              <Surface className="p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                 <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-6">Mission Rewards</div>
                 <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Award className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-[24px] font-bold font-mono">{bounty.pointReward}</div>
                            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Reputation Credits</div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-[11px] font-bold uppercase text-muted-foreground">Completion Perks:</div>
                        <ul className="space-y-1.5">
                            <li className="text-[12px] flex items-center gap-2 text-foreground/70"><CheckCircle2 className="h-3 w-3 text-success" /> Achievement Badge</li>
                            <li className="text-[12px] flex items-center gap-2 text-foreground/70"><CheckCircle2 className="h-3 w-3 text-success" /> Profile Update</li>
                            <li className="text-[12px] flex items-center gap-2 text-foreground/70"><CheckCircle2 className="h-3 w-3 text-success" /> Mainnet Broadcast</li>
                        </ul>
                    </div>
                 </div>
              </Surface>

              {/* Status & Assignment */}
              <Surface className="p-6">
                 <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Operational Status</div>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[12px] text-muted-foreground">Status</span>
                        <Pill variant={bounty.status === 'Open' ? 'success' : 'warning'} className="text-[9px] uppercase">{bounty.status}</Pill>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[12px] text-muted-foreground">Difficulty</span>
                        <span className="text-[12px] font-bold">{bounty.difficulty}</span>
                    </div>
                    
                    {bounty.assignedTo && (
                        <div className="pt-4 border-t border-border/50">
                            <div className="text-[10px] font-bold uppercase text-muted-foreground mb-3">Primary Operative</div>
                            <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 border border-border/50">
                                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                    {bounty.assignedTo.name?.substring(0, 1)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12px] font-bold truncate">{bounty.assignedTo.name}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase">{bounty.assignedTo.role}</div>
                                </div>
                            </div>
                        </div>
                    )}
                 </div>
              </Surface>

              {/* Security Policy */}
              <Surface className="p-6 border-warning/30 bg-warning/5">
                <div className="flex items-center gap-2 text-warning font-bold text-[11px] uppercase mb-3">
                   <ShieldCheck className="h-3.5 w-3.5" /> Enlistment Rules
                </div>
                <ul className="space-y-2 text-[11px] text-muted-foreground leading-relaxed italic">
                   <li>• Only one operative can claim a bounty at a time.</li>
                   <li>• Submission proof must be verifiable via external links.</li>
                   <li>• High-quality solutions may award bonus reputation.</li>
                </ul>
              </Surface>
          </div>
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}

function Input({ className, ...props }: any) {
    return <input className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />;
}
