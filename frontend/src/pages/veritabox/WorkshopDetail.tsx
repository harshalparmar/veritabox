import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface } from "@/components/veritabox/UI";
import {
  ChevronLeft, MapPin, Clock, Users, Calendar, ExternalLink,
  Loader2, BookOpen, CheckCircle2, Building2, Wifi, User, FileText, Tag
} from "lucide-react";
import { workshopsApi, Workshop } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { resolveAssetUrl } from "@/lib/api";

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Upcoming: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
  Live: { bg: "bg-success/10", text: "text-success", dot: "bg-success animate-pulse" },
  Completed: { bg: "bg-muted/10", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  Cancelled: { bg: "bg-destructive/10", text: "text-destructive", dot: "bg-destructive" },
  Draft: { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning" },
};

export default function WorkshopDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workshop, isLoading } = useQuery({
    queryKey: ["workshop-detail", slug],
    queryFn: () => workshopsApi.getBySlug(slug!),
    enabled: !!slug,
  });

  const isRegistered = workshop?.attendees?.some(
    (a) => (typeof a === "string" ? a : (a as any)._id) === user?._id
  );

  const isFull = workshop ? workshop.attendees.length >= workshop.capacity : false;

  const registerMutation = useMutation({
    mutationFn: () => workshopsApi.register(workshop!._id),
    onSuccess: () => {
      toast.success("Registered!", { description: "You're confirmed for this workshop." });
      queryClient.invalidateQueries({ queryKey: ["workshop-detail", slug] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const unregisterMutation = useMutation({
    mutationFn: () => workshopsApi.unregister(workshop!._id),
    onSuccess: () => {
      toast.success("Unregistered.", { description: "Your RSVP has been cancelled." });
      queryClient.invalidateQueries({ queryKey: ["workshop-detail", slug] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <PublicShell>
        <div className="h-[80vh] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </PublicShell>
    );
  }

  if (!workshop) {
    return (
      <PublicShell>
        <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground gap-2">
          <BookOpen className="h-8 w-8 opacity-30" />
          <p className="text-[14px]">Workshop not found.</p>
          <Link to="/workshops" className="text-[11px] text-primary hover:underline">Back to Workshops</Link>
        </div>
      </PublicShell>
    );
  }

  const statusStyle = STATUS_COLORS[workshop.status] || STATUS_COLORS.Draft;
  const spotsLeft = workshop.capacity - workshop.attendees.length;
  const fillPercent = Math.min(100, (workshop.attendees.length / workshop.capacity) * 100);

  return (
    <PublicShell>
      <div className="max-w-[1400px] mx-auto py-8 px-8">
        <Link to="/workshops" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to Workshops
        </Link>

        {/* Header Section */}
        <div className="mb-8">
          <div className="h-64 w-full rounded-xl overflow-hidden relative mb-6 border border-border bg-secondary/50">
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent z-10"></div>
            {workshop.coverUrl ? (
              <img src={resolveAssetUrl(workshop.coverUrl)} alt={workshop.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-muted-foreground/20" />
              </div>
            )}
            <div className="absolute bottom-6 left-6 z-20 flex flex-col items-start gap-3">
              <div className="flex gap-2">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded border ${statusStyle.bg} ${statusStyle.text} border-current/30`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                  {workshop.status}
                </span>
                {workshop.meetingLink && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-400/30">
                    <Wifi className="h-2.5 w-2.5" /> Virtual
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white drop-shadow-md break-words pr-4">{workshop.title}</h1>
              <Link to={`/chapters/${workshop.chapter?.slug}`} className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded border border-border/50">
                <Building2 className="h-4 w-4" />
                {workshop.chapter?.name}
              </Link>
            </div>
          </div>
          
          {/* Status Bar */}
          <Surface className="flex flex-wrap gap-6 p-4 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
            <div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Date & Time</div>
              <div className="font-mono text-sm">{format(new Date(workshop.date), "MMM d, yyyy · h:mm a")}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Duration</div>
              <div className="font-mono text-sm">{workshop.duration} minutes</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Location</div>
              <div className="font-mono text-sm text-primary font-bold">{workshop.location}</div>
            </div>
          </Surface>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Surface className="p-5 space-y-3 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">About This Workshop</h2>
              {workshop.xpReward > 0 && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded flex items-center gap-1">
                  +{workshop.xpReward} XP on attendance
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{workshop.description}</p>
          </Surface>

          {/* External Mentor Profile */}
          {workshop.externalMentor?.name && (
            <Surface className="p-5 space-y-3 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Guest Speaker</h2>
              <div className="flex items-start gap-4">
                {workshop.externalMentor.avatarUrl ? (
                  <img src={resolveAssetUrl(workshop.externalMentor.avatarUrl)} className="h-14 w-14 rounded-full object-cover border border-border shrink-0" alt="" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                    <User className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-[14px] font-bold">{workshop.externalMentor.name}</div>
                  {workshop.externalMentor.designation && (
                    <div className="text-[11px] text-primary font-medium">{workshop.externalMentor.designation}</div>
                  )}
                  {workshop.externalMentor.bio && (
                    <p className="text-[12px] text-muted-foreground leading-relaxed mt-1.5">{workshop.externalMentor.bio}</p>
                  )}
                </div>
              </div>
            </Surface>
          )}

          {/* Internal Mentor (platform user) */}
          {workshop.mentor && !workshop.externalMentor?.name && (
            <Surface className="p-5 space-y-3 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Speaker / Mentor</h2>
              <div className="flex items-center gap-3">
                {(workshop.mentor as any)?.avatarUrl ? (
                  <img src={resolveAssetUrl((workshop.mentor as any).avatarUrl)} className="h-10 w-10 rounded-full object-cover border border-border" alt="" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-secondary border border-border flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                )}
                <div>
                  <div className="text-[13px] font-bold">{(workshop.mentor as any)?.name || "TBA"}</div>
                  {(workshop.mentor as any)?.universityId && (
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{(workshop.mentor as any).universityId}</div>
                  )}
                </div>
              </div>
            </Surface>
          )}

          {/* Resources */}
          {workshop.resources && workshop.resources.length > 0 && (
            <Surface className="p-5 space-y-3 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Resources</h2>
              <div className="space-y-2">
                {workshop.resources.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-[12.5px] text-primary hover:underline">
                    <FileText className="h-3.5 w-3.5 shrink-0" /> {r.name}
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                ))}
              </div>
            </Surface>
          )}

          {/* Tags */}
          {workshop.tags && workshop.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              {workshop.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 bg-secondary border border-border rounded font-mono uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Attendee List */}
          <Surface className="p-5 space-y-3 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Registered Attendees ({workshop.attendees.length})</h2>
            <div className="flex flex-wrap gap-2">
              {workshop.attendees.slice(0, 24).map((a, i) => {
                const att = a as any;
                return att?.avatarUrl ? (
                  <img key={i} src={resolveAssetUrl(att.avatarUrl)} title={att.name}
                    className="h-8 w-8 rounded-full object-cover border border-border" />
                ) : (
                  <div key={i} title={att?.name || "Operative"}
                    className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {att?.name?.[0] || "?"}
                  </div>
                );
              })}
              {workshop.attendees.length > 24 && (
                <div className="h-8 px-2 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] text-muted-foreground font-mono">
                  +{workshop.attendees.length - 24}
                </div>
              )}
              {workshop.attendees.length === 0 && (
                <span className="text-[12px] text-muted-foreground">No attendees yet.</span>
              )}
            </div>
          </Surface>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* RSVP Card */}
          <Surface className="p-5 space-y-4 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
            <div className="space-y-2 text-[12px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{format(new Date(workshop.date), "EEEE, MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{format(new Date(workshop.date), "h:mm a")} · {workshop.duration} min</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{workshop.location}</span>
              </div>
              {workshop.meetingLink && workshop.status !== "Completed" && (
                <a href={workshop.meetingLink} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline font-medium">
                  <ExternalLink className="h-3.5 w-3.5" /> Join Online
                </a>
              )}
            </div>

            {/* Capacity */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {workshop.attendees.length}/{workshop.capacity}</span>
                <span className={isFull ? "text-destructive font-bold" : ""}>{isFull ? "Full" : `${spotsLeft} spots left`}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${isFull ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${fillPercent}%` }} />
              </div>
            </div>

            {/* RSVP Buttons */}
            {user && workshop.status !== "Completed" && workshop.status !== "Cancelled" && (
              isRegistered ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[12px] text-success font-bold">
                    <CheckCircle2 className="h-4 w-4" /> You're registered
                  </div>
                  <button
                    onClick={() => unregisterMutation.mutate()}
                    disabled={unregisterMutation.isPending}
                    className="w-full h-9 border border-border bg-secondary text-muted-foreground rounded text-[11px] font-bold uppercase tracking-widest hover:bg-border hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                  >
                    {unregisterMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cancel RSVP"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => registerMutation.mutate()}
                  disabled={registerMutation.isPending || isFull}
                  className="w-full h-9 bg-primary text-primary-foreground rounded text-[11px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registerMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isFull ? "Workshop Full" : "RSVP  -  Reserve Spot"}
                </button>
              )
            )}

            {!user && workshop.status !== "Completed" && (
              <Link to="/auth">
                <button className="w-full h-9 bg-primary text-primary-foreground rounded text-[11px] font-bold uppercase tracking-widest hover:brightness-110 transition-all">
                  Login to RSVP
                </button>
              </Link>
            )}
          </Surface>

          {/* Chapter Card */}
          {workshop.chapter && (
            <Surface className="p-4 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
              <Link to={`/chapters/${workshop.chapter.slug}`} className="flex items-center gap-3 group">
                <div className="h-9 w-9 bg-secondary rounded border border-border flex items-center justify-center shrink-0 overflow-hidden">
                  {workshop.chapter.logoUrl ? (
                    <img src={resolveAssetUrl(workshop.chapter.logoUrl)} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <Building2 className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
                <div>
                  <div className="text-[12px] font-bold group-hover:text-primary transition-colors">{workshop.chapter.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Hosting Chapter</div>
                </div>
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground rotate-180 ml-auto group-hover:text-primary transition-colors" />
              </Link>
            </Surface>
          )}
        </div>
      </div>
      </div>
    </PublicShell>
  );
}
