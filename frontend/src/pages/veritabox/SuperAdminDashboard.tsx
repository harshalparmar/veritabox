import { Surface, Stat, Pill } from "@/components/VeritaBox/UI";
import { useState, useEffect } from "react";
import { superAdminApi, User, setToken } from "@/lib/api";
import { 
  Shield, Search, Ghost, History, Lock, 
  Terminal, AlertTriangle, ChevronRight, Loader2,
  RefreshCw, Power
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const saToken = localStorage.getItem("sa_token");

  // Immediate Gatekeeper
  if (!saToken) {
    useEffect(() => { navigate("/login"); }, []);
    return null;
  }

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [u, logs] = await Promise.all([
        superAdminApi.getUsers(),
        superAdminApi.getAudit()
      ]);
      setUsers(u || []);
      setAuditLogs(logs || []);
    } catch (err) {
      toast.error("Shadow Layer sync failure.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!saToken) {
      navigate("/sa/login");
    } else {
      fetchData();
    }
  }, [saToken, navigate]);

  const handlePossess = async (userId: string) => {
    if (!window.confirm("Engage Ghost Mode? All actions will be logged immutably.")) return;
    try {
      const { token } = await superAdminApi.ghost(userId);
      setToken(token);
      toast.success("Ghost Mode engaged.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error("Possession protocol failed.");
    }
  };

  const roles = ["All", "Student", "Faculty", "Alumni", "Industry", "Admin", "Founder"];

  const filteredUsers = users.filter(u => {
    const name = u.name || "";
    const uid = u.universityId || "";
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || 
                          uid.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const terminateSA = () => {
    localStorage.removeItem("sa_token");
    navigate("/sa/login");
    toast.info("Shadow Layer disengaged.");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-foreground p-6 font-mono selection:bg-destructive/30">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Absolute Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 bg-destructive/10 border border-destructive/30 rounded flex items-center justify-center text-destructive relative group cursor-help">
              <Shield className="h-7 w-7" />
              <div className="absolute -inset-1 bg-destructive/20 blur opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[24px] font-black tracking-tighter text-destructive uppercase italic">Absolute Terminal</h1>
                <Pill variant="destructive" className="bg-destructive text-white border-none animate-pulse">SHADOW_ROOT</Pill>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-[10px] text-white/40 uppercase tracking-[0.2em]">
                <span className="flex items-center gap-1.5 text-success"><RefreshCw className="h-3 w-3" /> system_synced</span>
                <span className="h-1 w-1 bg-white/10 rounded-full" />
                <span>Protocol: v2.8.4_OMEGA</span>
                <span className="h-1 w-1 bg-white/10 rounded-full" />
                <span>Active SAs: 1</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={fetchData}
              className="h-10 w-10 flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-destructive' : 'text-white/40'}`} />
            </button>
            <button 
              onClick={terminateSA}
              className="h-10 px-5 bg-white/5 border border-white/10 hover:bg-destructive hover:text-white transition-all rounded text-[11px] font-bold uppercase tracking-[0.15em] flex items-center gap-2"
            >
              <Power className="h-3.5 w-3.5" /> Disengage
            </button>
          </div>
        </div>

        {/* Global Intelligence Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Surface className="p-5 bg-white/[0.02] border-white/5">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Total Population</div>
            <div className="text-[22px] font-black text-white/90">{users.length}</div>
            <div className="text-[9px] text-success mt-1">OPERATIVES_READY</div>
          </Surface>
          <Surface className="p-5 bg-white/[0.02] border-white/5">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">High Velocity</div>
            <div className="text-[22px] font-black text-white/90">{users.filter(u => u.rank === 'Elite').length}</div>
            <div className="text-[9px] text-primary mt-1">ELITE_CLASS_UNITS</div>
          </Surface>
          <Surface className="p-5 bg-white/[0.02] border-white/5">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Security Queue</div>
            <div className="text-[22px] font-black text-warning">14</div>
            <div className="text-[9px] text-warning/50 mt-1">PENDING_DOMAIN_OTP</div>
          </Surface>
          <Surface className="p-5 bg-white/[0.02] border-white/5 border-destructive/20">
            <div className="text-[10px] text-destructive/50 uppercase tracking-widest mb-1">Audit Density</div>
            <div className="text-[22px] font-black text-destructive">{auditLogs.length}</div>
            <div className="text-[9px] text-destructive/40 mt-1">INTERACTIONS_LOGGED</div>
          </Surface>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Operative Registry & Target Acquisition */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="QUERY_BY_NAME_ID_OR_SIGNATURE..." 
                  className="w-full h-11 bg-white/5 border border-white/10 pl-10 pr-4 text-[12px] outline-none rounded focus:border-destructive/30 transition-all focus:bg-white/10 uppercase placeholder:text-white/10"
                />
              </div>
              <div className="flex gap-1 bg-white/5 p-1 rounded border border-white/10 overflow-x-auto no-scrollbar">
                {roles.map(r => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded transition-all whitespace-nowrap uppercase tracking-tighter ${
                      roleFilter === r ? "bg-destructive text-white" : "text-white/30 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              {loading ? (
                <div className="h-64 flex items-center justify-center border border-white/5 rounded bg-white/[0.01]">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-destructive" />
                    <span className="text-[10px] text-destructive uppercase tracking-[0.3em]">Decrypting Registry...</span>
                  </div>
                </div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map(u => (
                  <Surface key={u._id} className="p-4 bg-white/[0.01] border-white/5 flex items-center justify-between group hover:border-destructive/20 hover:bg-white/[0.03] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 bg-white/5 rounded border border-white/5 flex items-center justify-center text-white/20 relative">
                        <Terminal className="h-5 w-5" />
                        {u.isVerified && (
                          <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-success rounded-full border-2 border-[#050505]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-bold text-white/90">{u.name}</span>
                          <span className="text-[10px] text-white/20">/</span>
                          <span className="text-[10px] text-white/40 uppercase tracking-widest">{u.universityId}</span>
                        </div>
                        <div className="text-[10px] flex items-center gap-3 mt-1 uppercase tracking-wider">
                          <span className="text-destructive font-black">{u.role}</span>
                          <span className="h-1 w-1 bg-white/10 rounded-full" />
                          <span className={`${u.rank === 'Elite' ? 'text-primary' : 'text-white/40'} font-bold`}>{u.rank || 'Rookie'}</span>
                          <span className="h-1 w-1 bg-white/10 rounded-full" />
                          <span className="text-white/20">Rep: {u.reputationPoints || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden xl:block mr-4 border-r border-white/5 pr-4">
                        <div className="text-[10px] text-white/40 uppercase">Domain Match</div>
                        <div className="text-[10px] text-white/20">{u.institutionalDomain || 'N/A'}</div>
                      </div>
                      <button 
                        onClick={() => handlePossess(u._id)}
                        className="h-10 px-5 bg-white/5 border border-white/10 text-white text-[11px] font-bold uppercase tracking-[0.2em] rounded hover:bg-destructive hover:border-destructive transition-all flex items-center gap-2"
                      >
                        <Ghost className="h-4 w-4" /> Possess
                      </button>
                    </div>
                  </Surface>
                ))
              ) : (
                <div className="h-48 flex items-center justify-center border border-dashed border-white/5 rounded text-white/10 text-[11px] uppercase tracking-widest">
                  Zero results in current sector.
                </div>
              )}
            </div>
          </div>

          {/* Intelligent Audit Stream */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="text-[11px] uppercase tracking-[0.3em] text-destructive font-black flex items-center gap-2">
                <History className="h-3.5 w-3.5" /> Intelligence Feed
              </div>
              <Pill variant="secondary" className="bg-white/5 text-[9px] border-none text-white/40">LIVE_TELEMETRY</Pill>
            </div>
            
            <div className="space-y-0.5 max-h-[750px] overflow-y-auto pr-2 scrollbar-none">
              {auditLogs.length > 0 ? (
                auditLogs.map((log, idx) => (
                  <div key={log._id} className={`group p-3 border-l-2 ${log.isGhostAction ? 'border-destructive bg-destructive/5' : 'border-white/10 hover:bg-white/[0.02]'} transition-all`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${log.isGhostAction ? 'text-destructive' : 'text-white/60'}`}>
                        {log.action.replace(' ', '_')}
                      </span>
                      <span className="text-[9px] text-white/20 font-mono">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[11px] text-white/80 leading-relaxed">
                      SA_{log.saId?.email?.split('@')[0].toUpperCase()} 
                      <span className="text-white/30 mx-1.5">{'>>'}</span> 
                      {log.action.toLowerCase()} 
                      {log.targetUserId && (
                        <span className="text-primary ml-1.5 font-bold">[@{log.targetUserId.universityId}]</span>
                      )}
                    </div>
                    {log.isGhostAction && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-destructive/60 font-black uppercase italic">
                        <AlertTriangle className="h-3 w-3" /> GHOST_PROTOCOL_ENGAGED
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="h-8 w-8 mx-auto text-white/5" />
                  <div className="text-[10px] text-white/10 uppercase tracking-widest">No signals detected.</div>
                </div>
              )}
            </div>

            <div className="p-5 bg-destructive/5 border border-destructive/20 rounded relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Shield className="h-16 w-16 -mr-4 -mt-4 rotate-12" />
              </div>
              <div className="relative z-10 flex items-start gap-4">
                <Lock className="h-5 w-5 text-destructive shrink-0 mt-1" />
                <div className="space-y-2">
                  <div className="text-[11px] text-white font-black uppercase">SA Security Protocol</div>
                  <div className="text-[10px] text-white/40 leading-relaxed uppercase tracking-tighter">
                    Absolute transparency is mandatory. Every possession and write operation is mirrored to the immutable shadow trail. Attempting to bypass logging will trigger immediate system lockdown.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
