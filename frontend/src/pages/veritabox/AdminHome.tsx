import { AdminLayout } from "@/components/veritabox/AdminLayout";
import { PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Stat, SectionTitle } from "@/components/veritabox/UI";
import { Link } from "react-router-dom";
import { Users, Cpu, Target, BookOpen, Trophy, Building2, Store, Shield, Loader2, Globe, MessageSquare } from "lucide-react";
import { MainnetIcon, WorkshopsIcon } from "@/components/veritabox/PlatformIcons";
import { useQuery } from "@tanstack/react-query";
import { adminApi, bountiesApi } from "@/lib/api";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { NeonPatternDefs, neonPatternId } from "@/components/NeonPatternDefs";
import { useNeonCharts } from "@/hooks/use-neon-charts";
import { useMemo } from "react";
import { format, subDays, parseISO, startOfDay } from "date-fns";

function getTiles() {
  const base = '/cmd';
  return [
    { icon: Users, l: "Users", to: `${base}/users`, c: "text-info" },
    { icon: MainnetIcon, l: "Mainnet", to: `${base}/mainnet`, c: "" },
    { icon: Target, l: "Bounties", to: `${base}/bounties`, c: "text-warning" },
    { icon: Trophy, l: "Hackathons", to: `${base}/hackathons`, c: "text-primary" },
    { icon: Trophy, l: "Competitions", to: `${base}/competitions`, c: "text-success" },
    { icon: Cpu, l: "Code Forge", to: `${base}/forge`, c: "text-warning" },
    { icon: Globe, l: "Events", to: `${base}/events`, c: "text-info" },
    { icon: BookOpen, l: "Knowledge CMS", to: `${base}/knowledge`, c: "text-info" },
    { icon: WorkshopsIcon, l: "Workshops", to: `${base}/workshops`, c: "text-warning" },
    { icon: Building2, l: "Chapters", to: `${base}/chapters`, c: "text-primary" },
    { icon: BookOpen, l: "Publishing", to: `${base}/publishing`, c: "text-info" },
    { icon: MessageSquare, l: "Secure Comms", to: `${base}/messages`, c: "text-primary" },
  ];
}

