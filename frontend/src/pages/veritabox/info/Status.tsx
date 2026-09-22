import { InfoPage, Section, Reveal, StatusDot, LiveCounter, LiveTimestamp } from "@/components/VeritaBox/InfoPage";
import { useEffect, useState } from "react";
import { systemApi, SystemStatus } from "@/lib/api";
import { toast } from "sonner";

function Sparkline({ healthy }: { healthy: boolean }) {
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 60 }, () => 0.6 + Math.random() * 0.4));
  useEffect(() => {
    const id = setInterval(() => {
      setBars(prev => {
        const next = prev.slice(1);
        next.push(0.6 + Math.random() * 0.4);
        return next;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-end gap-[2px] h-6">
      {bars.map((b, i) => (
        <span
          key={i}
          className={healthy ? "bg-success/70" : "bg-warning/70"}
          style={{ width: 3, height: `${Math.round(b * 100)}%` }}
        />
      ))}
    </div>
  );
}

export default function Status() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await systemApi.getStatus();
      setData(res);
    } catch (err) {
      console.error("Failed to fetch system status:", err);
      if (isInitial) toast.error("Could not sync with system health monitor.");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus(true);
    const id = setInterval(() => fetchStatus(), 15000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <InfoPage
        kicker="Support / Status"
        title="Synchronizing signals..."
        subtitle="Initializing handshake with the VeritaBox platform health monitor."
        accent="hsl(var(--muted))"
      >
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </InfoPage>
    );
  }

  if (!data) return null;

  return (
    <InfoPage
      kicker="Support / Status"
      title="System health, in real time."
      subtitle="Live uptime monitoring for the VeritaBox platform — services, database clusters, and the front door."
      accent="hsl(var(--success))"
    >
      <Reveal>
        <div className="bg-card border border-border rounded-md p-5 flex flex-col md:flex-row md:items-center gap-4">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success/40 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
          </span>
          <div className="flex-1">
            <div className="text-[14.5px] font-semibold">{data.overallStatus}</div>
            <div className="text-[12px] text-muted-foreground">30-day uptime: <LiveCounter value={data.overallUptime} decimals={2} suffix="%" /></div>
          </div>
          <LiveTimestamp />
        </div>
      </Reveal>

      <Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: "Requests / min", v: data.stats.requestsPerMin },
            { l: "Active sessions", v: data.stats.activeSessions },
            { l: "Sim pods", v: data.stats.simPods },
            { l: "Open incidents", v: data.stats.openIncidents },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 50}>
              <div className="bg-card border border-border rounded-md p-4">
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono">{s.l}</div>
                <div className="mt-1.5 text-[22px] font-semibold"><LiveCounter value={s.v} /></div>
              </div>
            </Reveal>
          ))}
        </div>
      </Reveal>

      <Section eyebrow="Services" title="Component status">
        <Reveal>
          <div className="bg-card border border-border rounded-md overflow-hidden">
            {data.services.map((s, i) => (
              <div key={s.name} className={`grid grid-cols-[1fr_140px_80px_80px] gap-4 items-center px-4 py-3.5 ${i < data.services.length - 1 ? "border-b border-border/60" : ""}`}>
                <div className="flex items-center gap-3">
                  <StatusDot tone={s.status === "operational" ? "success" : s.status === "degraded" ? "warning" : "danger"} />
                  <div>
                    <div className="text-[13px] font-medium">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground capitalize font-mono">{s.status}</div>
                  </div>
                </div>
                <Sparkline healthy={s.status === "operational"} />
                <div className="text-right font-mono text-[12px] tabular-nums text-muted-foreground">{s.latency}ms</div>
                <div className="text-right font-mono text-[13px] tabular-nums">{s.uptime}%</div>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      <Section eyebrow="History" title="Recent incidents & maintenance">
        <Reveal>
          <ol className="relative border-l border-border ml-2">
            {data.incidents.map((i, idx) => (
              <li key={`${i.date}-${idx}`} className="ml-4 mb-5">
                <span className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${i.level === "resolved" ? "bg-success" : "bg-warning"}`} />
                <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{i.date}</div>
                <div className="text-[13.5px] mt-0.5">{i.title}</div>
                <div className={`text-[11px] mt-1 font-mono uppercase ${i.level === "resolved" ? "text-success" : "text-warning"}`}>{i.level}</div>
              </li>
            ))}
          </ol>
        </Reveal>
      </Section>
    </InfoPage>
  );
}

