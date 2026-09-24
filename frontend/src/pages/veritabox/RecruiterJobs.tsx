import { useState, useEffect } from "react";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/veritabox/UI";
import { jobsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Plus,
  MapPin,
  Wifi,
  Pencil,
  XCircle,
  RotateCcw,
  Users,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

type StatusFilter = "All" | "Open" | "Draft" | "Closed";

export default function RecruiterJobs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("All");

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await jobsApi.getRecruiterPostings();
      setJobs(data);
    } catch {
      toast.error("Failed to load job postings");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (job: any) => {
    const newStatus = job.status === "Open" ? "Closed" : "Open";
    try {
      await jobsApi.updateJob(job._id, { status: newStatus });
      toast.success(`Job ${newStatus === "Open" ? "reopened" : "closed"}`);
      loadJobs();
    } catch {
      toast.error("Failed to update job status");
    }
  };

  const filtered =
    filter === "All" ? jobs : jobs.filter((j) => j.status === filter);

  const tabs: StatusFilter[] = ["All", "Open", "Draft", "Closed"];

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
        <div className="flex justify-end mb-4">
          <Button
            className="gap-2 text-xs"
            onClick={() => navigate("/jobs/new")}
          >
            <Plus className="h-3.5 w-3.5" /> New Posting
          </Button>
        </div>
        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${ filter === tab ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
              onClick={() => setFilter(tab)}
            >
              {tab}
              {tab !== "All" && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  ({jobs.filter((j) => (tab === "All" ? true : j.status === tab)).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Surface className="p-8 text-center text-muted-foreground text-[13px]">
            No job postings found.
          </Surface>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((job) => {
              const typeVariant =
                job.type === "Internship"
                  ? "success"
                  : job.type === "Contract"
                  ? "warning"
                  : "primary";
              const statusVariant =
                job.status === "Open"
                  ? "success"
                  : job.status === "Draft"
                  ? "warning"
                  : "default";

              return (
                <Surface key={job._id} hover className="p-4 flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-[13px] font-semibold leading-tight truncate">
                      {job.title}
                    </h3>
                    <Pill variant={statusVariant}>{job.status}</Pill>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    {job.company}
                  </p>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px] text-muted-foreground">
                    <Pill variant={typeVariant}>{job.type}</Pill>
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {job.location}
                      </span>
                    )}
                    {job.isRemote && (
                      <span className="flex items-center gap-1 text-success">
                        <Wifi className="h-3 w-3" /> Remote
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1 mb-3 text-[11px] text-muted-foreground">
                    {job.experience && (
                      <p>Experience: {job.experience}</p>
                    )}
                    {job.salary?.min != null && (
                      <p>
                        Salary: {job.salary.currency || "INR"}{" "}
                        {job.salary.min?.toLocaleString()} -{" "}
                        {job.salary.max?.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Skills */}
                  {job.requiredSkills && job.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {job.requiredSkills.slice(0, 4).map((s: any, i: number) => (
                        <span
                          key={i}
                          className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded"
                        >
                          {typeof s === "string" ? s : s.skillName || s}
                        </span>
                      ))}
                      {job.requiredSkills.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{job.requiredSkills.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <Users className="h-3 w-3" /> {job.applicationCount ?? 0}
                      </span>
                      {(job.pendingCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-warning">
                          <Clock className="h-3 w-3" /> {job.pendingCount} pending
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {job.createdAt
                        ? format(new Date(job.createdAt), "MMM dd, yyyy")
                        : ""}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-[11px] h-7 gap-1"
                      onClick={() => navigate(`/jobs/${job._id}`)}
                    >
                      <Pencil className="h-3 w-3" /> View / Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[11px] h-7 gap-1"
                      onClick={() => handleStatusToggle(job)}
                    >
                      {job.status === "Open" ? (
                        <>
                          <XCircle className="h-3 w-3" /> Close
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-3 w-3" /> Reopen
                        </>
                      )}
                    </Button>
                  </div>
                </Surface>
              );
            })}
          </div>
        )}
      </PageContent>
    </VeritaBoxLayout>
  );
}
