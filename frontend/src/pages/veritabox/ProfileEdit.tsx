import { useState, useEffect, useRef } from "react";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface } from "@/components/veritabox/UI";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Save, ArrowLeft, ArrowRight, GitBranch, Linkedin,
  Tag, X, Plus, Info, Globe, Loader2, Sparkles,
  Camera, Upload, Image as ImageIcon, Check,
  Phone, Smartphone, Calendar as CalendarIcon, Users, MapPin, Map,
  Building2, GraduationCap, Briefcase, BookOpen, Target,
  Github, Twitter
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, api, resolveAssetUrl } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subYears } from "date-fns";
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
  "Mathematics", "Physics", "Chemistry", "Statistics"
];

const INDUSTRY_SUGGESTIONS = [
  "Technology", "Finance & Banking", "Healthcare", "E-commerce",
  "Education", "Manufacturing", "Consulting", "Media & Entertainment",
  "Automotive", "Aerospace", "Telecommunications", "Energy",
  "Real Estate", "Agriculture", "Government", "Non-profit", "Startup"
];

type WizardStep = "basics" | "contact" | "role" | "links";

function getSteps(role: string): { id: WizardStep; label: string; icon: any }[] {
  const steps: { id: WizardStep; label: string; icon: any }[] = [
    { id: "basics", label: "Basic Info", icon: Info },
    { id: "contact", label: "Contact & Location", icon: MapPin },
  ];

  if (role === "Student") steps.push({ id: "role", label: "Academic Details", icon: GraduationCap });
  else if (role === "Professional") steps.push({ id: "role", label: "Professional Details", icon: Briefcase });
  else if (role === "Recruiter") steps.push({ id: "role", label: "Recruiter Details", icon: Users });
  else if (role === "Teacher" || role === "Faculty") steps.push({ id: "role", label: "Teaching Details", icon: BookOpen });

  if (role !== "Recruiter") {
    steps.push({ id: "links", label: "Skills & Social", icon: Globe });
  }

  return steps;
}

const Field = ({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] uppercase font-bold text-muted-foreground ml-1 flex items-center gap-1.5">
      <Icon className="h-3 w-3" /> {label}
    </label>
    {children}
  </div>
);

