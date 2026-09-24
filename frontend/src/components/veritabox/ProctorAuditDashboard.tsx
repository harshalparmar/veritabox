import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi, resolveGatedAssetUrl } from "@/lib/api";
import { Surface, Pill } from "@/components/veritabox/UI";
import {
  Camera, Trash2, Loader2, Calendar,
  Users, ShieldAlert, Monitor, ZoomIn, X, ChevronLeft, AlertTriangle, List, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  hackathonId: string;
}

export default function ProctorAuditDashboard({ hackathonId }: Props) {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<"snapshots" | "violations">("snapshots");
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterRound, setFilterRound] = useState<string>("all");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: snapshots, isLoading } = useQuery({
    queryKey: ["proctor-snapshots", hackathonId],
    queryFn: () => hackathonsApi.getProctorSnapshots(hackathonId),
    refetchInterval: 30000,
  });

  const { data: violations, isLoading: loadingViolations } = useQuery({
    queryKey: ["proctor-violations", hackathonId],
    queryFn: () => hackathonsApi.getViolations(hackathonId),
    enabled: activeView === "violations",
  });

  const purgeMutation = useMutation({
    mutationFn: () => hackathonsApi.purgeProctorSnapshots(hackathonId),
    onSuccess: () => {
      toast.success("Telemetry bank archived and purged.");
      queryClient.invalidateQueries({ queryKey: ["proctor-snapshots", hackathonId] });
    },
  });

  const filteredSnapshots = snapshots?.filter((s: any) => {
    const matchTeam = filterTeam === "all" || s.teamId?._id === filterTeam;
    const matchRound = filterRound === "all" || s.roundNumber.toString() === filterRound;
    return matchTeam && matchRound;
  });

  const uniqueTeams = Array.from(new Set(snapshots?.map((s: any) => s.teamId?._id))).map(id => {
    return snapshots?.find((s: any) => s.teamId?._id === id)?.teamId;
  }).filter(Boolean);

  const uniqueRounds = Array.from(new Set(snapshots?.map((s: any) => s.roundNumber))).sort();

  // Grouping Logic
  const groupedSnapshots = filteredSnapshots?.reduce((acc: any, s: any) => {
    // Handle both populated and unpopulated teamId
    const tId = typeof s.teamId === 'object' ? s.teamId?._id : s.teamId;
    const teamId = tId?.toString() || "unknown";
    
    if (!acc[teamId]) {
      acc[teamId] = { 
        team: typeof s.teamId === 'object' ? s.teamId : { _id: teamId, teamName: "Unknown Squadron" }, 
        snapshots: [] 
      };
    }
    acc[teamId].snapshots.push(s);
    return acc;
  }, {});

  const groupedTeams = Object.values(groupedSnapshots || {});

  const searchedTeams = groupedTeams.filter((g: any) => 
    g.team?.teamName?.toLowerCase()?.includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[12px] font-mono text-muted-foreground animate-pulse">Accessing telemetry bank...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border/50 pb-4">
        {([["snapshots", Camera, "Visual Telemetry"], ["violations", AlertTriangle, "Violation Log"]] as const).map(([view, Icon, label]) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`relative flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${activeView === view ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            <div className={`absolute inset-0 border ${activeView === view ? "bg-primary/10 border-primary" : "bg-secondary/20 border-border hover:bg-secondary/40"} -z-10`} />
            <Icon className={`h-3.5 w-3.5 ${activeView === view ? "text-primary" : "text-muted-foreground"}`} /> {label}
          </button>
        ))}
      </div>

      {activeView === "violations" && (
        <ViolationLogView violations={violations} isLoading={loadingViolations} />
      )}

      {activeView === "snapshots" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <SciFiDropdown
                label="Filter Squadron"
                value={filterTeam}
                onChange={setFilterTeam}
                options={[
                  { value: "all", label: "Global Feed" },
                  ...uniqueTeams.map((t: any) => ({ value: t._id, label: t.teamName }))
                ]}
              />
              <SciFiDropdown
                label="Filter Phase"
                value={filterRound}
                onChange={setFilterRound}
                options={[
                  { value: "all", label: "All Rounds" },
                  ...uniqueRounds.map((r: any) => ({ value: r, label: `Round ${r}` }))
                ]}
              />
            </div>
            <div className="flex items-center gap-4">
              <div 
                className="flex items-center h-9 bg-secondary/20 border border-border/60 px-3 gap-3 focus-within:border-primary/50 transition-colors"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest whitespace-nowrap">Search</label>
                <div className="flex items-center gap-2 pl-2 border-l border-border/50">
                  <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Terminal Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-[12px] w-48 placeholder:text-muted-foreground/50 text-foreground font-mono"
                  />
                </div>
              </div>

              {selectedTeamId && (
                <button
                  onClick={() => setSelectedTeamId(null)}
                  className="h-9 px-4 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold uppercase hover:bg-primary/20 flex items-center gap-2 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Return to Hub
                </button>
              )}
              <button
                onClick={() => confirm("Are you sure? This will permanently delete all visual telemetry artifacts.") && purgeMutation.mutate()}
                className="relative h-9 px-4 text-destructive text-[11px] font-bold uppercase hover:bg-destructive/20 flex items-center gap-2 transition-colors z-10"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <div className="absolute inset-0 bg-destructive/5 border border-destructive/40 -z-10" />
                <Trash2 className="h-4 w-4" /> Export & Purge Bank
              </button>
            </div>
          </div>

          {selectedTeamId === null ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {searchedTeams.map((group: any) => (
                <Surface
                  key={group.team?._id || "unknown"}
                  onClick={() => setSelectedTeamId(group.team?._id || "unknown")}
                  className="p-6 cursor-pointer group hover:border-primary/50 transition-all border-border/40 bg-secondary/5"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-[16px] font-bold uppercase tracking-tight">{group.team?.teamName || "独立Operatives"}</h3>
                      <Pill variant="secondary" className="text-[9px] h-4 uppercase font-mono tracking-tighter">
                        {group.snapshots.length} Artifacts Synced
                      </Pill>
                    </div>
                  </div>
                </Surface>
              ))}
              {searchedTeams.length === 0 && <EmptyState />}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {groupedTeams.filter((g: any) => (g.team?._id || "unknown") === selectedTeamId).map((group: any) => (
                <div key={group.team?._id || "unknown"} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-border/40 pb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-primary/20 border border-primary/40 rounded flex items-center justify-center">
                        <ShieldAlert className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-[20px] font-bold uppercase tracking-tight text-primary">{group.team?.teamName || "Squadron Telemetry Feed"}</h3>
                        <p className="text-[11px] text-muted-foreground font-mono uppercase">Full Intelligence Batch · Deep-Dive Session</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {group.snapshots.map((s: any) => (
                      <SnapshotCard key={s._id} snapshot={s} onSelect={setSelectedSnapshot} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Snapshot Preview Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
           <div className="relative w-full max-w-5xl space-y-4">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-4">
                    <div className="space-y-0.5">
                       <h4 className="text-[16px] font-bold uppercase tracking-tight flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-primary" /> Telemetry Analysis: {selectedSnapshot.teamId?.teamName}
                       </h4>
                       <p className="text-[11px] text-muted-foreground font-mono">
                          OPERATIVE: @{selectedSnapshot.userId?.name} · CAPTURED: {format(new Date(selectedSnapshot.timestamp), "yyyy-MM-dd HH:mm:ss")}
                       </p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedSnapshot(null)} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80">
                    <X className="h-5 w-5" />
                 </button>
              </div>

              <Surface className="p-0 border-primary/30 overflow-hidden shadow-2xl shadow-primary/10">
                 <img src={resolveGatedAssetUrl(selectedSnapshot.imagePath) || selectedSnapshot.imageData} alt="Analysis" className="w-full h-auto" />
              </Surface>

              <div className="grid grid-cols-3 gap-4">
                 <div className="p-4 bg-secondary/30 border border-border/40 rounded flex flex-col items-center gap-1 text-center">
                    <Monitor className="h-4 w-4 text-primary" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Source Stream</span>
                    <span className="text-[12px] font-mono">WEBCAM_720P</span>
                 </div>
                 <div className="p-4 bg-secondary/30 border border-border/40 rounded flex flex-col items-center gap-1 text-center">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Attribution</span>
                    <span className="text-[12px] font-mono">{selectedSnapshot.teamId?.teamName}</span>
                 </div>
                 <div className="p-4 bg-secondary/30 border border-border/40 rounded flex flex-col items-center gap-1 text-center">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Timestamp</span>
                    <span className="text-[12px] font-mono">{format(new Date(selectedSnapshot.timestamp), "PPpp")}</span>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function SnapshotCard({ snapshot: s, onSelect }: { snapshot: any, onSelect: (s: any) => void }) {
  return (
    <Surface className="p-0 overflow-hidden group border-border/40 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(var(--primary),0.1)] hover:-translate-y-0.5 cursor-pointer flex flex-col">
      <div className="relative aspect-video bg-black/60 overflow-hidden" onClick={() => onSelect(s)}>
        <img
          src={resolveGatedAssetUrl(s.imagePath) || s.imageData}
          alt="Proctoring Snapshot"
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-70 group-hover:opacity-50 transition-opacity duration-300" />
        
        <div className="absolute top-2 left-2 flex gap-1.5">
            <Pill variant="secondary" className="text-[9px] h-4 bg-black/60 border-white/20 backdrop-blur-md text-white/90 shadow-sm">R{s.roundNumber}</Pill>
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="h-12 w-12 bg-primary/20 border border-primary/40 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
              <ZoomIn className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
      <div className="p-3.5 space-y-2.5 bg-card/50 flex-1 flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-full bg-secondary border border-border/50 flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0 shadow-sm">
              {s.userId?.avatarUrl ? <img src={s.userId.avatarUrl} className="w-full h-full object-cover" /> : s.userId?.name?.substring(0, 1)}
            </div>
            <span className="text-[12px] font-bold truncate tracking-tight">@{s.userId?.name || "Unknown"}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-mono tracking-tighter pt-2 border-t border-border/30">
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-primary/80"><Users className="h-3 w-3" /> <span className="truncate max-w-[100px]">{s.teamId?.teamName || "ROAMER"}</span></span>
            <span className="flex items-center gap-1.5 opacity-80"><Calendar className="h-3 w-3" /> {format(new Date(s.timestamp), "HH:mm:ss")}</span>
          </div>
      </div>
    </Surface>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center border border-dashed border-border rounded-lg bg-secondary/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="h-16 w-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4 border border-border/50 group-hover:scale-110 group-hover:border-primary/30 transition-all duration-500 shadow-[0_0_15px_rgba(var(--primary),0.05)]">
            <Camera className="h-8 w-8 text-muted-foreground group-hover:text-primary/60 transition-colors" />
        </div>
        <h3 className="text-[14px] font-bold uppercase tracking-widest text-foreground/80 mb-2">No Artifacts Found</h3>
        <p className="text-[12px] text-muted-foreground font-mono max-w-sm">Adjust your filter parameters or search query to locate telemetry data.</p>
    </div>
  );
}

const VIOLATION_COLORS: Record<string, string> = {
  TAB_SWITCH: "text-warning border-warning/30 bg-warning/5",
  FULLSCREEN_EXIT: "text-orange-400 border-orange-400/30 bg-orange-400/5",
  MINIMIZE: "text-destructive border-destructive/30 bg-destructive/5",
};

function ViolationLogView({ violations, isLoading }: { violations: any[] | undefined; isLoading: boolean }) {
  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-[12px] font-mono text-muted-foreground animate-pulse">Retrieving breach logs...</p>
    </div>
  );

  if (!violations || violations.length === 0) return (
    <div className="py-20 text-center border border-dashed border-border rounded-lg bg-secondary/5">
      <List className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-20" />
      <p className="text-[13px] text-muted-foreground font-mono">No violations recorded for this mission.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b border-border pb-2">
        {violations.length} Total Violation Entries
      </div>
      <div className="space-y-2">
        {violations.map((v: any, i: number) => (
          <div key={i} className={`flex items-center justify-between p-3 border rounded text-[12px] ${VIOLATION_COLORS[v.type] ?? "text-muted-foreground border-border bg-secondary/5"}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <span className="font-bold uppercase tracking-tight">{v.type?.replace(/_/g, ' ')}</span>
                <span className="ml-2 text-muted-foreground">@{v.user?.name || v.userId}</span>
                {v.team?.teamName && <span className="ml-2 opacity-60">— {v.team.teamName}</span>}
              </div>
            </div>
            <div className="text-[10px] font-mono opacity-70">
              {v.timestamp ? format(new Date(v.timestamp), "yyyy-MM-dd HH:mm:ss") : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SciFiDropdown({ label, value, options, onChange }: { label: string, value: string, options: {value: string, label: string}[], onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || value;
  const clip = 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)';
  
  return (
    <div className="relative">
      <div 
        onClick={() => setOpen(!open)}
        className={`flex items-center h-9 bg-secondary/20 hover:bg-secondary/40 border transition-colors px-3 gap-3 cursor-pointer select-none ${open ? 'border-primary/50' : 'border-border/60'}`}
        style={{ clipPath: clip }}
      >
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{label}</span>
        <div className="flex items-center gap-2 pl-2 border-l border-border/50">
          <span className="text-[12px] font-bold text-foreground min-w-[80px]">{selectedLabel}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-primary transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-background border border-primary/30 shadow-2xl z-50 overflow-hidden"
             style={{ clipPath: clip }}
        >
          <div className="max-h-[250px] overflow-y-auto">
            {options.map(opt => (
              <div 
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${value === opt.value ? 'bg-primary/20 text-primary border-l-2 border-primary' : 'text-foreground/70 hover:bg-secondary hover:text-foreground border-l-2 border-transparent'}`}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
