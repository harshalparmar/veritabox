import React from "react";
import { PublicShell } from "@/components/VeritaBox/PublicShell";
import { PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Pill, Stat } from "@/components/VeritaBox/UI";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  MapPin, GitBranch, Github, Linkedin, Globe, Award, 
  Loader2, Package, Users, MessageSquare, 
  TrendingUp, Calendar, Zap, Sparkles, BrainCircuit,
  Settings, History, ChevronRight, Plus, ExternalLink,
  Building2, GraduationCap, QrCode, Mail, Star, MessageCircle,
  CircleDot, Clock, AlertTriangle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, activityApi, resolveAssetUrl } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formatSocialUrl = (url: string, platform: 'github' | 'linkedin' | 'portfolio') => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (platform === 'github') {
    return `https://github.com/${url.replace(/^@/, '')}`;
  }
  if (platform === 'linkedin') {
    return `https://linkedin.com/in/${url.replace(/^@/, '')}`;
  }
  return `https://${url}`;
};

export default function Profile() {
  const { username } = useParams(); // This is the ID or "me"
  const { profile: myProfile, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const isMe = !username || username === "me" || username === currentUser?._id;
  const targetId = isMe ? currentUser?._id : username;


  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile", targetId],
    queryFn: () => usersApi.getProfile(targetId!),
    enabled: !!targetId,
  });

  const { data: activityData } = useQuery({
    queryKey: ["activity", targetId],
    queryFn: () => activityApi.getPersonal(targetId!),
    enabled: !!targetId,
  });

  const forgeStats = React.useMemo(() => {
    const solved = profile?.forgeSolves || [];
    let rookie = 0;
    let operative = 0;
    let elite = 0;

    solved.forEach((sub: any) => {
      const difficulty = sub.challengeId?.difficulty || 'Operative';
      if (difficulty === 'Rookie') rookie++;
      else if (difficulty === 'Operative') operative++;
      else if (difficulty === 'Elite') elite++;
    });

    const totalSolved = solved.length;
    return { totalSolved, rookie, operative, elite };
  }, [profile?.forgeSolves]);

  const donutSegments = React.useMemo(() => {
    const { rookie, operative, elite, totalSolved } = forgeStats;
    if (totalSolved === 0) {
      return [];
    }

    const segments = [
      { name: 'Rookie', count: rookie, color: 'rgb(245 158 11)' },
      { name: 'Operative', count: operative, color: 'rgb(56 189 248)' },
      { name: 'Elite', count: elite, color: 'rgb(16 185 129)' }
    ];

    let currentOffset = 0;
    const r = 56;
    const circumference = 2 * Math.PI * r; // ~351.858

    return segments.map(seg => {
      const percentage = seg.count / totalSolved;
      const dashArray = `${percentage * circumference} ${circumference}`;
      const dashOffset = -currentOffset;
      currentOffset += percentage * circumference;
      return {
        ...seg,
        dashArray,
        dashOffset
      };
    });
  }, [forgeStats]);

  const getElapsedActiveTime = React.useCallback((createdAt: string) => {
    if (!createdAt) return "1h active";
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `${diffDays}d active`;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return `${diffHours}h active`;
  }, []);

  const activityBars = React.useMemo(() => {
    const today = new Date();
    const counts: Record<string, number> = {};
    
    const events = Array.isArray(activityData)
      ? activityData
      : ((activityData as any)?.events || []);

    events.forEach((ev: any) => {
      let dateStr = "";
      if (ev.date) {
        dateStr = ev.date;
      } else if (ev.timestamp || ev.createdAt) {
        const dVal = new Date(ev.timestamp || ev.createdAt);
        const year = dVal.getFullYear();
        const month = String(dVal.getMonth() + 1).padStart(2, '0');
        const day = String(dVal.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }
      if (dateStr) {
        counts[dateStr] = (counts[dateStr] || 0) + (ev.count || 1);
      }
    });

    const bars = [];
    let maxCount = 1;
    for (let i = 23; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const count = counts[dateStr] || 0;
      if (count > maxCount) maxCount = count;
      bars.push({ dateStr, count });
    }

    return bars.map(b => ({
      ...b,
      heightPercentage: Math.max(15, (b.count / maxCount) * 100)
    }));
  }, [activityData]);

  const connectMutation = useMutation({
    mutationFn: (type: 'Collaborator') => usersApi.requestConnection(profile?._id, type),
    onSuccess: () => {
      toast.success("Telemetry link request transmitted.");
      queryClient.invalidateQueries({ queryKey: ["network"] });
      queryClient.invalidateQueries({ queryKey: ["profile", targetId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const acceptMutation = useMutation({
    mutationFn: (requesterId: string) => usersApi.acceptConnection(requesterId),
    onSuccess: () => {
      toast.success("Telemetry link established successfully.");
      queryClient.invalidateQueries({ queryKey: ["network"] });
      queryClient.invalidateQueries({ queryKey: ["profile", targetId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to authorize connection."),
  });

  const { data: network } = useQuery({
    queryKey: ["network"],
    queryFn: () => usersApi.getNetwork(),
    enabled: !!currentUser && !isMe,
  });

  const incoming = network?.incoming || [];
  const outgoing = network?.outgoing || [];
  const active = network?.active || [];

  const isConnected = active.some((conn: any) => conn.user?._id === profile?._id);
  const isPendingOutgoing = outgoing.some((conn: any) => conn.user?._id === profile?._id);
  const isPendingIncoming = incoming.some((conn: any) => conn.user?._id === profile?._id);

  const handleMessageClick = () => {
    if (!currentUser) {
      toast.info("Please log in to message this user.");
      navigate("/auth");
      return;
    }
    if (isConnected) {
      navigate(`/messages?userId=${profile?._id}`);
      return;
    }
    if (isPendingOutgoing) {
      toast.info(`You must establish a connection link with ${name} first to start messaging.`);
      return;
    }
    if (isPendingIncoming) {
      toast.info(`Please authorize the connection request from ${name} first to start messaging.`);
      return;
    }
    toast.info(`You must connect with ${name} first to start messaging.`);
  };

  const handleConnectClick = () => {
    if (!currentUser) {
      toast.info("Please log in to connect with this user.");
      navigate("/auth");
      return;
    }
    if (isPendingIncoming) {
      acceptMutation.mutate(profile?._id);
      return;
    }
    if (!isConnected && !isPendingOutgoing) {
      connectMutation.mutate('Collaborator');
      return;
    }
  };

  if (isLoading) {
    return (
      <PublicShell>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PublicShell>
    );
  }

  if (error || !profile) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-[600px] px-6 py-24 text-center">
          <BrainCircuit className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-6" />
          <h2 className="text-[20px] font-bold uppercase tracking-widest text-muted-foreground">Operative not found.</h2>
          <p className="mt-2 text-muted-foreground/60 text-[13px]">Identity record missing or purged from the central registry.</p>
          <Link to="/leaderboard" className="mt-8 text-primary hover:underline text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2">
             <TrendingUp className="h-4 w-4" /> View Leaderboard
          </Link>
        </div>
      </PublicShell>
    );
  }

  const name = profile.name || "Operative";
  const bio = profile.bio || "No tactical brief provided.";
  const skillsList = profile.skills || [];
  const joinedDate = new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });



  return (
    <PublicShell>
      {/* Centered Main Profile Container (LinkedIn-style Layout) */}
      <div className="mx-auto max-w-5xl px-8 pt-6 pb-16">
        {/* Main Header Card */}
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-xs mb-6">
          {/* Cover Photo */}
          <div className="w-full h-[150px] sm:h-[180px] bg-secondary/30 relative overflow-hidden">
            {profile.coverPhotoUrl ? (
              <img src={resolveAssetUrl(profile.coverPhotoUrl)} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-primary via-transparent to-transparent" />
            )}
          </div>

          {/* Profile Details & Avatar Overlap - inside the card with padding */}
          <div className="px-6 pb-6 pt-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="-mt-12 sm:-mt-16 relative group shrink-0">
                  <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-card border-4 border-card shadow-2xl flex items-center justify-center text-3xl sm:text-[48px] font-bold text-primary overflow-hidden transition-transform group-hover:scale-[1.02]">
                    {profile.avatarUrl ? (
                      <img src={resolveAssetUrl(profile.avatarUrl)} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-primary">{name.substring(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                </div>

                <div className="pt-1.5 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground leading-none">{name}</h1>
                    {profile.isVerified && <Pill variant="success" className="scale-90">Verified</Pill>}
                  </div>
                  <div className="text-muted-foreground text-sm flex items-center gap-1.5 flex-wrap mt-1">
                    <span className="font-bold text-foreground">@{profile.username || profile.universityId?.split('@')[0]}</span>
                    <span>·</span>
                    <span>{profile.role || 'Operative'}</span>
                    {profile.chapter && (
                      <>
                        <span>·</span>
                        <Link to={`/chapters/${profile.chapter.slug}`} className="hover:text-primary transition-colors text-purple-500 font-medium">
                          {profile.chapter.name}
                        </Link>
                      </>
                    )}
                  </div>
                  
                  {/* Stats Telemetry Row */}
                  <div className="flex items-center gap-4 text-xs font-semibold mt-2.5 text-muted-foreground">
                    <span className="bg-secondary/40 px-2 py-0.5 rounded border border-border/30"><span className="font-mono text-foreground">{profile.reputationPoints?.toLocaleString() || 0}</span> Rep</span>
                    <span className="bg-secondary/40 px-2 py-0.5 rounded border border-border/30"><span className="font-mono text-foreground">{profile.forgeSolves?.length || 0}</span> Solves</span>
                    <span className="bg-secondary/40 px-2 py-0.5 rounded border border-border/30"><span className="font-mono text-foreground">{profile.hackathons?.length || 0}</span> Hackathons</span>
                    <span className="bg-secondary/40 px-2 py-0.5 rounded border border-border/30"><span className="font-mono text-foreground">{profile.knowledge?.length || 0}</span> Articles</span>
                  </div>

                  {/* Links Row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-muted-foreground text-xs mt-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> {profile.eduInstitutionName || "Global Operative"}
                    </span>
                    {profile.socialLinks?.github && (
                      <a 
                        href={formatSocialUrl(profile.socialLinks.github, 'github')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                      >
                        <Github className="h-3.5 w-3.5 text-muted-foreground" /> GitHub
                      </a>
                    )}
                    {profile.socialLinks?.linkedin && (
                      <a 
                        href={formatSocialUrl(profile.socialLinks.linkedin, 'linkedin')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                      >
                        <Linkedin className="h-3.5 w-3.5 text-muted-foreground" /> LinkedIn
                      </a>
                    )}
                    {profile.socialLinks?.portfolio && (
                      <a 
                        href={formatSocialUrl(profile.socialLinks.portfolio, 'portfolio')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                      >
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Portfolio <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Joined {joinedDate}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 md:pt-3">
                {!isMe && (
                  <>
                    <button 
                      type="button"
                      onClick={handleMessageClick}
                      className="relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background text-xs h-8 px-3 border-input bg-popover hover:bg-accent/50 text-foreground shadow-sm"
                    >
                      <MessageCircle className="h-4 w-4" /> Message
                    </button>

                    {currentUser && isConnected ? (
                      <button 
                        type="button"
                        disabled
                        className="relative inline-flex shrink-0 cursor-default items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium outline-none text-xs h-8 px-3 bg-secondary text-muted-foreground border-border"
                      >
                        Connected
                      </button>
                    ) : currentUser && isPendingOutgoing ? (
                      <button 
                        type="button"
                        disabled
                        className="relative inline-flex shrink-0 cursor-default items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium outline-none text-xs h-8 px-3 bg-secondary text-muted-foreground border-border"
                      >
                        Pending
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={handleConnectClick}
                        disabled={connectMutation.isPending || acceptMutation.isPending}
                        className="relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background text-xs h-8 px-3 border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                      >
                        {connectMutation.isPending || acceptMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : currentUser && isPendingIncoming ? (
                          "Authorize"
                        ) : (
                          <>
                            <Plus className="h-4 w-4" /> Connect
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Bio & Skills Section */}
            <div className="mt-5 pt-4 border-t border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <p className="max-w-prose text-foreground/85 text-sm leading-relaxed italic">
                "{bio}"
              </p>
              {skillsList.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 shrink-0 md:justify-end">
                  {skillsList.map((skill: string, idx: number) => {
                    const colorClasses = [
                      "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
                      "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
                      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
                      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
                      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
                    ];
                    const colorClass = colorClasses[idx % colorClasses.length];
                    return (
                      <span key={skill} className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] border", colorClass)}>
                        {skill}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        
        
        {/* ===================== CONTENT AREA ===================== */}
        <div className="mt-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Row 1 */}
            <div className="lg:col-span-2">
              {/* CodeForge Analytics */}<Surface className="p-6 bg-background/40 h-full flex flex-col">
                  <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-center">
                    {/* Left Column: Donut Chart / CodeForge Solves Breakdown */}
                    <div className="flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">Forge Status</span>
                          {profile.forgeRank && (
                            <span className={cn(
                              "font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border font-bold tracking-wider",
                              profile.forgeRank === 'Unranked'
                                ? "bg-secondary text-muted-foreground/50 border-border/40"
                                : "bg-warning/10 text-warning border-warning/30"
                            )}>
                              {profile.forgeRank === 'Unranked' ? 'Unranked' : `Rank ${profile.forgeRank}`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="font-heading text-4xl font-bold tracking-tight text-foreground">
                            {forgeStats.totalSolved}
                            {profile.forgeTotals && (
                              <span className="text-2xl text-muted-foreground/50 font-normal">
                                /{profile.forgeTotals.total}
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-muted-foreground text-[10px] uppercase">
                            solved
                          </span>
                        </div>
                        
                        {/* Donut Chart */}
                        <div className="flex items-center justify-center py-2">
                          <svg viewBox="-72 -72 144 144" className="size-28 -rotate-90">
                            {/* Background circle */}
                            <circle r="56" fill="none" stroke="currentColor" className="text-border/30" strokeWidth="14" />
                            {forgeStats.totalSolved === 0 ? (
                              <circle r="56" fill="none" stroke="currentColor" className="text-border/30" strokeWidth="14" />
                            ) : (
                              donutSegments.map((seg, idx) => (
                                <circle 
                                  key={idx}
                                  r="56" 
                                  fill="none" 
                                  stroke={seg.color} 
                                  strokeWidth="14" 
                                  strokeDasharray={seg.dashArray} 
                                  strokeDashoffset={seg.dashOffset} 
                                  className="transition-all hover:opacity-80 cursor-help"
                                >
                                  <title>{`${seg.name}: ${seg.count} solved`}</title>
                                </circle>
                              ))
                            )}
                          </svg>
                        </div>
                        <div className="text-[9px] text-muted-foreground/40 text-center font-mono mt-1 uppercase tracking-wider select-none">Hover segments to see data</div>
                      </div>

                      {/* Legend */}
                      <ul className="mt-4 space-y-1.5 font-mono text-[11px]">
                        <li className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-[rgb(245,158,11)]" />
                            <span className="text-muted-foreground uppercase tracking-[0.2em]">Rookie</span>
                          </span>
                          <span className="font-semibold text-foreground">
                            {forgeStats.rookie}
                            {profile.forgeTotals && (
                              <span className="text-muted-foreground/50 font-normal text-[10px]">
                                /{profile.forgeTotals.rookie}
                              </span>
                            )}
                          </span>
                        </li>
                        <li className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-[rgb(56,189,248)]" />
                            <span className="text-muted-foreground uppercase tracking-[0.2em]">Operative</span>
                          </span>
                          <span className="font-semibold text-foreground">
                            {forgeStats.operative}
                            {profile.forgeTotals && (
                              <span className="text-muted-foreground/50 font-normal text-[10px]">
                                /{profile.forgeTotals.operative}
                              </span>
                            )}
                          </span>
                        </li>
                        <li className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-[rgb(16,185,129)]" />
                            <span className="text-muted-foreground uppercase tracking-[0.2em]">Elite</span>
                          </span>
                          <span className="font-semibold text-foreground">
                            {forgeStats.elite}
                            {profile.forgeTotals && (
                              <span className="text-muted-foreground/50 font-normal text-[10px]">
                                /{profile.forgeTotals.elite}
                              </span>
                            )}
                          </span>
                        </li>
                      </ul>
                    </div>

                    {/* Right Column: Sparkline XP chart */}
                    <div className="flex flex-col justify-between h-full border-t border-border/20 pt-6 md:border-t-0 md:pt-0 md:border-l md:border-border/20 md:pl-6">
                      <div>
                        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em] mb-2">
                          Reputation Velocity
                        </div>
                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="font-heading text-4xl font-bold tracking-tight text-foreground">
                            {profile.reputationVelocity || 0} XP
                          </span>
                          <span className="font-mono text-emerald-500 text-[10px] uppercase tracking-wider font-semibold">
                            Weekly activity intensity
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs leading-relaxed mb-6">
                          Daily telemetry aggregates tracking points accumulated through CodeForge challenge solves, article publishing, and chapter sprint completions over the last 24 sectors.
                        </p>
                      </div>
                      
                      {/* Bar graph */}
                      <div className="flex h-16 items-end gap-1 select-none pt-4">
                        {activityBars.map((bar, idx) => (
                          <div 
                            key={idx}
                            title={`${bar.dateStr}: ${bar.count} events`}
                            className={cn(
                              "flex-1 rounded-xs transition-colors cursor-help",
                              idx === activityBars.length - 1 
                                ? "bg-emerald-500" 
                                : "bg-foreground/15 hover:bg-foreground/35"
                            )}
                            style={{ height: `${bar.heightPercentage}%` }}
                          />
                        ))}
                      </div>
                      <div className="text-[9px] text-muted-foreground/40 text-right font-mono mt-1.5 uppercase tracking-wider select-none">Hover bars to see data</div>
                    </div>
                  </div>
                </Surface>
              
              {/* Hackathon Deployment History */}
            </div>
            <div className="lg:col-span-1 flex flex-col gap-5">
              {/* Institute / Chapter Tile */}
{profile.chapter && (
                  <Surface className="p-6 bg-background/40">
                    <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-4">Associated Institute</div>
                    <Link to={`/chapters/${profile.chapter.slug}`}>
                      <div className="p-3 bg-secondary/20 hover:bg-secondary/40 border border-border/40 rounded-xl flex items-center gap-3 transition-all cursor-pointer">
                        <div className="h-10 w-10 rounded-lg bg-secondary border border-border flex items-center justify-center text-[12px] font-bold overflow-hidden shrink-0">
                          {profile.chapter.logoUrl ? (
                            <img src={resolveAssetUrl(profile.chapter.logoUrl)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            profile.chapter.name?.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-[13px] font-bold text-foreground truncate hover:text-primary transition-colors">
                              {profile.chapter.name}
                            </h4>
                            {profile.chapter.founder === profile._id && (
                              <span className="text-[8px] font-bold uppercase tracking-wider font-mono px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 leading-none">
                                Founder
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {profile.chapter.city || "Global Network"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-[13px] font-bold text-foreground">
                            {profile.chapter.membersCount || 0}
                          </div>
                          <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                            {profile.chapter.membersCount === 1 ? "Member" : "Members"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Surface>
                )}
              {/* Knowledge Intelligence Assets */}
<Surface className="p-6 bg-background/40 flex-1 flex flex-col">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-4">Knowledge Intelligence Assets</div>
                {profile.knowledge && profile.knowledge.length > 0 ? (
                <div className="flex flex-col">
                  {profile.knowledge.map((a: any) => (
                    <Link to={`/knowledge/${a.slug}`} key={a._id} className="flex flex-col gap-1.5 p-4 border border-border/60 bg-secondary/10 hover:bg-secondary/20 rounded-xl mb-3 last:mb-0 group transition-all cursor-pointer block">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-black text-info tracking-wider">{a.categoryId?.name || 'Technical'}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[14px] font-bold line-clamp-1 group-hover:text-primary transition-colors">
                        {a.title}
                      </div>
                      <p className="text-[12px] text-muted-foreground line-clamp-2">
                        {a.metaDescription || "Technical documentation and research findings contributed to the central intelligence hub."}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> {a.upvotes?.length || 0}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                  <BrainCircuit className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                  <div className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">No knowledge assets contributed</div>
                  <Link to="/knowledge" className="mt-4 inline-block text-primary text-[11px] font-bold uppercase tracking-widest hover:underline">Submit Intelligence</Link>
                </div>
              )}
              </Surface>
            </div>

            {/* Row 2 */}
            <div className="lg:col-span-2">
              <Surface className="p-6 bg-background/40 h-full flex flex-col">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-4">Hackathon Deployment History</div>
                {profile.hackathons && profile.hackathons.length > 0 ? (
                <div className="flex flex-col">
                  {profile.hackathons.map((h: any) => (
                    <Link to={`/hackathons/${h.hackathon?.slug}`} key={h._id} className="flex items-center gap-4 p-3.5 border border-border/60 bg-secondary/10 hover:bg-secondary/20 rounded-xl mb-3 last:mb-0 group transition-all cursor-pointer block">
                      <div className="flex items-center gap-4 w-full">
                        <div className="h-12 w-20 bg-secondary rounded overflow-hidden shrink-0 relative">
                          {h.hackathon?.bannerImage && (
                            <img src={resolveAssetUrl(h.hackathon.bannerImage)} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-bold truncate group-hover:text-primary transition-colors">{h.hackathon?.title}</div>
                          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3">
                            <span>Team <span className="font-mono text-foreground">{h.teamName}</span></span>
                            <span>Rank <span className="font-mono text-primary">#{h.rank || 'TBD'}</span></span>
                            <span><span className="font-mono text-foreground">{h.totalScore || 0}</span> pts</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <button type="button" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                            Intel
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                  <div className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">No arena deployments recorded</div>
                  <Link to="/hackathons" className="mt-4 inline-block text-primary text-[11px] font-bold uppercase tracking-widest hover:underline">Browse Hackathons</Link>
                </div>
              )}
              </Surface>
            </div>
            <div className="lg:col-span-1">
              {/* Competition Mission Log */}
<Surface className="p-6 bg-background/40 h-full flex flex-col">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-4">Competition Mission Log</div>
                {profile.competitions && profile.competitions.length > 0 ? (
                <div className="flex flex-col">
                  {profile.competitions.map((c: any) => (
                    <Link to={`/competitions/${c.event?.slug || c._id}`} key={c._id} className="flex flex-col gap-2 p-4 border border-border/60 bg-secondary/10 hover:bg-secondary/20 rounded-xl mb-3 last:mb-0 group transition-all cursor-pointer block">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-info tracking-wider">{c.event?.subCategory}</span>
                        <Pill variant={c.status === 'Approved' ? 'success' : 'info'} className="h-5 text-[9px] uppercase font-bold">{c.status}</Pill>
                      </div>
                      <div>
                        <div className="text-[14px] font-bold group-hover:text-primary transition-colors">{c.event?.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{c.event?.category} • Squad: <span className="font-mono text-foreground">{c.teamName}</span></div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                  <div className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">No competition records found</div>
                  <Link to="/competitions" className="mt-4 inline-block text-primary text-[11px] font-bold uppercase tracking-widest hover:underline">Deploy to Arena</Link>
                </div>
              )}
              </Surface>
            </div>

            {/* Row 3 */}
            <div className="lg:col-span-3">
              {/* Pinned Projects Section */}
              <Surface className="p-6 bg-background/40 h-full flex flex-col">
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-4">Pinned projects</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {profile.projects && profile.projects.length > 0 ? (
                      profile.projects.slice(0, 2).map((p: any) => (
                        <Link to={`/lab/${p.slug || p._id}`} key={p._id} className="rounded-xl border border-border/60 bg-secondary/10 p-4 transition-all hover:bg-secondary/20 flex flex-col justify-between min-h-[140px] cursor-pointer block">
                          <div>
                            <div className="flex items-center gap-2 font-mono text-sm text-foreground font-semibold">
                              <GitBranch className="h-3.5 w-3.5 opacity-60 text-muted-foreground" />
                              {p.title || p.associatedTeam?.teamName}
                            </div>
                            <p className="mt-1.5 text-muted-foreground text-xs leading-relaxed line-clamp-2">{p.tagline}</p>
                          </div>
                          <div className="mt-4 flex items-center gap-3 font-mono text-[11px] text-muted-foreground pt-3 border-t border-border/20">
                            <span className="flex items-center gap-1.5">
                              <span className="size-2 rounded-full bg-blue-500"></span>
                              {p.techStack?.[0] || 'TypeScript'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3 w-3 text-warning fill-warning" />
                              {p.stars || Math.floor(Math.random() * 200) + 10}
                            </span>
                          </div>
                        </Link>
                      ))
                    ) : null}
                    <article onClick={() => toast("Feature to pin new projects coming soon.")} className="rounded-xl border border-dashed border-border/60 bg-secondary/5 p-4 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-secondary/10 transition-all min-h-[140px]">
                      <Plus className="h-5 w-5 text-muted-foreground mb-1 group-hover:text-primary transition-colors" />
                      <span className="text-[11px] font-medium text-muted-foreground">Pin a project</span>
                    </article>
                  </div>
                </Surface>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
