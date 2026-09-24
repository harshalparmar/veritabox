import React, { useState } from "react";
import { Surface, Pill } from "@/components/veritabox/UI";
import { Users, ArrowRight, RefreshCw, AlertTriangle, Award, Loader2, Zap, Shield, X, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { toast } from "sonner";

interface SquadronsTabProps {
  id: string;
  hackathon: any;
}

export default function SquadronsTab({ id, hackathon }: SquadronsTabProps) {
  const queryClient = useQueryClient();
  const [showAwardPointsModal, setShowAwardPointsModal] = useState(false);
  const [awardTargetTeam, setAwardTargetTeam] = useState<any>(null);
  const [awardData, setAwardData] = useState({
    points: 0,
    reason: "",
    roundNumber: 1
  });

  const { data: leaderboard, isLoading: loadingLeaderboard } = useQuery({
    queryKey: ["admin-leaderboard", id],
    queryFn: () => hackathonsApi.getLeaderboard(id),
  });

  const updateTeamStatusMutation = useMutation({
    mutationFn: (data: { teamId: string; isDisqualified?: boolean; reason?: string; currentRound?: number }) => 
      hackathonsApi.updateTeamStatus(id, data.teamId, data),
    onSuccess: () => {
      toast.success("Squadron tactical parameters updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-leaderboard", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const pardonMissionBreachMutation = useMutation({
    mutationFn: (data: { teamId: string; reinstateIfDisqualified: boolean }) =>
      hackathonsApi.pardonMissionBreach(id, data.teamId, data.reinstateIfDisqualified),
    onSuccess: (res: any) => {
      toast.success(res.message || "Security strikes zeroed. Squadron pardoned.");
      queryClient.invalidateQueries({ queryKey: ["admin-leaderboard", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const awardPointsMutation = useMutation({
    mutationFn: (data: { teamId: string, points: number, reason: string, roundNumber: number }) => 
      hackathonsApi.awardPoints(id, data.teamId, data),
    onSuccess: () => {
      toast.success("Points awarded and score synchronized.");
      setShowAwardPointsModal(false);
      setAwardTargetTeam(null);
      setAwardData({ points: 0, reason: "", roundNumber: 1 });
      queryClient.invalidateQueries({ queryKey: ["admin-leaderboard", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleExportCsv = () => {
    if (!leaderboard || leaderboard.length === 0) {
      toast.error("No squadrons registered to export.");
      return;
    }

    try {
      const headers = ["Rank", "SquadronName", "Leader", "MembersCount", "Score", "CurrentRound", "Disqualified", "Warnings", "Entries", "Aborts"];
      const rows = [
        headers,
        ...leaderboard.map((team: any, index: number) => [
          index + 1,
          team.teamName || "",
          team.leader?.name || "Unknown",
          team.members?.length || 0,
          team.score || 0,
          team.currentRound || 1,
          team.isDisqualified ? "Yes" : "No",
          team.warnings || 0,
          team.arenaEntries || 0,
          team.abortCount || 0
        ])
      ];

      const csvContent = rows.map(r => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${hackathon?.slug || "hackathon"}-squadrons.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Squadrons list exported to CSV successfully!");
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <Surface className="overflow-hidden">
        <div className="p-4 border-b border-border/40 bg-secondary/20 flex justify-between items-center">
          <h3 className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Active Squadron Table
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if(confirm("ADVANCE_ALL_SQUADRONS: This will move all teams to their next designated round. Proceed?")) {
                  leaderboard?.forEach((team: any) => {
                    updateTeamStatusMutation.mutate({ teamId: team._id, currentRound: (team.currentRound || 1) + 1 });
                  });
                }
              }}
              className="text-[10px] font-bold h-7 px-3 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 rounded uppercase tracking-wider"
            >
              Mass Advance Phases
            </button>
            <button onClick={handleExportCsv} className="text-[11px] h-7 px-3 bg-secondary border border-border hover:bg-secondary/80 rounded font-bold uppercase tracking-wider">
              EXPORT CSV
            </button>
          </div>
        </div>

        {loadingLeaderboard ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
        ) : leaderboard?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-[14px]">No squadrons registered for this mission.</div>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-secondary/10">
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Unit Name</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Phase</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Leader (Sole Submitter)</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Ops Score</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Telemetry</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {leaderboard?.map((team: any) => (
                <tr key={team._id} className="hover:bg-secondary/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold">{team.teamName}</div>
                    <div className="text-[10px] font-mono text-muted-foreground uppercase opacity-60 font-bold">{team.members?.length} Operatives</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-muted-foreground">R{team.currentRound || 1}</span>
                      <button 
                        disabled={updateTeamStatusMutation.isPending}
                        onClick={() => updateTeamStatusMutation.mutate({ teamId: team._id, currentRound: (team.currentRound || 1) + 1 })}
                        className="p-1 hover:text-primary text-muted-foreground transition-colors"
                        title="Advance to next round"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
                        {team.leader?.name?.substring(0, 1)}
                      </div>
                      <span className="font-medium">@{team.leader?.name || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-primary">
                    {team.score ? team.score.toLocaleString() : 0}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-[10px] font-mono gap-1">
                      <span className="text-muted-foreground">Entries: <span className={team.arenaEntries >= 3 ? "text-destructive font-bold" : "text-foreground"}>{team.arenaEntries || 0}/3</span></span>
                      <span className="text-muted-foreground">Aborts: <span className={team.abortCount >= 2 ? "text-destructive font-bold" : "text-foreground"}>{team.abortCount || 0}/2</span></span>
                      <span className="text-muted-foreground">Warnings: <span className={team.warnings >= 6 ? "text-destructive font-bold" : "text-foreground"}>{team.warnings || 0}/6</span></span>
                      {(team.arenaEntries > 0 || team.abortCount > 0 || team.warnings > 0 || team.isDisqualified) && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Issue a full mission pardon for ${team.teamName}?`)) {
                              pardonMissionBreachMutation.mutate({ teamId: team._id, reinstateIfDisqualified: team.isDisqualified });
                            }
                          }}
                          className="mt-1 text-[9px] font-bold text-primary hover:underline uppercase flex items-center gap-1"
                        >
                          <RefreshCw className="h-2 w-2" /> Reset Telemetry
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <Pill variant={team.isDisqualified ? "danger" : "success"}>
                        {team.isDisqualified ? "MISSION TERMINATED" : "ENGAGED"}
                      </Pill>
                      {team.warnings > 0 && (
                        <span className="text-[9px] font-bold text-destructive uppercase tracking-tighter flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-2.5 w-2.5" /> {team.warnings} Security Strikes
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setAwardTargetTeam(team);
                          setAwardData({ 
                            points: 0, 
                            reason: "", 
                            roundNumber: team.currentRound || 1 
                          });
                          setShowAwardPointsModal(true);
                        }}
                        className="p-1.5 border border-border hover:border-primary hover:text-primary rounded transition-colors"
                        title="Award Tactical Points"
                      >
                        <Award className="h-4 w-4" />
                      </button>
                      <button
                        title="Pardon Mission Breach (Full Reset)"
                        disabled={pardonMissionBreachMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Issue a full mission pardon for ${team.teamName}? This will reset ALL entries, aborts, and strikes.`)) {
                            pardonMissionBreachMutation.mutate({ teamId: team._id, reinstateIfDisqualified: team.isDisqualified });
                          }
                        }}
                        className="p-1.5 border border-border hover:border-warning hover:text-warning rounded transition-colors"
                      >
                        {pardonMissionBreachMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </button>
                      <button 
                        onClick={() => updateTeamStatusMutation.mutate({ teamId: team._id, isDisqualified: !team.isDisqualified })}
                        className={`p-1.5 border border-border rounded transition-colors ${team.isDisqualified ? 'hover:border-success hover:text-success' : 'hover:border-destructive hover:text-destructive'}`}
                        title={team.isDisqualified ? "Reinstate Squadron" : "Disqualify Squadron"}
                      >
                        {team.isDisqualified ? <Zap className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Surface>

      {/* Award Points Modal */}
      {showAwardPointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Surface className="w-full max-w-md p-6 space-y-6 shadow-2xl border-primary/20">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold">Award Judged Points</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">Target Squadron: <span className="text-primary font-bold">{awardTargetTeam?.teamName}</span></p>
              </div>
              <button onClick={() => setShowAwardPointsModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Assign to Round</label>
                <select 
                  value={awardData.roundNumber}
                  onChange={(e) => setAwardData({ ...awardData, roundNumber: parseInt(e.target.value) || 1 })}
                  className="w-full h-10 bg-secondary border border-border px-3 text-[13px] rounded outline-none"
                >
                  {hackathon?.rounds?.map((r: any) => (
                    <option key={r._id} value={r.roundNumber}>Round {r.roundNumber}: {r.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Points Value</label>
                <input 
                  type="number"
                  value={awardData.points}
                  onChange={(e) => setAwardData({ ...awardData, points: parseInt(e.target.value) || 0 })}
                  className="w-full h-10 bg-secondary border border-border px-4 text-[13px] rounded outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Reason / Feedback Notes</label>
                <textarea
                  value={awardData.reason}
                  onChange={(e) => setAwardData({ ...awardData, reason: e.target.value })}
                  placeholder="Provide brief details on grading justification..."
                  className="w-full h-24 bg-secondary border border-border p-3 text-[13px] rounded outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <button 
                onClick={() => setShowAwardPointsModal(false)}
                className="flex-1 h-10 border border-border hover:bg-secondary text-[12px] font-bold uppercase tracking-wider transition-colors rounded"
              >
                Cancel
              </button>
              <button 
                onClick={() => awardPointsMutation.mutate({ 
                  teamId: awardTargetTeam?._id, 
                  points: awardData.points, 
                  reason: awardData.reason, 
                  roundNumber: awardData.roundNumber 
                })}
                disabled={awardPointsMutation.isPending || !awardData.reason.trim()}
                className="flex-1 h-10 bg-primary text-primary-foreground font-bold uppercase text-[11px] tracking-widest hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-50 rounded"
              >
                {awardPointsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Grant Points</>}
              </button>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}
