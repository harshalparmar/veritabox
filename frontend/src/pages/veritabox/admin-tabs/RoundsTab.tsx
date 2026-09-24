import React, { useState } from "react";
import { Surface } from "@/components/veritabox/UI";
import { Clock, Plus, Calendar, Globe, Shield, Trash2, Settings, Play, Pause, CheckCircle2, X, Loader2, Target } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi, forgeApi } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface RoundsTabProps {
  id: string;
  hackathon: any;
}

export default function RoundsTab({ id, hackathon }: RoundsTabProps) {
  const queryClient = useQueryClient();
  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [editingRoundIndex, setEditingRoundIndex] = useState<number | null>(null);

  const [newRound, setNewRound] = useState<any>({
    title: "",
    startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endTime: format(new Date(Date.now() + 86400000), "yyyy-MM-dd'T'HH:mm"),
    durationMinutes: 60,
    qualifyingThreshold: 50,
    type: "Online MCQ",
    snapshotInterval: 0,
    submissionConfig: { maxAttempts: 1, requiredFields: [] },
    codingContestConfig: { challengeIds: [], penaltyMinutes: 20 }
  });

  const { data: allChallenges } = useQuery({
    queryKey: ["forge-challenges-all"],
    queryFn: () => forgeApi.getAll({ all: true }),
    enabled: newRound.type === "Coding Contest",
  });

  const updateRoundsMutation = useMutation({
    mutationFn: (data: any[]) => hackathonsApi.updateRounds(id, data),
    onSuccess: () => {
      toast.success("Rounds timeline updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-hackathon", id] });
      setShowAddRoundModal(false);
      setEditingRoundIndex(null);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const pauseRoundMutation = useMutation({
    mutationFn: (roundNumber: number) => hackathonsApi.terminateRound(id, roundNumber),
    onSuccess: () => {
      toast.warning("Round execution suspended.");
      queryClient.invalidateQueries({ queryKey: ["admin-hackathon", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const resumeRoundMutation = useMutation({
    mutationFn: (roundNumber: number) => hackathonsApi.resumeRound(id, roundNumber),
    onSuccess: () => {
      toast.success("Round execution resumed.");
      queryClient.invalidateQueries({ queryKey: ["admin-hackathon", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const closeRoundMutation = useMutation({
    mutationFn: (roundNumber: number) => hackathonsApi.closeRound(id, roundNumber),
    onSuccess: () => {
      toast.success("Round successfully closed.");
      queryClient.invalidateQueries({ queryKey: ["admin-hackathon", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleAppendRound = () => {
    const rounds = [...(hackathon?.rounds || [])];
    
    if (editingRoundIndex !== null) {
      rounds[editingRoundIndex] = { 
        ...rounds[editingRoundIndex], 
        ...newRound 
      };
    } else {
      const nextNumber = rounds.length + 1;
      rounds.push({ ...newRound, roundNumber: nextNumber });
    }
    
    updateRoundsMutation.mutate(rounds);
  };

  const handleRemoveRound = (roundId: string) => {
    if (!confirm("Are you sure you want to remove this round? This will disconnect any associated questions.")) return;
    const rounds = hackathon?.rounds.filter((r: any) => r._id !== roundId) || [];
    updateRoundsMutation.mutate(rounds);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold uppercase tracking-widest flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Timeline Configuration
        </h3>
        <button 
          onClick={() => {
            setEditingRoundIndex(null);
            setNewRound({
              title: "",
              startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
              endTime: format(new Date(Date.now() + 86400000), "yyyy-MM-dd'T'HH:mm"),
              durationMinutes: 60,
              qualifyingThreshold: 50,
              type: "Online MCQ",
              snapshotInterval: 0,
              submissionConfig: { maxAttempts: 1, requiredFields: [] },
              codingContestConfig: { challengeIds: [], penaltyMinutes: 20 }
            });
            setShowAddRoundModal(true);
          }}
          className="text-[11px] h-8 px-4 bg-secondary border border-border hover:bg-secondary/80 rounded flex items-center gap-2 font-bold uppercase tracking-wider transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Append Round
        </button>
      </div>
      
      <div className="space-y-4">
        {hackathon?.rounds?.map((r: any, idx: number) => (
          <Surface key={r._id} className={`p-5 relative group/round ${r.status === 'Live' ? 'border-destructive/40 ring-1 ring-destructive/20' : ''}`}>
            {r.status === 'Live' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive" />}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground font-bold">R{idx + 1}</span>
                  <h4 className="text-[15px] font-bold inline-flex items-center gap-2">
                    {r.title}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${r.type === 'Online MCQ' ? 'border-primary/40 text-primary bg-primary/5' : 'border-warning/40 text-warning bg-warning/5'}`}>
                      {r.type || 'Online MCQ'}
                    </span>
                  </h4>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(r.startTime).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.durationMinutes} min</span>
                  {r.type === 'Online MCQ' && <span className="flex items-center gap-1 font-bold text-primary"><Target className="h-3 w-3" /> {r.qualifyingThreshold}+ pts</span>}
                  {r.snapshotInterval > 0 && <span className="flex items-center gap-1 font-bold text-destructive"><Shield className="h-3 w-3" /> {r.snapshotInterval}m Snapshots</span>}
                  <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {r.type?.includes('Offline') || r.type?.includes('Physical') ? 'Physical Site' : 'Digital Arena'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase ${
                  r.status === 'Live' ? 'border-destructive/40 text-destructive bg-destructive/5' : 
                  r.status === 'Closed' ? 'border-border text-muted-foreground bg-secondary/10' : 
                  r.status === 'Scheduled' ? 'border-warning/40 text-warning bg-warning/5' : 
                  'border-border/40 text-muted-foreground'
                }`}>
                  {r.status}
                </span>

                <div className="flex items-center gap-1.5 border-l border-border/60 pl-3">
                  {r.status !== 'Live' && r.status !== 'Closed' && (
                    <button
                      title="Go Live"
                      disabled={resumeRoundMutation.isPending}
                      onClick={() => resumeRoundMutation.mutate(r.roundNumber)}
                      className="p-1.5 text-success hover:bg-success/10 rounded transition-colors"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  {r.status === 'Live' && (
                    <button
                      title="Pause Round"
                      disabled={pauseRoundMutation.isPending}
                      onClick={() => pauseRoundMutation.mutate(r.roundNumber)}
                      className="p-1.5 text-warning hover:bg-warning/10 rounded transition-colors"
                    >
                      <Pause className="h-4 w-4" />
                    </button>
                  )}
                  {r.status !== 'Closed' && (
                    <button
                      title="Close Round (unlock debrief)"
                      disabled={closeRoundMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Close Round ${r.roundNumber}? This will lock submissions and unlock explanations.`)) {
                          closeRoundMutation.mutate(r.roundNumber);
                        }
                      }}
                      className="p-1.5 text-muted-foreground hover:text-primary rounded transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setEditingRoundIndex(idx);
                      setNewRound({
                        title: r.title,
                        startTime: format(new Date(r.startTime), "yyyy-MM-dd'T'HH:mm"),
                        endTime: format(new Date(r.endTime), "yyyy-MM-dd'T'HH:mm"),
                        durationMinutes: r.durationMinutes,
                        qualifyingThreshold: r.qualifyingThreshold,
                        type: r.type,
                        snapshotInterval: r.snapshotInterval,
                        submissionConfig: r.submissionConfig || { maxAttempts: 1, requiredFields: [] },
                        codingContestConfig: r.codingContestConfig || { challengeIds: [], penaltyMinutes: 20 }
                      });
                      setShowAddRoundModal(true);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-primary opacity-0 group-hover/round:opacity-100 transition-opacity"
                    title="Edit round settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleRemoveRound(r._id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover/round:opacity-100 transition-opacity"
                    title="Delete round"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </Surface>
        ))}
        {hackathon?.rounds?.length === 0 && (
          <div className="py-12 border border-dashed border-border rounded-lg text-center">
            <p className="text-muted-foreground text-[13px]">No rounds defined for this mission.</p>
          </div>
        )}
      </div>

      {/* Append/Edit Round Modal */}
      {showAddRoundModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md p-4 overflow-hidden">
          <Surface className="w-full max-w-2xl flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-primary/20 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-border/50 shrink-0 bg-secondary/10">
              <h3 className="text-[15px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Settings className="h-4 w-4" /> 
                {editingRoundIndex !== null ? `Modify Round ${editingRoundIndex + 1}` : "Append Round Sequence"}
              </h3>
              <button onClick={() => setShowAddRoundModal(false)} className="h-8 w-8 rounded flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Round Title</label>
                  <input 
                    value={newRound.title} 
                    onChange={(e) => setNewRound({ ...newRound, title: e.target.value })}
                    placeholder="e.g. MCQ Diagnostic / Physical Build" 
                    className="w-full h-10 bg-secondary/30 border border-border/60 px-4 text-[13px] rounded outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Round Type</label>
                  <select 
                    value={newRound.type}
                    onChange={(e) => setNewRound({ ...newRound, type: e.target.value })}
                    className="w-full h-10 bg-secondary/30 border border-border/60 px-3 text-[13px] rounded outline-none focus:border-primary/50 transition-colors"
                  >
                    <option value="Online MCQ">Online MCQ</option>
                    <option value="Offline Assessment">Offline Assessment</option>
                    <option value="Presentation">Presentation</option>
                    <option value="Physical Build">Physical Build</option>
                    <option value="Report Submission">Report Submission</option>
                    <option value="Data Challenge">Data Challenge</option>
                    <option value="Coding Contest">Coding Contest</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Snapshot Interval (min)</label>
                  <input 
                    type="number"
                    value={newRound.snapshotInterval} 
                    onChange={(e) => setNewRound({ ...newRound, snapshotInterval: parseInt(e.target.value) || 0 })}
                    placeholder="0 for disabled" 
                    className="w-full h-10 bg-secondary/30 border border-border/60 px-4 text-[13px] rounded outline-none focus:border-primary/50 transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Start Time</label>
                  <input 
                    type="datetime-local" 
                    value={newRound.startTime} 
                    onChange={(e) => setNewRound({ ...newRound, startTime: e.target.value })}
                    className="w-full h-10 bg-secondary/30 border border-border/60 px-4 text-[13px] rounded outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">End Time</label>
                  <input 
                    type="datetime-local" 
                    value={newRound.endTime} 
                    onChange={(e) => setNewRound({ ...newRound, endTime: e.target.value })}
                    className="w-full h-10 bg-secondary/30 border border-border/60 px-4 text-[13px] rounded outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Duration (Minutes)</label>
                  <input 
                    type="number" 
                    value={newRound.durationMinutes} 
                    onChange={(e) => setNewRound({ ...newRound, durationMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full h-10 bg-secondary/30 border border-border/60 px-4 text-[13px] rounded outline-none focus:border-primary/50 transition-colors font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Qualifying Score</label>
                  <input 
                    type="number" 
                    value={newRound.qualifyingThreshold} 
                    onChange={(e) => setNewRound({ ...newRound, qualifyingThreshold: parseInt(e.target.value) || 0 })}
                    className="w-full h-10 bg-secondary/30 border border-border/60 px-4 text-[13px] rounded outline-none focus:border-primary/50 transition-colors font-mono"
                  />
                </div>
              </div>

              {(newRound.type === "Report Submission" || newRound.type === "Data Challenge") && (
                <div className="space-y-4 p-4 bg-secondary/10 border border-border/40 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 border-b border-border/50 pb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-primary">Submission Configuration</h4>
                  </div>
                  
                  <div className="space-y-1.5 max-w-[50%]">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Max Attempts</label>
                    <input
                      type="number" min={1} max={20}
                      value={newRound.submissionConfig?.maxAttempts || 1}
                      onChange={(e) => setNewRound({ ...newRound, submissionConfig: { ...newRound.submissionConfig, maxAttempts: parseInt(e.target.value) || 1 } })}
                      className="w-full h-9 bg-background border border-border/60 px-3 text-[12px] rounded outline-none font-mono focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Required Fields Schema</label>
                      <button
                        type="button"
                        onClick={() => {
                          const fields = [...(newRound.submissionConfig?.requiredFields || []), { fieldName: "", fieldType: "text", required: true }];
                          setNewRound({ ...newRound, submissionConfig: { ...newRound.submissionConfig, requiredFields: fields } });
                        }}
                        className="text-[9px] h-6 px-2 bg-primary/10 text-primary hover:bg-primary/20 rounded font-bold uppercase transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add Field
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(newRound.submissionConfig?.requiredFields || []).map((field: any, fi: number) => (
                        <div key={fi} className="flex gap-2 items-center p-2 bg-background border border-border/40 rounded group">
                          <input
                            placeholder="Field label (e.g. GitHub URL)"
                            value={field.fieldName}
                            onChange={(e) => {
                              const fields = [...newRound.submissionConfig.requiredFields];
                              fields[fi] = { ...fields[fi], fieldName: e.target.value };
                              setNewRound({ ...newRound, submissionConfig: { ...newRound.submissionConfig, requiredFields: fields } });
                            }}
                            className="flex-1 h-8 bg-transparent border-none px-2 text-[12px] rounded outline-none placeholder:text-muted-foreground/40"
                          />
                          <div className="h-4 w-px bg-border/60" />
                          <select
                            value={field.fieldType}
                            onChange={(e) => {
                              const fields = [...newRound.submissionConfig.requiredFields];
                              fields[fi] = { ...fields[fi], fieldType: e.target.value };
                              setNewRound({ ...newRound, submissionConfig: { ...newRound.submissionConfig, requiredFields: fields } });
                            }}
                            className="h-8 bg-transparent border-none text-muted-foreground px-2 text-[11px] rounded outline-none w-28 cursor-pointer"
                          >
                            <option value="text">Short Text</option>
                            <option value="textarea">Paragraph</option>
                            <option value="url">URL Link</option>
                            <option value="file">File Upload</option>
                            <option value="select">Dropdown</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const fields = newRound.submissionConfig.requiredFields.filter((_: any, i: number) => i !== fi);
                              setNewRound({ ...newRound, submissionConfig: { ...newRound.submissionConfig, requiredFields: fields } });
                            }}
                            className="h-6 w-6 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center opacity-50 group-hover:opacity-100 transition-all shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {(newRound.submissionConfig?.requiredFields || []).length === 0 && (
                        <div className="text-[11px] text-muted-foreground/60 text-center py-4 border border-dashed border-border/40 rounded">
                          No submission fields defined.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {newRound.type === "Coding Contest" && (
                <div className="space-y-4 p-4 bg-secondary/10 border border-border/40 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 border-b border-border/50 pb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-primary">Algorithmic Contest Configuration</h4>
                  </div>
                  
                  <div className="space-y-1.5 max-w-[50%]">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Time Penalty (per wrong attempt)</label>
                    <input
                      type="number" min={0}
                      value={newRound.codingContestConfig?.penaltyMinutes ?? 20}
                      onChange={(e) => setNewRound({ ...newRound, codingContestConfig: { ...newRound.codingContestConfig, penaltyMinutes: parseInt(e.target.value) || 0 } })}
                      className="w-full h-9 bg-background border border-border/60 px-3 text-[12px] rounded outline-none font-mono focus:border-primary/50 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        Forge Challenges <span className="text-primary">({newRound.codingContestConfig?.challengeIds?.length || 0} selected)</span>
                      </label>
                    </div>
                    
                    <div className="max-h-[200px] overflow-y-auto space-y-1.5 border border-border/50 rounded-md p-2 bg-background custom-scrollbar shadow-inner">
                      {(allChallenges as any[] || []).map((ch: any) => {
                        const selected = (newRound.codingContestConfig?.challengeIds || []).includes(ch._id);
                        return (
                          <label key={ch._id} className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-colors ${selected ? 'bg-primary/5 border-primary/40' : 'border-transparent hover:bg-secondary/40'}`}>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => {
                                  const ids = [...(newRound.codingContestConfig?.challengeIds || [])];
                                  if (selected) {
                                    const idx = ids.indexOf(ch._id);
                                    ids.splice(idx, 1);
                                  } else {
                                    ids.push(ch._id);
                                  }
                                  setNewRound({ ...newRound, codingContestConfig: { ...newRound.codingContestConfig, challengeIds: ids } });
                                }}
                                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/50 cursor-pointer"
                              />
                              <span className={`text-[12px] ${selected ? 'font-bold text-foreground' : 'text-foreground/80'}`}>{ch.title}</span>
                            </div>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-widest font-bold shrink-0 ${
                              ch.difficulty === 'Easy' ? 'border-green-500/30 text-green-500 bg-green-500/5' :
                              ch.difficulty === 'Medium' ? 'border-warning/30 text-warning bg-warning/5' :
                              'border-destructive/30 text-destructive bg-destructive/5'
                            }`}>
                              {ch.difficulty}
                            </span>
                          </label>
                        );
                      })}
                      {(!allChallenges || (allChallenges as any[]).length === 0) && (
                        <p className="text-[11px] text-muted-foreground text-center py-6">No Forge challenges found. Create challenges in Code Forge first.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-border/50 bg-secondary/5 shrink-0">
              <button 
                onClick={() => setShowAddRoundModal(false)}
                className="flex-1 h-10 border border-border/60 hover:bg-secondary text-[11px] text-muted-foreground hover:text-foreground font-bold uppercase tracking-widest transition-colors rounded"
              >
                Cancel
              </button>
              <button 
                onClick={handleAppendRound}
                disabled={!newRound.title || updateRoundsMutation.isPending}
                className="flex-1 h-10 bg-primary text-primary-foreground font-bold uppercase text-[11px] tracking-widest hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-50 rounded shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all"
              >
                {updateRoundsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Sequence"}
              </button>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}
