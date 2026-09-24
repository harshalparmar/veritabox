import { useState, useEffect } from "react";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/veritabox/UI";
import { jobsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

type StatusFilter = "All" | "Pending" | "Interviewing" | "Accepted" | "Rejected";

const STATUS_VARIANTS: Record<string, "warning" | "success" | "danger" | undefined> = {
  Pending: "warning",
  Interviewing: undefined,
  Accepted: "success",
  Rejected: "danger",
};

const STATUS_OPTIONS = ["Pending", "Interviewing", "Accepted", "Rejected"];

export default function RecruiterApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [jobFilter, setJobFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appsData, jobsData] = await Promise.all([
        jobsApi.getJobApplications(),
        jobsApi.getRecruiterPostings(),
      ]);
      setApplications(appsData);
      setJobs(jobsData);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      await jobsApi.updateApplicationStatus(appId, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      setApplications((prev) =>
        prev.map((a) => (a._id === appId ? { ...a, status: newStatus } : a))
      );
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleFeedbackSave = async (appId: string) => {
    const feedback = feedbackMap[appId];
    if (!feedback?.trim()) return;
    setSavingId(appId);
    try {
      await jobsApi.updateApplicationStatus(appId, {
        status:
          applications.find((a) => a._id === appId)?.status || "Pending",
        recruiterFeedback: feedback,
      });
      toast.success("Feedback saved");
      setApplications((prev) =>
        prev.map((a) =>
          a._id === appId ? { ...a, recruiterFeedback: feedback } : a
        )
      );
    } catch {
      toast.error("Failed to save feedback");
    } finally {
      setSavingId(null);
    }
  };

  const filtered = applications.filter((app) => {
    if (filter !== "All" && app.status !== filter) return false;
    const appJobId = app.job?._id || app.job;
    if (jobFilter && appJobId !== jobFilter) return false;
    return true;
  });

  const tabs: StatusFilter[] = [
    "All",
    "Pending",
    "Interviewing",
    "Accepted",
    "Rejected",
  ];

  if (user?.role !== "Recruiter" && user?.role !== "Admin") {
    return (
      <VeritaBoxLayout>
        <div className="text-center py-24 text-muted-foreground text-sm">
          Access Restricted. Recruiter role required.
        </div>
      </VeritaBoxLayout>
    );
  }

  return (
    <VeritaBoxLayout>
      <PageContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex gap-1 border-b border-border flex-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${ filter === tab ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
                onClick={() => setFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          {jobs.length > 0 && (
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="bg-secondary border border-border rounded px-3 py-1.5 text-[12px] focus:outline-none focus:border-primary/50"
            >
              <option value="">All Jobs</option>
              {jobs.map((j) => (
                <option key={j._id} value={j._id}>
                  {j.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Surface className="p-8 text-center text-muted-foreground text-[13px]">
            No applications found.
          </Surface>
        ) : (
          <Surface className="divide-y divide-border">
            {filtered.map((app) => {
              const isExpanded = expandedId === app._id;
              const candidateName =
                app.candidate?.name || "Unknown Candidate";
              const candidateAvatar =
                app.candidate?.avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${candidateName}`;
              const jobTitle =
                app.job?.title || "Untitled Position";
              const variant = STATUS_VARIANTS[app.status] || "default";

              return (
                <div key={app._id}>
                  {/* Row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/40 transition-colors"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : app._id)
                    }
                  >
                    <img
                      src={candidateAvatar}
                      alt=""
                      className="h-8 w-8 rounded-full bg-secondary shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">
                        {candidateName}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {jobTitle}
                      </p>
                    </div>
                    <Pill variant={variant}>{app.status}</Pill>
                    <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
                      {app.createdAt
                        ? format(new Date(app.createdAt), "MMM dd, yyyy")
                        : ""}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-secondary/20 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px]">
                        {/* Resume */}
                        {app.resumeUrl && (
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              Resume
                            </span>
                            <a
                              href={app.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline mt-1"
                            >
                              <ExternalLink className="h-3 w-3" /> View Resume
                            </a>
                          </div>
                        )}

                        {/* Cover letter */}
                        {app.coverLetter && (
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              Cover Letter
                            </span>
                            <p className="text-muted-foreground mt-1 line-clamp-3">
                              {app.coverLetter}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Status action */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                            Update Status
                          </span>
                          <select
                            value={app.status}
                            onChange={(e) =>
                              handleStatusChange(app._id, e.target.value)
                            }
                            className="bg-secondary border border-border rounded px-3 py-1.5 text-[12px] focus:outline-none focus:border-primary/50"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex-1 space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                            Recruiter Feedback
                          </span>
                          <div className="flex gap-2">
                            <textarea
                              rows={2}
                              value={
                                feedbackMap[app._id] ??
                                app.recruiterFeedback ??
                                ""
                              }
                              onChange={(e) =>
                                setFeedbackMap((prev) => ({
                                  ...prev,
                                  [app._id]: e.target.value,
                                }))
                              }
                              className="flex-1 bg-secondary border border-border rounded px-3 py-1.5 text-[12px] focus:outline-none focus:border-primary/50 resize-none"
                              placeholder="Add notes or feedback..."
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto text-[11px] gap-1 self-end"
                              disabled={savingId === app._id}
                              onClick={() => handleFeedbackSave(app._id)}
                            >
                              {savingId === app._id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Surface>
        )}
      </PageContent>
    </VeritaBoxLayout>
  );
}
