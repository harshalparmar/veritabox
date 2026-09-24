import { useQuery } from "@tanstack/react-query";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Stat, Pill } from "@/components/veritabox/UI";
import { 
  BarChart3, Users, Trophy, BookOpen, Cpu, Target, 
  Layers, Shield, Zap, Globe, MapPin,
  TrendingUp, Clock, Radio, FlaskConical, Award
} from "lucide-react";
import { 
  knowledgeApi, hackathonsApi, bountiesApi, 
  chaptersApi, usersApi, projectsApi, adminApi 
} from "@/lib/api";

export default function Stats() {
  const { data: articles } = useQuery({ queryKey: ["articles"], queryFn: () => knowledgeApi.getAll() });
  const { data: hackathons } = useQuery({ queryKey: ["hackathons"], queryFn: () => hackathonsApi.getAll() });
  const { data: bounties } = useQuery({ queryKey: ["bounties"], queryFn: () => bountiesApi.getAll() });
  const { data: chapters } = useQuery({ queryKey: ["chapters"], queryFn: () => chaptersApi.getAll() });
  const { data: users } = useQuery({ queryKey: ["leaderboard"], queryFn: () => usersApi.getLeaderboard() });
  const { data: projects } = useQuery({ queryKey: ["mainnet-projects"], queryFn: () => projectsApi.getMainnet() });
  const { data: adminStats } = useQuery({ queryKey: ["admin-stats"], queryFn: () => adminApi.getStats() });

  const totalReputation = chapters?.reduce((acc, c) => acc + (c.stats?.totalReputation || 0), 0) || 0;
  
  const moduleStats = [
    { label: "Operatives", value: adminStats?.totalUsers || users?.totalCount || 0, icon: Users, color: "text-primary", hint: "Active on platform" },
    { label: "Active Chapters", value: chapters?.length || 0, icon: MapPin, color: "text-info", hint: "Verified institutions" },
    { label: "Hackathons", value: hackathons?.length || 0, icon: Trophy, color: "text-warning", hint: "Missions concluded/live" },
    { label: "Knowledge Intel", value: articles?.length || 0, icon: BookOpen, color: "text-success", hint: "Manuals & blueprints" },
    { label: "Active Bounties", value: bounties?.filter(b => b.status === 'Open').length || 0, icon: Target, color: "text-danger", hint: "Pending resolution" },
    { label: "Project Forge", value: projects?.length || 0, icon: Zap, color: "text-primary", hint: "Live builds on mainnet" },
    { label: "Total Reputation", value: totalReputation.toLocaleString(), icon: Award, color: "text-warning", hint: "Network-wide XP" },
  ];

  return (
    <PublicShell>
      <div className="relative border-b border-border bg-card/20 overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[300px] w-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative mx-auto max-w-[1300px] px-6 py-16">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-4">
            <BarChart3 className="h-3 w-3" />
            Platform Telemetry · LIVE
          </div>
          <h1 className="text-[40px] md:text-[56px] font-semibold tracking-tight leading-none">
            System Stats —<br />
            <span className="text-muted-foreground">the heartbeat of the collective.</span>
          </h1>
          <p className="mt-4 text-[15px] text-muted-foreground max-w-xl leading-relaxed">
            Real-time aggregate data across all VeritaBox modules. Every commit and every mission success reflected in the registry.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-6 py-12">
        {/* Core Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {moduleStats.map((s) => (
            <Surface key={s.label} className="p-5 relative overflow-hidden group">
              <div className="absolute -top-12 -right-12 h-24 w-24 bg-foreground/5 blur-2xl rounded-full group-hover:bg-primary/10 transition-colors" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono">{s.label}</div>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div className="text-[32px] font-bold tracking-tight">{s.value}</div>
                <div className="mt-1 text-[11px] text-muted-foreground/60 font-mono italic">{s.hint}</div>
              </div>
            </Surface>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
             <Surface className="p-5">
                <div className="flex items-center gap-2 text-[12px] font-semibold mb-4">
                   <Shield className="h-4 w-4 text-success" />
                   Security & Integrity
                </div>
                <div className="space-y-4">
                   {[
                     { l: "Verification Layer", v: 100, status: "Active" },
                     { l: "Encrypted Comms", v: 94, status: "Operational" },
                     { l: "Asset Tracking", v: 88, status: "Normal" },
                   ].map(s => (
                     <div key={s.l}>
                        <div className="flex justify-between text-[11px] mb-1.5">
                           <span className="text-muted-foreground">{s.l}</span>
                           <span className="font-mono text-primary">{s.status}</span>
                        </div>
                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                           <div className="h-full bg-primary" style={{ width: `${s.v}%` }} />
                        </div>
                     </div>
                   ))}
                </div>
             </Surface>

             <Surface className="p-5 bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2 text-[12px] font-semibold mb-3">
                   <Clock className="h-4 w-4 text-primary" />
                   Next Distribution
                </div>
                <div className="text-[24px] font-mono font-bold tracking-tighter mb-1">
                   14:28:42
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                   Reputation points from verified articles and bounty resolutions are batch-processed every 24 hours.
                </p>
             </Surface>

             <Surface className="p-5">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono mb-3">Global Distribution</div>
                <div className="space-y-2">
                   {[
                     { label: "Software", value: "42%", color: "bg-primary" },
                     { label: "Hardware", value: "28%", color: "bg-info" },
                     { label: "Embedded", value: "18%", color: "bg-warning" },
                     { label: "Research", value: "12%", color: "bg-success" },
                   ].map(d => (
                     <div key={d.label} className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${d.color}`} />
                        <div className="text-[12px] flex-1">{d.label}</div>
                        <div className="text-[12px] font-mono font-medium">{d.value}</div>
                     </div>
                   ))}
                </div>
             </Surface>
        </div>

        {/* Institutional Stats */}
        <div className="mt-12">
           <div className="flex items-center gap-2 mb-6">
              <Globe className="h-4 w-4 text-info" />
              <h3 className="text-[16px] font-semibold tracking-tight">Institutional Outreach</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Top Chapter", value: chapters?.[0]?.name || "IIT Bombay", sub: "by Reputation", icon: Trophy },
                { title: "Growth Rate", value: "In Development", sub: "MoM Member Enlistment", icon: TrendingUp },
                { title: "Total Rep", value: totalReputation.toLocaleString(), sub: "Across all sectors", icon: Award },
              ].map((s, i) => (
                <Surface key={i} className="p-6 text-center">
                   <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                      <s.icon className="h-5 w-5 text-muted-foreground" />
                   </div>
                   <div className="text-[24px] font-bold">{s.value}</div>
                   <div className="text-[13px] font-medium text-foreground/80 mt-1">{s.title}</div>
                   <div className="text-[11px] text-muted-foreground font-mono mt-1">{s.sub}</div>
                </Surface>
              ))}
           </div>
        </div>
      </div>
    </PublicShell>
  );
}
