import { Link } from "react-router-dom";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { Trophy, Award, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useSocket } from "@/contexts/SocketContext";

interface Props {
  hackathonId: string;
}

export default function HackathonLeaderboard({ hackathonId }: Props) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["hackathon-leaderboard", hackathonId],
    queryFn: () => hackathonsApi.getLeaderboard(hackathonId),
    refetchInterval: 10000,
  });

  // 4B — Real-time leaderboard refresh on socket event (reduces poll dependency)
  useEffect(() => {
    if (!socket) return;
    const handleLeaderboardUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["hackathon-leaderboard", hackathonId] });
    };
    socket.on("LEADERBOARD_UPDATE", handleLeaderboardUpdate);
    return () => { socket.off("LEADERBOARD_UPDATE", handleLeaderboardUpdate); };
  }, [socket, hackathonId, queryClient]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
        <p className="text-[12px] text-muted-foreground mt-4 font-mono">Syncing global terminal telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[14px] font-semibold flex items-center gap-2">
          <Award className="h-4 w-4 text-warning" /> Global Standings
        </h3>
        <span className="text-[11px] text-muted-foreground">LIVE POLLING ACTIVE</span>
      </div>

      <Surface className="overflow-hidden p-0 border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/40 border-b border-border">
                <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium w-16">Rank</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Squadron</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-right w-24">Score</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-right w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {leaderboard?.map((entry, index) => {
                const isTop3 = index < 3;
                const isExpanded = expandedTeam === entry._id;
                const roundScores = entry.roundScores || {};
                const rounds = Object.keys(roundScores).sort((a, b) => Number(a) - Number(b));

                return (
                  <React.Fragment key={entry._id}>
                    <tr
                      onClick={() => setExpandedTeam(isExpanded ? null : entry._id)}
                      className={`group hover:bg-secondary/20 transition-colors cursor-pointer ${index === 0 ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-4 py-4 font-mono text-[13px]">
                        <div className="flex items-center gap-2">
                          {index === 0 ? <Trophy className="h-4 w-4 text-warning" /> : `#${index + 1}`}
                          {rounds.length > 0 && (
                            isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          {/* 3C — Link to squadron profile page via /VeritaBox/squadron/:identifier */}
                          <Link
                            to={`/VeritaBox/squadron/${entry.slug || entry._id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[13px] font-bold hover:text-primary transition-colors cursor-pointer"
                          >
                             {entry.teamName}
                          </Link>
                          <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5 mt-0.5">
                            {entry.members?.length || 0} Operatives · {entry.warnings > 0 && <span>{entry.warnings} warnings</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`text-[14px] font-mono font-bold ${isTop3 ? "text-primary" : "text-muted-foreground"}`}>
                          {entry.score.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {entry.isDisqualified ? (
                          <Pill variant="danger" className="text-[9px] h-4">Disqualified</Pill>
                        ) : (
                          <Pill variant="success" className="text-[9px] h-4 uppercase tracking-tighter">Engaged</Pill>
                        )}
                      </td>
                    </tr>
                    {isExpanded && rounds.length > 0 && (
                      <tr className="bg-secondary/10 border-l-2 border-primary/30">
                        <td colSpan={4} className="px-4 py-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pl-8">
                            {rounds.map(roundNum => (
                              <div key={roundNum} className="flex flex-col">
                                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Round {roundNum}</span>
                                <span className="text-[12px] font-mono font-bold text-primary">{Number(roundScores[roundNum] || 0).toLocaleString()} pts</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {(!leaderboard || leaderboard.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-[12px] text-muted-foreground">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-20" />
                    No squads have synchronized scores yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Surface>

      <div className="p-4 bg-secondary/30 rounded border border-border/40">
        <p className="text-[11px] text-muted-foreground leading-relaxed italic">
          Scoring is finalized upon round termination or manual artifact audit. Click on a squadron to view round-by-round intelligence breakdown.
        </p>
      </div>
    </div>
  );
}
