import { Link } from "react-router-dom";
import { useState } from "react";
import { VeritaBoxLogo } from "../VeritaBoxLogo";
import { newsletterApi } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

export function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await newsletterApi.subscribe(email);
      toast.success("Subscribed successfully.");
      setEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-[1400px] px-6 py-12 grid grid-cols-2 md:grid-cols-6 gap-8 text-[12.5px]">
        <div className="col-span-2 flex flex-col gap-4">
          <Link to="/" className="flex items-center gap-2">
            <VeritaBoxLogo className="h-6 text-foreground" />
          </Link>
          <p className="mt-2 text-muted-foreground max-w-xs leading-relaxed">
            A next-generation platform for interactive learning, hackathons, competitions, and workshops â€” built by VeritaBox.
          </p>

          <form onSubmit={handleSubscribe} className="max-w-[280px] mt-2">
            <div className="text-[11px] font-bold uppercase tracking-widest text-foreground mb-2">Stay in the loop</div>
            <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">Subscribe for updates on events, new features, and community highlights.</p>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full h-9 bg-card/50 border border-border pl-3 pr-10 text-[12px] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded placeholder:text-muted-foreground/50"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center bg-primary text-primary-foreground rounded hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </form>
        </div>
        {[
          {
            h: "Platform",
            l: [
              { t: "Features", to: "/platform#features" },
              { t: "Hackathons", to: "/hackathons" },
              { t: "Competitions", to: "/competitions" },
              { t: "Workshops", to: "/workshops" },
              { t: "Knowledge Base", to: "/knowledge" },
            ],
          },
          {
            h: "Resources",
            l: [
              { t: "Documentation", to: "/docs" },
              { t: "Community Forum", to: "/community" },
              { t: "Tutorials", to: "/tutorials" },
              { t: "Leaderboard", to: "/leaderboard" },
            ],
          },
          {
            h: "Company",
            l: [
              { t: "About Us", to: "/about" },
              { t: "Contact", to: "/contact" },
              { t: "Platform Info", to: "/platform" },
              { t: "System Stats", to: "/stats" },
              { t: "System Health", to: "/status" },
            ],
          },
          {
            h: "Explore",
            l: [
              { t: "Bounties", to: "/bounties" },
              { t: "Forge", to: "/forge" },
              { t: "Lab", to: "/lab" },
              { t: "Chapters", to: "/chapters" },
              { t: "Events", to: "/events" },
            ],
          },
        ].map((c) => (
          <div key={c.h}>
            <div className="text-foreground font-medium mb-3 text-[12px] uppercase tracking-[0.08em]">{c.h}</div>
            <ul className="space-y-2 text-muted-foreground">
              {c.l.map((x) => (
                <li key={x.t}>
                  <Link to={x.to} className="hover:text-foreground transition-colors">
                    {x.t}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-[1400px] px-6 py-4 flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between text-[11px] text-muted-foreground items-center">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center">
            <span>&copy; {new Date().getFullYear()} VeritaBox &middot; Anuragya Pvt. Ltd.</span>
            <span className="hidden sm:inline">&middot;</span>
            <div className="flex gap-3">
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <span>&middot;</span>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <span>&middot;</span>
              <Link to="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
              <span>&middot;</span>
              <Link to="/conduct" className="hover:text-foreground transition-colors">Code of Conduct</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
