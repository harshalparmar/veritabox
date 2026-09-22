import React from "react";
import { Surface, Stat } from "@/components/VeritaBox/UI";
import { Target, ArrowRight, RefreshCw, Loader2, Shield } from "lucide-react";
import LifecycleTimeline from "@/components/VeritaBox/LifecycleTimeline";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { toast } from "sonner";

interface OverviewTabProps {
  id: string;
  hackathon: any;
  leaderboard: any[] | undefined;
}

export default function OverviewTab({ id, hackathon, leaderboard }: OverviewTabProps) {
  const queryClient = useQueryClient();

  const stages = [
    { id: 1, name: "Draft", description: "Admin creates mission, sets rules & rounds. Visible only to command.", status: hackathon?.status === 'Draft' ? 'active' : 'done' as any, badge: "STAGING" },
    { id: 2, name: "Registration", description: "Public listing visible. Squadrons form via leader invite codes.", status: hackathon?.status === 'Announced' ? 'active' : (hackathon?.status === 'Draft' ? 'upcoming' : 'done') as any, badge: "OPEN" },
    { id: 3, name: "Online Rounds", description: "Standardized sequential MCQ tests. Leader submits for the unit.", status: hackathon?.status === 'Live' ? 'active' : (hackathon?.status === 'Concluded' ? 'done' : 'upcoming') as any, badge: "ENGAGED" },
    { id: 4, name: "Shortlisting", description: "Leaderboard verification and final selection for offline arena.", status: 'upcoming' as any, badge: "PENDING" },
    { id: 5, name: "Physical Arena", description: "Final builds and presentation at physical institute site.", status: 'upcoming' as any, badge: "OFFLINE" },
    { id: 6, name: "Archival", description: "Results published, reputation awarded, mission logged.", status: hackathon?.status === 'Concluded' ? 'done' : 'upcoming' as any, badge: "COMPLETE" }
  ];

  const massAdvanceMutation = useMutation({
    mutationFn: (targetRound: number) => hackathonsApi.massAdvance(id, targetRound),
    onSuccess: (res: any) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["admin-leaderboard", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-hackathon", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const syncScoresMutation = useMutation({
    mutationFn: () => hackathonsApi.syncAllScores(id),
    onSuccess: (res: any) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["admin-leaderboard", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Total Squadrons" value={leaderboard?.length || 0} />
          <Stat label="Total Operatives" value={hackathon?.totalParticipants || 0} />
          <Stat label="Intel Bank" value={hackathon?.questionsCount || 0} hint="Total Questions" />
        </div>
        
        <Surface className="p-6">
          <h3 className="text-[14px] font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Mission Lifecycle
          </h3>
          <LifecycleTimeline stages={stages} />
        </Surface>
      </div>
      
      <div className="space-y-6">
        <Surface className="p-6">
          <h3 className="text-[12px] font-bold uppercase tracking-widest mb-4">Mission Parameters</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border/40 text-[13px]">
              <span className="text-muted-foreground">Institute Scope</span>
              <span className="font-mono text-primary">{hackathon?.chapterScope || "Local"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/40 text-[13px]">
              <span className="text-muted-foreground">Max Units</span>
              <span className="font-mono text-primary">{hackathon?.maxTeams || 100}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/40 text-[13px]">
              <span className="text-muted-foreground">Team Size</span>
              <span className="font-mono text-primary">1–5 Members</span>
            </div>
          </div>
        </Surface>

        <Surface className="p-5 border-destructive/20 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive font-bold text-[11px] uppercase mb-4">
            <Shield className="h-3.5 w-3.5" /> High-Clearance Actions
          </div>
          <div className="space-y-2">
            {hackathon?.rounds?.map((r: any) => (
              <button 
                key={r._id}
                onClick={() => {
                  if (window.confirm(`Move ALL squadrons to ${r.title} (Round ${r.roundNumber})?`)) {
                    massAdvanceMutation.mutate(r.roundNumber);
                  }
                }}
                disabled={massAdvanceMutation.isPending}
                className="w-full h-10 border border-primary/40 text-primary text-[11px] font-bold uppercase hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {massAdvanceMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                Advance to Round {r.roundNumber}
              </button>
            ))}
            <button 
              onClick={() => {
                if (window.confirm("Perform Global Score Synchronization? This will recalculate scores for ALL squadrons based on mission telemetry.")) {
                  syncScoresMutation.mutate();
                }
              }}
              disabled={syncScoresMutation.isPending}
              className="w-full h-10 border border-primary/40 text-primary text-[11px] font-bold uppercase hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {syncScoresMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} 
              Force Global Score Sync
            </button>
          </div>
        </Surface>
      </div>
    </div>
  );
}
