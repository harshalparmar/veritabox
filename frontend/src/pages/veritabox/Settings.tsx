import { useState, useEffect, useRef } from "react";
import { Pill } from "@/components/veritabox/UI";
import { VeritaBoxLayout } from "@/components/veritabox/VeritaBoxLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
   Save, Shield, Bell, Eye, AlertTriangle, User as UserIcon,
   Loader2, Linkedin, Globe, Twitter, Smartphone,
   MapPin, CheckCircle2, XCircle, LogOut, Trash2,
   Phone, Calendar as CalendarIcon, Users, Briefcase, GraduationCap, QrCode, Building2, Mail,
   Key, Github, Camera, Upload, Image as ImageIcon,
   Info, Map, Target, ShieldCheck, Menu, X, ChevronRight,
   Settings2, BookOpen, Crown
} from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, authSecurityApi, api, resolveAssetUrl } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { format, subYears } from "date-fns";
import {
   Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ACADEMIC_DATA, BATCH_YEARS } from "@/lib/academicData";
import { LocationSelector } from "@/components/veritabox/LocationSelector";
import { INDIAN_STATES, STATE_CITIES } from "@/lib/locations";
import { TagPicker } from "@/components/veritabox/TagPicker";

const SKILL_SUGGESTIONS = [
   "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Angular",
   "Node.js", "Express", "Python", "Django", "Flask", "FastAPI",
   "Java", "Spring Boot", "Kotlin", "C++", "C", "Rust", "Go",
   "Swift", "Flutter", "React Native", "Docker", "Kubernetes",
   "AWS", "Azure", "GCP", "MongoDB", "PostgreSQL", "MySQL", "Redis",
   "GraphQL", "REST API", "Git", "CI/CD", "Linux",
   "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
   "Data Science", "TensorFlow", "PyTorch", "Pandas",
   "Figma", "UI/UX Design", "Tailwind CSS",
   "Embedded Systems", "IoT", "Arduino", "Raspberry Pi",
   "Blockchain", "Solidity", "Web3",
   "Cyber Security", "Penetration Testing", "Networking"
];

const SUBJECT_SUGGESTIONS = [
   "Data Structures & Algorithms", "Operating Systems", "Computer Networks",
   "Database Management", "Software Engineering", "Web Development",
   "Machine Learning", "Artificial Intelligence", "Cyber Security",
   "Cloud Computing", "Mobile App Development", "Embedded Systems",
   "Mathematics", "Physics", "Chemistry", "Statistics",
   "Business Analytics", "Marketing", "Finance", "Human Resource Management"
];

const INDUSTRY_SUGGESTIONS = [
   "Technology", "Finance & Banking", "Healthcare", "E-commerce",
   "Education", "Manufacturing", "Consulting", "Media & Entertainment",
   "Automotive", "Aerospace", "Telecommunications", "Energy",
   "Real Estate", "Agriculture", "Government", "Non-profit", "Startup"
];

type TabType = "profile" | "academic" | "professional" | "security" | "access" | "notifications" | "privacy" | "admin" | "danger";

function getTabsForRole(role: string): { id: TabType; label: string; icon: any; group: string }[] {
   const base = [
      { id: "profile" as TabType, label: "Profile", icon: UserIcon, group: "Account" },
   ];

   if (["Student", "Teacher", "Faculty"].includes(role)) {
      base.push({ id: "academic", label: "Academic", icon: GraduationCap, group: "Account" });
   }
   if (["Professional", "Recruiter", "Industry"].includes(role)) {
      base.push({ id: "professional", label: "Professional", icon: Briefcase, group: "Account" });
   }

   base.push(
      { id: "security", label: "Security", icon: Shield, group: "Account" },
      { id: "access", label: "Access", icon: Key, group: "Account" },
      { id: "notifications", label: "Notifications", icon: Bell, group: "Preferences" },
      { id: "privacy", label: "Privacy", icon: Eye, group: "Preferences" },
   );

   if (["Admin", "SuperAdmin", "Founder"].includes(role)) {
      base.push({ id: "admin", label: "Administration", icon: Crown, group: "Preferences" });
   }

   base.push({ id: "danger", label: "Danger Zone", icon: AlertTriangle, group: "Danger" });
   return base;
}

