import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import { Loader2, Upload, CheckCircle2, AlertCircle, FileText, Send } from "lucide-react";
import { toast } from "sonner";

export default function RoundSubmissionForm() {
  const { id, roundNumber } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const rn = parseInt(roundNumber || "1");

  const { data: hackathon, isLoading: loadingH } = useQuery({
    queryKey: ["hackathon-id", id],
    queryFn: () => hackathonsApi.getById(id!),
    enabled: !!id,
  });

  const { data: submissions = [], isLoading: loadingSubs } = useQuery({
    queryKey: ["round-submissions", id, rn],
    queryFn: () => hackathonsApi.getMyRoundSubmissions(id!, rn),
    enabled: !!id,
  });

  const round = hackathon?.rounds?.find((r: any) => r.roundNumber === rn);
  const config = round?.submissionConfig;
  const maxAttempts = config?.maxAttempts || 1;
  const requiredFields = config?.requiredFields || [];
  const attemptsUsed = submissions.length;
  const canSubmit = attemptsUsed < maxAttempts && round?.status === "Live";

  const [fields, setFields] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const submitMutation = useMutation({
    mutationFn: () => hackathonsApi.submitRound(id!, rn, { fields, files }),
    onSuccess: () => {
      toast.success("Submission recorded.");
      queryClient.invalidateQueries({ queryKey: ["round-submissions", id, rn] });
      setFields({});
      setFiles([]);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleFileUpload = async (fieldName: string, file: File) => {
    setIsUploading(true);
    const form = new FormData();
    form.append("document", file);
    try {
      const res = await hackathonsApi.uploadDocument(form);
      if (fieldName) {
        setFields((prev) => ({ ...prev, [fieldName]: res.filePath }));
      } else {
        setFiles((prev) => [...prev, res.filePath]);
      }
      toast.success("File uploaded.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (loadingH || loadingSubs) {
    return (
      <VeritaBoxLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </VeritaBoxLayout>
    );
  }

  if (!hackathon || !round) {
    return (
      <VeritaBoxLayout>
        <PageContent>
          <div className="text-center py-20 text-muted-foreground">Round not found.</div>
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  return (
    <VeritaBoxLayout>
      <PageContent className="max-w-3xl mx-auto py-8">
        <div className="mb-6">
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{hackathon.title}</div>
          <h1 className="text-2xl font-bold tracking-tight">{round.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Pill variant={round.status === "Live" ? "danger" : "primary"}>{round.status}</Pill>
            <span className="text-xs text-muted-foreground font-mono">
              Attempt {attemptsUsed + 1} of {maxAttempts}
            </span>
          </div>
        </div>

        {/* Past submissions */}
        {submissions.length > 0 && (
          <Surface className="mb-6 p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Previous Submissions</h3>
            <div className="space-y-2">
              {submissions.map((sub: any) => (
                <div key={sub._id} className="flex items-center justify-between p-3 bg-secondary/30 rounded border border-border">
                  <div>
                    <div className="text-sm font-bold">Attempt #{sub.attemptNumber}</div>
                    <div className="text-xs text-muted-foreground">{new Date(sub.submittedAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.score !== undefined && sub.score !== null && (
                      <span className="text-sm font-mono font-bold text-primary">{sub.score} pts</span>
                    )}
                    <Pill variant={sub.status === "Scored" ? "success" : sub.status === "Rejected" ? "danger" : "warning"}>
                      {sub.status}
                    </Pill>
                  </div>
                </div>
              ))}
            </div>
          </Surface>
        )}

        {/* Submission form */}
        {canSubmit ? (
          <Surface className="p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Send className="h-4 w-4" /> New Submission
            </h3>

            {requiredFields.map((rf: any) => (
              <div key={rf.fieldName} className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {rf.fieldName} {rf.required && <span className="text-destructive">*</span>}
                </label>
                {rf.fieldType === "textarea" ? (
                  <textarea
                    value={fields[rf.fieldName] || ""}
                    onChange={(e) => setFields({ ...fields, [rf.fieldName]: e.target.value })}
                    maxLength={rf.maxLength || undefined}
                    className="w-full h-24 bg-card border border-border p-3 text-sm rounded resize-none"
                    placeholder={rf.fieldName}
                  />
                ) : rf.fieldType === "select" ? (
                  <select
                    value={fields[rf.fieldName] || ""}
                    onChange={(e) => setFields({ ...fields, [rf.fieldName]: e.target.value })}
                    className="w-full h-9 bg-card border border-border px-3 text-sm rounded"
                  >
                    <option value="">Select...</option>
                    {(rf.options || []).map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : rf.fieldType === "file" ? (
                  <div>
                    <input
                      type="file"
                      onChange={(e) => e.target.files && handleFileUpload(rf.fieldName, e.target.files[0])}
                      className="text-sm"
                    />
                    {fields[rf.fieldName] && (
                      <div className="text-xs text-success mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Uploaded
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type={rf.fieldType === "url" ? "url" : "text"}
                    value={fields[rf.fieldName] || ""}
                    onChange={(e) => setFields({ ...fields, [rf.fieldName]: e.target.value })}
                    maxLength={rf.maxLength || undefined}
                    className="w-full h-9 bg-card border border-border px-3 text-sm rounded"
                    placeholder={rf.fieldName}
                  />
                )}
                {rf.maxLength && (
                  <div className="text-[10px] text-muted-foreground text-right">
                    {(fields[rf.fieldName] || "").length} / {rf.maxLength}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => {
                const missing = requiredFields.filter((rf: any) => rf.required && !fields[rf.fieldName]?.trim());
                if (missing.length > 0) {
                  toast.error(`Please fill in: ${missing.map((f: any) => f.fieldName).join(', ')}`);
                  return;
                }
                submitMutation.mutate();
              }}
              disabled={submitMutation.isPending || isUploading}
              className="w-full py-3 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-xs rounded hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Submit (Attempt #{attemptsUsed + 1})
                </>
              )}
            </button>
          </Surface>
        ) : (
          <Surface className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {round.status !== "Live"
                ? "This round is not currently accepting submissions."
                : `Maximum attempts reached (${maxAttempts}).`}
            </p>
          </Surface>
        )}
      </PageContent>
    </VeritaBoxLayout>
  );
}
