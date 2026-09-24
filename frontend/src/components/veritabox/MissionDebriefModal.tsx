import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Surface, Pill } from "@/components/veritabox/UI";
import { useQuery } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { Loader2, CheckCircle2, XCircle, Info, Trophy, Target, ShieldAlert } from "lucide-react";

interface MissionDebriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  hackathonId: string;
  roundNumber: number;
}

export default function MissionDebriefModal({ isOpen, onClose, hackathonId, roundNumber }: MissionDebriefModalProps) {
  const { data: debrief, isLoading } = useQuery({
    queryKey: ["round-debrief", hackathonId, roundNumber],
    queryFn: () => hackathonsApi.getRoundDebrief(hackathonId, roundNumber),
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black border-primary/20 p-0 shadow-2xl shadow-primary/10">
        <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-primary/20 p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
               <ShieldAlert className="h-5 w-5 text-primary" />
               <Pill variant="info" className="text-[10px] h-4">MISSION_DEBRIEF</Pill>
            </div>
            <DialogTitle className="text-[24px] font-bold tracking-tight flex items-center justify-between">
               <span>Debrief: {debrief?.round?.title || `Round ${roundNumber}`}</span>
               {debrief && (
                  <div className="text-right">
                     <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Round Ops Score</div>
                     <div className="text-[20px] font-mono text-primary">{debrief.teamScore.toLocaleString()}</div>
                  </div>
               )}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-[12px] font-mono text-muted-foreground animate-pulse">Decrypting intelligence artifacts...</p>
            </div>
          ) : debrief ? (
            <div className="space-y-8">
              {debrief.questions.map((q, idx) => {
                const submission = debrief.submissions.find(s => s.questionId === q._id);
                const isCorrect = submission?.isCorrect;
                
                return (
                  <Surface key={q._id} className={`p-6 relative group overflow-hidden ${isCorrect ? 'border-success/30 bg-success/5' : submission ? 'border-destructive/30 bg-destructive/5' : 'border-border/40'}`}>
                    <div className="flex items-start gap-4">
                      <div className="h-8 w-8 rounded bg-secondary border border-border flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="text-[16px] font-medium leading-relaxed">{q.questionText}</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {q.options.map((opt: string, i: number) => {
                            const isUserChoice = submission?.answer === opt;
                            const isCorrectAnswer = q.correctAnswer === opt;
                            
                            return (
                              <div 
                                key={i}
                                className={`p-4 rounded border text-[13px] flex items-center justify-between transition-all ${
                                  isCorrectAnswer 
                                    ? "bg-success/20 border-success text-success shadow-lg shadow-success/10" 
                                    : isUserChoice 
                                      ? "bg-destructive/20 border-destructive text-destructive" 
                                      : "bg-white/5 border-border/40 text-muted-foreground"
                                }`}
                              >
                                <span>{opt}</span>
                                {isCorrectAnswer && <CheckCircle2 className="h-4 w-4" />}
                                {isUserChoice && !isCorrectAnswer && <XCircle className="h-4 w-4" />}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="p-4 bg-primary/5 border-l-2 border-primary/40 rounded-r-lg space-y-2">
                             <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                               <Info className="h-3 w-3" /> Debrief Logic
                             </div>
                             <p className="text-[12px] text-muted-foreground leading-relaxed italic">
                               {q.explanation}
                             </p>
                          </div>
                        )}
                        
                        {!submission && (
                          <div className="text-[11px] text-warning font-bold uppercase tracking-widest flex items-center gap-1.5 ">
                            <ShieldAlert className="h-3.5 w-3.5" /> No telemetry received for this artifact (Skipped or Breached)
                          </div>
                        )}
                      </div>
                    </div>
                  </Surface>
                );
              })}

              <Surface className="p-8 border-primary/20 bg-primary/5 text-center space-y-4">
                 <Trophy className="h-10 w-10 text-primary mx-auto opacity-50" />
                 <h4 className="text-[18px] font-bold uppercase tracking-tighter">Mission Phase Concluded</h4>
                 <p className="text-[13px] text-muted-foreground max-w-sm mx-auto">
                    Round data has been synchronized with the global leaderboard. Awaiting next mission window broadcast.
                 </p>
                 <button 
                  onClick={onClose}
                  className="px-8 h-10 bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-widest hover:brightness-110"
                 >
                    Acknowledge & Close
                 </button>
              </Surface>
            </div>
          ) : (
            <div className="py-20 text-center text-muted-foreground">Intelligence artifacts not found.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