export default function Settings() {
   const { user, refreshUser, linkSocialWithGoogle, linkSocialWithLinkedin } = useAuth();
   const navigate = useNavigate();
   const [searchParams, setSearchParams] = useSearchParams();
   const queryClient = useQueryClient();

   const role = user?.role || "Student";
   const tabs = getTabsForRole(role);
   const activeTab = (searchParams.get("settingsTab") || "profile") as TabType;
   const [mobileNavOpen, setMobileNavOpen] = useState(false);

   const [hasInitialized, setHasInitialized] = useState(false);

   const { data: latestProfile, isLoading } = useQuery({
      queryKey: ["me"],
      queryFn: () => usersApi.getMe(),
      enabled: true,
   });

   const activeProfile = latestProfile || user;

   // ---------- Form state ----------
   const [formData, setFormData] = useState({
      name: "",
      username: "",
      bio: "",
      github: "",
      linkedin: "",
      portfolio: "",
      twitter: "",
      skillMatrix: { software: 0, hardware: 0, embedded: 0, mechanical: 0, leadership: 0, research: 0 },
      settings: {
         notifications: {
            bounties: { platform: true, email: true },
            hackathons: { platform: true, email: true },
            reputation: { platform: true, email: false },
            community: { platform: true, email: false }
         },
         privacy: {
            profileVisibility: "Community",
            searchable: true,
            teamBuilder: true,
            showRadar: true,
            showTimeline: true,
            showReputation: true,
            showBadges: true
         }
      },
      phone: "",
      dob: "",
      gender: "",
      whatsappNo: "",
      alternateNo: "",
      permanentAddress: "",
      country: "India",
      state: "",
      city: "",
      employmentStatus: "None",
      occupation: "",
      designation: "",
      workExperience: 0,
      companyName: "",
      eduInstitutionType: "None",
      eduInstitutionName: "",
      eduInstitutionAddress: "",
      eduState: "",
      eduCity: "",
      course: "",
      branch: "",
      batch: "",
      universityId: "",
      avatarUrl: "",
      coverPhotoUrl: "",
      skills: [] as string[],
      isTwoFactorEnabled: false,
      socialProviders: {} as any
   });

   // Persona-specific profile state
   const [personaData, setPersonaData] = useState<Record<string, any>>({});

   // Modals
   const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
   const [twoFactorData, setTwoFactorData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
   const [verificationToken, setVerificationToken] = useState("");
   const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
   const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
   const [isUploadingCover, setIsUploadingCover] = useState(false);
   const avatarInputRef = useRef<HTMLInputElement>(null);
   const coverInputRef = useRef<HTMLInputElement>(null);
   const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
   const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

   // ---------- Initialize form from fetched data ----------
   useEffect(() => {
      if (latestProfile && !hasInitialized) {
         try {
            const safeDob = (() => {
               if (!latestProfile.dob) return "";
               const d = new Date(latestProfile.dob);
               return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
            })();

            setFormData({
               name: latestProfile.name || "",
               username: latestProfile.username || "",
               bio: latestProfile.bio || "",
               github: latestProfile.socialLinks?.github || "",
               linkedin: latestProfile.socialLinks?.linkedin || "",
               portfolio: latestProfile.socialLinks?.portfolio || "",
               twitter: latestProfile.socialLinks?.twitter || "",
               skillMatrix: {
                  software: latestProfile.skillMatrix?.software ?? 0,
                  hardware: latestProfile.skillMatrix?.hardware ?? 0,
                  embedded: latestProfile.skillMatrix?.embedded ?? 0,
                  mechanical: latestProfile.skillMatrix?.mechanical ?? 0,
                  leadership: latestProfile.skillMatrix?.leadership ?? 0,
                  research: latestProfile.skillMatrix?.research ?? 0
               },
               settings: {
                  notifications: {
                     bounties: { platform: latestProfile.settings?.notifications?.bounties?.platform ?? true, email: latestProfile.settings?.notifications?.bounties?.email ?? true },
                     hackathons: { platform: latestProfile.settings?.notifications?.hackathons?.platform ?? true, email: latestProfile.settings?.notifications?.hackathons?.email ?? true },
                     reputation: { platform: latestProfile.settings?.notifications?.reputation?.platform ?? true, email: latestProfile.settings?.notifications?.reputation?.email ?? false },
                     community: { platform: latestProfile.settings?.notifications?.community?.platform ?? true, email: latestProfile.settings?.notifications?.community?.email ?? false }
                  },
                  privacy: {
                     profileVisibility: latestProfile.settings?.privacy?.profileVisibility ?? "Community",
                     searchable: latestProfile.settings?.privacy?.searchable ?? true,
                     teamBuilder: latestProfile.settings?.privacy?.teamBuilder ?? true,
                     showRadar: latestProfile.settings?.privacy?.showRadar ?? true,
                     showTimeline: latestProfile.settings?.privacy?.showTimeline ?? true,
                     showReputation: latestProfile.settings?.privacy?.showReputation ?? true,
                     showBadges: latestProfile.settings?.privacy?.showBadges ?? true
                  }
               },
               phone: latestProfile.phone || "",
               dob: safeDob,
               gender: latestProfile.gender || "",
               whatsappNo: latestProfile.whatsappNo || "",
               alternateNo: latestProfile.alternateNo || "",
               permanentAddress: latestProfile.permanentAddress || "",
               country: latestProfile.country || "India",
               state: latestProfile.state || "",
               city: latestProfile.city || "",
               avatarUrl: latestProfile.avatarUrl || "",
               coverPhotoUrl: latestProfile.coverPhotoUrl || "",
               skills: latestProfile.skills || [],
               employmentStatus: latestProfile.employmentStatus || "None",
               occupation: latestProfile.occupation || "",
               designation: latestProfile.designation || "",
               workExperience: latestProfile.workExperience || 0,
               companyName: latestProfile.companyName || "",
               eduInstitutionType: latestProfile.eduInstitutionType || "None",
               eduInstitutionName: latestProfile.eduInstitutionName || "",
               eduInstitutionAddress: latestProfile.eduInstitutionAddress || "",
               eduState: latestProfile.eduState || "",
               eduCity: latestProfile.eduCity || "",
               course: latestProfile.course || "",
               branch: latestProfile.branch || "",
               batch: latestProfile.batch || "",
               universityId: latestProfile.universityId || "",
               isTwoFactorEnabled: latestProfile.isTwoFactorEnabled || false,
               socialProviders: latestProfile.socialProviders || {}
            });

            if (latestProfile.personaProfile) {
               setPersonaData({ ...latestProfile.personaProfile });
            }

            setHasInitialized(true);
         } catch (e: any) {
            console.error("Error populating settings form:", e);
            toast.error(`Settings data error: ${e.message}`);
         }
      }
   }, [latestProfile, hasInitialized]);

   // ---------- Mutations ----------
   const invalidateAll = () => {
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ["profile", user?._id] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
   };

   const mutation = useMutation({
      mutationFn: (data: any) => usersApi.updateProfile(data),
      onSuccess: () => {
         toast.success("Profile saved.");
         invalidateAll();
      },
      onError: (err: any) => toast.error(err.message || "Update failed."),
   });

   const personaMutation = useMutation({
      mutationFn: (data: Record<string, any>) => usersApi.updatePersonaProfile(data),
      onSuccess: () => {
         toast.success("Profile saved.");
         invalidateAll();
      },
      onError: (err: any) => toast.error(err.message || "Update failed."),
   });

   const revokeAllSessionsMutation = useMutation({
      mutationFn: () => usersApi.revokeAllSessions(),
      onSuccess: () => { toast.success("All sessions revoked."); invalidateAll(); },
      onError: (err: any) => toast.error(err.message || "Failed."),
   });

   const revokeSessionMutation = useMutation({
      mutationFn: (id: string) => usersApi.revokeSession(id),
      onSuccess: () => { toast.success("Session revoked."); invalidateAll(); },
   });

   const deactivateMutation = useMutation({
      mutationFn: () => usersApi.deactivateAccount(),
      onSuccess: (res: any) => { toast.success(res.message); navigate("/auth"); },
   });

   const setup2FAMutation = useMutation({
      mutationFn: () => authSecurityApi.setup2FA(),
      onSuccess: (data) => { setTwoFactorData(data); setIs2FAModalOpen(true); },
      onError: (err: any) => toast.error(err.message),
   });

   const verify2FAMutation = useMutation({
      mutationFn: () => authSecurityApi.verify2FA(verificationToken),
      onSuccess: (data) => { setBackupCodes(data.backupCodes); toast.success("2FA activated."); refreshUser(); },
      onError: (err: any) => toast.error(err.message),
   });

   const disable2FAMutation = useMutation({
      mutationFn: (data: { pw: string; token: string }) => authSecurityApi.disable2FA(data.pw, data.token),
      onSuccess: () => { toast.success("2FA disabled."); refreshUser(); },
      onError: (err: any) => toast.error(err.message),
   });

   const unlinkSocialMutation = useMutation({
      mutationFn: (provider: string) => authSecurityApi.unlinkSocial(provider),
      onSuccess: (data) => { setFormData(prev => ({ ...prev, socialProviders: data.socialProviders })); toast.success("Provider unlinked."); refreshUser(); },
      onError: (err: any) => toast.error(err.message),
   });

   // ---------- Handlers ----------
   const handleSave = () => {
      mutation.mutate({
         name: formData.name,
         username: formData.username,
         bio: formData.bio,
         socialLinks: { 
            github: formData.github || undefined, 
            linkedin: formData.linkedin || undefined, 
            portfolio: formData.portfolio || undefined, 
            twitter: formData.twitter || undefined 
         },
         skillMatrix: formData.skillMatrix,
         settings: formData.settings,
         phone: formData.phone,
         dob: formData.dob || undefined,
         gender: formData.gender || undefined,
         whatsappNo: formData.whatsappNo,
         alternateNo: formData.alternateNo,
         permanentAddress: formData.permanentAddress,
         country: formData.country,
         state: formData.state,
         city: formData.city,
         avatarUrl: formData.avatarUrl || undefined,
         coverPhotoUrl: formData.coverPhotoUrl || undefined,
         skills: formData.skills,
         employmentStatus: formData.employmentStatus || undefined,
         occupation: formData.occupation,
         designation: formData.designation,
         workExperience: formData.workExperience,
         companyName: formData.companyName,
         eduInstitutionType: formData.eduInstitutionType || undefined,
         eduInstitutionName: formData.eduInstitutionName,
         eduInstitutionAddress: formData.eduInstitutionAddress,
         eduState: formData.eduState,
         eduCity: formData.eduCity,
         course: formData.course,
         branch: formData.branch,
         batch: formData.batch,
      });
   };

   const handleSavePersona = () => {
      let finalPersonaData = { ...personaData };
      if (role === "Student") {
         finalPersonaData = {
            ...finalPersonaData,
            university: formData.eduInstitutionName,
            degree: formData.branch || formData.course || "Not Specified",
            department: formData.course,
            graduationYear: Number(formData.batch) || new Date().getFullYear(),
         };
      }
      personaMutation.mutate(finalPersonaData);
   };

   const handleSaveAll = () => {
      handleSave();
      if (Object.keys(personaData).length > 0 && latestProfile?.profileModel) {
         handleSavePersona();
      }
   };

   const updateNotif = (group: string, channel: "platform" | "email", val: boolean) => {
      setFormData(prev => ({
         ...prev,
         settings: { ...prev.settings, notifications: { ...prev.settings.notifications, [group]: { ...(prev.settings.notifications as any)[group], [channel]: val } } }
      }));
   };

   const updatePrivacy = (key: string, val: any) => {
      setFormData(prev => ({ ...prev, settings: { ...prev.settings, privacy: { ...prev.settings.privacy, [key]: val } } }));
   };

   const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploadingAvatar(true);
      const uploadData = new FormData();
      uploadData.append("document", file);
      try {
         const data = await api.upload<{ filePath: string }>("/api/upload", uploadData);
         setFormData(prev => ({ ...prev, avatarUrl: data.filePath }));
         toast.success("Avatar uploaded.");
      } catch (err: any) { toast.error(`Upload failed: ${err.message}`); }
      finally { setIsUploadingAvatar(false); if (avatarInputRef.current) avatarInputRef.current.value = ""; }
   };

   const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploadingCover(true);
      const uploadData = new FormData();
      uploadData.append("document", file);
      try {
         const data = await api.upload<{ filePath: string }>("/api/upload", uploadData);
         setFormData(prev => ({ ...prev, coverPhotoUrl: data.filePath }));
         toast.success("Cover uploaded.");
      } catch (err: any) { toast.error(`Upload failed: ${err.message}`); }
      finally { setIsUploadingCover(false); if (coverInputRef.current) coverInputRef.current.value = ""; }
   };

   const handleSocialLink = (provider: string) => {
      const clientId = provider === "github" ? import.meta.env.VITE_GITHUB_CLIENT_ID : import.meta.env.VITE_MICROSOFT_CLIENT_ID;
      const redirectUri = window.location.origin + "/auth";
      let url = "";
      if (provider === "github") url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user user:email&state=link_github`;
      else if (provider === "microsoft") { const scope = encodeURIComponent("user.read openid profile email"); url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}&state=link_microsoft`; }
      else if (provider === "linkedin") { const liClientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID; const scope = encodeURIComponent("openid profile email"); url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${liClientId}&redirect_uri=${redirectUri}&state=link_linkedin&scope=${scope}`; }
      if (url) window.location.assign(url);
   };

   const googleLink = useGoogleLogin({
      onSuccess: async (tokenResponse) => {
         try { await linkSocialWithGoogle(undefined, tokenResponse.access_token); toast.success("Google linked."); refreshUser(); }
         catch (error: any) { toast.error(error.message || "Linking failed"); }
      },
      onError: () => toast.error("Google auth error."),
   });

   const handleUpdatePassword = async () => {
      if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error("Passwords don't match.");
      try {
         const res = await usersApi.updatePassword({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
         toast.success(res.message);
         setIsPasswordModalOpen(false);
         setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } catch (error: any) { toast.error(error.message || "Password update failed."); }
   };

   const setActiveTab = (tab: TabType) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("settingsTab", tab);
      setSearchParams(newParams);
      setMobileNavOpen(false);
   };

   if (isLoading && !latestProfile) {
      return (
         <VeritaBoxLayout>
            <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
         </VeritaBoxLayout>
      );
   }

   const currentTabObj = tabs.find(t => t.id === activeTab) || tabs[0];

   return (
      <>
         <VeritaBoxLayout>
            <div className="flex flex-col h-[calc(100vh-56px)] w-full">
               {/* Header */}
               <div className="px-4 md:px-6 h-12 border-b border-border flex items-center justify-between shrink-0 bg-background relative z-40">
                  <div className="flex items-center gap-2">
                     <button
                        onClick={() => setMobileNavOpen(!mobileNavOpen)}
                        className="md:hidden p-1 -ml-1 rounded hover:bg-muted"
                     >
                        {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                     </button>
                     <h1 className="text-[14px] font-semibold">Settings</h1>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="text-[10px] text-muted-foreground hidden md:inline-block">
                        {currentTabObj.label}
                     </span>
                     <Button type="button" onClick={handleSaveAll} disabled={mutation.isPending || personaMutation.isPending} className="h-8 px-4 text-[11px] font-semibold flex items-center gap-1.5 relative z-50 cursor-pointer pointer-events-auto">
                        {(mutation.isPending || personaMutation.isPending) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save Changes
                     </Button>
                  </div>
               </div>

               <div className="flex-1 overflow-hidden">
                  <div className="flex flex-col md:flex-row h-full relative">

                     {/* Sidebar — desktop always, mobile as overlay */}
                     <div className={cn(
                        "md:w-56 shrink-0 md:border-r border-sidebar-border bg-sidebar z-20 transition-all duration-300",
                        "md:relative md:block",
                        mobileNavOpen ? "absolute inset-0 md:static border-b" : "hidden md:block"
                     )}>
                        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-3">
                           {(() => {
                              // Group tabs by their group name
                              const groupedTabs: Record<string, typeof tabs> = {};
                              tabs.forEach(t => {
                                 if (!groupedTabs[t.group]) groupedTabs[t.group] = [];
                                 groupedTabs[t.group].push(t);
                              });

                              return Object.entries(groupedTabs).map(([groupName, groupTabs]) => (
                                 <div key={groupName} className="space-y-px">
                                    <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-[0.1em] text-sidebar-foreground/50 font-medium">
                                       {groupName}
                                    </div>
                                    {groupTabs.map(t => (
                                       <button
                                          key={t.id}
                                          onClick={() => setActiveTab(t.id)}
                                          className={cn(
                                             "flex items-center justify-between gap-2 px-3 py-1.5 w-full rounded transition-colors text-[12px]",
                                             activeTab === t.id
                                                ? "bg-foreground text-background"
                                                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                                          )}
                                       >
                                          <span className="flex items-center gap-2 truncate">
                                             <t.icon className="h-4 w-4 shrink-0" />
                                             <span className="truncate">{t.label}</span>
                                          </span>
                                          <ChevronRight className="h-3 w-3 md:hidden opacity-40 shrink-0" />
                                       </button>
                                    ))}
                                 </div>
                              ));
                           })()}
                        </nav>
                     </div>

                     {/* Content */}
                     <div className={cn("flex-1 flex flex-col min-w-0 h-full", mobileNavOpen && "hidden md:flex")}>
                        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5 custom-scrollbar">

                           {/* ====== PROFILE TAB ====== */}
                           {activeTab === "profile" && (
                              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                 {/* Avatar & Cover */}
                                 <Section title="Photos">
                                    <div className="flex flex-col sm:flex-row gap-5">
                                       <div className="flex items-center gap-4">
                                          <div className="h-16 w-16 rounded-2xl border border-border bg-muted flex items-center justify-center shrink-0 overflow-hidden relative group">
                                             {formData.avatarUrl ? (
                                                <img src={resolveAssetUrl(formData.avatarUrl)} className="h-full w-full object-cover" />
                                             ) : (
                                                <ImageIcon className="h-6 w-6 text-muted-foreground opacity-20" />
                                             )}
                                             {isUploadingAvatar && <div className="absolute inset-0 bg-background/80 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>}
                                             <button type="button" onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="h-4 w-4 text-white" /></button>
                                          </div>
                                          <div className="space-y-1.5">
                                             <div className="text-[11px] font-medium">Avatar</div>
                                             <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                             <button type="button" onClick={() => avatarInputRef.current?.click()} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"><Upload className="h-3 w-3" /> Upload</button>
                                          </div>
                                       </div>
                                       <div className="flex-1 space-y-1.5">
                                          <div className="text-[11px] font-medium">Cover Photo</div>
                                          <div className="h-20 w-full rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden relative group">
                                             {formData.coverPhotoUrl ? (
                                                <img src={resolveAssetUrl(formData.coverPhotoUrl)} className="h-full w-full object-cover" />
                                             ) : (
                                                <ImageIcon className="h-5 w-5 text-muted-foreground opacity-15" />
                                             )}
                                             {isUploadingCover && <div className="absolute inset-0 bg-background/80 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>}
                                             <button type="button" onClick={() => coverInputRef.current?.click()} className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="h-4 w-4 text-white" /></button>
                                          </div>
                                          <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
                                       </div>
                                    </div>
                                 </Section>

                                 {/* Basic Info */}
                                 <Section title="Basic Information">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                       <Field id="name" label="Full Name" icon={UserIcon}>
                                          <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                       </Field>
                                       <Field id="username" label="Username" icon={UserIcon}>
                                          <Input value={formData.username} disabled className="bg-muted border-border/40 h-9 text-[12px] opacity-50 cursor-not-allowed" />
                                       </Field>
                                    </div>
                                    <Field id="bio" label="Bio" icon={Info}>
                                       <Textarea value={formData.bio} onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))} className="bg-secondary/20 border-border/40 min-h-[60px] resize-none text-[12px]" placeholder="Tell people about yourself..." maxLength={300} />
                                       <div className="flex justify-end"><span className="text-[9px] text-muted-foreground">{formData.bio.length}/300</span></div>
                                    </Field>
                                 </Section>

                                 {/* Contact */}
                                 <Section title="Contact">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                       <Field id="phone" label="Phone" icon={Phone}>
                                          <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="+91..." className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                       </Field>
                                       <Field id="whatsapp" label="WhatsApp" icon={Smartphone}>
                                          <Input value={formData.whatsappNo} onChange={e => setFormData(p => ({ ...p, whatsappNo: e.target.value }))} className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                       </Field>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                       <Field id="dob" label="Date of Birth" icon={CalendarIcon}>
                                          <Popover>
                                             <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full h-9 justify-start text-left font-normal bg-background border-border/40 text-[12px]", !formData.dob && "text-muted-foreground")}>
                                                   <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50 shrink-0" />
                                                   {formData.dob && !isNaN(new Date(formData.dob).getTime()) ? format(new Date(formData.dob), "PPP") : "Pick a date"}
                                                </Button>
                                             </PopoverTrigger>
                                             <PopoverContent className="w-auto p-0 bg-background/95 backdrop-blur-xl border-border shadow-2xl z-[100]" align="start">
                                                <Calendar mode="single" captionLayout="dropdown" fromYear={1900} toYear={new Date().getFullYear() - 12} selected={formData.dob ? new Date(formData.dob) : undefined} onSelect={date => setFormData(p => ({ ...p, dob: date ? format(date, "yyyy-MM-dd") : "" }))} disabled={date => date > subYears(new Date(), 12) || date < new Date("1900-01-01")} initialFocus className="bg-transparent" />
                                             </PopoverContent>
                                          </Popover>
                                       </Field>
                                       <Field id="gender" label="Gender" icon={Users}>
                                          <Select value={formData.gender} onValueChange={val => setFormData(p => ({ ...p, gender: val }))}>
                                             <SelectTrigger className="h-9 bg-background border-border/40 text-[12px]"><SelectValue placeholder="Select" /></SelectTrigger>
                                             <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl z-[100]">
                                                {["Male", "Female", "Other", "Prefer not to say"].map(g => <SelectItem key={g} value={g} className="text-[12px]">{g}</SelectItem>)}
                                             </SelectContent>
                                          </Select>
                                       </Field>
                                    </div>
                                 </Section>

                                 {/* Location */}
                                 <Section title="Location">
                                    <Field id="address" label="Address" icon={MapPin}>
                                       <Textarea value={formData.permanentAddress} onChange={e => setFormData(p => ({ ...p, permanentAddress: e.target.value }))} className="bg-secondary/20 border-border/40 min-h-[60px] resize-y text-[12px]" placeholder="Permanent address" />
                                    </Field>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                       <Field id="state" label="State" icon={Map}>
                                          <LocationSelector options={INDIAN_STATES} value={formData.state} onValueChange={val => setFormData(p => ({ ...p, state: val, city: "" }))} placeholder="Select State" />
                                       </Field>
                                       <Field id="city" label="City" icon={Target}>
                                          <LocationSelector options={STATE_CITIES[formData.state] || []} value={formData.city} onValueChange={val => setFormData(p => ({ ...p, city: val }))} placeholder={formData.state ? "Select City" : "Select state first"} disabled={!formData.state} />
                                       </Field>
                                    </div>
                                 </Section>

                                 {/* Social Links */}
                                 <Section title="Social Links">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                       <Field id="github" label="GitHub" icon={Github}>
                                          <Input value={formData.github} onChange={e => setFormData(p => ({ ...p, github: e.target.value }))} placeholder="https://github.com/..." className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                       </Field>
                                       <Field id="linkedin" label="LinkedIn" icon={Linkedin}>
                                          <Input value={formData.linkedin} onChange={e => setFormData(p => ({ ...p, linkedin: e.target.value }))} placeholder="https://linkedin.com/in/..." className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                       </Field>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                       <Field id="portfolio" label="Portfolio" icon={Globe}>
                                          <Input value={formData.portfolio} onChange={e => setFormData(p => ({ ...p, portfolio: e.target.value }))} placeholder="https://..." className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                       </Field>
                                       <Field id="twitter" label="Twitter / X" icon={Twitter}>
                                          <Input value={formData.twitter} onChange={e => setFormData(p => ({ ...p, twitter: e.target.value }))} placeholder="https://x.com/..." className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                       </Field>
                                    </div>
                                 </Section>

                                 {/* Skills */}
                                 <Section title="Skills">
                                    <Field id="skills" label="Your Skills" icon={Settings2}>
                                       <TagPicker value={formData.skills} onChange={val => setFormData(p => ({ ...p, skills: val }))} suggestions={SKILL_SUGGESTIONS} placeholder="Type to add skills..." max={15} />
                                    </Field>
                                 </Section>
                              </div>
                           )}

                           {/* ====== ACADEMIC TAB (Student / Teacher) ====== */}
                           {activeTab === "academic" && (
                              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                 {role === "Student" && (
                                    <>
                                       <Section title="Student Profile" description="Your academic details from onboarding. Update them here.">

                                          <Field id="sp-skillLevel" label="Skill Level" icon={Settings2}>
                                             <Select value={personaData.skillLevel || "Beginner"} onValueChange={val => setPersonaData(p => ({ ...p, skillLevel: val }))}>
                                                <SelectTrigger className="h-9 bg-background border-border/40 text-[12px] max-w-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl">
                                                   {["Beginner", "Intermediate", "Advanced"].map(l => <SelectItem key={l} value={l} className="text-[12px]">{l}</SelectItem>)}
                                                </SelectContent>
                                             </Select>
                                          </Field>
                                          <Field id="sp-currentSkills" label="Technical Skills" icon={Settings2}>
                                             <TagPicker value={personaData.currentSkills || []} onChange={val => setPersonaData(p => ({ ...p, currentSkills: val }))} suggestions={SKILL_SUGGESTIONS} placeholder="Add your skills..." max={15} />
                                          </Field>
                                       </Section>

                                       <Section title="Institution Details">
                                          <div className="grid sm:grid-cols-2 gap-4">
                                             <Field id="instType" label="Institution Type" icon={Building2}>
                                                <Select value={formData.eduInstitutionType} onValueChange={val => setFormData(p => ({ ...p, eduInstitutionType: val }))}>
                                                   <SelectTrigger className="h-9 bg-background border-border/40 text-[12px]"><SelectValue placeholder="Select" /></SelectTrigger>
                                                   <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl z-[100]">
                                                      {["None", "College", "University"].map(t => <SelectItem key={t} value={t} className="text-[12px]">{t}</SelectItem>)}
                                                   </SelectContent>
                                                </Select>
                                             </Field>
                                             <Field id="instName" label="Institution Name" icon={Building2}>
                                                <Input value={formData.eduInstitutionName} onChange={e => setFormData(p => ({ ...p, eduInstitutionName: e.target.value }))} className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                             </Field>
                                          </div>
                                          <div className="grid sm:grid-cols-2 gap-4">
                                             <Field id="course" label="Academic Track" icon={GraduationCap}>
                                                <Select value={formData.course} onValueChange={val => setFormData(p => ({ ...p, course: val, branch: "" }))}>
                                                   <SelectTrigger className="h-9 bg-background border-border/40 text-[12px]"><SelectValue placeholder="Select track" /></SelectTrigger>
                                                   <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[200px]">
                                                      {Object.keys(ACADEMIC_DATA).map(cat => <SelectItem key={cat} value={cat} className="text-[12px]">{cat}</SelectItem>)}
                                                   </SelectContent>
                                                </Select>
                                             </Field>
                                             <Field id="branch" label="Course / Specialization" icon={BookOpen}>
                                                <Select value={formData.branch} onValueChange={val => setFormData(p => ({ ...p, branch: val }))} disabled={!formData.course}>
                                                   <SelectTrigger className="h-9 bg-background border-border/40 text-[12px]"><SelectValue placeholder={formData.course ? "Select course" : "Pick track first"} /></SelectTrigger>
                                                   <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[200px]">
                                                      {(ACADEMIC_DATA[formData.course as keyof typeof ACADEMIC_DATA] || []).map(item => <SelectItem key={item} value={item} className="text-[12px]">{item}</SelectItem>)}
                                                   </SelectContent>
                                                </Select>
                                             </Field>
                                          </div>
                                          <div className="grid sm:grid-cols-2 gap-4">
                                             <Field id="batch" label="Batch Year" icon={CalendarIcon}>
                                                <Select value={formData.batch} onValueChange={val => setFormData(p => ({ ...p, batch: val }))}>
                                                   <SelectTrigger className="h-9 bg-background border-border/40 text-[12px]"><SelectValue placeholder="Select year" /></SelectTrigger>
                                                   <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[200px]">
                                                      {BATCH_YEARS.map(y => <SelectItem key={y} value={y} className="text-[12px]">{y}</SelectItem>)}
                                                   </SelectContent>
                                                </Select>
                                             </Field>
                                             <Field id="studentId" label="University ID" icon={QrCode}>
                                                <Input value={formData.universityId} disabled className="bg-muted border-border/40 h-9 text-[12px] opacity-50 cursor-not-allowed font-mono" />
                                             </Field>
                                          </div>
                                       </Section>
                                    </>
                                 )}

                                 {(role === "Teacher" || role === "Faculty") && (
                                    <Section title="Teacher Profile" description="Your teaching profile details.">
                                       <div className="grid sm:grid-cols-2 gap-4">
                                          <Field id="tp-institution" label="Institution" icon={Building2}>
                                             <Input value={personaData.institution || ""} onChange={e => setPersonaData(p => ({ ...p, institution: e.target.value }))} className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                          </Field>
                                          <Field id="tp-department" label="Department" icon={BookOpen}>
                                             <Input value={personaData.department || ""} onChange={e => setPersonaData(p => ({ ...p, department: e.target.value }))} className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                          </Field>
                                       </div>
                                       <Field id="tp-experience" label="Years of Experience" icon={Briefcase}>
                                          <Input type="number" value={personaData.experienceYears || 0} onChange={e => setPersonaData(p => ({ ...p, experienceYears: Number(e.target.value) }))} className="bg-secondary/20 border-border/40 h-9 text-[12px] max-w-[120px]" min={0} />
                                       </Field>
                                       <Field id="tp-subjects" label="Subjects You Teach" icon={BookOpen}>
                                          <TagPicker value={personaData.subjectsTaught || []} onChange={val => setPersonaData(p => ({ ...p, subjectsTaught: val }))} suggestions={SUBJECT_SUGGESTIONS} placeholder="Add subjects..." max={15} />
                                       </Field>
                                       <Field id="tp-canMentor" label="Can Mentor In" icon={Users}>
                                          <TagPicker value={personaData.canMentor || []} onChange={val => setPersonaData(p => ({ ...p, canMentor: val }))} suggestions={SKILL_SUGGESTIONS} placeholder="Add mentoring topics..." max={10} />
                                       </Field>
                                    </Section>
                                 )}
                              </div>
                           )}

                           {/* ====== PROFESSIONAL TAB (Professional / Recruiter) ====== */}
                           {activeTab === "professional" && (
                              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                 {role === "Professional" && (
                                    <Section title="Professional Profile" description="Your work details. Visible to recruiters and collaborators.">
                                       <div className="grid sm:grid-cols-2 gap-4">
                                          <Field id="pp-company" label="Company" icon={Building2}>
                                             <Input value={personaData.company || ""} onChange={e => setPersonaData(p => ({ ...p, company: e.target.value }))} className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                          </Field>
                                          <Field id="pp-jobTitle" label="Job Title" icon={Briefcase}>
                                             <Input value={personaData.jobTitle || ""} onChange={e => setPersonaData(p => ({ ...p, jobTitle: e.target.value }))} className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                          </Field>
                                       </div>
                                       <div className="grid sm:grid-cols-2 gap-4">
                                          <Field id="pp-experience" label="Years of Experience" icon={CalendarIcon}>
                                             <Input type="number" value={personaData.yearsOfExperience || 0} onChange={e => setPersonaData(p => ({ ...p, yearsOfExperience: Number(e.target.value) }))} className="bg-secondary/20 border-border/40 h-9 text-[12px] max-w-[120px]" min={0} />
                                          </Field>
                                          <Field id="pp-industry" label="Industry" icon={Globe}>
                                             <Select value={personaData.industry || ""} onValueChange={val => setPersonaData(p => ({ ...p, industry: val }))}>
                                                <SelectTrigger className="h-9 bg-background border-border/40 text-[12px]"><SelectValue placeholder="Select industry" /></SelectTrigger>
                                                <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[200px]">
                                                   {INDUSTRY_SUGGESTIONS.map(i => <SelectItem key={i} value={i} className="text-[12px]">{i}</SelectItem>)}
                                                </SelectContent>
                                             </Select>
                                          </Field>
                                       </div>
                                       <Field id="pp-techStack" label="Tech Stack" icon={Settings2}>
                                          <TagPicker value={personaData.techStack || []} onChange={val => setPersonaData(p => ({ ...p, techStack: val }))} suggestions={SKILL_SUGGESTIONS} placeholder="Add technologies..." max={15} />
                                       </Field>
                                       <Toggle label="Open to Mentoring" sublabel="Appear as a mentor to students looking for guidance." checked={personaData.openToMentor || false} onChange={val => setPersonaData(p => ({ ...p, openToMentor: val }))} />
                                    </Section>
                                 )}

                                 {role === "Recruiter" && (
                                    <Section title="Recruiter Profile" description="Your hiring profile. Helps match you with the right candidates.">
                                       <div className="grid sm:grid-cols-2 gap-4">
                                          <Field id="rp-company" label="Company" icon={Building2}>
                                             <Input value={personaData.company || ""} onChange={e => setPersonaData(p => ({ ...p, company: e.target.value }))} className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                          </Field>
                                          <Field id="rp-industry" label="Industry" icon={Globe}>
                                             <Select value={personaData.industry || ""} onValueChange={val => setPersonaData(p => ({ ...p, industry: val }))}>
                                                <SelectTrigger className="h-9 bg-background border-border/40 text-[12px]"><SelectValue placeholder="Select industry" /></SelectTrigger>
                                                <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[200px]">
                                                   {INDUSTRY_SUGGESTIONS.map(i => <SelectItem key={i} value={i} className="text-[12px]">{i}</SelectItem>)}
                                                </SelectContent>
                                             </Select>
                                          </Field>
                                       </div>
                                       <div className="grid sm:grid-cols-2 gap-4">
                                          <Field id="rp-teamSize" label="Team Size" icon={Users}>
                                             <Select value={personaData.teamSize || "Small"} onValueChange={val => setPersonaData(p => ({ ...p, teamSize: val }))}>
                                                <SelectTrigger className="h-9 bg-background border-border/40 text-[12px]"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl">
                                                   {["Small", "Medium", "Large"].map(s => {
                                                      const sizeMap: Record<string, string> = { Small: "1-10", Medium: "11-50", Large: "50+" };
                                                      return <SelectItem key={s} value={s} className="text-[12px]">{s} ({sizeMap[s]})</SelectItem>;
                                                   })}
                                                </SelectContent>
                                             </Select>
                                          </Field>
                                          <Field id="rp-urgency" label="Hiring Urgency" icon={AlertTriangle}>
                                             <Select value={personaData.hiringUrgency || "Exploring"} onValueChange={val => setPersonaData(p => ({ ...p, hiringUrgency: val }))}>
                                                <SelectTrigger className="h-9 bg-background border-border/40 text-[12px]"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl">
                                                   {["Active", "Passive", "Exploring"].map(u => <SelectItem key={u} value={u} className="text-[12px]">{u}</SelectItem>)}
                                                </SelectContent>
                                             </Select>
                                          </Field>
                                       </div>
                                       <Field id="rp-roles" label="Hiring Roles" icon={Briefcase}>
                                          <TagPicker value={personaData.hiringRoles || []} onChange={val => setPersonaData(p => ({ ...p, hiringRoles: val }))} suggestions={["Frontend Developer", "Backend Developer", "Full Stack", "DevOps", "Data Scientist", "ML Engineer", "Designer", "Product Manager", "QA Engineer", "Mobile Developer"]} placeholder="Add roles you're hiring for..." max={10} />
                                       </Field>
                                       <Field id="rp-skills" label="Preferred Skills" icon={Settings2}>
                                          <TagPicker value={personaData.preferredSkills || []} onChange={val => setPersonaData(p => ({ ...p, preferredSkills: val }))} suggestions={SKILL_SUGGESTIONS} placeholder="Skills you look for in candidates..." max={15} />
                                       </Field>
                                    </Section>
                                 )}

                                 {role === "Industry" && (
                                    <Section title="Industry Profile" description="Your professional details.">
                                       <div className="grid sm:grid-cols-2 gap-4">
                                          <Field id="ip-company" label="Company" icon={Building2}>
                                             <Input value={formData.companyName} onChange={e => setFormData(p => ({ ...p, companyName: e.target.value }))} className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                          </Field>
                                          <Field id="ip-designation" label="Designation" icon={Briefcase}>
                                             <Input value={formData.designation} onChange={e => setFormData(p => ({ ...p, designation: e.target.value }))} className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                                          </Field>
                                       </div>
                                    </Section>
                                 )}
                              </div>
                           )}

                           {/* ====== SECURITY TAB ====== */}
                           {activeTab === "security" && (
                              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                 <Section title="Email & Password">
                                    <Field id="email" label="Email" icon={Mail}>
                                       <div className="flex items-center gap-3">
                                          <Input value={user?.email || user?.universityId || ""} disabled className="bg-muted border-border/40 h-9 text-[12px] opacity-70 font-mono flex-1" />
                                          <Pill variant="success" className="shrink-0">Verified</Pill>
                                       </div>
                                    </Field>
                                    <Button onClick={() => setIsPasswordModalOpen(true)} variant="secondary" className="h-9 px-4 text-[11px] font-semibold gap-2">
                                       <ShieldCheck className="h-3.5 w-3.5" /> Change Password
                                    </Button>
                                 </Section>

                                 <Section title="Active Sessions">
                                    <div className="space-y-2">
                                       <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                                          <div className="flex items-center gap-3">
                                             <div className="h-7 w-7 rounded-md bg-green-500/10 flex items-center justify-center"><Smartphone className="h-3.5 w-3.5 text-green-500" /></div>
                                             <div>
                                                <div className="text-[11px] font-semibold">Current Session</div>
                                                <div className="text-[9px] text-muted-foreground">Active now</div>
                                             </div>
                                          </div>
                                          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                       </div>
                                       {activeProfile?.activeSessions?.map((session: any) => (
                                          <div key={session._id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                                             <div className="flex items-center gap-3">
                                                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center"><Smartphone className="h-3.5 w-3.5 text-muted-foreground" /></div>
                                                <div>
                                                   <div className="text-[11px] font-semibold">{session.device || "Unknown"}</div>
                                                   <div className="text-[9px] text-muted-foreground">{session.ip || "0.0.0.0"} · {new Date(session.lastActive).toLocaleDateString()}</div>
                                                </div>
                                             </div>
                                             <button onClick={() => revokeSessionMutation.mutate(session._id)} disabled={revokeSessionMutation.isPending} className="text-[9px] text-destructive hover:bg-destructive/10 px-2 py-1 rounded border border-destructive/20 font-semibold">Revoke</button>
                                          </div>
                                       ))}
                                    </div>
                                    {activeProfile?.activeSessions && activeProfile.activeSessions.length > 0 && (
                                       <button onClick={() => { if (confirm("Revoke all other sessions?")) revokeAllSessionsMutation.mutate(); }} disabled={revokeAllSessionsMutation.isPending} className="text-[10px] text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded border border-destructive/20 font-semibold flex items-center gap-1.5">
                                          <LogOut className="h-3 w-3" /> Revoke All Others
                                       </button>
                                    )}
                                 </Section>

                                 <Section title="Login History">
                                    <div className="divide-y divide-border/30 max-h-48 overflow-y-auto rounded-lg border border-border">
                                       {activeProfile?.loginHistory?.slice().reverse().slice(0, 20).map((log: any, i: number) => (
                                          <div key={i} className="py-2 px-3 flex items-center justify-between">
                                             <div className="flex items-center gap-2">
                                                {log.success ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                                                <div>
                                                   <div className="text-[10px] font-medium">{log.success ? "Success" : "Failed"}</div>
                                                   <div className="text-[9px] text-muted-foreground">{log.device} · {log.location}</div>
                                                </div>
                                             </div>
                                             <div className="text-[9px] text-muted-foreground font-mono">{new Date(log.timestamp).toLocaleString()}</div>
                                          </div>
                                       ))}
                                       {(!activeProfile?.loginHistory || activeProfile.loginHistory.length === 0) && (
                                          <div className="py-6 text-center text-[10px] text-muted-foreground">No login history</div>
                                       )}
                                    </div>
                                 </Section>
                              </div>
                           )}

                           {/* ====== ACCESS TAB (2FA & OAuth) ====== */}
                           {activeTab === "access" && (
                              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                 <Section title="Two-Factor Authentication" description="Add an extra layer of security with a time-based code from your authenticator app.">
                                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                                       <div className="flex-1 space-y-3">
                                          {formData.isTwoFactorEnabled && (
                                             <Pill variant="success">Active</Pill>
                                          )}
                                          {!formData.isTwoFactorEnabled ? (
                                             <Button onClick={() => setup2FAMutation.mutate()} disabled={setup2FAMutation.isPending} className="h-9 px-4 text-[11px] font-semibold gap-2">
                                                {setup2FAMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
                                                Enable 2FA
                                             </Button>
                                          ) : (
                                             <Button variant="outline" onClick={() => { const pw = prompt("Enter your password:"); const token = prompt("Enter 6-digit code:"); if (pw && token) disable2FAMutation.mutate({ pw, token }); }} disabled={disable2FAMutation.isPending} className="h-9 px-4 text-[11px] font-semibold gap-2 border-destructive/40 text-destructive hover:bg-destructive/10">
                                                {disable2FAMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                                Disable 2FA
                                             </Button>
                                          )}
                                       </div>
                                       {formData.isTwoFactorEnabled && activeProfile?.twoFactorBackupCodes && (
                                          <div className="w-full sm:w-48 p-3 rounded-lg bg-muted border border-border space-y-2">
                                             <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Backup Codes</div>
                                             <div className="grid grid-cols-2 gap-1">
                                                {activeProfile.twoFactorBackupCodes.map((code: string, i: number) => (
                                                   <code key={i} className="text-[9px] font-mono bg-background p-1 rounded text-center select-all">{code}</code>
                                                ))}
                                             </div>
                                             <p className="text-[8px] text-muted-foreground">Store these offline.</p>
                                          </div>
                                       )}
                                    </div>
                                 </Section>

                                 <Section title="Connected Accounts" description="Link external providers for quick sign-in.">
                                    <div className="grid sm:grid-cols-2 gap-3">
                                       <SocialCard label="Google" icon={<GoogleIcon />} isLinked={!!formData.socialProviders?.google} onLink={() => googleLink()} onUnlink={() => unlinkSocialMutation.mutate("google")} />
                                       <SocialCard label="GitHub" icon={<svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" /></svg>} isLinked={!!formData.socialProviders?.github} onLink={() => handleSocialLink("github")} onUnlink={() => unlinkSocialMutation.mutate("github")} />
                                       <SocialCard label="Microsoft" icon={<svg className="h-4 w-4" viewBox="0 0 23 23"><path fill="#f25022" d="M0 0h11v11H0z" /><path fill="#7fbb00" d="M12 0h11v11H12z" /><path fill="#00a1f1" d="M0 12h11v11H0z" /><path fill="#ffbb00" d="M12 12h11v11H12z" /></svg>} isLinked={!!formData.socialProviders?.microsoft} onLink={() => handleSocialLink("microsoft")} onUnlink={() => unlinkSocialMutation.mutate("microsoft")} />
                                       <SocialCard label="LinkedIn" icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0077B5"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>} isLinked={!!formData.socialProviders?.linkedin} onLink={() => handleSocialLink("linkedin")} onUnlink={() => unlinkSocialMutation.mutate("linkedin")} />
                                    </div>
                                 </Section>
                              </div>
                           )}

                           {/* ====== NOTIFICATIONS TAB ====== */}
                           {activeTab === "notifications" && (
                              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                 {Object.keys(formData.settings.notifications).map(group => (
                                    <Section key={group} title={group.charAt(0).toUpperCase() + group.slice(1)}>
                                       <div className="grid sm:grid-cols-2 gap-3">
                                          <Toggle label="In-App Notifications" sublabel="Show notifications within the platform." checked={(formData.settings.notifications as any)[group].platform} onChange={v => updateNotif(group, "platform", v)} />
                                          <Toggle label="Email Notifications" sublabel="Send email for this category." checked={(formData.settings.notifications as any)[group].email} onChange={v => updateNotif(group, "email", v)} />
                                       </div>
                                    </Section>
                                 ))}
                              </div>
                           )}

                           {/* ====== PRIVACY TAB ====== */}
                           {activeTab === "privacy" && (
                              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                 <Section title="Profile Visibility">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                       {["Public", "Community"].map(scope => (
                                          <button key={scope} onClick={() => updatePrivacy("profileVisibility", scope)} className={cn("flex-1 p-4 rounded-xl border text-left transition-all", formData.settings.privacy.profileVisibility === scope ? "bg-foreground text-background border-foreground" : "bg-background border-border hover:border-foreground/30")}>
                                             <div className="text-[12px] font-semibold">{scope}</div>
                                             <div className={cn("text-[10px] mt-0.5", formData.settings.privacy.profileVisibility === scope ? "text-background/70" : "text-muted-foreground")}>
                                                {scope === "Public" ? "Anyone can view your profile" : "Only registered users can view"}
                                             </div>
                                          </button>
                                       ))}
                                    </div>
                                 </Section>

                                 <Section title="Discovery">
                                    <div className="grid sm:grid-cols-2 gap-3">
                                       <Toggle label="Searchable" sublabel="Others can find you via search." checked={formData.settings.privacy.searchable} onChange={v => updatePrivacy("searchable", v)} />
                                       <Toggle label="Team Matching" sublabel="Show up in hackathon team suggestions." checked={formData.settings.privacy.teamBuilder} onChange={v => updatePrivacy("teamBuilder", v)} />
                                    </div>
                                 </Section>

                                 <Section title="Profile Sections">
                                    <div className="grid sm:grid-cols-2 gap-3">
                                       <Toggle label="Skill Radar" checked={formData.settings.privacy.showRadar} onChange={v => updatePrivacy("showRadar", v)} />
                                       <Toggle label="Activity Timeline" checked={formData.settings.privacy.showTimeline} onChange={v => updatePrivacy("showTimeline", v)} />
                                       <Toggle label="Reputation Score" checked={formData.settings.privacy.showReputation} onChange={v => updatePrivacy("showReputation", v)} />
                                       <Toggle label="Badges" checked={formData.settings.privacy.showBadges} onChange={v => updatePrivacy("showBadges", v)} />
                                    </div>
                                 </Section>
                              </div>
                           )}

                           {/* ====== ADMINISTRATION TAB (Admin / SuperAdmin) ====== */}
                           {activeTab === "admin" && (
                              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                 <Section title="Admin Account" description="Your administrative role and quick links.">
                                    <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                       <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Crown className="h-5 w-5 text-amber-500" /></div>
                                       <div>
                                          <div className="text-[13px] font-semibold">{role === "SuperAdmin" ? "Super Administrator" : "Administrator"}</div>
                                          <div className="text-[10px] text-muted-foreground">{user?.email} · {role}</div>
                                       </div>
                                    </div>
                                 </Section>

                                 <Section title="Quick Access">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                       {[
                                          { label: "User Management", href: '/cmd/users', icon: Users },
                                          { label: "Events", href: '/cmd/events', icon: CalendarIcon },
                                          { label: "Hackathons", href: '/cmd/hackathons', icon: Settings2 },
                                          { label: "Knowledge Base", href: '/cmd/knowledge', icon: BookOpen },
                                          { label: "Messages", href: '/cmd/messages', icon: Mail },
                                          { label: "Progress", href: '/cmd/progress', icon: Target },
                                       ].map(item => (
                                          <button key={item.href} onClick={() => navigate(item.href)} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-foreground/30 hover:bg-muted/50 transition-all">
                                             <item.icon className="h-5 w-5 text-muted-foreground" />
                                             <span className="text-[10px] font-medium text-center">{item.label}</span>
                                          </button>
                                       ))}
                                    </div>
                                 </Section>

                                 {role === "SuperAdmin" && (
                                    <Section title="Super Admin" description="Elevated access controls.">
                                       <button onClick={() => navigate("/super-admin")} className="h-9 px-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] font-semibold text-amber-600 hover:bg-amber-500/20 transition-colors flex items-center gap-2">
                                          <ShieldCheck className="h-3.5 w-3.5" /> Open Super Admin Dashboard
                                       </button>
                                    </Section>
                                 )}
                              </div>
                           )}

                           {/* ====== DANGER ZONE TAB ====== */}
                           {activeTab === "danger" && (
                              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                 <Section title="Deactivate Account">
                                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                                       <div className="flex items-start gap-3">
                                          <LogOut className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                          <div>
                                             <h4 className="text-[13px] font-semibold text-amber-600">Deactivate Account</h4>
                                             <p className="text-[11px] text-muted-foreground mt-1">Temporarily suspend your account. Your data will be preserved and you can reactivate by signing in again.</p>
                                          </div>
                                       </div>
                                       <button onClick={() => deactivateMutation.mutate()} disabled={deactivateMutation.isPending} className="h-8 px-4 border border-amber-500/40 hover:bg-amber-500/10 rounded text-[10px] font-semibold text-amber-600 transition-all disabled:opacity-50">
                                          {deactivateMutation.isPending ? "Processing..." : "Deactivate Account"}
                                       </button>
                                    </div>
                                 </Section>
                              </div>
                           )}

                        </div>

                     </div>
                  </div>
               </div>
            </div>
         </VeritaBoxLayout>

         {/* 2FA Modal */}
         <Dialog open={is2FAModalOpen} onOpenChange={setIs2FAModalOpen}>
            <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-2xl border-border shadow-2xl">
               <DialogHeader>
                  <DialogTitle className="text-[16px] font-semibold">Setup Two-Factor Authentication</DialogTitle>
                  <DialogDescription className="text-[11px] text-muted-foreground">Scan the QR code with your authenticator app and enter the 6-digit code.</DialogDescription>
               </DialogHeader>
               {!backupCodes ? (
                  <div className="flex flex-col items-center gap-4 py-3">
                     {twoFactorData?.qrCodeUrl ? (
                        <div className="p-3 bg-white rounded-xl"><img src={twoFactorData.qrCodeUrl} alt="QR Code" className="h-40 w-40" /></div>
                     ) : (
                        <div className="h-40 w-40 flex items-center justify-center bg-muted animate-pulse rounded-xl"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                     )}
                     <div className="w-full space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground text-center block">Verification Code</label>
                        <Input value={verificationToken} onChange={e => setVerificationToken(e.target.value)} placeholder="000000" className="text-center text-[20px] font-mono tracking-[0.3em] h-12 bg-secondary/20 border-border/50" maxLength={6} />
                     </div>
                  </div>
               ) : (
                  <div className="space-y-3 py-2">
                     <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-[11px] font-semibold text-green-500">2FA Activated</span>
                     </div>
                     <div className="space-y-2">
                        <div className="text-[10px] font-medium text-muted-foreground">Backup Codes:</div>
                        <div className="grid grid-cols-2 gap-1.5">{backupCodes.map((code, i) => <code key={i} className="bg-muted p-1.5 rounded text-center text-[10px] font-mono select-all">{code}</code>)}</div>
                     </div>
                     <p className="text-[9px] text-muted-foreground">Store these codes offline in a safe place.</p>
                  </div>
               )}
               <DialogFooter>
                  {!backupCodes ? (
                     <button onClick={() => verify2FAMutation.mutate()} disabled={verify2FAMutation.isPending || verificationToken.length !== 6} className="w-full h-10 bg-foreground text-background font-semibold text-[11px] rounded disabled:opacity-50 hover:opacity-90 transition-all">
                        {verify2FAMutation.isPending ? "Verifying..." : "Verify & Activate"}
                     </button>
                  ) : (
                     <button onClick={() => setIs2FAModalOpen(false)} className="w-full h-10 bg-muted text-foreground font-semibold text-[11px] rounded border border-border hover:bg-muted/80 transition-all">Done</button>
                  )}
               </DialogFooter>
            </DialogContent>
         </Dialog>

         {/* Password Modal */}
         <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
            <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-2xl border-border shadow-2xl">
               <DialogHeader>
                  <DialogTitle className="text-[16px] font-semibold">Change Password</DialogTitle>
                  <DialogDescription className="text-[11px] text-muted-foreground">Enter your current password and choose a new one.</DialogDescription>
               </DialogHeader>
               <div className="space-y-3 py-2">
                  <Field id="currPw" label="Current Password" icon={Key}>
                     <Input type="password" value={passwordData.currentPassword} onChange={e => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))} className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                  </Field>
                  <Field id="newPw" label="New Password" icon={Shield}>
                     <Input type="password" value={passwordData.newPassword} onChange={e => setPasswordData(p => ({ ...p, newPassword: e.target.value }))} className="bg-secondary/20 border-border/40 h-9 text-[12px]" placeholder="Min 8 chars, 1 number, 1 special" />
                  </Field>
                  <Field id="confPw" label="Confirm Password" icon={ShieldCheck}>
                     <Input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} className="bg-secondary/20 border-border/40 h-9 text-[12px]" />
                  </Field>
               </div>
               <DialogFooter>
                  <button onClick={handleUpdatePassword} disabled={!passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword} className="w-full h-10 bg-foreground text-background font-semibold text-[11px] rounded disabled:opacity-50 hover:opacity-90 transition-all flex items-center justify-center gap-1.5">
                     <Save className="h-3 w-3" /> Update Password
                  </button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </>
   );
}

// ========================= Sub-components =========================

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
   return (
      <div className="space-y-3">
         <div>
            <h3 className="text-[14px] font-semibold tracking-tight">{title}</h3>
            {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
         </div>
         <div className="space-y-4">{children}</div>
      </div>
   );
}

function Field({ id, label, icon: Icon, children }: { id: string; label: string; icon?: any; children: React.ReactNode }) {
   return (
      <div className="space-y-1">
         <label htmlFor={id} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 ml-0.5">
            {Icon && <Icon className="h-2.5 w-2.5" />} {label}
         </label>
         {children}
      </div>
   );
}

function Toggle({ label, sublabel, checked, onChange }: { label: string; sublabel?: string; checked: boolean; onChange: (v: boolean) => void }) {
   return (
      <div onClick={() => onChange(!checked)} className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", checked ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}>
         <div className="space-y-0.5">
            <div className={cn("text-[11px] font-medium", checked ? "text-foreground" : "text-muted-foreground")}>{label}</div>
            {sublabel && <p className="text-[9px] text-muted-foreground">{sublabel}</p>}
         </div>
         <div className={cn("h-5 w-9 rounded-full p-0.5 transition-colors", checked ? "bg-primary" : "bg-border")}>
            <div className={cn("h-4 w-4 rounded-full bg-white transition-transform shadow-sm", checked ? "translate-x-4" : "translate-x-0")} />
         </div>
      </div>
   );
}

function SocialCard({ label, icon, isLinked, onLink, onUnlink }: { label: string; icon: React.ReactNode; isLinked: boolean; onLink: () => void; onUnlink: () => void }) {
   return (
      <div className={cn("flex items-center justify-between p-3 rounded-lg border transition-all", isLinked ? "border-green-500/30 bg-green-500/5" : "border-border hover:border-foreground/20")}>
         <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-background border border-border flex items-center justify-center">{icon}</div>
            <div>
               <div className="text-[11px] font-medium">{label}</div>
               <div className={cn("text-[9px] font-medium", isLinked ? "text-green-500" : "text-muted-foreground")}>{isLinked ? "Connected" : "Not connected"}</div>
            </div>
         </div>
         {isLinked ? (
            <button onClick={onUnlink} className="text-[9px] text-destructive hover:bg-destructive/10 px-2 py-1 rounded border border-destructive/20 font-semibold">Unlink</button>
         ) : (
            <button onClick={onLink} className="text-[9px] bg-foreground text-background px-2.5 py-1 rounded font-semibold hover:opacity-90 transition-opacity">Connect</button>
         )}
      </div>
   );
}

function GoogleIcon() {
   return (
      <svg className="h-4 w-4" viewBox="0 0 24 24">
         <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
         <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
         <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
         <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
   );
}
