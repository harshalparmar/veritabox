import React from "react";
import { Link } from "react-router-dom";
import { Surface, Pill } from "@/components/veritabox/UI";
import {
  Users, Zap, Globe, Github, ExternalLink, BrainCircuit,
  ShieldCheck, Cpu, Code2, Heart, Calendar,
  History, Settings, Target, ShieldAlert, Clock, AlertTriangle,
  Copy, Award, ClipboardCheck, Ban
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveAssetUrl } from "@/lib/api";
import { Squad } from "@/lib/api";

interface HackathonSquadronViewProps {
  squadron: Squad;
  authUser: any;
  isLeader: boolean;
  onManageClick: () => void;
  onSaluteClick: () => void;
  isSaluting: boolean;
}

export default function HackathonSquadronView({
  squadron,
  authUser,
  isLeader,
  onManageClick,
  onSaluteClick,
  isSaluting
}: HackathonSquadronViewProps) {
  const hackathon = squadron.hackathonId as any;

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'Architect': return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
      case 'Systems Specialist': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25';
      case 'Logic Engineer': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25';
      case 'QA/Proctor Guardian': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
      default: return 'text-muted-foreground bg-secondary/50 border-border/30';
    }
  };



  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ===================== MINIMAL HEADER ===================== */}
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
                <span>Tactical Hackathon Unit</span>
                {hackathon && (
                  <>
                    <span className="text-muted-foreground/30">•</span>
                    <span>{hackathon.title}</span>
                  </>
                )}
              </div>
              <h1 className="text-[32px] font-semibold tracking-tight">{squadron.teamName}</h1>
              
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                  Rank #{squadron.rank || 'TBD'}
                </span>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium border",
                  squadron.isDisqualified
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : "bg-success/10 text-success border-success/20"
                )}>
                  {squadron.isDisqualified ? 'Disqualified' : 'Active'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground border border-border">
                  <Zap className="h-3 w-3 text-warning fill-warning/20" /> {squadron.score || 0} Points
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isLeader && (
                <button
                  onClick={onManageClick}
                  className="h-9 px-4 bg-foreground text-background hover:bg-foreground/90 text-[12px] font-medium rounded transition-colors flex items-center gap-2"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Manage Squadron</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== MAIN CONTENT CONTAINER ===================== */}
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* ===================== LEFT COLUMN: INTEL ===================== */}
          <div className="space-y-6">

            {/* Disqualification Reason Card */}
            {squadron.isDisqualified && (
              <div className="p-5 border border-destructive/30 bg-destructive/10/40 rounded-xl flex gap-3.5 items-start">
                <Ban className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-[13px] font-semibold text-destructive uppercase tracking-wider">Disqualification Notice</h4>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {squadron.disqualificationReason || "Tactical clearance revoked by administration review."}
                  </p>
                </div>
              </div>
            )}

            {/* Mission Objective (Bio) */}
            <Surface className="p-6 bg-background/40 border-border/60">
              <div className="space-y-3">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-3 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-primary" /> Active Mission Brief
                </div>
                {hackathon && (
                  <Link to={`/hackathons/${hackathon.slug}`} className="block text-[16px] font-bold tracking-tight text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group">
                    {hackathon.title}
                    <ExternalLink className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </Link>
                )}
                <p className="text-foreground/85 text-sm leading-relaxed italic pt-1">
                  "{squadron.squadronBio || "This squadron has not provided a tactical briefing bio."}"
                </p>
              </div>
            </Surface>

            {/* Offline Deliverables Archive Ledger */}
            {squadron.offlineDeliverables && squadron.offlineDeliverables.length > 0 && (
              <div className="space-y-3">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-3">Offline Deliverables</div>
                <Surface className="overflow-hidden bg-background/40 border-border/60 rounded-xl">
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-secondary/40 border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        <th className="px-5 py-3 w-28 font-mono">Round</th>
                        <th className="px-5 py-3 font-mono">Notes</th>
                        <th className="px-5 py-3 text-right font-mono">Resource</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {squadron.offlineDeliverables.map((del: any, idx: number) => (
                        <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-foreground">
                            Round {del.roundNumber}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground truncate max-w-sm">
                            {del.notes || "No submission logs."}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {del.link ? (
                              <a href={del.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1 bg-popover hover:bg-accent/50 text-foreground border border-input rounded-lg text-xs font-semibold transition-colors shadow-sm">
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground/45 italic text-[12px]">No Resource Link</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Surface>
              </div>
            )}

            {/* Proctor HQ Commendations & Score Adjustments */}
            {squadron.judgedPoints && squadron.judgedPoints.length > 0 && (
              <div className="space-y-3">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-3">Score Commendations</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {squadron.judgedPoints.map((award: any, idx: number) => (
                    <Surface key={idx} className="p-4 flex flex-col justify-between bg-background/40 border-border/60 hover:border-foreground/30 transition-all hover:shadow-xs rounded-xl">
                      <div className="flex justify-between items-center gap-2 border-b border-border/20 pb-2 mb-2 font-mono text-[10px]">
                        <span className="text-muted-foreground uppercase tracking-wider">Round {award.roundNumber}</span>
                        <span className={cn(
                          "font-bold px-1.5 py-0.5 rounded-full text-[9px] border font-mono tracking-wider",
                          award.points >= 0
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        )}>
                          {award.points >= 0 ? `+${award.points}` : award.points} PTS
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed italic">
                        "{award.reason || "Manual points assigned by administration review."}"
                      </p>
                    </Surface>
                  ))}
                </div>
              </div>
            )}

            {/* Mission Log / History */}
            <div className="space-y-3">
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-3">Mission Rounds</div>
              <Surface className="divide-y divide-border/30 overflow-hidden bg-background/40 border-border/60 rounded-xl">
                {hackathon?.rounds?.map((round: any) => {
                  const isCompleted = squadron.finalizedRounds?.includes(round.roundNumber);
                  const isCurrent = squadron.currentRound === round.roundNumber;

                  return (
                    <div key={round._id} className={cn("p-4 flex items-center justify-between transition-colors", !isCompleted && !isCurrent && "opacity-40 bg-secondary/10", (isCompleted || isCurrent) && "hover:bg-secondary/20")}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center font-bold border text-[11px] shadow-sm font-mono",
                          isCompleted ? "bg-success/10 text-success border-success/20" :
                            isCurrent ? "bg-primary/10 text-primary border-primary/20" :
                              "bg-secondary text-muted-foreground border-border/30"
                        )}>
                          {round.roundNumber}
                        </div>
                        <div>
                          <div className="text-[13px] font-bold text-foreground">{round.title}</div>
                          <div className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-mono mt-0.5">
                            {isCompleted ? 'Phase Concluded & Cleared' : isCurrent ? 'Active Operational Phase' : 'Staged Phase'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(isCompleted || isCurrent) && (
                          <span className="text-[10px] font-bold text-foreground bg-secondary/40 px-2 py-0.5 rounded border border-border/30 font-mono">
                            {((squadron.roundScores as any)?.[round.roundNumber.toString()] || 0)} Pts
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-success/15 text-success border border-success/20 tracking-wider">
                            SUCCESS
                          </span>
                        )}
                        {isCurrent && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-primary/15 text-primary border border-primary/20 tracking-wider animate-pulse">
                            ENGAGED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Surface>
            </div>
          </div>

          {/* ===================== RIGHT COLUMN: ROSTER ===================== */}
          <div className="space-y-6">

            {/* Tactical Status Dashboard */}
            <Surface className="p-5 bg-background/40 border-border/60 rounded-xl">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span>Operational State</span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-border/20 pb-2.5">
                  <span className="text-muted-foreground">Strikes & Warnings</span>
                  <span className={cn(
                    "font-mono font-semibold py-0.5 px-2 rounded-full border text-[10px] tracking-wide uppercase",
                    squadron.warnings > 0
                      ? "text-destructive bg-destructive/10 border-destructive/25"
                      : "text-success bg-success/5 border-success/15"
                  )}>
                    {squadron.warnings} / 6 Strikes
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2.5">
                  <span className="text-muted-foreground">Active Solver</span>
                  <span className="font-bold text-foreground truncate max-w-[140px]">
                    {squadron.activeSolver ? (squadron.activeSolver as any).name : "None"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2.5">
                  <span className="text-muted-foreground">Entries Count</span>
                  <span className="font-mono text-foreground font-semibold">
                    {squadron.arenaEntries || 0} / 3 Entries
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-border/20 pb-2.5">
                  <span className="text-muted-foreground">Aborts Count</span>
                  <span className="font-mono text-foreground font-semibold">
                    {squadron.abortCount || 0} / 2 Aborts
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Commissioned</span>
                  <span className="font-mono text-foreground font-semibold">
                    {new Date(squadron.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Surface>

            {/* Tactical Command Roster */}
            <div className="space-y-3">
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-3">Command Roster</div>
              <div className="flex flex-col gap-2 bg-background/40 border border-border/60 rounded-xl p-3">
                {squadron.members.map((member: any) => {
                  const role = squadron.memberRoles?.[member._id] || (member._id === (squadron.leader as any)?._id ? 'Architect' : 'Operative');

                  return (
                    <div key={member._id} className="p-2.5 rounded-lg hover:bg-secondary/40 transition-all flex items-center justify-between border border-transparent hover:border-border/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-secondary border border-border overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs">
                          {member.avatarUrl ? (
                            <img src={resolveAssetUrl(member.avatarUrl)} className="h-full w-full object-cover" alt="Operative Visual" />
                          ) : (
                            <span className="text-[12px] font-bold text-muted-foreground uppercase">
                              {member.name.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <Link to={`/profile/${member.username || member._id}`} className="block">
                            <div className="text-[13px] font-bold text-foreground truncate hover:text-primary transition-colors flex items-center gap-1.5 leading-none">
                              {member.name}
                              {member._id === (squadron.leader as any)?._id && (
                                <span className="text-[8px] font-bold uppercase tracking-wider font-mono px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 leading-none">
                                  Leader
                                </span>
                              )}
                            </div>
                          </Link>
                          <span className="inline-block text-[9px] font-mono font-medium tracking-wider uppercase mt-1 text-muted-foreground">
                            {role}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-[13px] font-bold text-foreground leading-none">{member.reputationPoints || 0}</div>
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mt-0.5">Rep</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
