import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User, ChevronRight, ChevronLeft, Loader2,
  GraduationCap, Briefcase, Users, BookOpen, Check, X,
  Rocket, Code2, Trophy, Network, Megaphone, Lightbulb
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagPicker } from "@/components/veritabox/TagPicker";
import { ACADEMIC_DATA, BATCH_YEARS } from "@/lib/academicData";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { chaptersApi } from "@/lib/api";

type Persona = "Student" | "Professional" | "Recruiter" | "Teacher";
type Step = 1 | 2 | 3;

const SKILL_SUGGESTIONS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Angular",
  "Node.js", "Express", "Python", "Django", "Flask", "FastAPI",
  "Java", "Spring Boot", "Kotlin", "C++", "C", "Rust", "Go",
  "Swift", "Flutter", "React Native", "Docker", "Kubernetes",
  "AWS", "Azure", "GCP", "MongoDB", "PostgreSQL", "MySQL", "Redis",
  "GraphQL", "REST API", "Git", "CI/CD", "Linux",
  "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
  "Data Science", "TensorFlow", "PyTorch", "Pandas",
  "Figma", "UI/UX Design", "Tailwind CSS", "SASS",
  "Embedded Systems", "IoT", "Arduino", "Raspberry Pi", "MATLAB",
  "Blockchain", "Solidity", "Web3",
  "Cyber Security", "Penetration Testing", "Networking",
  "Project Management", "Agile", "Scrum"
];

const SUBJECT_SUGGESTIONS = [
  "Data Structures & Algorithms", "Operating Systems", "Computer Networks",
  "Database Management", "Software Engineering", "Web Development",
  "Machine Learning", "Artificial Intelligence", "Cyber Security",
  "Cloud Computing", "Mobile App Development", "Embedded Systems",
  "Digital Electronics", "Signal Processing", "Control Systems",
  "Thermodynamics", "Fluid Mechanics", "Strength of Materials",
  "Mathematics", "Physics", "Chemistry", "Statistics",
  "Business Analytics", "Marketing", "Finance", "Human Resource Management"
];

const INDUSTRY_SUGGESTIONS = [
  "Technology", "Finance & Banking", "Healthcare", "E-commerce",
  "Education", "Manufacturing", "Consulting", "Media & Entertainment",
  "Automotive", "Aerospace", "Telecommunications", "Energy",
  "Real Estate", "Agriculture", "Government", "Non-profit", "Startup"
];

const INTEREST_OPTIONS = [
  { id: "hackathons", label: "Hackathons & Competitions", icon: Trophy, desc: "Compete and build under pressure" },
  { id: "learning", label: "Learning & Upskilling", icon: Lightbulb, desc: "Structured learning paths and courses" },
  { id: "community", label: "Community & Networking", icon: Network, desc: "Connect with peers and mentors" },
  { id: "projects", label: "Building Projects", icon: Code2, desc: "Collaborate on real-world projects" },
  { id: "recruiting", label: "Recruiting Talent", icon: Megaphone, desc: "Find and hire skilled candidates", personas: ["Recruiter"] as Persona[] },
  { id: "mentoring", label: "Teaching & Mentoring", icon: BookOpen, desc: "Guide and support learners", personas: ["Teacher", "Professional"] as Persona[] },
];

const PERSONA_OPTIONS: { id: Persona; label: string; icon: any; desc: string }[] = [
  { id: "Student", label: "Student", icon: GraduationCap, desc: "Currently studying" },
  { id: "Professional", label: "Professional", icon: Briefcase, desc: "Working in industry" },
  { id: "Recruiter", label: "Recruiter / HR", icon: Users, desc: "Looking for talent" },
  { id: "Teacher", label: "Teacher / Educator", icon: BookOpen, desc: "Teaching & guiding" },
];

