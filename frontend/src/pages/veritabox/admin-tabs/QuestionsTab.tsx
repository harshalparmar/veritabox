import React, { useState } from "react";
import { Surface, Pill } from "@/components/veritabox/UI";
import { List, Loader2, Edit3, Trash2, Command, Zap, Save, FileUp, X, Upload } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { toast } from "sonner";

interface QuestionsTabProps {
  id: string;
  hackathon: any;
}

export default function QuestionsTab({ id, hackathon }: QuestionsTabProps) {
  const queryClient = useQueryClient();
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkJson, setBulkJson] = useState("");

  const [newQuestion, setNewQuestion] = useState({
    questionText: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
    points: 10,
    roundId: ""
  });

  const { data: questions, isLoading: loadingQuestions } = useQuery({
    queryKey: ["admin-questions", id],
    queryFn: () => hackathonsApi.getQuestionsAdmin(id),
  });

  const addQuestionMutation = useMutation({
    mutationFn: (data: any | any[]) => {
      const questionsArray = Array.isArray(data) ? data : [data];
      const sanitized = questionsArray.map(q => {
        let finalRoundId = q.roundId;
        if (!finalRoundId && q.roundNumber) {
          const csvRndNum = parseInt(q.roundNumber) || 1;
          const matchedRound = hackathon?.rounds?.find((round: any) => round.roundNumber === csvRndNum);
          if (matchedRound) {
            finalRoundId = matchedRound._id;
          }
        }
        if (!finalRoundId) {
          finalRoundId = newQuestion.roundId || hackathon?.rounds?.[0]?._id;
        }
        return {
          ...q,
          roundId: finalRoundId
        };
      });
      return hackathonsApi.addQuestions(id, sanitized);
    },
    onSuccess: () => {
      toast.success("Intelligence artifacts uploaded to bank.");
      setNewQuestion({
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        explanation: "",
        points: 10,
        roundId: newQuestion.roundId // retain selected round
      });
      setBulkJson("");
      setShowBulkImportModal(false);
      queryClient.invalidateQueries({ queryKey: ["admin-questions", id] });
    },
    onError: (err: any) => toast.error(`Intel Failure: ${err.message}`)
  });

  const updateQuestionMutation = useMutation({
    mutationFn: (data: { questionId: string; payload: any }) => 
      hackathonsApi.updateQuestion(id, data.questionId, data.payload),
    onSuccess: () => {
      toast.success("Intelligence artifact successfully updated!");
      setEditingQuestionId(null);
      setNewQuestion({ questionText: "", options: ["", "", "", ""], correctAnswer: "", explanation: "", points: 10, roundId: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-questions", id] });
    },
    onError: (err: any) => toast.error(`Update Failure: ${err.message}`)
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (qId: string) => hackathonsApi.deleteQuestion(id, qId),
    onSuccess: () => {
      toast.success("Artifact purged from bank.");
      queryClient.invalidateQueries({ queryKey: ["admin-questions", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleExportQuestionsCsv = () => {
    if (!questions || questions.length === 0) {
      toast.error("No questions found in this hackathon to export.");
      return;
    }

    try {
      const headers = ["roundNumber", "roundTitle", "questionText", "option1", "option2", "option3", "option4", "correctAnswer", "explanation", "points"];
      const rows = [
        headers,
        ...questions.map((q: any) => {
          const round = hackathon?.rounds?.find((r: any) => r._id === q.roundId);
          return [
            round?.roundNumber || "",
            round?.title || "",
            q.questionText || "",
            q.options?.[0] || "",
            q.options?.[1] || "",
            q.options?.[2] || "",
            q.options?.[3] || "",
            q.correctAnswer || "",
            q.explanation || "",
            q.points || 10
          ];
        })
      ];
      
      const csvContent = rows.map(r => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${hackathon?.slug || "hackathon"}-questions.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Intelligence bank exported to CSV successfully!");
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    }
  };

  const handleBulkImport = () => {
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) {
        toast.error("Format error: Root element must be an array of questions.");
        return;
      }
      addQuestionMutation.mutate(parsed);
    } catch (e: any) {
      toast.error(`JSON parse error: ${e.message}`);
    }
  };

  const handleAddOrUpdateQuestion = () => {
    if (!newQuestion.questionText.trim()) {
      toast.error("Question text is required.");
      return;
    }
    if (!newQuestion.correctAnswer.trim()) {
      toast.error("Correct answer option is required.");
      return;
    }
    if (!newQuestion.roundId) {
      toast.error("Assigned round is required.");
      return;
    }

    if (editingQuestionId) {
      updateQuestionMutation.mutate({
        questionId: editingQuestionId,
        payload: newQuestion
      });
    } else {
      addQuestionMutation.mutate(newQuestion);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 max-w-6xl">
      <div className="space-y-6">
        <h3 className="text-[14px] font-bold uppercase tracking-widest flex items-center gap-2 mb-4">
          <List className="h-4 w-4 text-primary" /> Banked MCQs ({questions?.length || 0})
        </h3>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {loadingQuestions ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin h-5 w-5 text-primary" /></div>
          ) : questions?.length === 0 ? (
            <div className="py-8 border border-dashed border-border rounded-lg text-center">
              <p className="text-muted-foreground text-[12px]">Intelligence bank is empty. Commit new artifacts below.</p>
            </div>
          ) : (
            questions?.map((q: any) => (
              <Surface key={q._id} className="p-4 bg-secondary/10 group/q">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <p className="text-[13px] leading-relaxed mb-2 font-semibold">{q.questionText}</p>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt: string, i: number) => (
                        <span key={i} className={`text-[10px] px-2 py-0.5 rounded border ${opt?.toLowerCase() === q.correctAnswer?.toLowerCase() ? "bg-success/20 border-success text-success" : "bg-card border-border text-muted-foreground"}`}>
                          {opt}
                        </span>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="mt-3 text-[11px] text-muted-foreground italic border-l-2 border-primary/20 pl-3">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Pill className="text-[9px] h-4">
                      R{hackathon?.rounds?.find((r: any) => r._id === q.roundId)?.roundNumber || "?"}
                    </Pill>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          setEditingQuestionId(q._id);
                          setNewQuestion({
                            questionText: q.questionText,
                            options: [...q.options],
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation || "",
                            points: q.points || 10,
                            roundId: q.roundId
                          });
                        }}
                        className="p-1 text-muted-foreground hover:text-primary opacity-0 group-hover/q:opacity-100 transition-opacity"
                        title="Edit intelligence artifact"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm("Are you sure you want to purge this intelligence artifact?")) {
                            deleteQuestionMutation.mutate(q._id);
                          }
                        }}
                        className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover/q:opacity-100 transition-opacity"
                        title="Purge intelligence artifact"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Surface>
            ))
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h3 className="text-[14px] font-bold uppercase tracking-widest flex items-center gap-2">
            <Command className="h-4 w-4 text-primary" /> Intelligence Lab
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowBulkImportModal(true)}
              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-border text-muted-foreground hover:text-foreground transition-colors rounded flex items-center gap-1"
            >
              <Upload className="h-3 w-3" /> Import JSON
            </button>
            <button 
              onClick={handleExportQuestionsCsv}
              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-border text-muted-foreground hover:text-foreground transition-colors rounded"
            >
              Export CSV
            </button>
          </div>
        </div>

        <Surface className="p-6 border-primary/20 bg-primary/5 relative overflow-hidden">
          <div className="space-y-5 relative z-10">
            {editingQuestionId && (
              <div className="p-3 bg-primary/10 border border-primary/30 rounded flex justify-between items-center animate-in slide-in-from-top duration-300">
                <span className="text-[11px] font-mono text-primary font-bold flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 animate-pulse" /> EDITING MODE: Modifying active banked artifact
                </span>
                <button 
                  onClick={() => {
                    setEditingQuestionId(null);
                    setNewQuestion({ questionText: "", options: ["", "", "", ""], correctAnswer: "", explanation: "", points: 10, roundId: "" });
                  }}
                  className="text-[10px] text-muted-foreground hover:text-foreground font-bold"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground font-bold uppercase">Assign to Round Sequence</label>
              <select 
                value={newQuestion.roundId}
                onChange={(e) => setNewQuestion({ ...newQuestion, roundId: e.target.value })}
                className="w-full h-10 bg-secondary border border-border px-3 text-[13px] rounded outline-none"
              >
                <option value="">Select Target Round...</option>
                {hackathon?.rounds?.map((r: any) => (
                  <option key={r._id} value={r._id}>Round {r.roundNumber}: {r.title} ({r.type})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground font-bold uppercase">Question text (Markdowns allowed)</label>
              <textarea 
                className="w-full h-24 bg-secondary border border-border p-3 text-[13px] rounded outline-none" 
                placeholder="Details of the challenge to present..." 
                value={newQuestion.questionText}
                onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {newQuestion.options.map((opt, idx) => (
                <div key={idx} className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground">Option {idx + 1}</label>
                  <input 
                    className="w-full h-9 bg-secondary border border-border px-3 text-[12px] rounded outline-none"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...newQuestion.options];
                      newOpts[idx] = e.target.value;
                      setNewQuestion({ ...newQuestion, options: newOpts });
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Correct Answer Value</label>
                <input 
                  className="w-full h-10 bg-secondary border border-border px-4 text-[13px] rounded outline-none" 
                  placeholder="Must match one of options exactly" 
                  value={newQuestion.correctAnswer}
                  onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Points Weight</label>
                <input 
                  type="number"
                  className="w-full h-10 bg-secondary border border-border px-4 text-[13px] rounded outline-none" 
                  value={newQuestion.points}
                  onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground font-bold uppercase">Explanation (Provided post-round)</label>
              <textarea 
                className="w-full h-16 bg-secondary border border-border p-3 text-[12px] rounded outline-none" 
                placeholder="Provide details on correct resolution..." 
                value={newQuestion.explanation}
                onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
              />
            </div>

            <button 
              onClick={handleAddOrUpdateQuestion}
              disabled={addQuestionMutation.isPending || updateQuestionMutation.isPending}
              className="w-full h-10 bg-primary text-primary-foreground font-bold uppercase text-[11px] tracking-widest hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-50 rounded"
            >
              {addQuestionMutation.isPending || updateQuestionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><Save className="h-4 w-4" /> {editingQuestionId ? "Commit Changes" : "Commit to Bank"}</>
              )}
            </button>
          </div>
        </Surface>
      </div>

      {/* Bulk Import Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Surface className="w-full max-w-lg p-6 space-y-6 shadow-2xl border-primary/20">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div>
                <h3 className="text-[16px] font-bold uppercase tracking-widest">Bulk Import Questions</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">JSON array structure with options, correctAnswer, and points.</p>
              </div>
              <button onClick={() => setShowBulkImportModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                placeholder='[{"questionText": "What is 2+2?", "options": ["3","4","5","6"], "correctAnswer": "4", "points": 10}]'
                className="w-full h-60 bg-secondary border border-border p-4 text-[12px] font-mono rounded outline-none focus:border-primary/50"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <button 
                onClick={() => setShowBulkImportModal(false)}
                className="flex-1 h-10 border border-border hover:bg-secondary text-[12px] font-bold uppercase tracking-wider transition-colors rounded"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkImport}
                disabled={!bulkJson.trim() || addQuestionMutation.isPending}
                className="flex-1 h-10 bg-primary text-primary-foreground font-bold uppercase text-[11px] tracking-widest hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-50 rounded"
              >
                {addQuestionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Commit Arrays"}
              </button>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}
