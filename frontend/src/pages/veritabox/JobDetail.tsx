import { useState, useEffect } from "react";
import { PublicShell } from "@/components/VeritaBox/PublicShell";
import { Link } from "react-router-dom";
import { Surface, Pill, SectionTitle } from "@/components/VeritaBox/UI";
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
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { jobsApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { format, isPast, formatDistanceToNow } from "date-fns";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [resumeUrl, setResumeUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  useEffect(() => {
    loadData();
  }, [id, user]);

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
    setApplying(true);
    try {
      const app = await jobsApi.apply(id!, {
        resumeUrl: resumeUrl.trim() || undefined,
        coverLetter: coverLetter.trim() || undefined,
      });
      setApplication(app);
      setShowApplyForm(false);
      toast.success("Application submitted!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply");
    } finally {
      setApplying(false);
    }
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
  const deadlinePast = job.deadline && isPast(new Date(job.deadline));
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

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-10">
          <button
            onClick={() => navigate("/jobs")}
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-6 flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Jobs
          </button>
          
          <div className="mt-3 flex items-center gap-2">
            <Pill variant={typeVariant}>
              {job.type === "Job" ? "Full-time" : job.type}
            </Pill>
            {job.isRemote && (
              <span className="text-[11px] font-mono text-success uppercase">
                Remote
              </span>
            )}
          </div>
          <h1 className="mt-3 text-[32px] font-semibold tracking-tight">{job.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground">
             <span className="flex items-center gap-1">
               <Building2 className="h-4 w-4" />
               {job.company}
             </span>
             {job.location && (
               <span className="flex items-center gap-1">
                 <MapPin className="h-4 w-4" />
                 {job.location}
               </span>
             )}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1300px] px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
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
                {job.salary?.min != null && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                      Salary
                    </p>
                    <p className="text-[13px] font-medium flex items-center gap-1">
                      <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                      {job.salary.currency || "INR"}{" "}
                      {job.salary.min.toLocaleString()}
                      {job.salary.max
                        ? ` - ${job.salary.max.toLocaleString()}`
                        : "+"}
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
                      {format(new Date(job.deadline), "MMM dd, yyyy")}
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
                <div className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap mt-3">
                  {job.description}
                </div>
              </Surface>
            )}

            {/* Required Skills */}
            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <Surface className="p-5 sm:p-6">
                <SectionTitle>Required Skills</SectionTitle>
                <div className="space-y-2 mt-3">
                  {job.requiredSkills.map((skill: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded text-[13px]"
                    >
                      <span className="font-medium">
                        {skill.skillName || skill}
                      </span>
                      {skill.minimumProficiency != null && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            Min. proficiency
                          </span>
                          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${(skill.minimumProficiency / 10) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono w-6 text-right">
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
          <div className="space-y-4">
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
                      Resume Link
                    </label>
                    <div className="relative">
                      <ExternalLink className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="url"
                        placeholder="https://drive.google.com/..."
                        value={resumeUrl}
                        onChange={(e) => setResumeUrl(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded text-[12px] focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Google Drive, Dropbox, or any public link
                    </p>
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
                      Deadline Passed
                    </Button>
                  ) : (
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
                  )}
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

