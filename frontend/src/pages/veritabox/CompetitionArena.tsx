import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/veritabox/UI";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { Trophy, Target, Medal, Crown, Flame, Loader2, Link as LinkIcon, FileText, Upload, ArrowUp, ArrowDown, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CompetitionArena() {
  const { id } = useParams();
  
  const { data: competition, isLoading } = useQuery({
    queryKey: ["competition", id],
    queryFn: () => hackathonsApi.getBySlug(id || ""),
    enabled: !!id
  });

  const [projectLink, setProjectLink] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Challenge submission received!");
      setProjectLink("");
      setNotes("");
    }, 1000);
  };

  if (isLoading) {
    return (
      <VeritaBoxLayout>
        <PageContent className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  if (!competition) {
    return (
      <VeritaBoxLayout>
        <PageContent className="flex h-[80vh] items-center justify-center">
          <div className="text-center text-muted-foreground">Competition not found</div>
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  const status = competition.status || "Live"; // Upcoming, Live, Ended
  const round = 1;

  // Mock Leaderboard
  const leaderboard = [
    { rank: 1, name: "Alpha Squad", score: 980, trend: "up" },
    { rank: 2, name: "Beta Force", score: 920, trend: "down" },
    { rank: 3, name: "Cyber Knights", score: 850, trend: "up" },
    { rank: 4, name: "Null Pointers", score: 810, trend: "up" },
    { rank: 5, name: "Data Miners", score: 790, trend: "down" },
  ];

  return (
    <VeritaBoxLayout>
      <PageContent>
        {/* Header */}
        <Surface className="mb-6 p-6 border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Trophy className="h-32 w-32 text-amber-500" />
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Pill className={
                  status === "Live" ? "bg-amber-500/20 text-amber-500 border-amber-500/30 font-bold" :
                  status === "Upcoming" ? "bg-blue-500/20 text-blue-500 border-blue-500/30" :
                  "bg-muted text-muted-foreground"
                }>
                  {status.toUpperCase()}
                </Pill>
                <Pill className="border-border text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" /> Round {round}
                </Pill>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{competition.title}</h1>
              <p className="text-muted-foreground mt-1 text-sm max-w-xl">{competition.shortDescription || "Prove your skills in this elite challenge arena."}</p>
            </div>
            {status === "Live" && (
              <div className="text-right">
                <div className="text-xs uppercase tracking-widest text-amber-500/70 font-bold mb-1">Time Remaining</div>
                <div className="text-2xl font-mono font-bold text-amber-500 flex items-center gap-2">
                  <Clock className="h-5 w-5" /> 04:22:15
                </div>
              </div>
            )}
          </div>
        </Surface>

        {status === "Upcoming" && (
           <Surface className="p-12 text-center border-amber-500/20 mb-6 flex flex-col items-center justify-center">
             <Clock className="h-12 w-12 text-amber-500/50 mb-4" />
             <h2 className="text-2xl font-bold mb-2">Competition Begins Soon</h2>
             <p className="text-muted-foreground mb-6 max-w-md mx-auto">The arena is being prepared. Stand by for the commencement signal.</p>
             <div className="flex gap-4 font-mono text-3xl font-bold text-amber-500">
               <div>24<span className="text-sm block text-muted-foreground mt-1">HRS</span></div>:
               <div>42<span className="text-sm block text-muted-foreground mt-1">MIN</span></div>:
               <div>10<span className="text-sm block text-muted-foreground mt-1">SEC</span></div>
             </div>
           </Surface>
        )}

        {status === "Ended" && (
           <Surface className="p-8 text-center border-amber-500/30 bg-amber-500/5 mb-6">
             <Crown className="h-16 w-16 text-amber-500 mx-auto mb-4" />
             <h2 className="text-3xl font-bold mb-2 text-foreground">Competition Concluded</h2>
             <p className="text-muted-foreground mb-8">The final scores have been tallied and the victors stand triumphant.</p>
             
             <div className="flex justify-center items-end gap-4 max-w-2xl mx-auto h-48">
               {/* 2nd Place */}
               <div className="w-1/3 flex flex-col items-center">
                 <div className="text-lg font-bold mb-2">Beta Force</div>
                 <div className="w-full bg-secondary/80 h-32 rounded-t flex flex-col items-center justify-start pt-4 border border-border border-b-0">
                   <Medal className="h-8 w-8 text-slate-400 mb-1" />
                   <span className="font-bold text-xl">2nd</span>
                 </div>
               </div>
               {/* 1st Place */}
               <div className="w-1/3 flex flex-col items-center">
                 <div className="text-xl font-bold mb-2 text-amber-500">Alpha Squad</div>
                 <div className="w-full bg-amber-500/20 h-40 rounded-t flex flex-col items-center justify-start pt-4 border border-amber-500/50 border-b-0 relative shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                   <Crown className="h-10 w-10 text-amber-500 mb-1" />
                   <span className="font-bold text-2xl text-amber-500">1st</span>
                 </div>
               </div>
               {/* 3rd Place */}
               <div className="w-1/3 flex flex-col items-center">
                 <div className="text-lg font-bold mb-2">Cyber Knights</div>
                 <div className="w-full bg-secondary/60 h-24 rounded-t flex flex-col items-center justify-start pt-4 border border-border border-b-0">
                   <Medal className="h-6 w-6 text-amber-700 mb-1" />
                   <span className="font-bold text-lg">3rd</span>
                 </div>
               </div>
             </div>
           </Surface>
        )}

        {status === "Live" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar: Leaderboard */}
            <div className="lg:col-span-3 space-y-4">
              <Surface className="p-4 border-amber-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <h3 className="font-bold text-sm uppercase tracking-widest text-amber-500">Leaderboard</h3>
                </div>
                <div className="space-y-2">
                  {leaderboard.map((team, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-secondary/50 text-sm">
                      <div className="flex items-center gap-3">
                        <span className={`font-bold font-mono w-4 ${idx === 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>{team.rank}</span>
                        <span className="font-medium truncate max-w-[100px]">{team.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        {team.score}
                        {team.trend === "up" ? <ArrowUp className="h-3 w-3 text-green-500" /> : <ArrowDown className="h-3 w-3 text-red-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
            </div>

            {/* Center: Main Content */}
            <div className="lg:col-span-6 space-y-6">
              <Surface className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="h-5 w-5 text-amber-500" />
                  <h2 className="text-xl font-bold">Current Challenge</h2>
                </div>
                <div className="prose dark:prose-invert max-w-none text-sm text-muted-foreground mb-6">
                  <p>Design a fault-tolerant distributed consensus algorithm that can survive 33% node failure while maintaining under 50ms latency across global regions.</p>
                  <p>Requirements:</p>
                  <ul>
                    <li>Written in Rust or Go</li>
                    <li>Provide formal proof of safety and liveness</li>
                    <li>Include comprehensive test suite</li>
                  </ul>
                </div>
                
                <div className="border-t border-border pt-6">
                  <h3 className="font-bold text-sm uppercase tracking-widest mb-4">Submit Deliverables</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Project Repository URL</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input 
                          type="url" 
                          required
                          value={projectLink}
                          onChange={(e) => setProjectLink(e.target.value)}
                          placeholder="https://github.com/..."
                          className="w-full bg-secondary/50 border border-border rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Implementation Notes</label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <textarea 
                          required
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Explain your approach, trade-offs, and how to run the code..."
                          className="w-full bg-secondary/50 border border-border rounded pl-9 pr-3 py-2 text-sm min-h-[100px] focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Additional Artifacts (Optional)</label>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-amber-500/30 hover:bg-amber-500/5 transition-colors cursor-pointer">
                        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                        <div className="text-sm font-medium">Click to upload or drag and drop</div>
                        <div className="text-xs text-muted-foreground mt-1">PDF, ZIP, or Images (Max 50MB)</div>
                      </div>
                    </div>
                    
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase tracking-widest text-sm py-3 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                      {isSubmitting ? "Transmitting..." : "Submit Challenge"}
                    </button>
                  </form>
                </div>
              </Surface>
            </div>

            {/* Right: Competitor Info */}
            <div className="lg:col-span-3 space-y-4">
              <Surface className="p-4 bg-amber-500/5 border-amber-500/20">
                <h3 className="font-bold text-sm uppercase tracking-widest text-amber-500 mb-4">Competitor Status</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase">Current Rank</div>
                    <div className="text-2xl font-bold font-mono">#12</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase">Total Score</div>
                    <div className="text-xl font-mono text-amber-500">450</div>
                  </div>
                  <div className="pt-2 border-t border-amber-500/10">
                    <div className="text-xs text-muted-foreground uppercase mb-1">Target to next rank</div>
                    <div className="text-sm font-mono">+15 pts to overtake #11</div>
                  </div>
                </div>
              </Surface>
            </div>
          </div>
        )}
      </PageContent>
    </VeritaBoxLayout>
  );
}
