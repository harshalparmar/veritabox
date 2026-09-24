import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AdminLayout } from "@/components/veritabox/AdminLayout";
import { PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface } from "@/components/veritabox/UI";
import { 
  Info, Clock, Target, Users, Shield, Settings, Command, FileText,
  ArrowLeft, Zap, Lock, Award, Loader2, Trash2, Plus, Trophy, X, Save
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { toast } from "sonner";

// Tab Subcomponents
import OverviewTab from "./admin-tabs/OverviewTab";
import SettingsTab from "./admin-tabs/SettingsTab";
import RoundsTab from "./admin-tabs/RoundsTab";
import QuestionsTab from "./admin-tabs/QuestionsTab";
import SquadronsTab from "./admin-tabs/SquadronsTab";
import AuditTab from "./admin-tabs/AuditTab";
import SubmissionsTab from "./admin-tabs/SubmissionsTab";

type TabType = "overview" | "rounds" | "questions" | "squadron" | "submissions" | "audit" | "settings";

export default function AdminHackathonManagement() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showReputationModal, setShowReputationModal] = useState(false);
  const [reputationTiers, setReputationTiers] = useState<Array<{ rank: number; points: number }>>([
    { rank: 1, points: 500 },
    { rank: 2, points: 300 },
    { rank: 3, points: 100 },
  ]);

  // Main Queries
  const { data: hackathon, isLoading: loadingHackathon } = useQuery({
    queryKey: ["admin-hackathon", id],
    queryFn: () => hackathonsApi.getById(id!),
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["admin-leaderboard", id],
    queryFn: () => hackathonsApi.getLeaderboard(id!),
  });

  // Global Mutations
  const announceMutation = useMutation({
    mutationFn: () => hackathonsApi.announce(id!),
    onSuccess: () => {
      toast.success("MISSION_SIGNAL_TRANSMITTED to all operatives.");
      queryClient.invalidateQueries({ queryKey: ["admin-hackathon", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const concludeMutation = useMutation({
    mutationFn: () => hackathonsApi.conclude(id!),
    onSuccess: () => {
      toast.success("MISSION_CONCLUDED: Hackathon has been officially closed.");
      queryClient.invalidateQueries({ queryKey: ["admin-hackathon", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const awardReputationMutation = useMutation({
    mutationFn: () => hackathonsApi.awardReputation(id!, reputationTiers),
    onSuccess: (res: any) => {
      toast.success(`Reputation awarded to ${res.awards?.length ?? 0} operatives.`);
      setShowReputationModal(false);
      queryClient.invalidateQueries({ queryKey: ["admin-hackathon", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  if (loadingHackathon) {
    return (
      <AdminLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!hackathon) {
    return (
      <AdminLayout>
        <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
          <h3 className="text-lg font-bold">Hackathon mission context not found.</h3>
          <Link to={`/cmd/hackathons`} className="text-primary hover:underline">Return to operations register</Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageContent>
        {/* Global Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <Link to={`/cmd/hackathons`} className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Registry
            </Link>
            
            <div className="h-4 w-px bg-border/60 hidden sm:block" />
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => announceMutation.mutate()}
                disabled={hackathon.status !== 'Draft' || announceMutation.isPending}
                className="text-[10px] h-8 px-3 bg-primary text-primary-foreground font-bold uppercase tracking-widest hover:brightness-110 flex items-center gap-2 disabled:opacity-50 rounded transition-all"
              >
                <Zap className="h-3.5 w-3.5" /> Broadcast
              </button>
              {hackathon.status === 'Live' && (
                <button
                  onClick={() => {
                    if (window.confirm("Conclude this hackathon? This permanently closes all active operations and cannot be undone.")) {
                      concludeMutation.mutate();
                    }
                  }}
                  disabled={concludeMutation.isPending}
                  className="text-[10px] h-8 px-3 bg-destructive text-white font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 rounded transition-all"
                >
                  <Lock className="h-3.5 w-3.5" /> Conclude
                </button>
              )}
              {hackathon.status === 'Concluded' && !hackathon.reputationAwarded && (
                <button
                  onClick={() => setShowReputationModal(true)}
                  className="text-[10px] h-8 px-3 bg-warning/20 border border-warning/45 text-warning font-bold uppercase tracking-widest hover:bg-warning/30 flex items-center gap-2 rounded transition-all"
                >
                  <Award className="h-3.5 w-3.5" /> Award Reputation
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: "overview", label: "Overview" },
              { id: "rounds", label: "Timeline" },
              { id: "questions", label: "Questions" },
              { id: "squadron", label: "Squadrons" },
              { id: "submissions", label: "Submissions" },
              { id: "audit", label: "Audit" },
              { id: "settings", label: "CMS Settings" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? "bg-foreground text-background border-foreground font-medium" 
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary font-medium"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Renderers */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-350">
          {activeTab === "overview" && (
            <OverviewTab id={id!} hackathon={hackathon} leaderboard={leaderboard} />
          )}
          {activeTab === "rounds" && (
            <RoundsTab id={id!} hackathon={hackathon} />
          )}
          {activeTab === "questions" && (
            <QuestionsTab id={id!} hackathon={hackathon} />
          )}
          {activeTab === "squadron" && (
            <SquadronsTab id={id!} hackathon={hackathon} />
          )}
          {activeTab === "submissions" && (
            <SubmissionsTab id={id!} hackathon={hackathon} />
          )}
          {activeTab === "audit" && (
            <AuditTab id={id!} />
          )}
          {activeTab === "settings" && (
            <SettingsTab id={id!} hackathon={hackathon} />
          )}
        </div>
      </PageContent>

      {/* Global Reputation Award Modal */}
      {showReputationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Surface className="w-full max-w-md p-6 space-y-6 shadow-2xl border-warning/20">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold">Award Reputation Points</h3>
                <p className="text-[12px] text-muted-foreground">Transfer reputation to top squadrons' user accounts</p>
              </div>
              <button onClick={() => setShowReputationModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {reputationTiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 min-w-[80px]">
                    <Trophy className="h-4 w-4 text-warning" />
                    <span className="text-[12px] font-bold">#{tier.rank}</span>
                  </div>
                  <input
                    type="number"
                    value={tier.points}
                    onChange={(e) => {
                      const updated = [...reputationTiers];
                      updated[idx].points = parseInt(e.target.value) || 0;
                      setReputationTiers(updated);
                    }}
                    className="flex-1 h-9 bg-secondary border border-border px-3 rounded outline-none text-[13px] font-mono"
                    placeholder="Points"
                  />
                  <span className="text-[10px] text-muted-foreground">pts</span>
                  <button
                    onClick={() => setReputationTiers(reputationTiers.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setReputationTiers([...reputationTiers, { rank: reputationTiers.length + 1, points: 50 }])}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-bold"
              >
                <Plus className="h-3.5 w-3.5" /> Add tier
              </button>
            </div>

            <div className="p-3 bg-warning/5 border border-warning/20 rounded text-[11px] text-warning leading-relaxed">
              ⚠ This action is irreversible. Reputation points will be permanently added to each member of the qualifying squadrons' user profiles.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowReputationModal(false)} className="flex-1 h-11 border border-border hover:bg-secondary rounded font-bold text-[12px] uppercase tracking-widest transition-colors">
                Abort
              </button>
              <button
                disabled={awardReputationMutation.isPending || reputationTiers.length === 0}
                onClick={() => awardReputationMutation.mutate()}
                className="flex-1 h-11 bg-warning text-black hover:brightness-105 rounded font-bold text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                {awardReputationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Award className="h-4 w-4" /> Execute Transfer</>}
              </button>
            </div>
          </Surface>
        </div>
      )}
    </AdminLayout>
  );
}