export default function AdminHome() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.getStats()
  });

  const { data: bounties = [], isLoading: bountiesLoading } = useQuery({
    queryKey: ["admin-bounties"],
    queryFn: () => bountiesApi.getAll()
  });

  const isLoading = statsLoading || bountiesLoading;

  const { getFill } = useNeonCharts();

  // Chart Logic
  const STATUS_COLORS: Record<string, string> = {
    Open: "hsl(var(--info))",
    Assigned: "hsl(var(--primary))",
    Resolved: "hsl(var(--success))",
    Closed: "hsl(var(--muted-foreground))",
  };
  const STATUS_LABELS: Record<string, string> = {
    Open: "Open", Assigned: "Assigned", Resolved: "Resolved", Closed: "Closed",
  };
  const SEVERITY_COLORS: Record<string, string> = {
    Hard: "hsl(0, 72%, 51%)", Medium: "hsl(38, 92%, 50%)", Easy: "hsl(142, 70%, 40%)",
  };
  const SEVERITY_LABELS: Record<string, string> = {
    Hard: "Hard", Medium: "Medium", Easy: "Easy",
  };

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    bounties.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });
    return Object.entries(STATUS_LABELS).map(([key, label]) => ({ status: label, count: counts[key] || 0, fill: STATUS_COLORS[key] }));
  }, [bounties]);
  const statusChartConfig: ChartConfig = Object.fromEntries(Object.entries(STATUS_LABELS).map(([k, label]) => [k, { label, color: STATUS_COLORS[k] }]));

  const severityData = useMemo(() => {
    const counts: Record<string, number> = {};
    bounties.forEach(b => { 
      const diff = b.difficulty || "Medium";
      counts[diff] = (counts[diff] || 0) + 1; 
    });
    return Object.entries(SEVERITY_LABELS).map(([key, label]) => ({ name: label, value: counts[key] || 0, fill: SEVERITY_COLORS[key] }));
  }, [bounties]);
  const severityChartConfig: ChartConfig = Object.fromEntries(Object.entries(SEVERITY_LABELS).map(([k, label]) => [k, { label, color: SEVERITY_COLORS[k] }]));

  const trendData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) days[format(subDays(new Date(), i), "MMM dd")] = 0;
    bounties.forEach(b => { 
      if (!b.createdAt) return;
      const key = format(parseISO(b.createdAt), "MMM dd"); 
      if (key in days) days[key]++; 
    });
    return Object.entries(days).map(([date, count]) => ({ date, count }));
  }, [bounties]);
  const trendChartConfig: ChartConfig = { count: { label: "Bounties Created", color: "hsl(234, 55%, 60%)" } };

  const areaData = useMemo(() => {
    const resolvedStatuses = new Set(["Resolved", "Closed"]);
    const result: { date: string; open: number; resolved: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      // End of the day for inclusive comparison
      const endOfDayTime = day.getTime() + 24 * 60 * 60 * 1000 - 1;
      let open = 0, resolved = 0;
      bounties.forEach(b => { 
        if (!b.createdAt) return;
        const createdTime = parseISO(b.createdAt).getTime();
        if (createdTime <= endOfDayTime) { 
          // If it's currently resolved, check WHEN it was resolved (using updatedAt as proxy)
          const isResolvedNow = resolvedStatuses.has(b.status);
          const resolvedTime = (isResolvedNow && b.updatedAt) ? parseISO(b.updatedAt).getTime() : Infinity;
          
          if (isResolvedNow && resolvedTime <= endOfDayTime) {
            resolved++;
          } else {
            open++;
          }
        } 
      });
      result.push({ date: format(day, "MMM dd"), open, resolved });
    }
    return result;
  }, [bounties]);
  const areaChartConfig: ChartConfig = { open: { label: "Open", color: "hsl(38, 92%, 50%)" }, resolved: { label: "Resolved", color: "hsl(142, 70%, 40%)" } };

  const stackedData = useMemo(() => {
    return Object.entries(STATUS_LABELS).map(([statusKey, statusLabel]) => {
      const row: Record<string, string | number> = { status: statusLabel };
      Object.keys(SEVERITY_LABELS).forEach(sev => { 
        row[sev] = bounties.filter(b => b.status === statusKey && (b.difficulty || "Medium") === sev).length; 
      });
      return row;
    });
  }, [bounties]);
  const stackedChartConfig: ChartConfig = Object.fromEntries(Object.entries(SEVERITY_LABELS).map(([k, label]) => [k, { label, color: SEVERITY_COLORS[k] }]));

  return (
    <AdminLayout>
      <PageContent>
        {isLoading ? (
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Stat label="Active members" value={stats?.activeMembers?.toLocaleString() || "0"} hint={`Total: ${stats?.totalUsers || 0}`} />
            <Stat label="Bounty completion" value={`${stats?.bountyCompletion || 0}%`} />
            <Stat label="Workshops" value={stats?.totalWorkshops ?? 0} hint={`${stats?.pendingWorkshops || 0} pending`} />
            <Stat label="Queues" value={stats?.pendingQueues || 0} accent="hsl(var(--warning))" hint="Pending review" />
          </div>
        )}

        <div className="mb-8">
          <SectionTitle>System Intelligence</SectionTitle>
          <NeonPatternDefs colors={[...Object.values(STATUS_COLORS), ...Object.values(SEVERITY_COLORS), "hsl(38, 92%, 50%)", "hsl(142, 70%, 40%)"]} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-md overflow-hidden border border-border">
            {/* Status Bar */}
            <Surface className="bg-background p-4 rounded-none">
              <p className="text-[13px] font-medium mb-1">Bugs by status</p>
              <p className="text-[12px] text-muted-foreground mb-4">Distribution across workflow stages</p>
              <ChartContainer config={statusChartConfig} className="h-[220px] w-full">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={0}>
                    {statusData.map((e, i) => <Cell key={i} {...getFill(e.fill)} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </Surface>

            {/* Severity Pie */}
            <Surface className="bg-background p-4 rounded-none">
              <p className="text-[13px] font-medium mb-1">Severity distribution</p>
              <p className="text-[12px] text-muted-foreground mb-4">Breakdown by severity level</p>
              <ChartContainer config={severityChartConfig} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {severityData.map((e, i) => <Cell key={i} {...getFill(e.fill)} />)}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </Surface>

            {/* Trend Line */}
            <Surface className="bg-background p-4 rounded-none">
              <p className="text-[13px] font-medium mb-1">Bounty creation trend</p>
              <p className="text-[12px] text-muted-foreground mb-4">New bounties opened per day (last 30 days)</p>
              <ChartContainer config={trendChartConfig} className="h-[220px] w-full">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="count" stroke="hsl(234, 55%, 60%)" strokeWidth={1.5} dot={{ r: 2 }} />
                </LineChart>
              </ChartContainer>
            </Surface>

            {/* Open vs Resolved */}
            <Surface className="bg-background p-4 rounded-none">
              <p className="text-[13px] font-medium mb-1">Open vs resolved</p>
              <p className="text-[12px] text-muted-foreground mb-4">Cumulative counts over the last 30 days</p>
              <ChartContainer config={areaChartConfig} className="h-[220px] w-full">
                <AreaChart data={areaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="open" stackId="1" stroke="hsl(38, 92%, 50%)" fill={`url(#${neonPatternId("hsl(38, 92%, 50%)")})`} fillOpacity={1} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="resolved" stackId="1" stroke="hsl(142, 70%, 40%)" fill={`url(#${neonPatternId("hsl(142, 70%, 40%)")})`} fillOpacity={1} strokeWidth={1.5} />
                </AreaChart>
              </ChartContainer>
            </Surface>

            {/* Severity by Status */}
            <Surface className="bg-background p-4 rounded-none lg:col-span-2">
              <p className="text-[13px] font-medium mb-1">Severity by status</p>
              <p className="text-[12px] text-muted-foreground mb-4">How severity levels distribute across each status</p>
              <ChartContainer config={stackedChartConfig} className="h-[220px] w-full">
                <BarChart data={stackedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="Hard" stackId="a" fill={`url(#${neonPatternId(SEVERITY_COLORS.Hard)})`} stroke={SEVERITY_COLORS.Hard} strokeWidth={1.5} shape={(props: any) => {
                    const { x, y, width, height, fill, stroke } = props;
                    return (<g><rect x={x} y={y} width={width} height={height} fill={fill} stroke="none" />
                      <line x1={x} y1={y+height} x2={x+width} y2={y+height} stroke={stroke} strokeWidth={1.5} />
                      <line x1={x} y1={y} x2={x} y2={y+height} stroke={stroke} strokeWidth={1.5} />
                      <line x1={x+width} y1={y} x2={x+width} y2={y+height} stroke={stroke} strokeWidth={1.5} />
                      <line x1={x} y1={y} x2={x+width} y2={y} stroke={stroke} strokeWidth={0.5} /></g>);
                  }} />
                  <Bar dataKey="Medium" stackId="a" fill={`url(#${neonPatternId(SEVERITY_COLORS.Medium)})`} stroke={SEVERITY_COLORS.Medium} strokeWidth={1.5} shape={(props: any) => {
                    const { x, y, width, height, fill, stroke } = props;
                    return (<g><rect x={x} y={y} width={width} height={height} fill={fill} stroke="none" />
                      <line x1={x} y1={y+height} x2={x+width} y2={y+height} stroke={stroke} strokeWidth={0.5} />
                      <line x1={x} y1={y} x2={x} y2={y+height} stroke={stroke} strokeWidth={1.5} />
                      <line x1={x+width} y1={y} x2={x+width} y2={y+height} stroke={stroke} strokeWidth={1.5} />
                      <line x1={x} y1={y} x2={x+width} y2={y} stroke={stroke} strokeWidth={0.5} /></g>);
                  }} />
                  <Bar dataKey="Easy" stackId="a" fill={`url(#${neonPatternId(SEVERITY_COLORS.Easy)})`} stroke={SEVERITY_COLORS.Easy} strokeWidth={1.5} shape={(props: any) => {
                    const { x, y, width, height, fill, stroke } = props;
                    return (<g><rect x={x} y={y} width={width} height={height} fill={fill} stroke="none" />
                      <line x1={x} y1={y+height} x2={x+width} y2={y+height} stroke={stroke} strokeWidth={0.5} />
                      <line x1={x} y1={y} x2={x} y2={y+height} stroke={stroke} strokeWidth={1.5} />
                      <line x1={x+width} y1={y} x2={x+width} y2={y+height} stroke={stroke} strokeWidth={1.5} />
                      <line x1={x} y1={y} x2={x+width} y2={y} stroke={stroke} strokeWidth={1.5} /></g>);
                  }} />
                </BarChart>
              </ChartContainer>
            </Surface>
          </div>
        </div>

        <SectionTitle>Tactical Access</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {getTiles().map(t => (
            <Link key={t.l} to={t.to}>
              <Surface hover className="p-5 flex items-center gap-3">
                <t.icon className={`h-5 w-5 ${t.c}`} />
                <div className="flex-1">
                  <div className="text-[14px] font-semibold">{t.l}</div>
                  <div className="text-[11px] text-muted-foreground">Manage and moderate</div>
                </div>
              </Surface>
            </Link>
          ))}
        </div>
      </PageContent>
    </AdminLayout>
  );
}
