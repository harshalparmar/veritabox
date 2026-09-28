import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Link } from "react-router-dom";
import { Surface, Pill, SectionTitle } from "@/components/veritabox/UI";
import {
  Building2,
  MapPin,
  Wifi,
  Briefcase,
  IndianRupee,
  CalendarClock,
  Users,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Send,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { jobsApi, resolveAssetUrl, uploadApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { endOfDay, format, isAfter, formatDistanceToNow } from "date-fns";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [job, setJob] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadedResumeUrl, setUploadedResumeUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const applyPath = `/jobs/${id}?apply=1`;

  useEffect(() => {
    loadData();
  }, [id, user]);

  useEffect(() => {
    if (loading || authLoading || !job || searchParams.get("apply") !== "1") return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("apply");
    setSearchParams(nextSearchParams, { replace: true });

    if (!user) {
      navigate("/auth");
      return;
    }
    if (user.role !== "Student" && user.role !== "Professional") {
      toast.error("Only student and professional accounts can apply");
      return;
    }
    if (job.deadline && isAfter(new Date(), endOfDay(new Date(job.deadline)))) {
      toast.error("The application deadline has passed");
      return;
    }
    if (application) {
      toast.info("You have already applied to this job");
      return;
    }
    setShowApplyForm(true);
  }, [application, authLoading, job, loading, navigate, searchParams, setSearchParams, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allJobs = await jobsApi.getJobs();
      const found = allJobs.find((j: any) => j._id === id);
      if (!found) {
        toast.error("Job not found");
        navigate("/jobs");
        return;
      }
      setJob(found);

      if (user) {
        const apps = await jobsApi.getMyApplications().catch(() => []);
        const myApp = apps.find(
          (a: any) => (a.job?._id || a.job) === id
        );
        setApplication(myApp || null);
      }
    } catch {
      toast.error("Failed to load job");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (user.role !== "Student" && user.role !== "Professional") {
      toast.error("Only student and professional accounts can apply");
      return;
    }
    if (deadlinePast) {
      toast.error("The application deadline has passed");
      return;
    }
    setApplying(true);
    try {
      let resumeUrl = uploadedResumeUrl;
      if (resumeFile && !resumeUrl) {
        const uploaded = await uploadApi.uploadFile(resumeFile);
        resumeUrl = resolveAssetUrl(uploaded.filePath);
        setUploadedResumeUrl(resumeUrl);
      }
      const app = await jobsApi.apply(id!, {
        resumeUrl: resumeUrl || undefined,
        coverLetter: coverLetter.trim() || undefined,
      });
      setApplication(app);
      setShowApplyForm(false);
      setResumeFile(null);
      setUploadedResumeUrl("");
      toast.success("Application submitted!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  const handleResumeFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const allowedTypes = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    const hasAllowedExtension = /\.(pdf|doc|docx)$/i.test(file.name);
    if (!hasAllowedExtension || !allowedTypes.has(file.type)) {
      toast.error("Choose a PDF, DOC, or DOCX resume file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume files must be 5 MB or smaller");
      return;
    }

    setResumeFile(file);
    setUploadedResumeUrl("");
  };

  if (loading) {
    return (
      <PublicShell>
        <div className="flex justify-center py-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </PublicShell>
    );
  }

  if (!job) return null;

  const typeVariant =
    job.type === "Internship"
      ? "success"
      : job.type === "Contract"
      ? "warning"
      : "primary";
  const deadlinePast = job.deadline && isAfter(new Date(), endOfDay(new Date(job.deadline)));
  const canApply = user?.role === "Student" || user?.role === "Professional";
  const isApplied = !!application;
  const appStatus = application?.status;

  const statusVariant =
    appStatus === "Accepted"
      ? "success"
      : appStatus === "Rejected"
      ? "danger"
      : appStatus === "Interviewing"
      ? "warning"
      : undefined;
  const companyLogo = job.companyLogo || job.recruiter?.companyLogo;
  const companyAbout = job.aboutCompany || job.companyDescription || job.recruiter?.aboutCompany || job.recruiter?.companyDescription;
  const companyWebsite = job.companyWebsite || job.website || job.recruiter?.companyWebsite || job.recruiter?.website;

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-10">
          <button
            onClick={() => navigate("/jobs")}
            className="mb-6 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Jobs
          </button>
          
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div role="img" aria-label={companyLogo ? `${job.company} logo` : `${job.company} logo not available`} className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-secondary text-muted-foreground">
                <Building2 aria-hidden="true" className="h-5 w-5" />
                {companyLogo && <img src={resolveAssetUrl(companyLogo)} alt="" className="absolute inset-0 h-full w-full bg-card object-contain p-1" onError={(event) => { event.currentTarget.hidden = true; }} />}
              </div>
              <span className="truncate text-[14px] font-medium">{job.company}</span>
            </div>
            <Pill variant={typeVariant}>
              {job.type === "Job" ? "Full-time" : job.type}
            </Pill>
          </div>
          <h1 className="mt-3 break-words text-[32px] font-semibold tracking-tight">{job.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground">
             {job.location && (
               <span className="flex items-center gap-1">
                 <MapPin className="h-4 w-4" />
                 {job.location}
               </span>
             )}
             {job.isRemote && !/remote/i.test(job.location || "") && <span className="flex items-center gap-1 text-success"><Wifi className="h-4 w-4" />Remote</span>}
          </div>
        </div>
      </div>
      <div className="mx-auto min-w-0 max-w-[1300px] px-6 py-8">
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Main content */}
          <div className="min-w-0 space-y-5 xl:col-span-2">
            <Surface className="p-5 sm:p-6">
              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {job.experience && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                      Experience
                    </p>
                    <p className="text-[13px] font-medium flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      {job.experience}
                    </p>
                  </div>
                )}
                {(job.salary?.min != null || job.salary?.max != null) && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                      Salary
                    </p>
                    <p className="text-[13px] font-medium flex items-center gap-1">
                      <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                      {job.salary.currency || "INR"}{" "}
                      {job.salary.min != null ? job.salary.min.toLocaleString() : " - "}
                      {job.salary.max != null ? ` - ${job.salary.max.toLocaleString()}` : "+"}
                    </p>
                  </div>
                )}
                {job.deadline && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                      Deadline
                    </p>
                    <p
                      className={`text-[13px] font-medium flex items-center gap-1 ${
                        deadlinePast ? "text-danger" : ""
                      }`}
                    >
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                      {format(new Date(job.deadline), "dd-MM-yyyy")}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    Applicants
                  </p>
                  <p className="text-[13px] font-medium flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {job.applicationCount ?? 0}
                  </p>
                </div>
              </div>
            </Surface>

            {/* Description */}
            {job.description && (
              <Surface className="p-5 sm:p-6">
                <SectionTitle>About this role</SectionTitle>
                <div className="mt-3 break-words whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
                  {job.description}
                </div>
              </Surface>
            )}

            <Surface className="p-5 sm:p-6">
              <SectionTitle>About Company</SectionTitle>
              <div className="mt-3 break-words whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
                {companyAbout || "Company information is not available for this posting."}
              </div>
              {companyWebsite && <a href={companyWebsite} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[12px] text-primary underline-offset-4 hover:underline">Company website</a>}
            </Surface>

            {/* Required Skills */}
            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <Surface className="p-5 sm:p-6">
                <SectionTitle>Required Skills</SectionTitle>
                <div className="mt-3 min-w-0 space-y-2">
                  {job.requiredSkills.map((skill: any, i: number) => (
                    <div
                      key={i}
                      className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded bg-secondary/50 px-3 py-2 text-[13px]"
                    >
                      <span className="min-w-0 break-words font-medium">
                        {skill.skillName || skill}
                      </span>
                      {skill.minimumProficiency != null && (
                        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            Min. proficiency
                          </span>
                          <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-border">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${(skill.minimumProficiency / 10) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="w-6 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                            {skill.minimumProficiency}/10
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Surface>
            )}
          </div>

          {/* Sidebar */}
          <div className="min-w-0 space-y-4">
            {/* Apply card */}
            <Surface className="p-5 sticky top-20">
              {isApplied ? (
                <div className="text-center space-y-3">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
                  <div>
                    <p className="text-[14px] font-semibold">
                      Application Submitted
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {application?.createdAt
                        ? `Applied ${formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}`
                        : "Your application is being reviewed"}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Pill variant={statusVariant}>
                      {appStatus || "Pending"}
                    </Pill>
                  </div>
                  {application?.recruiterFeedback && (
                    <div className="mt-3 pt-3 border-t border-border text-left">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                        Recruiter Feedback
                      </p>
                      <p className="text-[12px] text-foreground">
                        {application.recruiterFeedback}
                      </p>
                    </div>
                  )}
                </div>
              ) : showApplyForm ? (
                <div className="space-y-4">
                  <h3 className="text-[14px] font-semibold">
                    Submit Application
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                      Resume file <span className="normal-case tracking-normal text-muted-foreground/60">(optional)</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-border bg-secondary px-3 py-2 text-[12px] transition-colors hover:bg-secondary/70 focus-within:outline focus-within:outline-2 focus-within:outline-ring">
                        <Upload className="h-3.5 w-3.5" />
                        {resumeFile ? "Replace resume" : "Choose resume file"}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="sr-only"
                          onChange={handleResumeFileChange}
                        />
                      </label>
                      {resumeFile && (
                        <div className="flex min-w-0 items-center gap-2 rounded border border-border px-2.5 py-1.5 text-[11px]">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="max-w-[180px] truncate">{resumeFile.name}</span>
                          <button
                            type="button"
                            aria-label="Remove selected resume"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => { setResumeFile(null); setUploadedResumeUrl(""); }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">PDF, DOC, or DOCX · up to 5 MB. Choose a file from your device.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                      Cover Letter{" "}
                      <span className="normal-case tracking-normal text-muted-foreground/60">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Why are you a good fit for this role?"
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded text-[12px] focus:outline-none focus:border-primary/50 resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-2 text-[12px]"
                      onClick={handleApply}
                      disabled={applying}
                    >
                      {applying ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Submit Application
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[12px]"
                      onClick={() => setShowApplyForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-[14px] font-semibold mb-1">
                      Interested in this role?
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Submit your application with a resume link and optional
                      cover letter.
                    </p>
                  </div>
                  {deadlinePast ? (
                    <Button className="w-full text-[12px]" disabled>
                      <Clock className="h-3.5 w-3.5 mr-1.5" />
                      Expired {format(new Date(job.deadline), "dd-MM-yyyy")}
                    </Button>
                  ) : !user ? (
                    <Button className="w-full text-[12px] gap-2" onClick={() => navigate(`/auth?redirect=${encodeURIComponent(applyPath)}`)}>
                      <FileText className="h-3.5 w-3.5" />
                      Sign in or register to apply
                    </Button>
                  ) : canApply ? (
                    <Button
                      className="w-full text-[12px] gap-2"
                      onClick={() => {
                        if (!user) {
                          navigate("/auth");
                          return;
                        }
                        setShowApplyForm(true);
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Apply Now
                    </Button>
                  ) : <p className="text-center text-[11px] text-muted-foreground">Applications are available to students and professionals.</p>}
                </div>
              )}
            </Surface>

            {/* Recruiter info */}
            {job.recruiter && (
              <Surface className="p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                  Posted by
                </p>
                <p className="text-[13px] font-medium">
                  {job.recruiter.name || "Recruiter"}
                </p>
              </Surface>
            )}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