export function EnlistmentFlow({ returnTo }: { returnTo?: string | null }) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1  -  Identity
  const [username, setUsername] = useState("");
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [persona, setPersona] = useState<Persona>("Student");

  // Step 2  -  Persona-specific
  // Student
  const [eduInstitutionName, setEduInstitutionName] = useState("");
  const [academicTrack, setAcademicTrack] = useState("");
  const [branch, setBranch] = useState("");
  const [batch, setBatch] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [instituteOptions, setInstituteOptions] = useState<string[]>([]);
  const [instituteSearch, setInstituteSearch] = useState("");
  const [showInstituteDropdown, setShowInstituteDropdown] = useState(false);
  // Professional
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("0");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [industry, setIndustry] = useState("");
  // Recruiter
  const [hiringRoles, setHiringRoles] = useState<string[]>([]);
  const [teamSize, setTeamSize] = useState("Small");
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [recruiterIndustry, setRecruiterIndustry] = useState("");
  // Teacher
  const [institution, setInstitution] = useState("");
  const [subjectsTaught, setSubjectsTaught] = useState<string[]>([]);
  const [teacherDepartment, setTeacherDepartment] = useState("");
  const [teacherExperience, setTeacherExperience] = useState("0");
  const [teacherPreferredSkills, setTeacherPreferredSkills] = useState<string[]>([]);

  // Step 3  -  Interests
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    chaptersApi.getAll().then(chapters => {
      const names = chapters.map((c: any) => c.university || c.name).filter(Boolean);
      setInstituteOptions([...new Set(names)]);
    }).catch(() => {});
  }, []);

  // Username availability check
  useEffect(() => {
    if (!username || username.length < 3) {
      setIsUsernameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const res = await usersApi.checkUsername(username);
        setIsUsernameAvailable(res.available);
      } catch {
        setIsUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [username]);

  const validateStep1 = () => {
    if (!username || username.length < 3) {
      toast({ title: "Username Required", description: "Username must be at least 3 characters.", variant: "destructive" });
      return false;
    }
    if (isUsernameAvailable === false) {
      toast({ title: "Username Taken", description: "This username is already in use.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (persona === "Student") {
      if (!eduInstitutionName) {
        toast({ title: "Institution Required", description: "Please enter your institution name.", variant: "destructive" });
        return false;
      }
      if (!branch) {
        toast({ title: "Course Required", description: "Please select your course/specialization.", variant: "destructive" });
        return false;
      }
      if (!batch) {
        toast({ title: "Batch Required", description: "Please select your graduation year.", variant: "destructive" });
        return false;
      }
    } else if (persona === "Professional") {
      if (!companyName) {
        toast({ title: "Company Required", description: "Please enter your company name.", variant: "destructive" });
        return false;
      }
      if (!jobTitle) {
        toast({ title: "Role Required", description: "Please enter your job title.", variant: "destructive" });
        return false;
      }
    } else if (persona === "Teacher") {
      if (!institution) {
        toast({ title: "Institution Required", description: "Please enter your institution name.", variant: "destructive" });
        return false;
      }
      if (subjectsTaught.length === 0) {
        toast({ title: "Subjects Required", description: "Please add at least one subject you teach.", variant: "destructive" });
        return false;
      }
    } else if (persona === "Recruiter") {
      if (!companyName) {
        toast({ title: "Company Required", description: "Please enter your company name.", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const totalSteps = persona === "Recruiter" ? 2 : 3;

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 2 && persona === "Recruiter") {
      handleSubmit();
      return;
    }
    setStep(s => (s + 1) as Step);
  };

  const handleBack = () => setStep(s => (s - 1) as Step);

  const toggleInterest = (id: string) => {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (persona !== "Recruiter" && interests.length === 0) {
      toast({ title: "Select Interests", description: "Pick at least one thing you're here for.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const baseData: any = { username, skills };

      const profileData: any = { interests };

      if (persona === "Student") {
        profileData.university = eduInstitutionName;
        profileData.degree = branch || academicTrack || "Not Specified";
        profileData.graduationYear = parseInt(batch) || new Date().getFullYear();
        profileData.currentSkills = skills;
        baseData.eduInstitutionName = eduInstitutionName;
        baseData.course = academicTrack;
        baseData.branch = branch;
        baseData.batch = batch;
        baseData.employmentStatus = "Studying";
      } else if (persona === "Professional") {
        profileData.company = companyName;
        profileData.jobTitle = jobTitle;
        profileData.yearsOfExperience = parseInt(yearsOfExperience) || 0;
        profileData.techStack = techStack;
        profileData.industry = industry;
        baseData.companyName = companyName;
        baseData.designation = jobTitle;
        baseData.workExperience = parseInt(yearsOfExperience) || 0;
        baseData.employmentStatus = "Working";
      } else if (persona === "Teacher") {
        profileData.institution = institution;
        profileData.subjectsTaught = subjectsTaught;
        profileData.department = teacherDepartment;
        profileData.experienceYears = parseInt(teacherExperience) || 0;
        profileData.preferredSkills = teacherPreferredSkills;
        baseData.companyName = institution;
        baseData.designation = "Educator";
        baseData.employmentStatus = "Working";
      } else if (persona === "Recruiter") {
        profileData.company = companyName;
        profileData.hiringRoles = hiringRoles;
        profileData.teamSize = teamSize;
        profileData.preferredSkills = preferredSkills;
        profileData.industry = recruiterIndustry;
        baseData.companyName = companyName;
        baseData.designation = "Recruiter";
        baseData.employmentStatus = "Working";
      }

      await usersApi.completeOnboarding(persona, profileData, baseData);
      await refreshUser();
      toast({ title: "Welcome to VeritaBox!", description: "Your profile is ready. Let's get started." });
      const canReturnToJob = persona === "Student" || persona === "Professional";
      navigate(canReturnToJob && returnTo ? returnTo : "/dashboard", { replace: true });
    } catch (error: any) {
      toast({ title: "Setup Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleInterests = INTEREST_OPTIONS.filter(
    opt => !opt.personas || opt.personas.includes(persona)
  );

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[26px] font-semibold tracking-tight">
              {step === 1 && "Create your identity"}
              {step === 2 && "Tell us about yourself"}
              {step === 3 && "What brings you here?"}
            </h2>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              {step === 1 && "Pick a username and tell us what you do."}
              {step === 2 && personaStepDesc(persona)}
              {step === 3 && "Select what you want to do on VeritaBox. This helps us personalize your experience."}
            </p>
          </div>
          <div className="text-[11px] font-mono font-bold text-foreground bg-secondary px-2 py-1 rounded">
            {step} / {totalSteps}
          </div>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-500",
                step >= s ? "bg-foreground" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {step === 1 && (
          <div className="space-y-6">
            <Field id="username" label="Username" required>
              <div className="relative">
                <Input
                  id="username"
                  placeholder="e.g. johndoe"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className={cn(
                    "h-11 bg-background pr-10 transition-all duration-300",
                    isUsernameAvailable === true && "border-green-500/50 bg-green-500/5",
                    isUsernameAvailable === false && "border-red-500/50 bg-red-500/5"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCheckingUsername && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {!isCheckingUsername && isUsernameAvailable === true && <Check className="h-4 w-4 text-green-500" />}
                  {!isCheckingUsername && isUsernameAvailable === false && <X className="h-4 w-4 text-red-500" />}
                </div>
              </div>
              {isUsernameAvailable === false && (
                <p className="text-[11px] text-red-500 mt-1">This username is already taken</p>
              )}
            </Field>

            <Field id="persona" label="I am a..." required>
              <div className="grid grid-cols-2 gap-3">
                {PERSONA_OPTIONS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersona(p.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                      persona === p.id
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background border-border hover:border-foreground/30"
                    )}
                  >
                    <p.icon className="h-5 w-5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">{p.label}</div>
                      <div className={cn("text-[11px]", persona === p.id ? "text-background/70" : "text-muted-foreground")}>{p.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 2 && persona === "Student" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Field id="instName" label="Institution Name" required>
              <div className="relative">
                <Input
                  value={eduInstitutionName}
                  onChange={e => {
                    setEduInstitutionName(e.target.value);
                    setInstituteSearch(e.target.value);
                    setShowInstituteDropdown(true);
                  }}
                  onFocus={() => setShowInstituteDropdown(true)}
                  onBlur={() => setTimeout(() => setShowInstituteDropdown(false), 200)}
                  placeholder="e.g. IIT Bombay, NIT Trichy"
                  className="h-11 bg-background"
                />
                {showInstituteDropdown && instituteOptions.filter(n => n.toLowerCase().includes(instituteSearch.toLowerCase())).length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background/95 backdrop-blur-xl border border-border rounded-lg shadow-2xl max-h-[200px] overflow-y-auto">
                    {instituteOptions
                      .filter(n => n.toLowerCase().includes(instituteSearch.toLowerCase()))
                      .slice(0, 10)
                      .map(name => (
                        <button
                          key={name}
                          type="button"
                          className="w-full text-left px-3 py-2 text-[13px] hover:bg-secondary transition-colors"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setEduInstitutionName(name);
                            setShowInstituteDropdown(false);
                          }}
                        >
                          {name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="academicTrack" label="Academic Track">
                <Select value={academicTrack} onValueChange={val => { setAcademicTrack(val); setBranch(""); }}>
                  <SelectTrigger className="h-11 bg-background border-border">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[300px]">
                    {Object.keys(ACADEMIC_DATA).map(cat => (
                      <SelectItem key={cat} value={cat} className="text-[13px]">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="branch" label="Course / Specialization" required>
                <Select value={branch} onValueChange={setBranch} disabled={!academicTrack}>
                  <SelectTrigger className="h-11 bg-background border-border">
                    <SelectValue placeholder={academicTrack ? "Select course" : "Pick track first"} />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[300px]">
                    {(ACADEMIC_DATA[academicTrack as keyof typeof ACADEMIC_DATA] || []).map(item => (
                      <SelectItem key={item} value={item} className="text-[13px]">{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="batch" label="Graduation Year" required>
                <Select value={batch} onValueChange={setBatch}>
                  <SelectTrigger className="h-11 bg-background border-border">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[300px]">
                    {BATCH_YEARS.map(y => (
                      <SelectItem key={y} value={y} className="text-[13px]">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field id="skills" label="Skills">
              <TagPicker value={skills} onChange={setSkills} suggestions={SKILL_SUGGESTIONS} placeholder="e.g. React, Python..." max={10} />
              <p className="text-[10px] text-muted-foreground mt-1">Type to search or add your own</p>
            </Field>
          </div>
        )}

        {step === 2 && persona === "Professional" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="company" label="Company" required>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Google, Infosys" className="h-11 bg-background" />
              </Field>
              <Field id="jobTitle" label="Job Title / Role" required>
                <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Software Engineer" className="h-11 bg-background" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="experience" label="Years of Experience">
                <Input type="number" min="0" max="50" value={yearsOfExperience} onChange={e => setYearsOfExperience(e.target.value)} className="h-11 bg-background" />
              </Field>
              <Field id="industry" label="Industry">
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="h-11 bg-background border-border">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[300px]">
                    {INDUSTRY_SUGGESTIONS.map(ind => (
                      <SelectItem key={ind} value={ind} className="text-[13px]">{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field id="techStack" label="Tech Stack">
              <TagPicker value={techStack} onChange={setTechStack} suggestions={SKILL_SUGGESTIONS} placeholder="e.g. Node.js, AWS..." max={10} />
            </Field>
          </div>
        )}

        {step === 2 && persona === "Teacher" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Field id="institution" label="Institution" required>
              <Input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. Delhi University, VIT" className="h-11 bg-background" />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="department" label="Department">
                <Input value={teacherDepartment} onChange={e => setTeacherDepartment(e.target.value)} placeholder="e.g. Computer Science" className="h-11 bg-background" />
              </Field>
              <Field id="teacherExp" label="Years of Experience">
                <Input type="number" min="0" max="50" value={teacherExperience} onChange={e => setTeacherExperience(e.target.value)} className="h-11 bg-background" />
              </Field>
            </div>

            <Field id="subjects" label="Subjects You Teach" required>
              <TagPicker value={subjectsTaught} onChange={setSubjectsTaught} suggestions={SUBJECT_SUGGESTIONS} placeholder="e.g. Data Structures, Web Dev..." max={10} />
            </Field>

            <Field id="teacherPreferredSkills" label="Preferred Candidate Skills">
              <TagPicker value={teacherPreferredSkills} onChange={setTeacherPreferredSkills} suggestions={SKILL_SUGGESTIONS} placeholder="e.g. React, Python..." max={10} />
            </Field>
          </div>
        )}

        {step === 2 && persona === "Recruiter" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="company" label="Company" required>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. TCS, Flipkart" className="h-11 bg-background" />
              </Field>
              <Field id="recruiterIndustry" label="Industry">
                <Select value={recruiterIndustry} onValueChange={setRecruiterIndustry}>
                  <SelectTrigger className="h-11 bg-background border-border">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[300px]">
                    {INDUSTRY_SUGGESTIONS.map(ind => (
                      <SelectItem key={ind} value={ind} className="text-[13px]">{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field id="teamSize" label="Team Size">
              <Select value={teamSize} onValueChange={setTeamSize}>
                <SelectTrigger className="h-11 bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-xl border-border shadow-2xl">
                  <SelectItem value="Small" className="text-[13px]">Small (1-50)</SelectItem>
                  <SelectItem value="Medium" className="text-[13px]">Medium (50-500)</SelectItem>
                  <SelectItem value="Large" className="text-[13px]">Large (500+)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field id="hiringRoles" label="Roles You're Hiring For">
              <TagPicker value={hiringRoles} onChange={setHiringRoles} suggestions={["Frontend Developer", "Backend Developer", "Full Stack Developer", "DevOps Engineer", "Data Scientist", "Product Manager", "UI/UX Designer", "QA Engineer", "Mobile Developer", "ML Engineer"]} placeholder="e.g. Frontend Developer..." max={8} />
            </Field>

            <Field id="preferredSkills" label="Preferred Candidate Skills">
              <TagPicker value={preferredSkills} onChange={setPreferredSkills} suggestions={SKILL_SUGGESTIONS} placeholder="e.g. React, Python..." max={10} />
            </Field>
          </div>
        )}

        {step === 3 && persona !== "Recruiter" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleInterests.map(opt => {
                const selected = interests.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleInterest(opt.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      selected
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background border-border hover:border-foreground/30"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                      selected ? "bg-background/20" : "bg-secondary"
                    )}>
                      <opt.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{opt.label}</div>
                      <div className={cn("text-[11px] mt-0.5", selected ? "text-background/70" : "text-muted-foreground")}>{opt.desc}</div>
                    </div>
                    {selected && (
                      <Check className="h-4 w-4 ml-auto mt-1 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            {interests.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center">Select at least one to continue</p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-4">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="flex-1 h-12 font-bold uppercase tracking-widest"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
        <Button
          type="button"
          onClick={step === totalSteps ? handleSubmit : handleNext}
          disabled={isSubmitting || (step === totalSteps && persona !== "Recruiter" && interests.length === 0)}
          className="flex-[2] h-12 bg-foreground text-background hover:bg-foreground/90 font-bold uppercase tracking-widest"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : step === totalSteps ? (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Get Started
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function personaStepDesc(persona: Persona) {
  switch (persona) {
    case "Student": return "Your academic details help us match you with the right opportunities.";
    case "Professional": return "Tell us about your work so we can connect you with relevant projects.";
    case "Teacher": return "Share what you teach so students can find you.";
    case "Recruiter": return "Help us understand what talent you're looking for.";
  }
}

function Field({ id, label, children, required }: { id: string; label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
        {label} {required && <span className="text-red-400">*</span>}
      </Label>
      {children}
    </div>
  );
}