export default function ProfileEdit() {
  const { profile, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = user?.role || "Student";
  const steps = getSteps(role);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const currentStep = steps[currentStepIdx];

  // Basic Info
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Contact & Location
  const [phone, setPhone] = useState("");
  const [whatsappNo, setWhatsappNo] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  // Student fields
  const [eduInstitutionType, setEduInstitutionType] = useState("None");
  const [eduInstitutionName, setEduInstitutionName] = useState("");
  const [course, setCourse] = useState("");
  const [branch, setBranch] = useState("");
  const [batch, setBatch] = useState("");
  const [studentSkills, setStudentSkills] = useState<string[]>([]);
  const [graduationYear, setGraduationYear] = useState("");
  const [department, setDepartment] = useState("");
  const [university, setUniversity] = useState("");
  const [degree, setDegree] = useState("");

  // Professional fields
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState(0);
  const [industry, setIndustry] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);

  // Recruiter fields
  const [recruiterCompany, setRecruiterCompany] = useState("");
  const [recruiterIndustry, setRecruiterIndustry] = useState("");
  const [teamSize, setTeamSize] = useState("Small");
  const [hiringRoles, setHiringRoles] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);

  // Teacher fields
  const [teacherInstitution, setTeacherInstitution] = useState("");
  const [teacherDepartment, setTeacherDepartment] = useState("");
  const [teacherExperience, setTeacherExperience] = useState(0);
  const [subjectsTaught, setSubjectsTaught] = useState<string[]>([]);
  const [canMentor, setCanMentor] = useState<string[]>([]);

  // Skills & Social
  const [skills, setSkills] = useState<string[]>([]);
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [twitter, setTwitter] = useState("");

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || "");
    setBio(profile.bio || "");
    setAvatarUrl(profile.avatarUrl || "");
    setCoverPhotoUrl(profile.coverPhotoUrl || "");
    setPhone(profile.phone || "");
    setWhatsappNo(profile.whatsappNo || "");
    setDob(profile.dob ? new Date(profile.dob).toISOString().split("T")[0] : "");
    setGender(profile.gender || "");
    setPermanentAddress(profile.permanentAddress || "");
    setState(profile.state || "");
    setCity(profile.city || "");
    setSkills(profile.skills || []);
    setGithub(profile.socialLinks?.github || "");
    setLinkedin(profile.socialLinks?.linkedin || "");
    setPortfolio(profile.socialLinks?.portfolio || "");
    setTwitter(profile.socialLinks?.twitter || "");

    setEduInstitutionType(profile.eduInstitutionType || "None");
    setEduInstitutionName(profile.eduInstitutionName || "");
    setCourse(profile.course || "");
    setBranch(profile.branch || "");
    setBatch(profile.batch || "");

    const pp = profile.personaProfile;
    if (pp && role === "Student") {
      setUniversity(pp.university || "");
      setDegree(pp.degree || "");
      setDepartment(pp.department || "");
      setGraduationYear(String(pp.graduationYear || ""));
      setStudentSkills(pp.currentSkills || []);
    }
    if (pp && role === "Professional") {
      setCompany(pp.company || "");
      setJobTitle(pp.jobTitle || "");
      setYearsOfExperience(pp.yearsOfExperience || 0);
      setIndustry(pp.industry || "");
      setTechStack(pp.techStack || []);
    }
    if (pp && role === "Recruiter") {
      setRecruiterCompany(pp.company || "");
      setRecruiterIndustry(pp.industry || "");
      setTeamSize(pp.teamSize || "Small");
      setHiringRoles(pp.hiringRoles || []);
      setPreferredSkills(pp.preferredSkills || []);
    }
    if (pp && (role === "Teacher" || role === "Faculty")) {
      setTeacherInstitution(pp.institution || "");
      setTeacherDepartment(pp.department || "");
      setTeacherExperience(pp.experienceYears || 0);
      setSubjectsTaught(pp.subjectsTaught || []);
      setCanMentor(pp.canMentor || []);
    }
  }, [profile, role]);

  const invalidateAll = () => {
    refreshUser();
    queryClient.invalidateQueries({ queryKey: ["profile", user?._id] });
    queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  const profileMutation = useMutation({
    mutationFn: (data: any) => usersApi.updateProfile(data),
    onSuccess: invalidateAll,
    onError: (err: any) => toast.error(err.message || "Update failed."),
  });

  const personaMutation = useMutation({
    mutationFn: (data: Record<string, any>) => usersApi.updatePersonaProfile(data),
    onSuccess: invalidateAll,
    onError: (err: any) => toast.error(err.message || "Update failed."),
  });

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setUrl: (url: string) => void,
    setUploading: (v: boolean) => void,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("document", file);
    try {
      const data = await api.upload<{ filePath: string }>("/api/upload", fd);
      setUrl(data.filePath);
      toast.success("Upload successful.");
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const saveAll = async () => {
    try {
      await profileMutation.mutateAsync({
        name, bio, avatarUrl, coverPhotoUrl,
        phone, whatsappNo, dob: dob || undefined, gender: gender || undefined,
        permanentAddress, state, city,
        skills,
        socialLinks: { github, linkedin, portfolio, twitter },
        eduInstitutionType, eduInstitutionName,
        course, branch, batch,
      });

      const personaData: Record<string, any> = {};
      if (role === "Student") {
        Object.assign(personaData, { 
          university: eduInstitutionName, 
          degree: branch || course || "Not Specified", 
          department: course, 
          graduationYear: Number(batch) || new Date().getFullYear(), 
          currentSkills: studentSkills 
        });
      } else if (role === "Professional") {
        Object.assign(personaData, { company, jobTitle, yearsOfExperience, industry, techStack });
      } else if (role === "Recruiter") {
        Object.assign(personaData, { company: recruiterCompany, industry: recruiterIndustry, teamSize, hiringRoles, preferredSkills });
      } else if (role === "Teacher" || role === "Faculty") {
        Object.assign(personaData, { institution: teacherInstitution, department: teacherDepartment, experienceYears: teacherExperience, subjectsTaught, canMentor });
      }

      if (Object.keys(personaData).length > 0) {
        await personaMutation.mutateAsync(personaData);
      }

      toast.success("Profile updated successfully!");
      navigate("/profile/me");
    } catch {
      // errors handled by mutation callbacks
    }
  };

  const isSaving = profileMutation.isPending || personaMutation.isPending;

  const next = () => { if (currentStepIdx < steps.length - 1) setCurrentStepIdx(i => i + 1); };
  const prev = () => { if (currentStepIdx > 0) setCurrentStepIdx(i => i - 1); };
  const isLast = currentStepIdx === steps.length - 1;

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="max-w-2xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Complete Profile</h1>
                <p className="text-sm text-muted-foreground mt-1">Fill in your details to make the most of VeritaBox.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile/me")} className="text-muted-foreground hover:text-foreground">
                 <ArrowLeft className="h-4 w-4 mr-2" /> Cancel
              </Button>
            </div>
          </div>

          {/* Step progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">Step {currentStepIdx + 1} of {steps.length}</span>
              <span className="text-[11px] font-medium text-primary">{currentStep.label}</span>
            </div>
            <Progress value={((currentStepIdx + 1) / steps.length) * 100} className="h-1" />
            <div className="flex justify-between mt-2">
              {steps.map((s, i) => (
                <span key={i} className={cn("text-[9px] uppercase tracking-wider hidden sm:block", i <= currentStepIdx ? "text-primary" : "text-muted-foreground/50")}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Step content */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" key={currentStep.id}>
            {currentStep.id === "basics" && (
              <div className="space-y-8 mt-2">
                <h3 className="text-[14px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Info className="h-4 w-4" /> Basic Information
                </h3>

                {/* Avatar & Cover */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Profile Photo</label>
                    <div className="flex gap-4">
                      <div className="h-20 w-20 rounded-2xl border border-border bg-secondary/50 flex items-center justify-center shrink-0 overflow-hidden relative group">
                        {avatarUrl ? (
                          <img src={resolveAssetUrl(avatarUrl)} className="h-full w-full object-cover" alt="" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground opacity-20" />
                        )}
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        )}
                        <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="h-5 w-5 text-white" />
                        </button>
                      </div>
                      <div className="flex-1 space-y-2">
                        <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={e => handleUpload(e, setAvatarUrl, setIsUploadingAvatar, avatarInputRef)} />
                        <button onClick={() => avatarInputRef.current?.click()} disabled={isUploadingAvatar} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:brightness-110 disabled:opacity-50">
                          <Upload className="h-3 w-3" /> Upload Photo
                        </button>
                        {avatarUrl && (
                          <button onClick={() => setAvatarUrl("")} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive">
                            <X className="h-3 w-3" /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cover Photo</label>
                    <div className="h-20 w-full rounded-xl border border-border bg-secondary/50 flex items-center justify-center overflow-hidden relative group">
                      {coverPhotoUrl ? (
                        <img src={resolveAssetUrl(coverPhotoUrl)} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground opacity-20" />
                      )}
                      {isUploadingCover && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      )}
                      <button onClick={() => coverInputRef.current?.click()} className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-5 w-5 text-white" />
                      </button>
                    </div>
                    <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={e => handleUpload(e, setCoverPhotoUrl, setIsUploadingCover, coverInputRef)} />
                    <div className="flex gap-3">
                      <button onClick={() => coverInputRef.current?.click()} disabled={isUploadingCover} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:brightness-110 disabled:opacity-50">
                        <Upload className="h-3 w-3" /> Upload
                      </button>
                      {coverPhotoUrl && (
                        <button onClick={() => setCoverPhotoUrl("")} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive">
                          <X className="h-3 w-3" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <Field label="Full Name" icon={Info}>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="bg-secondary/40 border-border h-10" />
                </Field>

                <Field label="Bio" icon={Info}>
                  <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell people about yourself..." className="bg-secondary/40 border-border min-h-[100px] resize-none" maxLength={300} />
                  <div className="text-[10px] text-right text-muted-foreground">{bio.length}/300</div>
                </Field>
              </div>
            )}

            {currentStep.id === "contact" && (
              <div className="space-y-8 mt-2">
                <h3 className="text-[14px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Contact & Location
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Phone" icon={Phone}>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91..." className="bg-secondary/40 border-border h-10" />
                  </Field>
                  <Field label="WhatsApp" icon={Smartphone}>
                    <Input value={whatsappNo} onChange={e => setWhatsappNo(e.target.value)} placeholder="+91..." className="bg-secondary/40 border-border h-10" />
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Date of Birth" icon={CalendarIcon}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full h-10 justify-start text-left font-normal bg-secondary/40 border-border", !dob && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50 shrink-0" />
                          {dob && !isNaN(new Date(dob).getTime()) ? format(new Date(dob), "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background/95 backdrop-blur-xl border-border shadow-2xl z-[100]" align="start">
                        <Calendar mode="single" captionLayout="dropdown" fromYear={1900} toYear={new Date().getFullYear() - 12} selected={dob ? new Date(dob) : undefined} onSelect={date => setDob(date ? format(date, "yyyy-MM-dd") : "")} disabled={date => date > subYears(new Date(), 12) || date < new Date("1900-01-01")} initialFocus className="bg-transparent" />
                      </PopoverContent>
                    </Popover>
                  </Field>
                  <Field label="Gender" icon={Users}>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="h-10 bg-secondary/40 border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl z-[100]">
                        {["Male", "Female", "Other", "Prefer not to say"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Address" icon={MapPin}>
                  <Textarea value={permanentAddress} onChange={e => setPermanentAddress(e.target.value)} className="bg-secondary/40 border-border min-h-[60px] resize-y" placeholder="Permanent address" />
                </Field>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="State" icon={Map}>
                    <LocationSelector options={INDIAN_STATES} value={state} onValueChange={val => { setState(val); setCity(""); }} placeholder="Select State" />
                  </Field>
                  <Field label="City" icon={Target}>
                    <LocationSelector options={STATE_CITIES[state] || []} value={city} onValueChange={setCity} placeholder={state ? "Select City" : "Select state first"} disabled={!state} />
                  </Field>
                </div>
              </div>
            )}

            {currentStep.id === "role" && role === "Student" && (
              <div className="space-y-8 mt-2">
                <h3 className="text-[14px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> Academic Details
                </h3>


                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Institution Type" icon={Building2}>
                    <Select value={eduInstitutionType} onValueChange={setEduInstitutionType}>
                      <SelectTrigger className="h-10 bg-secondary/40 border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl">
                        {["None", "College", "University"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Institution Name" icon={Building2}>
                    <Input value={eduInstitutionName} onChange={e => setEduInstitutionName(e.target.value)} className="bg-secondary/40 border-border h-10" />
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Academic Track" icon={GraduationCap}>
                    <Select value={course} onValueChange={val => { setCourse(val); setBranch(""); }}>
                      <SelectTrigger className="h-10 bg-secondary/40 border-border"><SelectValue placeholder="Select track" /></SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[200px]">
                        {Object.keys(ACADEMIC_DATA).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Course / Specialization" icon={BookOpen}>
                    <Select value={branch} onValueChange={setBranch} disabled={!course}>
                      <SelectTrigger className="h-10 bg-secondary/40 border-border"><SelectValue placeholder={course ? "Select course" : "Pick track first"} /></SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[200px]">
                        {(ACADEMIC_DATA[course as keyof typeof ACADEMIC_DATA] || []).map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Batch Year" icon={CalendarIcon}>
                  <Select value={batch} onValueChange={setBatch}>
                    <SelectTrigger className="h-10 bg-secondary/40 border-border max-w-[200px]"><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[200px]">
                      {BATCH_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Technical Skills" icon={Tag}>
                  <TagPicker value={studentSkills} onChange={setStudentSkills} suggestions={SKILL_SUGGESTIONS} placeholder="Add your skills..." max={15} />
                </Field>
              </div>
            )}

            {currentStep.id === "role" && role === "Professional" && (
              <div className="space-y-8 mt-2">
                <h3 className="text-[14px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Professional Details
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Company" icon={Building2}>
                    <Input value={company} onChange={e => setCompany(e.target.value)} className="bg-secondary/40 border-border h-10" />
                  </Field>
                  <Field label="Job Title" icon={Briefcase}>
                    <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="bg-secondary/40 border-border h-10" />
                  </Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Years of Experience" icon={CalendarIcon}>
                    <Input type="number" value={yearsOfExperience} onChange={e => setYearsOfExperience(Number(e.target.value))} className="bg-secondary/40 border-border h-10 max-w-[140px]" min={0} />
                  </Field>
                  <Field label="Industry" icon={Globe}>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className="h-10 bg-secondary/40 border-border"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[200px]">
                        {INDUSTRY_SUGGESTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Tech Stack" icon={Tag}>
                  <TagPicker value={techStack} onChange={setTechStack} suggestions={SKILL_SUGGESTIONS} placeholder="Add technologies..." max={15} />
                </Field>
              </div>
            )}

            {currentStep.id === "role" && role === "Recruiter" && (
              <div className="space-y-8 mt-2">
                <h3 className="text-[14px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Users className="h-4 w-4" /> Recruiter Details
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Company" icon={Building2}>
                    <Input value={recruiterCompany} onChange={e => setRecruiterCompany(e.target.value)} className="bg-secondary/40 border-border h-10" />
                  </Field>
                  <Field label="Industry" icon={Globe}>
                    <Select value={recruiterIndustry} onValueChange={setRecruiterIndustry}>
                      <SelectTrigger className="h-10 bg-secondary/40 border-border"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[200px]">
                        {INDUSTRY_SUGGESTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Team Size" icon={Users}>
                    <Select value={teamSize} onValueChange={setTeamSize}>
                      <SelectTrigger className="h-10 bg-secondary/40 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl">
                        {[{ v: "Small", l: "1-10" }, { v: "Medium", l: "11-50" }, { v: "Large", l: "50+" }].map(s => (
                          <SelectItem key={s.v} value={s.v}>{s.v} ({s.l})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Roles You're Hiring For" icon={Briefcase}>
                  <TagPicker value={hiringRoles} onChange={setHiringRoles} suggestions={["Frontend Developer", "Backend Developer", "Full Stack", "DevOps", "Data Scientist", "ML Engineer", "Designer", "Product Manager", "QA Engineer", "Mobile Developer"]} placeholder="Add roles..." max={10} />
                </Field>

                <Field label="Preferred Candidate Skills" icon={Tag}>
                  <TagPicker value={preferredSkills} onChange={setPreferredSkills} suggestions={SKILL_SUGGESTIONS} placeholder="Skills you look for..." max={15} />
                </Field>
              </div>
            )}

            {currentStep.id === "role" && (role === "Teacher" || role === "Faculty") && (
              <div className="space-y-8 mt-2">
                <h3 className="text-[14px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Teaching Details
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Institution" icon={Building2}>
                    <Input value={teacherInstitution} onChange={e => setTeacherInstitution(e.target.value)} className="bg-secondary/40 border-border h-10" />
                  </Field>
                  <Field label="Department" icon={BookOpen}>
                    <Input value={teacherDepartment} onChange={e => setTeacherDepartment(e.target.value)} className="bg-secondary/40 border-border h-10" />
                  </Field>
                </div>

                <Field label="Years of Experience" icon={CalendarIcon}>
                  <Input type="number" value={teacherExperience} onChange={e => setTeacherExperience(Number(e.target.value))} className="bg-secondary/40 border-border h-10 max-w-[140px]" min={0} />
                </Field>

                <Field label="Subjects You Teach" icon={BookOpen}>
                  <TagPicker value={subjectsTaught} onChange={setSubjectsTaught} suggestions={SUBJECT_SUGGESTIONS} placeholder="Add subjects..." max={15} />
                </Field>

                <Field label="Can Mentor In" icon={Users}>
                  <TagPicker value={canMentor} onChange={setCanMentor} suggestions={SKILL_SUGGESTIONS} placeholder="Add mentoring topics..." max={10} />
                </Field>
              </div>
            )}

            {currentStep.id === "links" && (
              <div className="space-y-8 mt-2">
                <h3 className="text-[14px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Skills & Social Links
                </h3>

                <Field label="Skills" icon={Tag}>
                  <TagPicker value={skills} onChange={setSkills} suggestions={SKILL_SUGGESTIONS} placeholder="Add your skills..." max={15} />
                </Field>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="GitHub" icon={Github}>
                    <Input value={github} onChange={e => setGithub(e.target.value)} placeholder="https://github.com/..." className="bg-secondary/40 border-border h-10" />
                  </Field>
                  <Field label="LinkedIn" icon={Linkedin}>
                    <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." className="bg-secondary/40 border-border h-10" />
                  </Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Portfolio" icon={Globe}>
                    <Input value={portfolio} onChange={e => setPortfolio(e.target.value)} placeholder="https://..." className="bg-secondary/40 border-border h-10" />
                  </Field>
                  <Field label="Twitter / X" icon={Twitter}>
                    <Input value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="https://x.com/..." className="bg-secondary/40 border-border h-10" />
                  </Field>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={prev}
              disabled={currentStepIdx === 0}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {isLast ? (
              <Button
                onClick={saveAll}
                disabled={isSaving}
                className="gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save & Finish
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={next}
                className="gap-1.5"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
