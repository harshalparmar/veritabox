import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import { 
  Settings, Loader2, Save, 
  MapPin, Globe, ShieldCheck, 
  Trash2, Plus, Info, Image as ImageIcon,
  ExternalLink, Users, Award, Palette,
  Swords, UserCog, Upload, Camera
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chaptersApi, api, resolveAssetUrl } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const LOCAL_ROLES = [
  "Technical Commander",
  "Logistics Lead",
  "Communications Officer",
  "Intelligence Liaison"
];

const THEME_COLORS = [
  { name: "Neon Blue", value: "hsl(199 89% 48%)" },
  { name: "Cyber Purple", value: "hsl(271 91% 65%)" },
  { name: "Toxic Green", value: "hsl(142 71% 45%)" },
  { name: "Blood Red", value: "hsl(0 84% 60%)" },
  { name: "Gold Standard", value: "hsl(48 96% 53%)" },
];

export default function ChapterManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("General");
  const [formData, setFormData] = useState<any>({});
  const [roleModalMember, setRoleModalMember] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const { data: chapter, isLoading } = useQuery({
    queryKey: ["chapter-manage", id],
    queryFn: () => chaptersApi.getBySlug(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (chapter) {
        setFormData({
            description: chapter.description || "",
            city: chapter.city || "",
            logoUrl: chapter.logoUrl || "",
            bannerUrl: chapter.bannerUrl || "",
            socialLinks: chapter.socialLinks || { instagram: "", linkedin: "", twitter: "", website: "" },
            verifiedDomains: chapter.verifiedDomains || [],
            themeColor: chapter.themeColor || "hsl(var(--primary))",
            localRoles: chapter.localRoles || []
        });
    }
  }, [chapter]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => chaptersApi.manage(chapter?._id, data),
    onSuccess: () => {
        toast.success("INSTITUTE PROTOCOLS UPDATED", {
            description: "Sector changes have been synchronized with the global registry."
        });
        queryClient.invalidateQueries({ queryKey: ["chapter-manage", id] });
        queryClient.invalidateQueries({ queryKey: ["chapter", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const uploadData = new FormData();
    uploadData.append('document', file);

    try {
        const data = await api.upload<{ filePath: string }>("/api/upload", uploadData);
        setFormData((prev: any) => ({ ...prev, logoUrl: data.filePath }));
        toast.success("Logo uplink successful.");
    } catch (err: any) {
        toast.error(`Uplink failed: ${err.message}`);
    } finally {
        setIsUploadingLogo(false);
        if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    const uploadData = new FormData();
    uploadData.append('document', file);

    try {
        const data = await api.upload<{ filePath: string }>("/api/upload", uploadData);
        setFormData((prev: any) => ({ ...prev, bannerUrl: data.filePath }));
        toast.success("Banner asset synchronized.");
    } catch (err: any) {
        toast.error(`Sync failed: ${err.message}`);
    } finally {
        setIsUploadingBanner(false);
        if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleSave = () => {
      const sanitizedData = {
          ...formData,
          localRoles: formData.localRoles.map((r: any) => ({
              user: r.user?._id || r.user,
              roleName: r.roleName
          }))
      };
      updateMutation.mutate(sanitizedData);
  };

  if (isLoading) {
    return (
      <VeritaBoxLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </VeritaBoxLayout>
    );
  }

  if (!chapter) return null;

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="mb-6 border-b border-border pb-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin Portal</span>
          <h1 className="text-[28px] font-semibold tracking-tight mt-1">Manage {chapter.name}</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Administrative control panel for the {chapter.university} sector.</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 space-y-4">
                <Surface className="p-2">
                    {["General", "Visual Identity", "Members & Roles", "Verification", "Danger Zone"].map((t) => (
                        <button 
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={cn(
                                "w-full text-left px-3.5 py-2 rounded text-[12.5px] font-medium transition-all",
                                activeTab === t ? "bg-secondary text-foreground font-semibold border border-border" : "text-muted-foreground hover:bg-secondary/40"
                            )}
                            style={activeTab === t ? { borderColor: formData.themeColor, color: formData.themeColor } : {}}
                        >
                            {t}
                        </button>
                    ))}
                </Surface>

                <Surface className="p-4 bg-secondary/10">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Sector Status</div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-muted-foreground">Tier</span>
                            <Pill style={{ backgroundColor: formData.themeColor }} className="text-[9px] h-4.5 text-white border-0">{chapter.tier?.toUpperCase() || "PROVISIONAL"}</Pill>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-muted-foreground">Reputation</span>
                            <span className="text-[12px] font-bold text-success">{chapter.stats?.totalReputation || 0} XP</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-muted-foreground">Velocity</span>
                            <span className="text-[12px] font-bold text-info">+{chapter.stats?.reputationVelocity || 0}</span>
                        </div>
                    </div>
                </Surface>
            </div>

            {/* Main Configuration Area */}
            <div className="lg:col-span-3 space-y-6">
                <Surface className="p-6 space-y-6">
                    {activeTab === "General" && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-2 text-primary" style={{ color: formData.themeColor }}>
                                <Settings className="h-4.5 w-4.5" />
                                <h3 className="text-[13px] font-bold uppercase tracking-wider">General Configuration</h3>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Operational City</label>
                                <div className="flex items-center gap-2 px-3 h-9 bg-secondary/20 border border-border rounded">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <input 
                                        value={formData.city}
                                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                                        className="bg-transparent flex-1 outline-none text-[12.5px]" 
                                        placeholder="e.g. Mumbai, India"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sector Mission Briefing</label>
                                <textarea 
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full min-h-[120px] bg-secondary/20 border border-border rounded p-3 text-[12.5px] outline-none focus:border-primary/50 transition-all resize-none"
                                    placeholder="Describe your institute's focus and achievements..."
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "Visual Identity" && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-primary" style={{ color: formData.themeColor }}>
                                <Palette className="h-4.5 w-4.5" />
                                <h3 className="text-[13px] font-bold uppercase tracking-wider">Visual Identity & Battle Theme</h3>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Institute Battle Theme</label>
                                <div className="flex flex-wrap gap-2.5">
                                    {THEME_COLORS.map(c => (
                                        <button 
                                            key={c.value}
                                            onClick={() => setFormData({...formData, themeColor: c.value})}
                                            className={cn(
                                                "group flex flex-col items-center gap-1.5 transition-all",
                                                formData.themeColor === c.value ? "opacity-100 scale-102" : "opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                                            )}
                                        >
                                            <div className="h-10 w-10 rounded-full border border-border shadow" style={{ backgroundColor: c.value }} />
                                            <span className="text-[9px] font-mono uppercase tracking-tight">{c.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-border/40" />

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Institute Logo</label>
                                    <div className="flex gap-3">
                                        <div className="h-16 w-16 rounded border border-border bg-secondary/30 flex items-center justify-center shrink-0 overflow-hidden relative group">
                                            {formData.logoUrl ? (
                                                <img src={resolveAssetUrl(formData.logoUrl)} className="h-full w-full object-cover" />
                                            ) : (
                                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                            )}
                                            {isUploadingLogo && (
                                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => logoInputRef.current?.click()}
                                                className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                            >
                                                <Camera className="h-4 w-4 text-white" />
                                            </button>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <input 
                                                type="file"
                                                ref={logoInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                            />
                                            <input 
                                                value={formData.logoUrl}
                                                onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                                                className="w-full h-8.5 bg-secondary/20 border border-border rounded px-3 text-[12px] outline-none" 
                                                placeholder="Logo URL..."
                                            />
                                            <button 
                                                onClick={() => logoInputRef.current?.click()}
                                                disabled={isUploadingLogo}
                                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:brightness-110 disabled:opacity-50"
                                            >
                                                <Upload className="h-3 w-3" /> Upload Logo
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Banner Asset</label>
                                    <div className="space-y-2">
                                        <div className="h-16 w-full rounded border border-border bg-secondary/30 flex items-center justify-center overflow-hidden relative group">
                                            {formData.bannerUrl ? (
                                                <img src={resolveAssetUrl(formData.bannerUrl)} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                                    <span className="text-[9px] text-muted-foreground mt-0.5">No Banner</span>
                                                </div>
                                            )}
                                            {isUploadingBanner && (
                                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => bannerInputRef.current?.click()}
                                                className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                            >
                                                <Camera className="h-4.5 w-4.5 text-white" />
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="file"
                                                ref={bannerInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleBannerUpload}
                                            />
                                            <input 
                                                value={formData.bannerUrl}
                                                onChange={(e) => setFormData({...formData, bannerUrl: e.target.value})}
                                                className="flex-1 h-8.5 bg-secondary/20 border border-border rounded px-3 text-[12px] outline-none" 
                                                placeholder="Banner URL..."
                                            />
                                            <button 
                                                onClick={() => bannerInputRef.current?.click()}
                                                disabled={isUploadingBanner}
                                                className="h-8.5 px-3 bg-secondary border border-border rounded text-[10px] font-bold uppercase tracking-widest hover:bg-border transition-all flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                <Upload className="h-3 w-3" /> Upload
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Members & Roles" && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-primary" style={{ color: formData.themeColor }}>
                                <Users className="h-4.5 w-4.5" />
                                <h3 className="text-[13px] font-bold uppercase tracking-wider">Sector Operatives</h3>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[12px] text-muted-foreground leading-relaxed">
                                    Manage your institute's operatives and assign local leadership roles.
                                </p>
                                
                                <div className="grid gap-2">
                                    {chapter.members?.map((member: any) => {
                                        const role = formData.localRoles?.find((r: any) => (r.user?._id || r.user) === member._id)?.roleName;
                                        return (
                                            <div key={member._id} className="flex items-center justify-between p-3.5 bg-secondary/10 border border-border rounded group hover:border-primary/20 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 bg-background rounded flex items-center justify-center border border-border font-bold text-[10px] uppercase">
                                                        {member.name?.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div className="text-[12.5px] font-bold uppercase tracking-wider">{member.name}</div>
                                                        <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                                                            {role ? (
                                                                <span className="flex items-center gap-1 text-primary" style={{ color: formData.themeColor }}>
                                                                    <ShieldCheck className="h-3 w-3" /> {role}
                                                                </span>
                                                            ) : (
                                                                "Standard Operative"
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        setRoleModalMember(member);
                                                        setSelectedRole(role || null);
                                                    }}
                                                    className="h-8 px-3 border border-border hover:bg-secondary rounded text-[10px] font-bold uppercase tracking-widest transition-all"
                                                >
                                                    {role ? "Reassign" : "Assign Role"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Verification" && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-info">
                                <ShieldCheck className="h-4.5 w-4.5" />
                                <h3 className="text-[13px] font-bold uppercase tracking-wider">Auto-Verification Protocol</h3>
                            </div>
                            
                            <p className="text-[12px] text-muted-foreground leading-relaxed">
                                Users with email addresses ending in these domains will be automatically verified as institute members upon enlistment.
                            </p>

                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input 
                                        id="newDomain"
                                        className="flex-1 h-9 bg-secondary/20 border border-border rounded px-3 text-[12.5px] outline-none" 
                                        placeholder="e.g. university.edu"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = e.currentTarget.value.trim();
                                                if (val && !formData.verifiedDomains.includes(val)) {
                                                    setFormData({...formData, verifiedDomains: [...formData.verifiedDomains, val]});
                                                    e.currentTarget.value = '';
                                                }
                                            }
                                        }}
                                    />
                                    <button 
                                        onClick={() => {
                                            const input = document.getElementById('newDomain') as HTMLInputElement;
                                            const val = input.value.trim();
                                            if (val && !formData.verifiedDomains.includes(val)) {
                                                setFormData({...formData, verifiedDomains: [...formData.verifiedDomains, val]});
                                                input.value = '';
                                            }
                                        }}
                                        className="h-9 px-4 bg-secondary border border-border rounded text-[11px] font-bold uppercase tracking-widest hover:bg-border transition-all"
                                    >
                                        Add Domain
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {formData.verifiedDomains?.map((domain: string, i: number) => (
                                        <Pill key={i} className="h-7 pl-2.5 pr-1.5 flex items-center gap-1.5 border-info/30 bg-info/5 text-info">
                                            {domain}
                                            <button 
                                                onClick={() => setFormData({...formData, verifiedDomains: formData.verifiedDomains.filter((d: string) => d !== domain)})}
                                                className="h-4 w-4 hover:bg-info/20 rounded flex items-center justify-center"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </Pill>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-border flex justify-end gap-3">
                        <button 
                            onClick={() => navigate(`/chapters/${chapter.slug}`)}
                            className="h-9 px-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="h-9 px-6 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[11px] rounded flex items-center gap-1.5 hover:brightness-110 transition-all"
                            style={{ backgroundColor: formData.themeColor }}
                        >
                            {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5" /> Save Configuration</>}
                        </button>
                    </div>
                </Surface>
            </div>
        </div>
      </PageContent>

      <RoleAssignmentModal 
        isOpen={!!roleModalMember} 
        onClose={() => setRoleModalMember(null)}
        member={roleModalMember}
        chapterId={chapter._id}
        currentRole={selectedRole}
        onUpdate={(newRole: string | null) => {
            const updatedRoles = (formData.localRoles || []).filter((r: any) => (r.user?._id || r.user) !== roleModalMember._id);
            if (newRole) {
                updatedRoles.push({ user: roleModalMember._id, roleName: newRole });
            }
            setFormData({...formData, localRoles: updatedRoles});
        }}
      />
    </VeritaBoxLayout>
  );
}

function RoleAssignmentModal({ isOpen, onClose, member, currentRole, onUpdate }: any) {
    const [selected, setSelected] = useState<string | null>(currentRole);

    useEffect(() => {
        setSelected(currentRole);
    }, [currentRole]);

    const ROLES = [
        "Technical Commander",
        "Logistics Lead",
        "Communications Officer",
        "Intelligence Liaison"
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] bg-card border-border shadow-2xl rounded-sm">
                <DialogHeader>
                    <DialogTitle className="text-[14px] font-bold uppercase tracking-wider">Assign Tactical Role</DialogTitle>
                    <DialogDescription className="text-[11.5px] mt-1">
                        Assign a specialized role to {member?.name} for local operational oversight.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-1.5">
                    {ROLES.map(role => (
                        <button
                            key={role}
                            onClick={() => setSelected(role)}
                            className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", selected === role ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                        >
                            {role}
                            {selected === role && <ShieldCheck className="h-3.5 w-3.5" />}
                        </button>
                    ))}
                    <button
                        onClick={() => setSelected(null)}
                        className={cn(
                            "w-full h-9 px-3 rounded border text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-between mt-3",
                            selected === null 
                                ? "bg-destructive text-destructive-foreground border-destructive" 
                                : "bg-secondary/50 border-border hover:bg-secondary"
                        )}
                    >
                        Strip All Roles
                    </button>
                </div>
                <DialogFooter>
                    <button 
                        onClick={() => {
                            onUpdate(selected);
                            onClose();
                        }}
                        className="w-full h-9 bg-foreground text-background font-bold uppercase tracking-widest text-[11px] rounded hover:brightness-110 transition-all flex items-center justify-center"
                    >
                        Update Local Configuration
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

