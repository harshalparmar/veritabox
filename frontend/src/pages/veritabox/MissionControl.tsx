import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Stat, Pill, SectionTitle } from "@/components/VeritaBox/UI";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Bell, Flame, Trophy, Target, ArrowUpRight, Zap, Cpu, Code2, Loader2, Store, Users, Shield, MessageSquare, Swords } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { bountiesApi, hackathonsApi, activityApi, chaptersApi, pulseApi } from "@/lib/api";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { NeonPatternDefs } from "@/components/NeonPatternDefs";
import { useNeonCharts } from "@/hooks/use-neon-charts";
import { ProfileCompletionCard } from "@/components/VeritaBox/ProfileCompletionCard";
import { useMemo } from "react";

export default function MissionControl() {
  const { profile, user } = useAuth();
  const name = profile?.name || "Operative";

  // Fetch data from backend
  const { data: bounties = [], isLoading: loadingBounties } = useQuery({
    queryKey: ["bounties"],
    queryFn: () => bountiesApi.getAll(),
  });

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ["my-teams"],
    queryFn: () => hackathonsApi.getTeamsMe(),
  });

  const { data: activities, isLoading: loadingActivity } = useQuery({
    queryKey: ["activity", user?._id],
    queryFn: () => activityApi.getPersonal(user?._id || ""),
    enabled: !!user?._id,
  });

  const { data: managedChapters } = useQuery({
    queryKey: ["managed-chapters"],
    queryFn: () => chaptersApi.getManaged(),
    enabled: !!profile
  });

  const { data: pulseAnnouncements } = useQuery({
    queryKey: ["pulse-active"],
    queryFn: () => pulseApi.getActive(),
    enabled: !!user?._id
  });

  const { getFill } = useNeonCharts();

  // ── Chart data: Bounties by Status ────────────────────────────────────────
  const STATUS_COLORS: Record<string, string> = {
    Open: "hsl(var(--info))",
    Assigned: "hsl(var(--primary))",
    Resolved: "hsl(var(--success))",
    Closed: "hsl(var(--muted-foreground))",
  };

  const statusData = useMemo(() => {
    const c: Record<string, number> = { Open: 0, Assigned: 0, Resolved: 0, Closed: 0 };
    bounties.forEach(b => { if (b.status in c) c[b.status]++; });
    return Object.entries(c).map(([status, count]) => ({
      status, count, fill: STATUS_COLORS[status],
    }));
  }, [bounties]);

  const statusChartConfig: ChartConfig = Object.fromEntries(
    Object.entries(STATUS_COLORS).map(([k, color]) => [k, { label: k, color }])
  );

  // ── Chart data: Bounties by Difficulty ────────────────────────────────────
  const DIFF_COLORS: Record<string, string> = {
    Easy: "hsl(var(--success))",
    Medium: "hsl(var(--warning))",
    Hard: "hsl(var(--danger, var(--destructive)))",
  };

  const diffData = useMemo(() => {
    const c: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
    bounties.forEach(b => {
      const diff = b.difficulty || "Medium";
      if (diff in c) c[diff]++;
      else c.Medium++;
    });
    return Object.entries(c).map(([name, value]) => ({
      name, value, fill: DIFF_COLORS[name] || "hsl(var(--muted-foreground))",
    }));
  }, [bounties]);

  const diffChartConfig: ChartConfig = Object.fromEntries(
    Object.entries(DIFF_COLORS).map(([k, color]) => [k, { label: k, color }])
  );

  const isLoading = loadingBounties || loadingTeams;

  if (isLoading) {
    return (
      <VeritaBoxLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </VeritaBoxLayout>
    );
  }

  // Derived stats
  const openBountiesCount = bounties.filter(b => b.status === "Open").length || 0;
  const activeSquadronsCount = teams?.length || 0;
  const reputation = profile?.reputationPoints || 0;

  // Get time-based greeting and formatted date
  const firstName = name.split(" ")[0];
  const currentHour = new Date().getHours();
  let timeGreeting = "Good morning";
  if (currentHour >= 12 && currentHour < 17) {
    timeGreeting = "Good afternoon";
  } else if (currentHour >= 17) {
    timeGreeting = "Good evening";
  }

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <VeritaBoxLayout>
      <PageContent>
        {/* Date and Greeting Header */}
        <div className="mb-8">
          <div className="text-[13px] font-semibold text-muted-foreground/75">
            {formattedDate}
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-extrabold text-foreground tracking-tight mt-0.5">
            {timeGreeting}, {firstName}
          </h1>
        </div>

        {/* ── Profile Completion Nudge ────────────────────────────────────── */}
        <div className="mb-6">
          <ProfileCompletionCard />
        </div>

        {/* ── VeritaBox Pulse Announcements ─────────────────────────────────── */}
        {pulseAnnouncements && pulseAnnouncements.length > 0 && (
          <div className="mb-6 space-y-3">
            {pulseAnnouncements.map((pulse: any) => (
              <Surface key={pulse._id} className="p-4 border-l-4" style={{ borderLeftColor: pulse.priority === 'Critical' ? 'hsl(var(--danger))' : pulse.priority === 'High' ? 'hsl(var(--warning))' : 'hsl(var(--primary))' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Pill variant={pulse.priority === 'Critical' || pulse.priority === 'High' ? 'danger' : 'default'}>{pulse.type}</Pill>
                      {pulse.priority === 'Critical' && <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Critical</span>}
                    </div>
                    <h3 className="text-base font-semibold">{pulse.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{pulse.body}</p>
                  </div>
                  {pulse.ctaUrl && (
                    <a href={pulse.ctaUrl} target={pulse.ctaUrl.startsWith('http') ? "_blank" : "_self"} rel="noreferrer" className="shrink-0">
                      <Button size="sm" variant={pulse.priority === 'Critical' || pulse.priority === 'High' ? 'default' : 'outline'}>
                        {pulse.ctaLabel || "View"}
                      </Button>
                    </a>
                  )}
                </div>
              </Surface>
            ))}
          </div>
        )}

        {/* ── Stats Row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat
            label="Reputation"
            value={reputation.toLocaleString()}
            hint={`${profile?.role || 'Operative'} · ${Math.max(0, 5000 - reputation)} to Elite`}
          />
          <Stat
            label="Streak"
            value={`${(profile as any)?.currentStreak ?? 0}d`}
            accent="hsl(var(--warning))"
            hint={(profile as any)?.longestStreak ? `Best: ${(profile as any).longestStreak}d` : 'Keep building'}
          />
          <Stat label="Bounties open" value={openBountiesCount} />
          <Stat label="Squadrons" value={activeSquadronsCount} hint={teams?.[0]?.teamName || "No active squad"} />
        </div>

        {/* ── Charts: Bounties by Status + Difficulty ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-md overflow-hidden mb-6 border border-border">
          <NeonPatternDefs colors={[...Object.values(STATUS_COLORS), ...Object.values(DIFF_COLORS)]} />
          <Surface className="p-4 bg-background">
            <p className="text-[13px] font-medium mb-1">Bounties by Status</p>
            <p className="text-[12px] text-muted-foreground mb-4">Distribution across workflow stages</p>
            <ChartContainer config={statusChartConfig} className="min-h-[200px] sm:min-h-[250px] w-full">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={0}>
                  {statusData.map((entry, i) => <Cell key={i} {...getFill(entry.fill)} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </Surface>
          <Surface className="p-4 bg-background">
            <p className="text-[13px] font-medium mb-1">Bounties by Difficulty</p>
            <p className="text-[12px] text-muted-foreground mb-4">Breakdown by difficulty level</p>
            <ChartContainer config={diffChartConfig} className="min-h-[200px] sm:min-h-[250px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={diffData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {diffData.map((entry, i) => <Cell key={i} {...getFill(entry.fill)} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
          </Surface>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: My bounties & Chapter Command */}
          <div className="space-y-3">
            {managedChapters && managedChapters.length > 0 && (
              <>
                <SectionTitle>Tactical Commands</SectionTitle>
                <Link to="/dashboard/chapter">
                  <Surface hover className="p-4 border-primary/20 bg-primary/[0.03] group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold uppercase tracking-widest">Institute Command</div>
                          <div className="text-[10px] text-muted-foreground uppercase font-medium">Sector Oversight & Leads</div>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Surface>
                </Link>
              </>
            )}

            <SectionTitle action={<Link to="/bounties" className="text-[11px] text-muted-foreground hover:text-foreground">All →</Link>}>Open Bounties</SectionTitle>
            {bounties.slice(0, 3).map(b => (
              <Link key={b._id} to={`/bounties/${b._id}`}>
                <Surface hover className="p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-semibold pr-2">{b.title}</h4>
                    <Pill variant="warning">{(b as any).reward || b.pointReward || 100} rep</Pill>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1.5">Status: {b.status}</div>
                </Surface>
              </Link>
            ))}
            {bounties.length === 0 && (
              <Surface className="p-4 text-center text-muted-foreground text-[12px]">No open bounties available.</Surface>
            )}

            <SectionTitle action={<Link to="/hackathons" className="text-[11px] text-muted-foreground hover:text-foreground">All →</Link>}>Active Squadrons</SectionTitle>
            {teams?.map(t => (
              <Link key={t._id} to={`/hackathons/${(t.hackathonId as any)?.slug || t._id}`}>
                <Surface hover className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium">{t.teamName}</span>
                    <Pill variant={t.hackathonId ? "danger" : "default"}>
                      {t.hackathonId ? "Live" : "Standalone"}
                    </Pill>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1.5">
                    {(t.hackathonId as any)?.title || "Operational Unit"}
                  </div>
                </Surface>
              </Link>
            ))}

            {/* Active Builds — from profile.currentProjects */}
            <SectionTitle action={<Link to="/lab" className="text-[11px] text-muted-foreground hover:text-foreground">All →</Link>}>Active Builds</SectionTitle>
            {(profile as any)?.currentProjects && (profile as any).currentProjects.length > 0 ? (
              <div className="space-y-2">
                {((profile as any).currentProjects as string[]).map((proj: string, i: number) => (
                  <Link key={i} to="/lab">
                    <Surface hover className="p-3 flex items-center justify-between">
                      <span className="text-[13px] font-medium truncate">{proj}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </Surface>
                  </Link>
                ))}
              </div>
            ) : (
              <Surface className="p-4 text-center">
                <p className="text-[12px] text-muted-foreground mb-2">No active builds.</p>
                <Link to="/lab" className="text-[11px] text-primary font-bold hover:underline">
                  Start one in the Lab →
                </Link>
              </Surface>
            )}
          </div>

          {/* Center: Mainnet feed (Simulated with latest Bounties/Articles) */}
          <div className="lg:col-span-1">
            <SectionTitle action={<Link to="/mainnet" className="text-[11px] text-muted-foreground hover:text-foreground">Open feed →</Link>}>Mainnet Feed</SectionTitle>
            <Surface>
              {bounties.slice(0, 4).map((b, i) => (
                <div key={b._id} className="p-4 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 text-[12px]">
                    <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[10px] font-semibold text-primary">
                      SYS
                    </div>
                    <span className="font-medium">System</span>
                    <span className="text-muted-foreground">· Global</span>
                    <span className="text-muted-foreground ml-auto">{i + 1}h</span>
                  </div>
                  <p className="mt-2 text-[12.5px] text-foreground/85">
                    New bounty issued: <strong>{b.title}</strong> worth {(b as any).reward || b.pointReward || 100} rep.
                  </p>
                </div>
              ))}
              {bounties.length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-[12px]">No recent activity.</div>
              )}
            </Surface>
          </div>

          {/* Right: Notifications, quick links, and Role Widgets */}
          <div className="space-y-3">
            {/* Specialized Role Widgets */}
            <RoleWidgets user={profile} />

            <SectionTitle action={<Link to="/notifications" className="text-[11px] text-muted-foreground hover:text-foreground">All →</Link>}>Notifications</SectionTitle>
            <Surface>
              {[
                { icon: Flame, t: "Welcome to VeritaBox, Operative.", c: "text-warning" },
                { icon: Trophy, t: "Reputation system online.", c: "text-success" },
                { icon: Bell, t: "Check the Arsenal for new gear.", c: "text-info" },
              ].map((n, i) => (
                <div key={i} className="p-3 border-b border-border last:border-0 flex items-start gap-2.5">
                  <n.icon className={`h-3.5 w-3.5 mt-0.5 ${n.c}`} />
                  <span className="text-[12px] text-foreground/90">{n.t}</span>
                </div>
              ))}
            </Surface>

            <SectionTitle>Quick jump</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { icon: Cpu, l: "Arsenal", to: "/arsenal" },
                { icon: Code2, l: "Code Forge", to: "/forge" },
                { icon: Trophy, l: "Hackathons", to: "/hackathons" },
                { icon: Target, l: "Bounties", to: "/bounties" },
              ].map(q => (
                <Link key={q.l} to={q.to}>
                  <Surface hover className="p-3 flex items-center gap-2 text-[12.5px] font-medium">
                    <q.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{q.l}</span>
                    <ArrowUpRight className="h-3 w-3 ml-auto text-muted-foreground shrink-0" />
                  </Surface>
                </Link>
              ))}
              {(managedChapters?.length > 0 || profile?.chapterId) && (
                <Link to="/dashboard/chapter">
                  <Surface hover className="p-3 flex items-center gap-2 text-[12.5px] font-medium">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">Institute Command</span>
                    <ArrowUpRight className="h-3 w-3 ml-auto text-muted-foreground shrink-0" />
                  </Surface>
                </Link>
              )}
            </div>
          </div>
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}

