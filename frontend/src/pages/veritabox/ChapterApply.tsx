import { useState } from "react";
import { PublicShell } from "@/components/VeritaBox/PublicShell";
import { Surface } from "@/components/VeritaBox/UI";
import { 
  Send, Loader2, ShieldCheck, Globe, Users, ChevronLeft, Building2
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { chaptersApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";

export default function ChapterApply() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    universityName: "",
    proposedSlug: "",
    missionStatement: "",
    expectedMembers: 10,
    socialProofUrl: ""
  });

  const applyMutation = useMutation({
    mutationFn: () => chaptersApi.apply(formData),
    onSuccess: () => {
      toast.success("Application transmitted.", {
        description: "Your sector enlistment is now being reviewed.",
      });
      navigate("/chapters");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.universityName || !formData.missionStatement) {
      toast.error("Missing fields", { description: "University name and mission statement are required." });
      return;
    }
    applyMutation.mutate();
  };

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[800px] px-6 py-8">
          <div className="mb-4">
            <Link to="/chapters" className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">
              <ChevronLeft className="h-3 w-3" /> Back to Institutes
            </Link>
          </div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Expansion</div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Register an Institute</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground leading-relaxed">
            Scale the VeritaBox network to your university. Establish a local autonomous engineering hub.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[800px] px-6 py-10">
        <Surface className="p-6 space-y-6">
          <div className="p-4 bg-secondary/30 border border-border rounded text-[12px] text-muted-foreground leading-relaxed">
            Founding an institute means establishing a local resource hub. You will coordinate team formation, project build pipelines, and organize community sessions.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">University Name</label>
                <input 
                  value={formData.universityName}
                  onChange={(e) => setFormData({...formData, universityName: e.target.value})}
                  placeholder="e.g. Indian Institute of Technology, Bombay"
                  className="w-full h-9 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Proposed Slug (URL)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground opacity-50 font-mono">/chapters/</span>
                  <input 
                    value={formData.proposedSlug}
                    onChange={(e) => setFormData({...formData, proposedSlug: e.target.value})}
                    placeholder="iit-bombay"
                    className="w-full h-9 bg-secondary/50 border border-border rounded pl-20 pr-3 text-[12px] outline-none focus:border-primary/50 transition-colors font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mission Statement</label>
              <textarea 
                value={formData.missionStatement}
                onChange={(e) => setFormData({...formData, missionStatement: e.target.value})}
                placeholder="What is your vision for this institute? How will you cultivate engineering excellence?"
                className="w-full min-h-[120px] bg-secondary/50 border border-border rounded p-3 text-[12px] outline-none focus:border-primary/50 transition-colors resize-none"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expected Initial Members</label>
                <input 
                  type="number"
                  value={formData.expectedMembers}
                  onChange={(e) => setFormData({...formData, expectedMembers: parseInt(e.target.value) || 10})}
                  className="w-full h-9 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Social Proof / Existing Club Link</label>
                <input 
                  value={formData.socialProofUrl}
                  onChange={(e) => setFormData({...formData, socialProofUrl: e.target.value})}
                  placeholder="LinkedIn page, website, or Instagram link"
                  className="w-full h-9 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex flex-col items-center">
              <button 
                type="submit"
                disabled={applyMutation.isPending}
                className="w-full h-9 bg-foreground text-background font-bold uppercase tracking-widest text-[11px] rounded hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                {applyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> Submit Application</>}
              </button>
              <p className="mt-3 text-[10px] text-muted-foreground italic text-center">
                All submissions are subject to validation by institute coordinators.
              </p>
            </div>
          </form>
        </Surface>

        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, title: "Identity Verification", text: "Requires institutional domain validation." },
            { icon: Globe, title: "Public Registry", text: "Your institute profile is visible globally in the VeritaBox logs." },
            { icon: Users, title: "Mentorship", text: "Access to developer forums, hardware grants, and mentors." }
          ].map((feature, i) => (
            <div key={i} className="text-center space-y-1.5">
              <feature.icon className="h-4 w-4 text-primary mx-auto opacity-70" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider">{feature.title}</h4>
              <p className="text-[11px] text-muted-foreground leading-normal">{feature.text}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
