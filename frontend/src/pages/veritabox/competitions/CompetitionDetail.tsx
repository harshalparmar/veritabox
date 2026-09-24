import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { competitionsApi, resolveAssetUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import {
  Loader2, ArrowLeft, Trophy, Calendar, CheckCircle2, AlertCircle,
  FileText, Send, Users, Contact, Phone, Mail, Download, Lock,
  Copy, Check, UserCheck, UserX, DoorOpen, Shield, ShieldAlert,
  Crown, UserPlus, ClipboardList, Clock3, Globe
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CompetitionDetail() {
  const { slug } = useParams();
  const { user } = useAuth();

  const { data: comp, isLoading } = useQuery({
    queryKey: ['competition', slug],
    queryFn: () => competitionsApi.getBySlug(slug as string),
    enabled: !!slug
  });

  const { data: enrollment, isLoading: enrollLoading } = useQuery({
    queryKey: ['competition_enrollment', comp?._id],
    queryFn: () => competitionsApi.getEnrollment(comp._id),
    enabled: !!comp?._id && !!user
  });

  // Full squadron details (populated members with avatars)
  const { data: squadronDetails, isLoading: squadronLoading } = useQuery({
    queryKey: ['competition_squadron', comp?._id],
    queryFn: () => competitionsApi.getSquadronDetails(comp._id),
    enabled: !!comp?._id && !!user && enrollment?.isEnrolled && enrollment?.registration?.participationType === 'Squadron',
    retry: false
  });

  const Shell = user ? VeritaBoxLayout : PublicShell;

  if (isLoading || (user && enrollLoading)) return (
    <Shell>
      <div className="flex items-center justify-center h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </Shell>
  );

  if (!comp) return (
    <Shell>
      <div className="text-center py-24 text-muted-foreground">Competition not found or offline.</div>
    </Shell>
  );

  const isEnrolled = enrollment?.isEnrolled;
  const isRegistrationOpen = comp.currentPhase === 'Registration';

  return (
    <Shell>
      <PageContent className="max-w-5xl mx-auto py-8">
        <Link to="/competitions" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Arena
        </Link>

        {/* Header Section */}
        <div className="mb-8">
          <div className="h-64 w-full rounded-lg overflow-hidden relative mb-6 border border-border">
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent z-10"></div>
            <img src={resolveAssetUrl(comp.coverImage)} alt={comp.title} className="w-full h-full object-cover" />
            <div className="absolute bottom-6 left-6 z-20">
              <Pill variant="primary" className="mb-3 font-bold">{comp.currentPhase}</Pill>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white drop-shadow-md break-words pr-4">{comp.title}</h1>
            </div>
          </div>
          
          {/* Status Bar */}
          <Surface className="flex flex-wrap gap-6 p-4">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Registration Ends</div>
              <div className="font-mono text-sm flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{new Date(comp.registrationDeadline).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Abstract Selection</div>
              <div className="font-mono text-sm flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-muted-foreground" />{new Date(comp.abstractDeadline).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Offline Engagement</div>
              <div className="font-mono text-sm text-primary font-bold flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" />{new Date(comp.competitionDate).toLocaleDateString()}</div>
            </div>
          </Surface>

          {comp.externalUrl && (
            <div className="mt-4">
              <a
                href={comp.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold text-sm rounded hover:brightness-110 transition-all"
              >
                <Globe className="h-4 w-4" /> Go to External Platform
              </a>
            </div>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-12">
            {/* Overview Section */}
            <section id="overview" className="overflow-hidden">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">Overview</h2>
              <div className="prose dark:prose-invert prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none">
                <p className="whitespace-pre-wrap break-words">{comp.overview}</p>
              </div>
            </section>

            {/* Problem Statement Section */}
            <section id="problem" className="overflow-hidden">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">Problem Statement</h2>
              <div className="prose dark:prose-invert prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none mb-6">
                <p className="whitespace-pre-wrap break-words">{comp.problemStatement}</p>
              </div>
              {comp.problemStatementPdfUrl && (
                <a href={resolveAssetUrl(comp.problemStatementPdfUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-foreground hover:bg-secondary/80 font-bold text-sm rounded transition-colors">
                  <Download className="h-4 w-4" /> Download Detailed Problem Statement (PDF)
                </a>
              )}
            </section>

            {/* Abstract Submission Section */}
            <section id="abstract">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">Abstract Submission</h2>
              <AbstractTerminal comp={comp} enrollment={enrollment} user={user} />
            </section>

            {/* Contact Section */}
            <section id="contact">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Contact className="h-5 w-5 text-primary" /> Command Contacts</h2>
              {comp.contacts && comp.contacts.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {comp.contacts.filter((c: any) => c.name || c.email).map((contact: any, idx: number) => (
                    <Surface key={idx} className="p-4 border-border">
                      <div className="font-bold text-sm mb-2">{contact.name}</div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {contact.mobile}</div>
                        <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {contact.email}</div>
                      </div>
                    </Surface>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-4 bg-card/50 rounded border border-border">No contacts provided for this mission.</div>
              )}
            </section>
          </div>

          {/* Sidebar CTA Area */}
          <div>
            <div className="sticky top-6 space-y-4">
              {!user ? (
                <Surface className="p-6 text-center border-primary/20 bg-primary/5">
                  <Users className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">Authentication Required</h3>
                  <p className="text-xs text-muted-foreground mb-6">You must be logged into the VeritaBox Network to enroll in this competition or view abstract payloads.</p>
                  <Link to="/auth" className="block w-full py-2.5 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[11px] rounded hover:brightness-110 transition-all">
                    Initialize Login
                  </Link>
                </Surface>
              ) : isEnrolled ? (
                <EnrolledDashboard
                  comp={comp}
                  enrollment={enrollment}
                  squadronDetails={squadronDetails}
                  squadronLoading={squadronLoading}
                  user={user}
                />
              ) : (
                <EnrollmentFlow comp={comp} isOpen={isRegistrationOpen} />
              )}
            </div>
          </div>
        </div>
      </PageContent>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENROLLMENT FLOW
// ─────────────────────────────────────────────────────────────────────────────

function EnrollmentFlow({ comp, isOpen }: { comp: any, isOpen: boolean }) {
  const [mode, setMode] = useState<'select' | 'solo' | 'squad'>('select');
  const [squadName, setSquadName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const queryClient = useQueryClient();

  const enrollMutation = useMutation({
    mutationFn: (data: any) => competitionsApi.enroll(comp._id, data),
    onSuccess: () => {
      toast.success("Successfully enrolled in competition.");
      queryClient.invalidateQueries({ queryKey: ['competition_enrollment', comp._id] });
      queryClient.invalidateQueries({ queryKey: ['competition_squadron', comp._id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  if (!isOpen) {
    return (
      <Surface className="p-6 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-bold text-lg mb-2">Registration Closed</h3>
        <p className="text-xs text-muted-foreground">The enrollment phase for this competition has concluded.</p>
      </Surface>
    );
  }

  if (mode === 'select') {
    return (
      <Surface className="p-6 border-primary/20">
        <h3 className="font-bold text-xl mb-1">Initialize Enrollment</h3>
        <p className="text-xs text-muted-foreground mb-6">Select your operational capacity for this engagement.</p>
        
        <div className="space-y-3">
          <button onClick={() => {
            if(confirm("Confirm Solo Enrollment? You will participate as an individual operative.")) enrollMutation.mutate({ participationType: 'Individual' });
          }} disabled={enrollMutation.isPending} className="w-full text-left p-4 rounded border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group relative overflow-hidden">
            <div className="font-bold mb-1 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Operate Solo</div>
            <div className="text-xs text-muted-foreground">Participate as an individual operative.</div>
          </button>

          <button onClick={() => setMode('squad')} className="w-full text-left p-4 rounded border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group">
            <div className="font-bold mb-1 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Form Squadron</div>
            <div className="text-xs text-muted-foreground">Create or join a team of operatives (up to {comp?.maxSquadronSize || 10}).</div>
          </button>
        </div>
        {enrollMutation.isPending && <div className="mt-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
      </Surface>
    );
  }

  if (mode === 'squad') {
    return (
      <Surface className="p-6 border-primary/20">
        <button onClick={() => setMode('select')} className="text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground mb-4 block flex items-center gap-1"><ArrowLeft className="inline h-3 w-3" /> Back</button>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Squadron Command</h3>
        
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Create New Squadron</label>
            <div className="flex gap-2">
              <input value={squadName} onChange={e=>setSquadName(e.target.value)} placeholder="Squadron Name" className="flex-1 h-9 bg-card/50 border border-border px-3 text-xs rounded focus:outline-none focus:border-primary" />
              <button 
                disabled={enrollMutation.isPending || !squadName.trim()}
                onClick={() => enrollMutation.mutate({ participationType: 'Squadron', squadronName: squadName.trim() })}
                className="h-9 px-4 bg-primary text-primary-foreground font-bold text-[10px] uppercase rounded disabled:opacity-50 flex items-center gap-1"
              >{enrollMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}Create</button>
            </div>
          </div>
          
          <div className="relative text-center border-t border-border pt-4">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-card px-2 text-[10px] text-muted-foreground font-bold">OR</span>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block text-left">Join Existing Squadron</label>
            <div className="flex gap-2">
              <input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="JOIN CODE" className="flex-1 h-9 bg-card/50 border border-border px-3 text-xs rounded uppercase font-mono tracking-widest focus:outline-none focus:border-primary" maxLength={8} />
              <button 
                disabled={enrollMutation.isPending || !joinCode.trim()}
                onClick={() => enrollMutation.mutate({ participationType: 'Squadron', joinCode: joinCode.trim() })}
                className="h-9 px-4 bg-secondary text-foreground font-bold text-[10px] uppercase rounded border border-border hover:bg-border disabled:opacity-50 flex items-center gap-1"
              >{enrollMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Join'}</button>
            </div>
          </div>
        </div>
      </Surface>
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENROLLED DASHBOARD  
// ─────────────────────────────────────────────────────────────────────────────

function EnrolledDashboard({ comp, enrollment, squadronDetails, squadronLoading, user }: { comp: any, enrollment: any, squadronDetails: any, squadronLoading: boolean, user: any }) {
  const reg = enrollment.registration;
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState(false);

  // Proper ObjectId comparison — leaderId is a populated object or raw string
  const leaderId = squadronDetails?.leaderId?._id || squadronDetails?.leaderId;
  const isLeader = reg.participationType === 'Squadron' && leaderId?.toString() === user._id?.toString();

  const handleMemberAction = async (userId: string, action: 'accept' | 'reject') => {
    try {
      if (action === 'reject' && !confirm("Remove this member from the squadron?")) return;
      if (action === 'accept') {
        await competitionsApi.acceptSquadronMember(comp._id, userId);
        toast.success("Member approved and enlisted.");
      } else {
        await competitionsApi.rejectSquadronMember(comp._id, userId);
        toast.success("Member removed from squadron.");
      }
      queryClient.invalidateQueries({ queryKey: ['competition_enrollment', comp._id] });
      queryClient.invalidateQueries({ queryKey: ['competition_squadron', comp._id] });
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  const leaveMutation = useMutation({
    mutationFn: () => competitionsApi.leaveSquadron(comp._id),
    onSuccess: () => {
      toast.success("You have left the squadron.");
      queryClient.invalidateQueries({ queryKey: ['competition_enrollment', comp._id] });
      queryClient.invalidateQueries({ queryKey: ['competition_squadron', comp._id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || err.message)
  });

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success("Join code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const abstractStatus = reg.abstract?.status;
  const pendingCount = squadronDetails?.members?.filter((m: any) => m.status === 'Pending').length || 0;
  const acceptedCount = squadronDetails?.members?.filter((m: any) => m.status === 'Accepted').length || 0;

  return (
    <div className="space-y-4">
      {/* Enrollment Status Card */}
      <Surface className="p-5 border-success/30 bg-success/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-success font-bold text-xs uppercase tracking-widest">
            <CheckCircle2 className="h-4 w-4" /> Enrolled Active
          </div>
          {isLeader && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded">
              <Crown className="h-2.5 w-2.5" /> Leader
            </span>
          )}
        </div>
        
        <div className="space-y-2 font-mono text-sm">
          <div className="flex justify-between items-center border-b border-border/50 pb-2">
            <span className="text-muted-foreground text-xs">Type</span>
            <span className="text-right text-xs font-bold">{reg.participationType}</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/50 pb-2">
            <span className="text-muted-foreground text-xs">Abstract</span>
            <span className={cn("text-right text-xs font-bold", 
              abstractStatus === 'Selected' ? 'text-success' : 
              abstractStatus === 'Rejected' ? 'text-destructive' : 
              abstractStatus === 'Pending' ? 'text-warning' : 'text-muted-foreground'
            )}>
              {abstractStatus || 'Not Submitted'}
            </span>
          </div>
        </div>
      </Surface>

      {/* Squadron Panel */}
      {reg.participationType === 'Squadron' && (
        <Surface className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", isLeader ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}>
          {/* Squadron Header */}
          <div className="p-4 bg-secondary/30 border-b border-border">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Squadron
                </div>
                <div className="font-bold text-base">{squadronDetails?.name || reg.squadronId?.name || '—'}</div>
              </div>
              {pendingCount > 0 && isLeader && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-warning/10 text-warning border border-warning/20 px-2 py-1 rounded-full">
                  {pendingCount} Pending
                </span>
              )}
            </div>

            {/* Join Code */}
            {squadronDetails?.joinCode && (
              <div className="flex items-center gap-2 bg-card/60 border border-border rounded px-3 py-2">
                <div className="flex-1">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Join Code</div>
                  <div className="font-mono font-black text-sm tracking-widest text-warning">{squadronDetails.joinCode}</div>
                </div>
                <button
                  onClick={() => copyJoinCode(squadronDetails.joinCode)}
                  className="h-8 w-8 flex items-center justify-center rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy join code"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}

            {/* Quick Stats */}
            {squadronDetails && (
              <div className="flex gap-4 mt-3 text-[10px] uppercase font-bold text-muted-foreground">
                <span><span className="text-foreground font-black">{acceptedCount}</span> Accepted</span>
                {pendingCount > 0 && <span className="text-warning"><span className="font-black">{pendingCount}</span> Pending</span>}
                <span><span className="text-foreground font-black">{squadronDetails.members?.length || 0}</span>/{comp?.maxSquadronSize || 10} Total</span>
              </div>
            )}
          </div>

          {/* Member Roster */}
          <div className="p-4">
            {squadronLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : squadronDetails?.members && squadronDetails.members.length > 0 ? (
              <div className="space-y-2">
                <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                  <ClipboardList className="h-3 w-3" /> Operative Roster
                </div>
                {squadronDetails.members.map((m: any) => {
                  const memberUser = m.userId;
                  const isThisLeader = memberUser?._id?.toString() === leaderId?.toString();
                  const isMe = memberUser?._id?.toString() === user._id?.toString();
                  const isPending = m.status === 'Pending';

                  return (
                    <div key={memberUser?._id || m._id} className={cn(
                      "flex items-center gap-3 p-2.5 rounded border transition-colors",
                      isPending ? "border-warning/20 bg-warning/5" : "border-border/50 bg-card/30"
                    )}>
                      {/* Avatar */}
                      <div className="h-8 w-8 rounded shrink-0 overflow-hidden bg-secondary border border-border flex items-center justify-center">
                        {memberUser?.avatarUrl ? (
                          <img src={resolveAssetUrl(memberUser.avatarUrl)} className="h-full w-full object-cover" alt={memberUser.name} />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">{memberUser?.name?.substring(0,1)?.toUpperCase()}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold truncate">{memberUser?.name || 'Unknown'}</span>
                          {isMe && <span className="text-[8px] font-black text-primary bg-primary/10 border border-primary/20 px-1 py-0.5 rounded uppercase tracking-wider">You</span>}
                          {isThisLeader && <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5"><Crown className="h-2 w-2" />Leader</span>}
                        </div>
                        <div className="text-[9px] text-muted-foreground">{memberUser?.reputationPoints || 0} rep</div>
                      </div>

                      {/* Status + Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isPending && (
                          <span className="text-[8px] font-black text-success uppercase tracking-wider">✓ Active</span>
                        )}
                        {isPending && (
                          <span className="text-[8px] font-black text-warning uppercase tracking-wider">Pending</span>
                        )}
                        {/* Leader can approve/remove non-self members */}
                        {isLeader && !isMe && (
                          <div className="flex items-center gap-1">
                            {isPending && (
                              <button
                                onClick={() => handleMemberAction(memberUser._id, 'accept')}
                                className="h-6 w-6 flex items-center justify-center rounded bg-success/10 text-success hover:bg-success/20 transition-colors"
                                title="Approve member"
                              >
                                <UserCheck className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleMemberAction(memberUser._id, 'reject')}
                              className="h-6 w-6 flex items-center justify-center rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                              title="Remove member"
                            >
                              <UserX className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-muted-foreground">Loading roster...</div>
            )}
          </div>

          {/* Governance */}
          {!isLeader && reg.participationType === 'Squadron' && (
            <div className="px-4 pb-4">
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to leave this squadron? You will be unenrolled from the competition.")) {
                    leaveMutation.mutate();
                  }
                }}
                disabled={leaveMutation.isPending}
                className="w-full flex items-center justify-center gap-2 h-9 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {leaveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <DoorOpen className="h-3.5 w-3.5" />}
                Leave Squadron
              </button>
            </div>
          )}
          {isLeader && (
            <div className="px-4 pb-4 flex items-center gap-1.5 text-[9px] text-muted-foreground">
              <ShieldAlert className="h-3 w-3 text-primary" />
              <span>As leader, contact an admin to dissolve this squadron.</span>
            </div>
          )}
        </Surface>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABSTRACT TERMINAL
// ─────────────────────────────────────────────────────────────────────────────

function AbstractTerminal({ comp, enrollment, user }: { comp: any, enrollment: any, user: any }) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const reg = enrollment?.registration;
  const isSquadron = reg?.participationType === 'Squadron';
  // leaderId is populated in enrollment response as ObjectId string
  const leaderId = reg?.squadronId?.leaderId;
  const isLeader = isSquadron && (leaderId?.toString() === user?._id?.toString() || leaderId === user?._id);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!pdfFile) throw new Error("A PDF document is required.");
      
      setIsUploading(true);
      const formData = new FormData();
      formData.append('document', pdfFile);
      let pdfUrl;
      try {
        const res = await competitionsApi.uploadDocument(formData);
        pdfUrl = res.filePath;
      } catch (error: any) {
        setIsUploading(false);
        throw new Error("Failed to upload PDF: " + error.message);
      }
      
      return competitionsApi.submitAbstract(comp._id, { content: '', pdfUrl });
    },
    onSuccess: () => {
      setIsUploading(false);
      toast.success("Abstract Payload Transmitted.");
      queryClient.invalidateQueries({ queryKey: ['competition_enrollment', comp._id] });
    },
    onError: (err: any) => {
      setIsUploading(false);
      toast.error(err.message);
    }
  });

  if (!user) {
    return <div className="py-6 text-center text-muted-foreground bg-secondary/20 rounded border border-border">Log in to view abstract requirements and submit your document.</div>;
  }

  if (!enrollment?.isEnrolled) {
    return <div className="py-6 text-center text-muted-foreground bg-secondary/20 rounded border border-border">You must enroll in the competition before accessing the Abstract Terminal.</div>;
  }

  if (reg.abstract) {
    return (
      <Surface className="p-6 bg-secondary/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm">Abstract Payload Submitted</h3>
          <Pill variant={reg.abstract.status === 'Selected' ? 'success' : reg.abstract.status === 'Rejected' ? 'destructive' : 'warning'}>
            Status: {reg.abstract.status}
          </Pill>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Your abstract document has been securely transmitted and is under review.</p>
        
        {reg.abstract.pdfUrl && (
          <a href={resolveAssetUrl(reg.abstract.pdfUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors border border-primary/20">
            <FileText className="h-4 w-4" /> View Submitted PDF Document
          </a>
        )}
      </Surface>
    );
  }

  if (comp.currentPhase !== 'AbstractSelection') {
    return (
      <Surface className="p-6 text-center">
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-bold text-lg mb-2">Phase Locked</h3>
        <p className="text-sm text-muted-foreground">The Abstract Submission terminal is only available during the Abstract Selection phase.</p>
      </Surface>
    );
  }

  if (isSquadron && !isLeader) {
    return (
      <Surface className="p-6 text-center border-warning/30 bg-warning/5">
        <Lock className="h-8 w-8 text-warning mx-auto mb-3" />
        <h3 className="font-bold text-lg mb-2 text-warning">Terminal Locked</h3>
        <p className="text-sm text-muted-foreground">Only the designated Squadron Leader can transmit the abstract payload.</p>
      </Surface>
    );
  }

  return (
    <Surface className="p-6 border-primary/20">
      <div className="mb-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2"><FileText className="h-4 w-4" /> Upload Abstract Document</h3>
          <p className="text-xs text-muted-foreground mt-1">Attach your team's abstract proposal in PDF format. This action is irreversible once transmitted.</p>
        </div>
        {comp.abstractTemplateDocUrl && (
          <a href={resolveAssetUrl(comp.abstractTemplateDocUrl)} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 font-bold text-[11px] uppercase tracking-widest rounded transition-colors">
            <Download className="h-3.5 w-3.5" /> Template (DOCX)
          </a>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors bg-secondary/20">
          <input 
            type="file" 
            accept=".pdf" 
            id="abstract-upload"
            onChange={(e) => setPdfFile(e.target.files ? e.target.files[0] : null)}
            className="hidden"
          />
          <label htmlFor="abstract-upload" className="cursor-pointer flex flex-col items-center">
            <Download className="h-8 w-8 text-muted-foreground mb-3" />
            <span className="text-sm font-bold block mb-1">{pdfFile ? pdfFile.name : "Click to select PDF document"}</span>
            <span className="text-xs text-muted-foreground block">Max size: 5MB</span>
          </label>
        </div>

        <button 
          onClick={() => {
            if(confirm("Finalize and transmit abstract payload? This cannot be undone.")) submitMutation.mutate();
          }}
          disabled={submitMutation.isPending || isUploading || !pdfFile}
          className="w-full h-12 bg-primary text-primary-foreground font-bold text-sm uppercase tracking-widest rounded hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitMutation.isPending || isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Transmit Payload</>}
        </button>
      </div>
    </Surface>
  );
}
