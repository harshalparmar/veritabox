import { useState } from "react";
import { Surface } from "@/components/veritabox/UI";
import { ChevronDown, ChevronRight, Download, ExternalLink, FileText, Loader2, MessageSquare, Save, Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi, resolveAssetUrl } from "@/lib/api";
import { toast } from "sonner";

interface SubmissionsTabProps {
  id: string;
  hackathon: any;
}

export default function SubmissionsTab({ id, hackathon }: SubmissionsTabProps) {
  const queryClient = useQueryClient();
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [scoring, setScoring] = useState<Record<string, { score: string; feedback: string; status: string }>>({});

  const submittableRounds = (hackathon?.rounds || []).filter(
    (r: any) => r.type === "Report Submission" || r.type === "Data Challenge"
  );

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["admin-round-submissions", id, selectedRound],
    queryFn: () => hackathonsApi.adminGetRoundSubmissions(id, selectedRound!),
    enabled: selectedRound !== null,
  });

  const scoreMutation = useMutation({
    mutationFn: ({ subId, data }: { subId: string; data: any }) =>
      hackathonsApi.adminScoreRoundSubmission(id, selectedRound!, subId, data),
    onSuccess: () => {
      toast.success("Submission scored.");
      queryClient.invalidateQueries({ queryKey: ["admin-round-submissions", id, selectedRound] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleScore = (subId: string) => {
    const s = scoring[subId];
    if (!s) return;
    scoreMutation.mutate({
      subId,
      data: {
        score: s.score ? parseFloat(s.score) : undefined,
        feedback: s.feedback || undefined,
        status: s.status || "Scored",
      },
    });
  };

  if (submittableRounds.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground text-[13px]">No submission-based rounds configured for this mission.</p>
        <p className="text-muted-foreground text-[11px] mt-1">Add a "Report Submission" or "Data Challenge" round in the Timeline tab.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-[10px] text-muted-foreground font-bold uppercase">Round</label>
        <select
          value={selectedRound ?? ""}
          onChange={(e) => {
            setSelectedRound(e.target.value ? parseInt(e.target.value) : null);
            setExpandedSub(null);
          }}
          className="h-9 bg-secondary border border-border px-3 text-[12px] rounded outline-none min-w-[200px]"
        >
          <option value="">Select a round...</option>
          {submittableRounds.map((r: any) => (
            <option key={r.roundNumber} value={r.roundNumber}>
              R{r.roundNumber}: {r.title} ({r.type})
            </option>
          ))}
        </select>
      </div>

      {selectedRound !== null && isLoading && (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {selectedRound !== null && !isLoading && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            {(submissions as any[])?.length || 0} submission(s) found
          </p>

          {(submissions as any[] || []).map((sub: any) => {
            const isExpanded = expandedSub === sub._id;
            const s = scoring[sub._id] || { score: sub.score?.toString() || "", feedback: sub.feedback || "", status: sub.status || "Submitted" };

            return (
              <Surface key={sub._id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedSub(isExpanded ? null : sub._id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold truncate">
                        {sub.teamId?.name || "Unknown Team"}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        by {sub.submittedBy?.displayName || "Unknown"} · Attempt {sub.attemptNumber} · {new Date(sub.submittedAt || sub.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {sub.score != null && (
                      <span className="text-[12px] font-mono font-bold text-primary">{sub.score} pts</span>
                    )}
                    <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase ${
                      sub.status === "Scored" ? "border-primary/40 text-primary bg-primary/5" :
                      sub.status === "Rejected" ? "border-destructive/40 text-destructive bg-destructive/5" :
                      sub.status === "Under Review" ? "border-warning/40 text-warning bg-warning/5" :
                      "border-border text-muted-foreground"
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4 bg-secondary/10">
                    {sub.fields && Object.keys(sub.fields).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Submitted Fields
                        </h4>
                        <div className="grid gap-2">
                          {Object.entries(sub.fields).map(([key, value]: [string, any]) => (
                            <div key={key} className="p-3 bg-background border border-border rounded">
                              <div className="text-[9px] uppercase font-bold text-muted-foreground mb-1">{key}</div>
                              {String(value).startsWith("http") ? (
                                <a href={String(value)} target="_blank" rel="noreferrer" className="text-[12px] text-primary hover:underline inline-flex items-center gap-1">
                                  {String(value).split("/").pop()} <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <p className="text-[12px] whitespace-pre-wrap">{String(value)}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sub.files && sub.files.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                          <Download className="h-3 w-3" /> Uploaded Files
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {sub.files.map((file: string, i: number) => (
                            <a
                              key={i}
                              href={resolveAssetUrl(file)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] px-3 py-1.5 bg-background border border-border rounded hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
                            >
                              <Download className="h-3 w-3" /> {file.split("/").pop()}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-border pt-4 space-y-3">
                      <h4 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3" /> Scoring
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-muted-foreground">Status</label>
                          <select
                            value={s.status}
                            onChange={(e) => setScoring({ ...scoring, [sub._id]: { ...s, status: e.target.value } })}
                            className="w-full h-8 bg-background border border-border px-2 text-[11px] rounded outline-none"
                          >
                            <option value="Submitted">Submitted</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Scored">Scored</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-muted-foreground">Score</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={s.score}
                            onChange={(e) => setScoring({ ...scoring, [sub._id]: { ...s, score: e.target.value } })}
                            className="w-full h-8 bg-background border border-border px-2 text-[11px] rounded outline-none font-mono"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => handleScore(sub._id)}
                            disabled={scoreMutation.isPending}
                            className="h-8 px-4 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest rounded hover:brightness-110 flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {scoreMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Save className="h-3 w-3" /> Save</>}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> Feedback
                        </label>
                        <textarea
                          value={s.feedback}
                          onChange={(e) => setScoring({ ...scoring, [sub._id]: { ...s, feedback: e.target.value } })}
                          placeholder="Optional feedback for the team..."
                          className="w-full h-20 bg-background border border-border p-2 text-[11px] rounded outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </Surface>
            );
          })}

          {(!submissions || (submissions as any[]).length === 0) && (
            <div className="py-12 border border-dashed border-border rounded-lg text-center">
              <p className="text-muted-foreground text-[13px]">No submissions received for this round yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
