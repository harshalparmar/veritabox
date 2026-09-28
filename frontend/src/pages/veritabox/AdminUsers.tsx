import { AdminLayout } from "@/components/veritabox/AdminLayout";
import { PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Stat, Pill } from "@/components/veritabox/UI";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, resolveAssetUrl } from "@/lib/api";
import { 
  Users, Search, Filter, Shield, UserCheck, 
  GraduationCap, Briefcase, Building2, Clock, 
  ChevronRight, MoreHorizontal, ExternalLink, Loader2,
  UserX, ShieldCheck, Award, Zap, X, Save, Edit3,
  Globe, Github, Linkedin, BriefcaseIcon, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_COLORS: Record<string, string> = {
  Student: "hsl(var(--info))",
  Teacher: "hsl(var(--success))",
  Professional: "hsl(var(--primary))",
  Recruiter: "hsl(var(--warning))",
  Admin: "hsl(var(--destructive))",
  Founder: "hsl(var(--destructive))"
};

// The three standard user types managed in the Operative Registry.
const OPERATIVE_ROLES = ['Student', 'Teacher', 'Professional'];
// Recruiters live in their own isolated registry.
const RECRUITER_ROLES = ['Recruiter'];

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [registry, setRegistry] = useState<'operatives' | 'recruiters'>('operatives');
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [managingUser, setManagingUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'profile'>('status');
  const [profileForm, setProfileForm] = useState({
    name: '',
    bio: '',
    username: '',
    universityId: '',
    skills: [] as string[]
  });

  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminApi.getUsers(),
  });

  const isRecruiterRegistry = registry === 'recruiters';
  const assignableRoles = isRecruiterRegistry ? RECRUITER_ROLES : OPERATIVE_ROLES;
  const roles = ["All", ...assignableRoles];

  const switchRegistry = (r: 'operatives' | 'recruiters') => {
    setRegistry(r);
    setRoleFilter("All");
  };

  const handleManageUser = (user: any) => {
    setManagingUser(user);
    setProfileForm({
      name: user.name || '',
      bio: user.bio || '',
      username: user.username || '',
      universityId: user.universityId || '',
      skills: user.skills || []
    });
    setActiveTab('status');
  };

  const verifyMutation = useMutation({
    mutationFn: ({ id, verify }: { id: string; verify: boolean }) => adminApi.verifyUser(id, verify, 'Admin'),
    onSuccess: () => {
      toast.success("Verification status updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateUserRole(id, role),
    onSuccess: () => {
      toast.success("User role updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setManagingUser(null);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspend }: { id: string; suspend: boolean }) => adminApi.suspendUser(id, suspend),
    onSuccess: (data: any) => {
      toast.info(data.data.message);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setManagingUser(null);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const editProfileMutation = useMutation({
    mutationFn: (data: any) => adminApi.editUserProfile(managingUser._id, data),
    onSuccess: () => {
      toast.success("Operative profile updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setManagingUser(null);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const filteredUsers = users?.filter(u => {
    // Registry isolation: recruiters are managed separately from operatives.
    const inRegistry = isRecruiterRegistry
      ? u.role === 'Recruiter'
      : (u.role !== 'Recruiter' && u.role !== 'Admin' && u.role !== 'Founder');
    if (!inRegistry) return false;

    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
                         u.universityId?.toLowerCase().includes(search.toLowerCase()) ||
                         u.username?.toLowerCase().includes(search.toLowerCase()) ||
                         u.role?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <AdminLayout>

      <PageContent>
        <div className="space-y-6">
          {/* Registry switch  -  Operatives (Student/Teacher/Professional) vs Recruiters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => switchRegistry('operatives')}
              className={cn("text-[12px] px-4 py-2 border rounded font-bold uppercase tracking-widest transition-colors", !isRecruiterRegistry ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
            >
              Operative Registry
            </button>
            <button
              onClick={() => switchRegistry('recruiters')}
              className={cn("text-[12px] px-4 py-2 border rounded font-bold uppercase tracking-widest transition-colors", isRecruiterRegistry ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
            >
              Recruiter Registry
            </button>
          </div>

          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Stat label={isRecruiterRegistry ? "Total Recruiters" : "Total Operatives"} value={filteredUsers?.length?.toString() || "0"} />
            <Stat label="Verified" value={users?.filter(u => u.isVerified).length?.toString() || "0"} accent="hsl(var(--success))" />
            <Stat label="Pending Verification" value={users?.filter(u => !u.isVerified).length?.toString() || "0"} accent="hsl(var(--warning))" />
            <Stat label="Admins" value={users?.filter(u => u.role === 'Admin' || u.role === 'Founder').length?.toString() || "0"} hint="Total control" />
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID, role or domain..." 
                className="w-full h-10 bg-secondary/30 border border-border pl-10 pr-4 text-[13px] outline-none rounded focus:border-primary/50 transition-all"
              />
            </div>
            <button className="h-10 px-4 border border-border text-[12px] font-bold uppercase tracking-widest rounded hover:bg-secondary transition-all flex items-center gap-2 shrink-0">
              <ExternalLink className="h-3.5 w-3.5" /> Export
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              {roles.map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={cn("text-[12px] px-3 py-1.5 border rounded transition-colors whitespace-nowrap", roleFilter === r ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Users List */}
          <div className="grid gap-3">
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Surface key={user._id} className="p-4 flex items-center justify-between group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-secondary rounded flex items-center justify-center text-muted-foreground relative overflow-hidden">
                      {user.avatarUrl ? (
                        <img src={resolveAssetUrl(user.avatarUrl)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Users className="h-5 w-5" />
                      )}
                      {user.isVerified && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-success border border-background rounded-full" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold">{user.name}</span>
                        <span className="text-[11px] text-muted-foreground">@{user.username || user.universityId}</span>
                        <Pill style={{ backgroundColor: ROLE_COLORS[user.role] || "hsl(var(--muted))" }} className="text-[9px] h-4 text-white border-0">
                          {user.role?.toUpperCase() || 'UNKNOWN'}
                        </Pill>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 uppercase tracking-wider">
                        <span>{user.universityId}</span>
                        <span>•</span>
                        <span>Rep: {user.reputationPoints || 0}</span>
                        {user.isSuspended && (
                            <>
                                <span>•</span>
                                <span className="text-destructive font-black">SUSPENDED</span>
                            </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        {user.isVerified ? 'Verified' : 'Pending'}
                      </div>
                      <div className="text-[9px] text-muted-foreground/60 uppercase">
                        {user.verificationMethod || 'None'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => verifyMutation.mutate({ id: user._id, verify: !user.isVerified })}
                            disabled={verifyMutation.isPending}
                            className={cn(
                                "h-8 w-8 flex items-center justify-center rounded border transition-all",
                                user.isVerified 
                                    ? "bg-success/10 border-success/30 text-success hover:bg-success/20" 
                                    : "bg-warning/10 border-warning/30 text-warning hover:bg-warning/20"
                            )}
                            title={user.isVerified ? "Revoke Verification" : "Verify Operative"}
                        >
                            {user.isVerified ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                        </button>
                        
                        <button 
                            onClick={() => handleManageUser(user)}
                            className="h-8 w-8 flex items-center justify-center bg-secondary border border-border rounded hover:bg-border transition-colors text-muted-foreground"
                            title="Manage Operative"
                        >
                            <Settings className="h-4 w-4" />
                        </button>
                    </div>
                  </div>
                </Surface>
              ))
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-[13px]">
                No operatives found matching your query.
              </div>
            )}
          </div>
          
          <div className="py-4 border-t border-border flex justify-between items-center text-[12px] text-muted-foreground">
            <div>Showing {filteredUsers?.length || 0} of {users?.length || 0} operatives</div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-border rounded hover:bg-secondary">Previous</button>
              <button className="px-3 py-1 border border-border rounded hover:bg-secondary">Next</button>
            </div>
          </div>
        </div>

        {/* Management Modal */}
        {managingUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setManagingUser(null)} />
                <Surface className="relative w-full max-w-xl p-0 border-primary/30 shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-border/50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-secondary overflow-hidden border border-border">
                                {managingUser.avatarUrl ? (
                                    <img src={resolveAssetUrl(managingUser.avatarUrl)} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-primary font-bold">{managingUser.name[0]}</div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-[16px] font-bold uppercase tracking-widest text-primary">Operative Terminal</h2>
                                <p className="text-[11px] text-muted-foreground uppercase">{managingUser.name} • {managingUser.universityId}</p>
                            </div>
                        </div>
                        <button onClick={() => setManagingUser(null)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-2 px-6 py-3 border-b border-border/50 bg-secondary/20 flex-wrap">
                        <button 
                            onClick={() => setActiveTab('status')}
                            className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", activeTab === 'status' ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                        >
                            Status & Access
                        </button>
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", activeTab === 'profile' ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                        >
                            Profile Data
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {activeTab === 'status' ? (
                            <div className="space-y-8">
                                {/* Profile Brief */}
                                <div className="p-4 bg-primary/5 rounded border border-primary/10 space-y-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Globe className="h-3 w-3" /> Tactical Brief
                                    </h3>
                                    <p className="text-[13px] leading-relaxed text-foreground italic">
                                        "{managingUser.bio || 'No mission statement provided.'}"
                                    </p>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {managingUser.skills?.map((skill: string) => (
                                            <span key={skill} className="px-2 py-0.5 bg-background border border-border rounded text-[9px] font-bold text-muted-foreground uppercase">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Role Change */}
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Shield className="h-3.5 w-3.5" /> Access Role
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {assignableRoles.map(role => (
                                            <button
                                                key={role}
                                                onClick={() => roleMutation.mutate({ id: managingUser._id, role })}
                                                disabled={roleMutation.isPending}
                                                className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", managingUser.role === role ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Suspension */}
                                <div className="pt-6 border-t border-border/50">
                                    <button 
                                        onClick={() => suspendMutation.mutate({ id: managingUser._id, suspend: !managingUser.isSuspended })}
                                        disabled={suspendMutation.isPending}
                                        className={cn(
                                            "w-full px-4 py-3 text-[12px] font-black uppercase tracking-widest border rounded transition-all flex items-center justify-center gap-2",
                                            managingUser.isSuspended 
                                                ? "bg-success/10 border-success/30 text-success hover:bg-success/20" 
                                                : "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
                                        )}
                                    >
                                        {managingUser.isSuspended ? <RefreshCw className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                                        {managingUser.isSuspended ? "Reactivate Operative" : "Suspend Operative"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</label>
                                        <input 
                                            value={profileForm.name}
                                            onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                                            className="w-full h-10 bg-secondary/30 border border-border px-3 text-[13px] outline-none rounded focus:border-primary/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Username</label>
                                        <input 
                                            value={profileForm.username}
                                            onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                                            className="w-full h-10 bg-secondary/30 border border-border px-3 text-[13px] outline-none rounded focus:border-primary/50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">University ID / Identity Signature</label>
                                    <input 
                                        value={profileForm.universityId}
                                        onChange={(e) => setProfileForm({...profileForm, universityId: e.target.value})}
                                        className="w-full h-10 bg-secondary/30 border border-border px-3 text-[13px] outline-none rounded focus:border-primary/50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mission Statement (Bio)</label>
                                    <textarea 
                                        value={profileForm.bio}
                                        rows={4}
                                        onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                                        className="w-full bg-secondary/30 border border-border p-3 text-[13px] outline-none rounded focus:border-primary/50 resize-none"
                                        placeholder="Enter operative background..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Skills (Comma separated)</label>
                                    <input 
                                        value={profileForm.skills.join(', ')}
                                        onChange={(e) => setProfileForm({...profileForm, skills: e.target.value.split(',').map(s => s.trim())})}
                                        className="w-full h-10 bg-secondary/30 border border-border px-3 text-[13px] outline-none rounded focus:border-primary/50"
                                        placeholder="React, PCB Design, Python..."
                                    />
                                </div>

                                <div className="pt-4">
                                    <button 
                                        onClick={() => editProfileMutation.mutate(profileForm)}
                                        disabled={editProfileMutation.isPending}
                                        className="w-full h-11 bg-primary text-primary-foreground text-[12px] font-black uppercase tracking-[0.2em] rounded flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                                    >
                                        {editProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Synchronize Profile Data
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-secondary/20 border-t border-border/50 text-center shrink-0">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
                            {activeTab === 'status' ? 'Administrative oversight in effect.' : 'Synchronizing changes with global registry...'}
                        </p>
                    </div>
                </Surface>
            </div>
        )}
      </PageContent>
    </AdminLayout>
  );
}

function Settings(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    )
}
