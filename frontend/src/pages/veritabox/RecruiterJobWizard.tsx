import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, CalendarDays, Check, ChevronDown, CircleCheck, ExternalLink, FileImage, IndianRupee, Loader2, MapPin, Plus, Save, Upload, Wifi, X } from "lucide-react";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface } from "@/components/veritabox/UI";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { jobsApi, resolveAssetUrl, uploadApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type JobStatus = "Draft" | "Published" | "Closed";

interface JobForm {
  companyName: string;
  employmentType: string;
  designation: string;
  jobType: string;
  locationType: string;
  location: string;
  companyLogo: string;
  website: string;
  aboutCompany: string;
  description: string;
  skills: string[];
  salaryMin: string;
  salaryMax: string;
  experienceMin: string;
  experienceMax: string;
  status: JobStatus;
  lastApplyDate: string;
}

const EMPTY_FORM: JobForm = {
  companyName: "",
  employmentType: "",
  designation: "",
  jobType: "",
  locationType: "",
  location: "",
  companyLogo: "",
  website: "",
  aboutCompany: "",
  description: "",
  skills: [],
  salaryMin: "",
  salaryMax: "",
  experienceMin: "",
  experienceMax: "",
  status: "Draft",
  lastApplyDate: "",
};

const STEPS = [
  { number: 1, title: "Basic job details", caption: "Role and location" },
  { number: 2, title: "Company & job info", caption: "Brand, description, skills" },
  { number: 3, title: "Compensation & publishing", caption: "Ranges and deadline" },
];

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Temporary"];
const JOB_TYPES = [
  { value: "Job", label: "Full-time job" },
  { value: "Internship", label: "Internship" },
  { value: "Contract", label: "Contract" },
];
const LOCATION_TYPES = ["On-site", "Remote"];
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const inputClass = "w-full rounded border border-border bg-secondary px-3 py-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2";
const labelClass = "mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground";

function toDisplayDate(value?: string | Date) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getUTCDate()).padStart(2, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${date.getUTCFullYear()}`;
}

function toIsoDate(value: string) {
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCDate() !== Number(day) || date.getUTCMonth() + 1 !== Number(month) || date.getUTCFullYear() !== Number(year)) return "";
  return `${year}-${month}-${day}`;
}

function fromIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function legacyExperience(minimum: string) {
  if (!minimum) return undefined;
  const years = Number(minimum);
  if (years < 1) return "0-1 years";
  if (years < 3) return "1-3 years";
  if (years < 5) return "3-5 years";
  return "5+ years";
}

function legacyExperienceRange(value = "") {
  const values: Record<string, [string, string]> = {
    "Fresher": ["0", "0"],
    "0-1 years": ["0", "1"],
    "1-3 years": ["1", "3"],
    "3-5 years": ["3", "5"],
    "5+ years": ["5", ""],
  };
  return values[value] || ["", ""];
}

function skillName(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "skillName" in value) {
    const name = (value as { skillName?: unknown }).skillName;
    return typeof name === "string" ? name : "";
  }
  return "";
}

function JobPostingPreview({ form, logoPreview }: { form: JobForm; logoPreview: string }) {
  const salary = form.salaryMin || form.salaryMax
    ? `INR ${form.salaryMin || " - "} - ${form.salaryMax || " - "} per annum`
    : "Salary not specified";
  const experience = form.experienceMin || form.experienceMax
    ? `${form.experienceMin || "0"} - ${form.experienceMax || "Any"} yrs`
    : "Experience not specified";

  const previewArticle = (
    <article className="rounded-md border border-border bg-background/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {logoPreview || form.companyLogo ? (
              <img src={logoPreview || resolveAssetUrl(form.companyLogo)} alt="Company logo preview" className="h-10 w-10 shrink-0 rounded border border-border bg-background object-contain p-1" />
            ) : (
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border bg-secondary text-muted-foreground"><Building2 className="h-5 w-5" /></span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium">{form.companyName || "Company name"}</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">Posting date appears after saving</p>
            </div>
          </div>
          <span className="max-w-[150px] truncate rounded-full border border-border px-2.5 py-1 text-[9px] text-muted-foreground">{form.employmentType || "Employment type"}</span>
        </div>

        <h3 className="mt-4 text-[16px] font-semibold">{form.designation || "Job designation"}</h3>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"><BriefcaseBusiness className="h-3 w-3" />{experience}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"><MapPin className="h-3 w-3" />{form.location || "Location"}</span>
          {form.locationType === "Remote" && <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 px-2.5 py-1 text-success"><Wifi className="h-3 w-3" />Remote</span>}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"><IndianRupee className="h-3 w-3" />{salary}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1">{form.jobType || "Job type"}</span>
        </div>

        <div className="my-4 border-t border-border" />
        <div>
          <h4 className="text-[11px] font-semibold">Skills</h4>
          {form.skills.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">{form.skills.map((skill) => <span key={skill} className="rounded-full border border-border px-2.5 py-1 text-[9px] text-muted-foreground">{skill}</span>)}</div>
          ) : <p className="mt-1 text-[10px] text-muted-foreground">Selected skills will appear here.</p>}
        </div>
        <div className="mt-4">
          <h4 className="text-[11px] font-semibold">Job description</h4>
          <p className="mt-1 whitespace-pre-wrap text-[10px] leading-relaxed text-muted-foreground">{form.description || "Your job description will appear here."}</p>
        </div>
        <div className="mt-4">
          <h4 className="text-[11px] font-semibold">About company</h4>
          <p className="mt-1 whitespace-pre-wrap text-[10px] leading-relaxed text-muted-foreground">{form.aboutCompany || "Your company overview will appear here."}</p>
        </div>
        {form.website && <p className="mt-4 truncate text-[10px] text-muted-foreground">{form.website}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-[10px] text-muted-foreground">Apply before {form.lastApplyDate || "DD-MM-YYYY"}</p>
          <Button type="button" size="sm" disabled className="h-8 px-5 text-[11px]">Apply</Button>
        </div>
      </article>
  );

  return (
    <>
      <section className="hidden min-w-0 rounded-md border border-success/50 bg-card p-4 sm:p-5 lg:block">
        <div className="mb-4">
          <h2 className="text-[15px] font-semibold">Preview of job description</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">This preview updates as you fill in the form.</p>
        </div>
        {previewArticle}
      </section>
      <details className="min-w-0 rounded-md border border-border bg-card lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold">Live job preview</span>
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{form.designation || "Job designation"} · {form.companyName || "Company name"}</span>
          </span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        </summary>
        <div className="border-t border-border p-3">{previewArticle}</div>
      </details>
    </>
  );
}

export default function RecruiterJobWizard() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const datePickerRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<JobForm>(EMPTY_FORM);
  const [currentStep, setCurrentStep] = useState(1);
  const [isReview, setIsReview] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [skillOptions, setSkillOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>(["Pan India"]);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [limitationsConfirmed, setLimitationsConfirmed] = useState(false);
  const [stepError, setStepError] = useState("");

  useEffect(() => {
    let active = true;
    jobsApi.getRecruiterPostings().then((postings) => {
      if (!active) return;
      setSkillOptions([...new Set(postings.flatMap((job) => (job.requiredSkills || []).map(skillName)).filter(Boolean))].sort((a, b) => a.localeCompare(b)));
      setLocationOptions([...new Set(["Pan India", ...postings.map((job) => job.location).filter(Boolean)])]);
    }).catch(() => { if (active) setSkillOptions([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview("");
      return;
    }
    const preview = URL.createObjectURL(logoFile);
    setLogoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [logoFile]);

  useEffect(() => {
    if (!isEdit || !id) return;
    let active = true;
    jobsApi.getRecruiterJob(id).then((job) => {
      if (!active) return;
      const [legacyMin, legacyMax] = legacyExperienceRange(job.experience);
      setForm({
        companyName: job.company || "",
        employmentType: job.type === "Internship" ? "Internship" : job.type === "Contract" ? "Contract" : "Full-time",
        designation: job.title || "",
        jobType: job.type || "Job",
        locationType: job.isRemote ? "Remote" : "On-site",
        location: job.location || "",
        companyLogo: job.companyLogo || "",
        website: "",
        aboutCompany: "",
        description: job.description || "",
        skills: (job.requiredSkills || []).map(skillName).filter(Boolean).slice(0, 8),
        salaryMin: job.salary?.min?.toString() || "",
        salaryMax: job.salary?.max?.toString() || "",
        experienceMin: legacyMin,
        experienceMax: legacyMax,
        status: job.status === "Draft" ? "Draft" : job.status === "Closed" ? "Closed" : "Published",
        lastApplyDate: toDisplayDate(job.deadline),
      });
    }).catch(() => {
      toast.error("Failed to load job details");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id, isEdit]);

  const update = (key: keyof JobForm, value: string | string[]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setStepError("");
  };

  const validateStep = (step: number, publishing = false) => {
    if (step === 1) {
      if (!form.companyName.trim()) return "Company name is required";
      if (!form.employmentType) return "Select an employment type";
      if (!form.designation.trim()) return "Job designation is required";
      if (!form.jobType) return "Select a job type";
      if (!form.locationType) return "Select a job location type";
      if (!form.location.trim()) return "Job location is required";
    }
    if (step === 2) {
      if (publishing && !form.companyLogo && !logoFile) return "Upload a company logo";
      if (publishing && !form.website.trim()) return "Company website is required";
      if (publishing && form.website.trim()) {
        try {
          const website = new URL(form.website);
          if (!['http:', 'https:'].includes(website.protocol)) return "Enter a valid HTTP or HTTPS website URL";
        } catch {
          return "Enter a valid company website URL";
        }
      }
      if (publishing && !form.aboutCompany.trim()) return "About company is required";
      if (!form.description.trim()) return "Job description is required";
      if (form.skills.length > 8) return "Choose no more than 8 skills";
    }
    if (step === 3) {
      if (form.salaryMin && form.salaryMax && Number(form.salaryMax) < Number(form.salaryMin)) return "Maximum salary must be at least the minimum";
      if (form.experienceMin && form.experienceMax && Number(form.experienceMax) < Number(form.experienceMin)) return "Maximum experience must be at least the minimum";
      if ((form.experienceMin && Number(form.experienceMin) > 50) || (form.experienceMax && Number(form.experienceMax) > 50)) return "Experience must be 50 years or less";
      if (publishing && !toIsoDate(form.lastApplyDate)) return "Enter the last apply date as DD-MM-YYYY";
    }
    return "";
  };

  const validatePublish = () => {
    for (const step of [1, 2, 3]) {
      const message = validateStep(step, true);
      if (message) {
        setCurrentStep(step);
        setIsReview(false);
        setStepError(message);
        toast.error(message);
        return false;
      }
    }
    return true;
  };

  const addSkill = (candidate: string) => {
    const value = candidate.trim();
    if (!value || form.skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) return;
    if (form.skills.length >= 8) {
      toast.error("You can add up to 8 skills");
      return;
    }
    update("skills", [...form.skills, value]);
    setSkillSearch("");
  };

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast.error("Choose a PNG or JPEG image");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Company logo must be 5 MB or smaller");
      event.target.value = "";
      return;
    }
    try {
      const image = await createImageBitmap(file);
      const validDimensions = image.width <= 500 && image.height <= 500;
      image.close();
      if (!validDimensions) {
        toast.error("Company logo dimensions must be no larger than 500 × 500 pixels");
        event.target.value = "";
        return;
      }
      setLogoFile(file);
    } catch {
      toast.error("The selected file is not a valid image");
      event.target.value = "";
    }
  };

  const saveJob = async (targetStatus: JobStatus) => {
    const publish = targetStatus === "Published";
    if (publish && !validatePublish()) return;
    if (!form.companyName.trim() || !form.designation.trim() || !form.description.trim() || !form.jobType) {
      const message = "The existing job API requires company, designation, description, and job type for both drafts and published jobs";
      setStepError(message);
      toast.error(message);
      setCurrentStep(!form.companyName.trim() || !form.designation.trim() || !form.jobType ? 1 : 2);
      setIsReview(false);
      return;
    }
    if (!limitationsConfirmed) {
      setIsReview(true);
      toast.error("Review and acknowledge which fields the current backend cannot save before continuing");
      return;
    }
    if (form.skills.length > 8) {
      toast.error("Choose no more than 8 skills");
      return;
    }
    const salaryMin = form.salaryMin === "" ? undefined : Number(form.salaryMin);
    const salaryMax = form.salaryMax === "" ? undefined : Number(form.salaryMax);
    const experienceMin = form.experienceMin === "" ? undefined : Number(form.experienceMin);
    const experienceMax = form.experienceMax === "" ? undefined : Number(form.experienceMax);
    if ([salaryMin, salaryMax].some((value) => value !== undefined && (!Number.isFinite(value) || value < 0)) ||
        [experienceMin, experienceMax].some((value) => value !== undefined && (!Number.isFinite(value) || value < 0 || value > 50))) {
      toast.error("Salary and experience ranges must contain valid non-negative values");
      return;
    }
    if (salaryMin !== undefined && salaryMax !== undefined && salaryMax < salaryMin) {
      toast.error("Maximum salary must be at least the minimum");
      return;
    }
    if (experienceMin !== undefined && experienceMax !== undefined && experienceMax < experienceMin) {
      toast.error("Maximum experience must be at least the minimum");
      return;
    }

    setSubmitting(true);
    try {
      const isoDate = toIsoDate(form.lastApplyDate);
      const uploadedLogo = logoFile ? await uploadApi.uploadFile(logoFile) : null;
      const companyLogo = uploadedLogo?.filePath ?? form.companyLogo;
      const payload = {
        title: form.designation.trim(),
        company: form.companyName.trim(),
        companyLogo,
        type: form.jobType || undefined,
        location: form.location.trim(),
        isRemote: form.locationType === "Remote",
        description: form.description.trim(),
        requiredSkills: form.skills.map((skill) => ({ skillName: skill, minimumProficiency: 5 })),
        salary: salaryMin !== undefined || salaryMax !== undefined ? { min: salaryMin, max: salaryMax, currency: "INR" } : undefined,
        experience: legacyExperience(form.experienceMin),
        deadline: isoDate ? new Date(`${isoDate}T00:00:00.000Z`).toISOString() : undefined,
        status: targetStatus === "Published" ? "Open" : targetStatus,
      };

      if (isEdit && id) {
        await jobsApi.updateJob(id, payload);
      } else {
        await jobsApi.createJob(payload);
      }
      toast.success(publish ? "Job published. Company logo and supported fields were saved." : targetStatus === "Closed" ? "Job closed. Supported fields were saved." : "Draft saved. Supported fields were saved.");
      navigate("/jobs");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    const message = validateStep(currentStep, currentStep === 3 && form.status === "Published");
    if (message) {
      setStepError(message);
      toast.error(message);
      return;
    }
    setStepError("");
    if (currentStep < 3) setCurrentStep((step) => step + 1);
    else setIsReview(true);
  };

  const handleStepNav = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      setIsReview(false);
      setStepError("");
    }
  };

  const input = (key: keyof JobForm) => ({
    value: form[key] as string,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(key, event.target.value),
  });

  if (user?.role !== "Recruiter" && user?.role !== "Admin") {
    return (
      <VeritaBoxLayout>
        <PageContent>
          <div className="py-24 text-center text-sm text-muted-foreground">Access Restricted. Recruiter role required.</div>
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{isEdit ? "Edit job posting" : "Create job posting"}</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">Add role details, then review before publishing.</p>
          </div>
          <Button variant="ghost" className="gap-2 text-xs" onClick={() => navigate("/jobs")}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Jobs
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid min-w-0 items-start gap-x-5 gap-y-4 lg:grid-cols-2 xl:gap-x-6">
            <div className="relative col-span-full mb-1">
              <div className="absolute left-[16.666%] right-[16.666%] top-3 h-px bg-border">
                <div className="h-px bg-primary transition-all duration-300" style={{ width: `${(currentStep - 1) * 50}%` }} />
              </div>
              <nav aria-label="Job posting progress" className="relative grid grid-cols-3">
                {STEPS.map((step) => {
                  const active = currentStep === step.number;
                  const complete = currentStep > step.number;
                  return (
                    <button key={step.number} type="button" aria-current={active ? "step" : undefined} disabled={step.number > currentStep} onClick={() => handleStepNav(step.number)} className="flex min-w-0 flex-col items-center gap-2 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default">
                      <span className={`z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors ${complete || active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>
                        {complete ? <Check className="h-3.5 w-3.5" /> : step.number}
                      </span>
                      <span className={`text-[10px] font-medium sm:text-[11px] ${active ? "text-foreground" : "text-muted-foreground"}`}>{step.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <Surface className="min-w-0 p-4 sm:p-5 lg:p-6">
              {isReview ? (
                <div>
                  <div className="mb-6 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary"><CircleCheck className="h-5 w-5" /></div>
                    <div>
                      <h2 className="text-base font-semibold">Review your posting</h2>
                      <p className="mt-1 text-[12px] text-muted-foreground">Check these details before making the job visible.</p>
                    </div>
                  </div>
                  <label className="mb-5 flex items-start gap-2.5 rounded border border-warning/40 bg-warning/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
                    <input type="checkbox" checked={limitationsConfirmed} onChange={(event) => setLimitationsConfirmed(event.target.checked)} className="mt-0.5 accent-primary" />
                    <span>I understand that company logo and supported role fields will be saved. Company website, company overview, detailed employment type, and exact experience bounds are not stored by the current API.</span>
                  </label>
                  <div className="space-y-5">
                    <section className="border-b border-border pb-4">
                      <div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Role</p><button type="button" onClick={() => { setCurrentStep(1); setIsReview(false); }} className="text-[10px] font-medium text-primary hover:underline">Edit</button></div>
                      <p className="text-[15px] font-semibold">{form.designation || "Untitled role"}</p>
                      <p className="mt-1 text-[12px] text-muted-foreground">{form.companyName || "Company not set"} · {form.employmentType || "Employment type not set"}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{form.location || "Location not set"} · {form.locationType || "Work location not set"}</p>
                    </section>
                    <section className="border-b border-border pb-4">
                      <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Company & role information</p><button type="button" onClick={() => { setCurrentStep(2); setIsReview(false); }} className="text-[10px] font-medium text-primary hover:underline">Edit</button></div>
                      <p className="text-[12px] font-medium">Website</p>
                      <p className="break-all text-[12px] text-muted-foreground">{form.website || "Not set"}</p>
                      <p className="mt-3 text-[12px] font-medium">About company</p>
                      <p className="whitespace-pre-wrap text-[12px] text-muted-foreground">{form.aboutCompany || "Not set"}</p>
                      <p className="mt-3 text-[12px] font-medium">Job description</p>
                      <p className="whitespace-pre-wrap text-[12px] text-muted-foreground">{form.description || "Not set"}</p>
                      {form.skills.length > 0 && <p className="mt-3 text-[12px] text-muted-foreground">Skills: {form.skills.join(", ")}</p>}
                    </section>
                    <section>
                      <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Compensation & publishing</p><button type="button" onClick={() => { setCurrentStep(3); setIsReview(false); }} className="text-[10px] font-medium text-primary hover:underline">Edit</button></div>
                      <p className="text-[12px] text-muted-foreground">Annual salary: {form.salaryMin || form.salaryMax ? `INR ${form.salaryMin || " - "} - ${form.salaryMax || " - "}` : "Not specified"}</p>
                      <p className="text-[12px] text-muted-foreground">Experience: {form.experienceMin || form.experienceMax ? `${form.experienceMin || "0"} - ${form.experienceMax || "Any"} years` : "Not specified"}</p>
                      <p className="text-[12px] text-muted-foreground">Last apply date: {form.lastApplyDate || "Not set"}</p>
                      <p className="mt-1 text-[12px] text-muted-foreground">Status: {form.status}</p>
                    </section>
                  </div>
                  <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-border pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsReview(false)}>Back to details</Button>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" className="gap-2" disabled={submitting} onClick={() => saveJob(form.status)}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : form.status === "Published" ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                        {form.status === "Published" ? "Publish Job" : form.status === "Closed" ? "Save as Closed" : "Save Draft"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={(event: FormEvent) => { event.preventDefault(); handleNext(); }}>
                  <div className="mb-6 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Step {currentStep} of 3</p>
                      <h2 className="mt-1 text-base font-semibold">{STEPS[currentStep - 1].title}</h2>
                      <p className="mt-1 text-[12px] text-muted-foreground">{STEPS[currentStep - 1].caption}</p>
                    </div>
                    {currentStep === 3 && <span className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground">Annual salary · INR</span>}
                  </div>
                  {stepError && <p id="job-wizard-error" role="alert" aria-live="assertive" aria-atomic="true" className="mb-5 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">{stepError}</p>}

                  {currentStep === 1 && (
                    <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                      <div><label htmlFor="job-company-name" className={labelClass}>Company name <span className="text-destructive">*</span></label><input id="job-company-name" {...input("companyName")} aria-required="true" className={inputClass} placeholder="Company or organisation" /></div>
                      <div><label htmlFor="job-employment-type" className={labelClass}>Employment type <span className="text-destructive">*</span></label><select id="job-employment-type" {...input("employmentType")} aria-required="true" className={inputClass}><option value="">Select employment type</option>{EMPLOYMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
                      <div><label htmlFor="job-designation" className={labelClass}>Job designation <span className="text-destructive">*</span></label><input id="job-designation" {...input("designation")} aria-required="true" className={inputClass} placeholder="e.g. Senior Product Designer" /></div>
                      <div><label htmlFor="job-type" className={labelClass}>Job type <span className="text-destructive">*</span></label><select id="job-type" {...input("jobType")} aria-required="true" className={inputClass}><option value="">Select job type</option>{JOB_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
                      <div><label htmlFor="job-location-type" className={labelClass}>Job location type <span className="text-destructive">*</span></label><select id="job-location-type" {...input("locationType")} aria-required="true" className={inputClass}><option value="">Select work arrangement</option>{LOCATION_TYPES.map((type) => <option key={type}>{type}</option>)}</select><p className="mt-1 text-[10px] text-muted-foreground">The current API stores only Remote or not Remote.</p></div>
                      <div className="sm:col-span-2">
                        <p id="job-location-label" className={labelClass}>Job location <span className="text-destructive">*</span></p>
                        <div role="radiogroup" aria-labelledby="job-location-label" className="mb-2 flex gap-4 text-[11px]">
                          <label className="inline-flex items-center gap-1.5"><input type="radio" name="locationScope" checked={form.location !== "Pan India"} onChange={() => { if (form.location === "Pan India") update("location", ""); }} className="accent-success" />City</label>
                          <label className="inline-flex items-center gap-1.5"><input type="radio" name="locationScope" checked={form.location === "Pan India"} onChange={() => update("location", "Pan India")} className="accent-success" />Pan India</label>
                        </div>
                        {form.location !== "Pan India" && <div className="relative"><MapPin aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><input id="job-location" {...input("location")} aria-label="Job city or location" aria-required="true" list="job-location-suggestions" className={`${inputClass} pl-9`} placeholder="Search or enter a city" /><datalist id="job-location-suggestions">{locationOptions.filter((location) => location !== "Pan India").map((location) => <option key={location} value={location} />)}</datalist></div>}
                        <p className="mt-1 text-[10px] text-muted-foreground">City suggestions come from your existing postings; other locations can be entered.</p>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-5">
                      <div>
                        <p id="company-logo-label" className={labelClass}>Company logo <span className="text-destructive">*</span></p>
                        <div className="flex flex-wrap items-center gap-4 rounded border border-dashed border-border bg-secondary/30 p-3">
                          {(logoPreview || form.companyLogo) ? <img src={logoPreview || resolveAssetUrl(form.companyLogo)} alt="Company logo preview" className="h-16 w-16 rounded border border-border bg-background object-contain p-1" /> : <div aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded border border-border bg-background text-muted-foreground"><FileImage className="h-6 w-6" /></div>}
                          <div id="company-logo-help" className="min-w-0 flex-1"><p className="text-[12px] font-medium">PNG or JPEG · up to 500 × 500 px</p><p className="mt-1 text-[11px] text-muted-foreground">Maximum file size 5 MB.</p></div>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-border bg-background px-3 py-2 text-[11px] font-medium hover:bg-secondary focus-within:outline focus-within:outline-2 focus-within:outline-ring focus-within:outline-offset-2"><Upload aria-hidden="true" className="h-3.5 w-3.5" />{logoFile || form.companyLogo ? "Replace logo" : "Choose logo"}<input type="file" accept="image/png,image/jpeg" aria-label={logoFile || form.companyLogo ? "Replace company logo" : "Choose company logo"} aria-describedby="company-logo-help" aria-required="true" className="sr-only" onChange={handleLogoChange} /></label>
                          {(logoFile || form.companyLogo) && <Button type="button" size="sm" variant="ghost" aria-label="Remove company logo" className="h-8 text-[11px]" onClick={() => { setLogoFile(null); update("companyLogo", ""); }}>Remove</Button>}
                        </div>
                      </div>
                      <div><label htmlFor="company-website" className={labelClass}>Company website <span className="text-destructive">*</span></label><div className="relative"><ExternalLink aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><input id="company-website" {...input("website")} aria-required="true" type="url" className={`${inputClass} pl-9`} placeholder="https://company.com" /></div></div>
                      <div><label htmlFor="company-about" className={labelClass}>About company <span className="text-destructive">*</span></label><textarea id="company-about" {...input("aboutCompany")} aria-required="true" rows={4} className={`${inputClass} resize-y`} placeholder="Introduce your organisation and what makes it a great place to work." /></div>
                      <div><label htmlFor="job-description" className={labelClass}>Job description <span className="text-destructive">*</span></label><textarea id="job-description" {...input("description")} aria-required="true" rows={7} className={`${inputClass} resize-y`} placeholder="Responsibilities, qualifications, and what success looks like in this role." /></div>
                      <div>
                        <p id="job-skills-label" className={labelClass}>Skills <span className="normal-case tracking-normal">(optional)</span><span className="ml-2 normal-case tracking-normal">{form.skills.length}/8</span></p>
                        <div className="flex flex-wrap gap-1.5">{form.skills.map((skill) => <span key={skill} className="inline-flex items-center gap-1 rounded border border-border bg-secondary px-2 py-1 text-[11px]">{skill}<button type="button" aria-label={`Remove ${skill}`} onClick={() => update("skills", form.skills.filter((item) => item !== skill))} className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><X aria-hidden="true" className="h-3 w-3" /></button></span>)}</div>
                        <div className="mt-2 flex gap-2">
                          <Popover open={skillsOpen} onOpenChange={setSkillsOpen}>
                            <PopoverTrigger asChild><Button type="button" variant="outline" aria-describedby="job-skills-label" className="h-9 min-w-0 flex-1 justify-between text-[12px] font-normal text-muted-foreground"><span className="truncate">Search skills from the catalog</span><ChevronDown aria-hidden="true" className="ml-2 h-3.5 w-3.5 shrink-0" /></Button></PopoverTrigger>
                            <PopoverContent align="start" className="w-[min(420px,calc(100vw-3rem))] p-0">
                              <Command>
                                <CommandInput aria-label="Search or add a skill" value={skillSearch} onValueChange={setSkillSearch} placeholder="Search or add a skill..." />
                                <CommandList>
                                  <CommandEmpty>No skills found. Type a skill name to add it.</CommandEmpty>
                                  <CommandGroup heading="Skills used in your postings">
                                    {skillOptions
                                      .filter((skill) => !form.skills.some((selected) => selected.toLowerCase() === skill.toLowerCase()))
                                      .map((skill) => <CommandItem key={skill} value={skill} disabled={form.skills.length >= 8} onSelect={() => { addSkill(skill); setSkillsOpen(false); }}><Plus className="mr-2 h-3.5 w-3.5" />{skill}</CommandItem>)}
                                  </CommandGroup>
                                  {skillSearch.trim() && !skillOptions.some((skill) => skill.toLowerCase() === skillSearch.trim().toLowerCase()) && !form.skills.some((skill) => skill.toLowerCase() === skillSearch.trim().toLowerCase()) && (
                                    <CommandGroup heading="Add a new skill">
                                      <CommandItem value={skillSearch.trim()} disabled={form.skills.length >= 8} onSelect={() => { addSkill(skillSearch); setSkillsOpen(false); }}><Plus className="mr-2 h-3.5 w-3.5" />Add &quot;{skillSearch.trim()}&quot;</CommandItem>
                                    </CommandGroup>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <Button type="button" variant="outline" className="h-9 gap-1.5 text-[11px]" disabled={!skillSearch.trim() || form.skills.length >= 8} onClick={() => { addSkill(skillSearch); setSkillsOpen(false); }}><Plus className="h-3.5 w-3.5" />Add</Button>
                        </div>
                        {form.skills.length >= 8 && <p className="mt-1 text-[10px] text-muted-foreground">Maximum of 8 skills selected.</p>}
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <section>
                        <h3 className="mb-3 text-[12px] font-semibold">Annual salary range <span className="font-normal text-muted-foreground">(optional, INR)</span></h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div><label htmlFor="salary-min" className={labelClass}>Minimum annual salary</label><input id="salary-min" {...input("salaryMin")} type="number" min="0" step="1" className={inputClass} placeholder="e.g. 600000" /></div>
                          <div><label htmlFor="salary-max" className={labelClass}>Maximum annual salary</label><input id="salary-max" {...input("salaryMax")} type="number" min="0" step="1" className={inputClass} placeholder="e.g. 1200000" /></div>
                        </div>
                      </section>
                      <section>
                        <h3 className="mb-3 text-[12px] font-semibold">Years of experience <span className="font-normal text-muted-foreground">(optional)</span></h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div><label htmlFor="experience-min" className={labelClass}>Minimum years</label><input id="experience-min" {...input("experienceMin")} type="number" min="0" max="50" step="1" className={inputClass} placeholder="e.g. 2" /></div>
                          <div><label htmlFor="experience-max" className={labelClass}>Maximum years</label><input id="experience-max" {...input("experienceMax")} type="number" min="0" max="50" step="1" className={inputClass} placeholder="e.g. 5" /></div>
                        </div>
                      </section>
                      <section>
                        <h3 className="mb-3 text-[12px] font-semibold">Publishing</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="job-status" className={labelClass}>Status</label>
                            <select id="job-status" {...input("status")} className={inputClass}><option value="Draft">Draft</option><option value="Published">Published</option>{form.status === "Closed" && <option value="Closed">Closed</option>}</select>
                            <p className="mt-1 text-[10px] text-muted-foreground">Saving as a draft keeps this posting private.</p>
                          </div>
                          <div>
                            <label htmlFor="last-apply-date" className={labelClass}>Last apply date <span className="text-destructive">*</span></label>
                            <div className="flex gap-2">
                              <input id="last-apply-date" {...input("lastApplyDate")} aria-required="true" aria-describedby="last-apply-help" type="text" inputMode="numeric" className={inputClass} placeholder="DD-MM-YYYY" maxLength={10} />
                              <Button type="button" variant="outline" aria-label="Choose last apply date" className="h-[42px] w-[42px] shrink-0 px-0" onClick={() => { const picker = datePickerRef.current; if (!picker) return; if (typeof picker.showPicker === "function") picker.showPicker(); else picker.click(); }}><CalendarDays aria-hidden="true" className="h-4 w-4" /></Button>
                              <input ref={datePickerRef} type="date" lang="en-GB" tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute h-px w-px opacity-0" value={toIsoDate(form.lastApplyDate)} onChange={(event) => update("lastApplyDate", fromIsoDate(event.target.value))} />
                            </div>
                            <p id="last-apply-help" className="mt-1 text-[10px] text-muted-foreground">Enter or choose a date in DD-MM-YYYY format.</p>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <div>{currentStep > 1 && <Button type="button" variant="ghost" className="gap-2" onClick={() => setCurrentStep((step) => step - 1)}><ArrowLeft className="h-3.5 w-3.5" />Back</Button>}</div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="gap-2" disabled={submitting} onClick={() => saveJob("Draft")}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Draft
                      </Button>
                      <Button type="submit" disabled={submitting} className="gap-2">
                        {currentStep === 3 ? <><span>Review posting</span><ArrowRight className="h-3.5 w-3.5" /></> : <><span>Next</span><ArrowRight className="h-3.5 w-3.5" /></>}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </Surface>

            <aside className="min-w-0 lg:sticky lg:top-20">
              <JobPostingPreview form={form} logoPreview={logoPreview} />
            </aside>
          </div>
        )}
      </PageContent>
    </VeritaBoxLayout>
  );
}