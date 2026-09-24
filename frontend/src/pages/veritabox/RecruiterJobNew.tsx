import { useState, useEffect } from "react";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface } from "@/components/veritabox/UI";
import { jobsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SkillRow {
  skillName: string;
  proficiency: number;
}

interface JobForm {
  title: string;
  company: string;
  type: string;
  description: string;
  location: string;
  isRemote: boolean;
  experience: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  requiredSkills: SkillRow[];
  deadline: string;
  status: string;
}

const INITIAL_FORM: JobForm = {
  title: "",
  company: "",
  type: "Job",
  description: "",
  location: "",
  isRemote: false,
  experience: "",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "INR",
  requiredSkills: [],
  deadline: "",
  status: "Open",
};

const EXPERIENCE_OPTIONS = [
  "Fresher",
  "0-1 years",
  "1-3 years",
  "3-5 years",
  "5+ years",
];

export default function RecruiterJobNew() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<JobForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && id) loadJob(id);
  }, [id]);

  const loadJob = async (jobId: string) => {
    setLoading(true);
    try {
      const job = await jobsApi.getRecruiterJob(jobId);
      setForm({
        title: job.title || "",
        company: job.company || "",
        type: job.type || "Job",
        description: job.description || "",
        location: job.location || "",
        isRemote: job.isRemote || false,
        experience: job.experience || "",
        salaryMin: job.salary?.min?.toString() || "",
        salaryMax: job.salary?.max?.toString() || "",
        salaryCurrency: job.salary?.currency || "INR",
        requiredSkills: (job.requiredSkills || []).map((s: any) =>
          typeof s === "string"
            ? { skillName: s, proficiency: 5 }
            : { skillName: s.skillName || "", proficiency: s.proficiency || 5 }
        ),
        deadline: job.deadline
          ? new Date(job.deadline).toISOString().split("T")[0]
          : "",
        status: job.status || "Open",
      });
    } catch {
      toast.error("Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addSkillRow = () => {
    setForm((prev) => ({
      ...prev,
      requiredSkills: [...prev.requiredSkills, { skillName: "", proficiency: 5 }],
    }));
  };

  const removeSkillRow = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter((_, i) => i !== idx),
    }));
  };

  const updateSkill = (idx: number, field: keyof SkillRow, value: string | number) => {
    setForm((prev) => {
      const skills = [...prev.requiredSkills];
      skills[idx] = { ...skills[idx], [field]: value };
      return { ...prev, requiredSkills: skills };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.company.trim() || !form.description.trim()) {
      toast.error("Title, Company, and Description are required");
      return;
    }

    const payload: any = {
      title: form.title,
      company: form.company,
      type: form.type,
      description: form.description,
      location: form.location,
      isRemote: form.isRemote,
      experience: form.experience,
      requiredSkills: form.requiredSkills.filter((s) => s.skillName.trim()),
      status: form.status,
    };
    if (form.salaryMin || form.salaryMax) {
      payload.salary = {
        min: form.salaryMin ? Number(form.salaryMin) : undefined,
        max: form.salaryMax ? Number(form.salaryMax) : undefined,
        currency: form.salaryCurrency,
      };
    }
    if (form.deadline) payload.deadline = form.deadline;

    setSubmitting(true);
    try {
      if (isEdit && id) {
        await jobsApi.updateJob(id, payload);
        toast.success("Job updated successfully");
      } else {
        await jobsApi.createJob(payload);
        toast.success("Job posted successfully");
      }
      navigate("/jobs");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save job");
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== "Recruiter" && user?.role !== "Admin") {
    return (
      <VeritaBoxLayout>
        <div className="text-center py-24 text-muted-foreground text-sm">
          Access Restricted. Recruiter role required.
        </div>
      </VeritaBoxLayout>
    );
  }

  const inputClass =
    "w-full bg-secondary border border-border rounded px-3 py-2 text-[13px] focus:outline-none focus:border-primary/50 transition-colors";

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            className="gap-2 text-xs"
            onClick={() => navigate("/jobs")}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Jobs
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <Surface className="p-6 max-w-3xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title & Company */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Title *
                  </label>
                  <input
                    name="title"
                    required
                    value={form.title}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="e.g. Senior React Developer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Company *
                  </label>
                  <input
                    name="company"
                    required
                    value={form.company}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="e.g. Acme Corp"
                  />
                </div>
              </div>

              {/* Type & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Type
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="Job">Full-time Job</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="Open">Open</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Description *
                </label>
                <textarea
                  name="description"
                  required
                  rows={5}
                  value={form.description}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Job description, responsibilities, requirements..."
                />
              </div>

              {/* Location & Remote */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Location
                  </label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="e.g. Bangalore, India"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Remote Work
                  </label>
                  <div className="flex items-center gap-2 h-[38px]">
                    <input
                      type="checkbox"
                      checked={form.isRemote}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, isRemote: e.target.checked }))
                      }
                      className="accent-primary"
                    />
                    <span className="text-[12px] text-muted-foreground">
                      This position allows remote work
                    </span>
                  </div>
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Experience Level
                </label>
                <select
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  {EXPERIENCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Salary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Salary Min
                  </label>
                  <input
                    name="salaryMin"
                    type="number"
                    value={form.salaryMin}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="e.g. 500000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Salary Max
                  </label>
                  <input
                    name="salaryMax"
                    type="number"
                    value={form.salaryMax}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="e.g. 1200000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Currency
                  </label>
                  <select
                    name="salaryCurrency"
                    value={form.salaryCurrency}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              {/* Required Skills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Required Skills
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-6 gap-1"
                    onClick={addSkillRow}
                  >
                    <Plus className="h-3 w-3" /> Add Skill
                  </Button>
                </div>
                {form.requiredSkills.map((skill, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      value={skill.skillName}
                      onChange={(e) =>
                        updateSkill(idx, "skillName", e.target.value)
                      }
                      className={`${inputClass} flex-1`}
                      placeholder="Skill name"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground w-4 text-right">
                        {skill.proficiency}
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={skill.proficiency}
                        onChange={(e) =>
                          updateSkill(idx, "proficiency", parseInt(e.target.value))
                        }
                        className="w-20 h-1.5 accent-primary cursor-pointer"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSkillRow(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Deadline */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Application Deadline
                </label>
                <input
                  name="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/jobs")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isEdit ? "Update Job" : "Publish Job"}
                </Button>
              </div>
            </form>
          </Surface>
        )}
      </PageContent>
    </VeritaBoxLayout>
  );
}
