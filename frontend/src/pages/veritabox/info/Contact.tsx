import { InfoPage, Section, Reveal, LiveCounter, LiveTimestamp } from "@/components/VeritaBox/InfoPage";
import { useEffect, useState } from "react";
import { Mail, LifeBuoy, Building2, Send, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "general", icon: Mail, label: "General Inquiry", desc: "Partnerships, press, or anything that doesn't fit the other lanes." },
  { id: "support", icon: LifeBuoy, label: "Technical Support", desc: "Platform bugs, account issues, or feature requests." },
  { id: "business", icon: Building2, label: "Business & Enterprise", desc: "Custom deployments, licensing, or enterprise plans." },
];

export default function Contact() {
  const [tab, setTab] = useState("general");
  const [sent, setSent] = useState(false);
  const [responseMin, setResponseMin] = useState(38);

  useEffect(() => {
    const id = setInterval(() => setResponseMin(r => Math.max(12, Math.min(120, r + (Math.random() > 0.5 ? 1 : -1)))), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <InfoPage
      kicker="Support / Contact"
      title="Get in touch with us."
      subtitle="Pick the lane that fits — we route everything to a real human within one working day."
      accent="hsl(var(--info))"
    >
      <Reveal>
        <div className="bg-card border border-border rounded-md p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono">Avg response</div>
            <div className="mt-1 text-[20px] font-semibold flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-info" />
              <LiveCounter value={responseMin} suffix="m" />
            </div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono">Open tickets</div>
            <div className="mt-1 text-[20px] font-semibold"><LiveCounter value={7} /></div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono">Resolved (7d)</div>
            <div className="mt-1 text-[20px] font-semibold"><LiveCounter value={42} /></div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono">Status</div>
            <div className="mt-1 text-[13px] font-semibold flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success/40 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              All channels open
            </div>
            <div className="mt-1"><LiveTimestamp /></div>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSent(false); }}
              className={cn(
                "text-left bg-card border rounded-md p-4 transition-all",
                tab === t.id ? "border-foreground/50 -translate-y-0.5" : "border-border hover:border-foreground/30"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", tab === t.id ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}>
                  <t.icon className="h-4 w-4" />
                </span>
                <div className="text-[13.5px] font-semibold">{t.label}</div>
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </div>
      </Reveal>

      <Section eyebrow={tabs.find(t => t.id === tab)?.label} title="Send a message">
        <Reveal>
          {sent ? (
            <div className="bg-card border border-border rounded-md p-8 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-success" />
              <h3 className="mt-3 text-[15px] font-semibold">Message received</h3>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                We've logged your {tab === "support" ? "ticket" : "inquiry"}. Expect a reply within one working day.
              </p>
              <button onClick={() => setSent(false)} className="mt-4 text-[12px] text-foreground/70 hover:text-foreground underline underline-offset-4">
                Send another
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); setSent(true); }}
              className="bg-card border border-border rounded-md p-5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name" placeholder="Your name" />
                <Field label="Email" type="email" placeholder="you@example.com" />
              </div>
              {tab === "support" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Ticket ID (if any)" placeholder="KBX-00123" mono />
                  <div>
                    <Label>Severity</Label>
                    <select className="w-full bg-background border border-border rounded px-3 py-2 text-[13px] focus:outline-none focus:border-foreground/40">
                      <option>Low — cosmetic</option>
                      <option>Medium — workflow blocked</option>
                      <option>High — production incident</option>
                    </select>
                  </div>
                </div>
              )}
              {tab === "business" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Organization" placeholder="Your company" />
                  <Field label="Role" placeholder="e.g. CTO, Head of Events" />
                </div>
              )}
              <Field label="Subject" placeholder={tab === "support" ? "What went wrong?" : "What's this about?"} />
              <div>
                <Label>Message</Label>
                <textarea
                  required
                  rows={5}
                  placeholder="Describe in detail..."
                  className="w-full bg-background border border-border rounded px-3 py-2 text-[13px] focus:outline-none focus:border-foreground/40 resize-none"
                />
              </div>
              <button type="submit" className="inline-flex items-center gap-2 border border-foreground/40 text-foreground hover:bg-foreground hover:text-background transition-colors px-4 py-2 text-[13px] rounded">
                <Send className="h-3.5 w-3.5" /> Send message
              </button>
            </form>
          )}
        </Reveal>
      </Section>

      <Section eyebrow="Direct" title="Reach us directly">
        <Reveal>
          <div className="bg-card border border-border rounded-md p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-[13px]">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-1">Email</div>
              <div className="font-medium">info@veritabox.com</div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-1">Organization</div>
              <div className="font-medium">VeritaBox</div>
              <div className="text-[12px] text-muted-foreground">A wing of Anuragya Pvt. Ltd.</div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-1">Support hours</div>
              <div className="font-medium">Mon–Fri, 10:00–18:00 IST</div>
            </div>
          </div>
        </Reveal>
      </Section>
    </InfoPage>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-1.5">{children}</label>;
}
function Field({ label, type = "text", placeholder, mono }: { label: string; type?: string; placeholder?: string; mono?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        required
        type={type}
        placeholder={placeholder}
        className={cn("w-full bg-background border border-border rounded px-3 py-2 text-[13px] focus:outline-none focus:border-foreground/40", mono && "font-mono")}
      />
    </div>
  );
}
