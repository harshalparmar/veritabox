import React from "react";
import { Link } from "react-router-dom";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import { useQuery } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import {
  Trophy, Medal, Users, Zap, ExternalLink, Calendar,
  Award, ShieldCheck, Heart, Settings, BookOpen, ArrowRight,
  TrendingUp, Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveAssetUrl } from "@/lib/api";
import { Squad } from "@/lib/api";

interface CompetitionSquadronViewProps {
  squadron: Squad;
  authUser: any;
  isLeader: boolean;
  onManageClick: () => void;
  onSaluteClick: () => void;
  isSaluting: boolean;
}

export default function CompetitionSquadronView({
  squadron,
  authUser,
  isLeader,
  onManageClick,
  onSaluteClick,
  isSaluting
}: CompetitionSquadronViewProps) {
  const hackathon = squadron.hackathonId as any;

  // Retrieve Live Standings
  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ["hackathon-leaderboard", hackathon?._id],
    queryFn: () => hackathonsApi.getLeaderboard(hackathon?._id),
    enabled: !!hackathon?._id,
  });

  const currentTeamIndex = leaderboard?.findIndex((entry: any) => entry._id === squadron._id) ?? -1;
  const currentTeamRank = currentTeamIndex !== -1 ? currentTeamIndex + 1 : (squadron.rank || 'TBD');

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
                <span>Competitive Arena Squadron</span>
                {hackathon && (
                  <>
                    <span className="text-muted-foreground/30">•</span>
                    <span>{hackathon.title}</span>
                  </>
                )}
              </div>
              <h1 className="text-[32px] font-semibold tracking-tight">{squadron.teamName}</h1>
              
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Medal className="h-3 w-3 mr-1" /> Rank #{currentTeamRank}
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
                  <span>Modify Roster</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== MAIN CONTENT CONTAINER ===================== */}
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* ===================== LEFT COLUMN: STANDINGS & RULES ===================== */}
          <div className="space-y-6">

            {/* Tournament Objective Brief */}
            <Surface className="p-6 bg-background/40 border-border/60">
              <div className="space-y-3">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-3 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-primary" /> Tournament Details
                </div>
                {hackathon && (
                  <Link to={`/VeritaBox/competitions/${hackathon.slug}`} className="block text-[16px] font-bold tracking-tight text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group">
                    {hackathon.title}
                    <ExternalLink className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </Link>
                )}
                <p className="text-foreground/85 text-sm leading-relaxed italic pt-1">
                  "{squadron.squadronBio || "This competitive squad has not registered a custom bio statement yet."}"
                </p>
              </div>
            </Surface>

            {/* Prizes Grid */}
            {hackathon?.prizes && hackathon.prizes.length > 0 && (
              <div className="space-y-3">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-3">Target Rewards</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {hackathon.prizes.map((prize: any, idx: number) => (
                    <Surface key={idx} className="p-4 flex flex-col justify-between bg-background/40 border border-border/60 hover:border-foreground/30 hover:shadow-xs transition-all rounded-xl">
                      <div>
                        <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-500">
                          {prize.position} Place
                        </div>
                        <h4 className="text-[16px] font-bold text-foreground mt-1 tracking-tight">
                          {prize.reward}
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {prize.description}
                      </p>
                    </Surface>
                  ))}
                </div>
              </div>
            )}

            {/* Standings Ledger */}
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-3">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">Real-time Standings</div>
                {hackathon && (
                  <Link to={`/VeritaBox/competitions/${hackathon.slug}`} className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">
                    Full Leaderboard <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>

              <Surface className="overflow-hidden bg-background/40 border-border/60 rounded-xl">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <th className="px-5 py-3 w-28 font-mono">Rank</th>
                      <th className="px-5 py-3 font-mono">Squadron</th>
                      <th className="px-5 py-3 text-right font-mono">Warnings</th>
                      <th className="px-5 py-3 text-right font-mono">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {isLoadingLeaderboard ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                          Loading active standings...
                        </td>
                      </tr>
                    ) : leaderboard?.slice(0, 5).map((entry: any, index: number) => {
                      const rank = index + 1;
                      const isCurrent = entry._id === squadron._id;

                      return (
                        <tr key={entry._id} className={cn(
                          "hover:bg-secondary/10 transition-colors",
                          isCurrent && "bg-primary/5 font-semibold"
                        )}>
                          <td className="px-5 py-3.5 text-[13px] font-medium text-foreground">
                            {rank === 1 ? '🥇 1st' : rank === 2 ? '🥈 2nd' : rank === 3 ? '🥉 3rd' : `${rank}th`}
                          </td>
                          <td className="px-5 py-3.5 text-foreground flex items-center gap-2">
                            {entry.teamName}
                            {isCurrent && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] bg-primary/10 border border-primary/25 text-primary uppercase font-bold tracking-wider font-mono">
                                YOU
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right text-muted-foreground">
                            {entry.warnings} / 6
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-primary">
                            {entry.score.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Surface>
            </div>
          </div>

          {/* ===================== RIGHT COLUMN: ROSTER & RULES ===================== */}
          <div className="space-y-6">

            {/* Arena Rules Brief */}
            {hackathon?.rules && hackathon.rules.length > 0 && (
              <Surface className="p-5 bg-background/40 border-border/60 rounded-xl">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>Arena Directives</span>
                </div>
                <ul className="space-y-3">
                  {hackathon.rules.map((rule: string, idx: number) => (
                    <li key={idx} className="flex gap-2 items-start text-xs text-muted-foreground leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </Surface>
            )}

            {/* Competitor Roster */}
            <div className="space-y-3">
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-3">Competitors</div>
              <div className="flex flex-col gap-2 bg-background/40 border border-border/60 rounded-xl p-3">
                {squadron.members.map((member: any) => {
                  const role = squadron.memberRoles?.[member._id] || (member._id === (squadron.leader as any)?._id ? 'Architect' : 'Operative');

                  return (
                    <div key={member._id} className="p-2.5 rounded-lg hover:bg-secondary/40 transition-all flex items-center justify-between border border-transparent hover:border-border/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-secondary border border-border overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs">
                          {member.avatarUrl ? (
                            <img src={resolveAssetUrl(member.avatarUrl)} className="h-full w-full object-cover" alt="Competitor" />
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