function RoleWidgets({ user }: { user: any }) {
  if (!user?.chapter) return null;

  const chapter = user.chapter;
  const userRoles = chapter.localRoles
    ?.filter((r: any) => (r.user?._id || r.user) === user._id)
    .map((r: any) => r.roleName) || [];

  if (userRoles.length === 0) return null;

  return (
    <div className="space-y-3">
      {userRoles.includes("Logistics Lead") && (
        <>
          <SectionTitle>Logistics Command</SectionTitle>
          <Surface className="p-4 border-info/20 bg-info/[0.02]">
            <div className="flex items-start gap-3">
              <Cpu className="h-4 w-4 text-info mt-1" />
              <div className="space-y-2">
                <div className="text-[13px] font-bold">Hardware Queue</div>
                <div className="text-[11px] text-muted-foreground italic">3 pending requisitions require sector authorization.</div>
                <Link to="/chapters/managed">
                   <button className="h-7 px-3 bg-info text-white text-[9px] font-bold uppercase tracking-widest rounded">Review Queue</button>
                </Link>
              </div>
            </div>
          </Surface>
        </>
      )}

      {userRoles.includes("Communications Officer") && (
        <>
          <SectionTitle>Comms Intelligence</SectionTitle>
          <Surface className="p-4 border-warning/20 bg-warning/[0.02]">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-4 w-4 text-warning mt-1" />
              <div className="space-y-2">
                <div className="text-[13px] font-bold">Draft Intel</div>
                <div className="text-[11px] text-muted-foreground">New knowledge article from Sector-A is pending peer review.</div>
                <Link to="/knowledge">
                   <button className="h-7 px-3 bg-warning text-black text-[9px] font-bold uppercase tracking-widest rounded">Moderate Intel</button>
                </Link>
              </div>
            </div>
          </Surface>
        </>
      )}

      {userRoles.includes("Technical Commander") && (
        <>
          <SectionTitle>Tactical Status</SectionTitle>
          <Surface className="p-4 border-danger/20 bg-danger/[0.02]">
            <div className="flex items-start gap-3">
              <Swords className="h-4 w-4 text-danger mt-1" />
              <div className="space-y-2">
                <div className="text-[13px] font-bold">Active Sprint</div>
                <div className="flex items-center gap-2">
                   <div className="h-1 w-12 bg-danger/20 rounded-full overflow-hidden">
                      <div className="h-full bg-danger" style={{ width: '40%' }} />
                   </div>
                   <span className="text-[10px] font-mono text-danger">40% Win Prob</span>
                </div>
                <Link to="/dashboard/chapter">
                   <button className="h-7 px-3 bg-danger text-white text-[9px] font-bold uppercase tracking-widest rounded">Mobilize Squad</button>
                </Link>
              </div>
            </div>
          </Surface>
        </>
      )}
    </div>
  );
}
