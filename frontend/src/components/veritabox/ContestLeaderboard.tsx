import { useQuery } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import { Trophy, Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContestLeaderboardProps {
  hackathonId: string;
  roundNumber: number;
}

export default function ContestLeaderboard({ hackathonId, roundNumber }: ContestLeaderboardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["contest-leaderboard", hackathonId, roundNumber],
    queryFn: () => hackathonsApi.getContestLeaderboard(hackathonId, roundNumber),
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const leaderboard = data?.leaderboard || [];
  const challengeIds = data?.challengeIds || [];
  const penaltyMinutes = data?.penaltyMinutes || 20;

  if (leaderboard.length === 0) {
    return (
      <Surface className="p-12 text-center text-muted-foreground">
        No submissions yet. The leaderboard will populate as teams solve problems.
      </Surface>
    );
  }

  // Find first blood per problem — earliest solvedAt time wins
  const firstBlood: Record<string, string> = {};
  const firstBloodTime: Record<string, string> = {};
  for (const entry of leaderboard) {
    for (const p of entry.problems || []) {
      if (p.solved && p.challengeId && p.solvedAt) {
        const cId = p.challengeId.toString();
        if (!firstBloodTime[cId] || p.solvedAt < firstBloodTime[cId]) {
          firstBloodTime[cId] = p.solvedAt;
          firstBlood[cId] = entry.teamId;
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" /> ICPC-Style Leaderboard
        </h3>
        <span className="text-[10px] text-muted-foreground font-mono">
          Penalty: +{penaltyMinutes}min per wrong attempt
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <th className="py-2 px-2 text-left w-12">#</th>
              <th className="py-2 px-2 text-left">Team</th>
              <th className="py-2 px-2 text-center w-16">Solved</th>
              <th className="py-2 px-2 text-center w-20">Penalty</th>
              {challengeIds.map((_: any, idx: number) => (
                <th key={idx} className="py-2 px-2 text-center w-20">
                  {String.fromCharCode(65 + idx)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry: any) => {
              const problemMap: Record<string, any> = {};
              (entry.problems || []).forEach((p: any) => {
                if (p.challengeId) problemMap[p.challengeId.toString()] = p;
              });

              return (
                <tr key={entry.teamId} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="py-2 px-2 font-mono font-bold">
                    {entry.rank <= 3 ? (
                      <span className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black",
                        entry.rank === 1 ? "bg-amber-500/20 text-amber-500" :
                        entry.rank === 2 ? "bg-slate-400/20 text-slate-400" :
                        "bg-orange-500/20 text-orange-500"
                      )}>{entry.rank}</span>
                    ) : entry.rank}
                  </td>
                  <td className="py-2 px-2">
                    <div className="font-bold text-sm">{entry.teamName}</div>
                    {entry.members?.[0] && (
                      <div className="text-[10px] text-muted-foreground">{entry.members[0].name}</div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold text-primary">{entry.totalSolved}</td>
                  <td className="py-2 px-2 text-center font-mono text-muted-foreground">{entry.totalPenalty}</td>
                  {challengeIds.map((cId: string, idx: number) => {
                    const cIdStr = typeof cId === "object" ? (cId as any).toString() : cId;
                    const p = problemMap[cIdStr];
                    const isFirst = firstBlood[cIdStr] === entry.teamId;

                    if (!p || p.attempts === 0) {
                      return <td key={idx} className="py-2 px-2 text-center text-muted-foreground/30">-</td>;
                    }

                    if (p.solved) {
                      return (
                        <td key={idx} className={cn("py-2 px-2 text-center", isFirst ? "bg-success/10" : "")}>
                          <div className="text-success font-bold text-xs">
                            {isFirst && <Zap className="h-3 w-3 inline mr-0.5 text-amber-500" />}
                            +{p.attempts > 1 ? p.attempts - 1 : ""}
                          </div>
                          <div className="text-[9px] text-muted-foreground">{p.penaltyTime}m</div>
                        </td>
                      );
                    }

                    return (
                      <td key={idx} className="py-2 px-2 text-center">
                        <div className="text-destructive font-bold text-xs">-{p.attempts}</div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
