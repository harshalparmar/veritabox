import { useState, useEffect } from "react";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill, SectionTitle } from "@/components/veritabox/UI";
import {
  Building2,
  MapPin,
  Wifi,
  Clock,
  Loader2,
  Search,
  Briefcase,
  IndianRupee,
  CalendarClock,
  Users,
  ChevronRight,
  FileText,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { jobsApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { format, formatDistanceToNow, isPast } from "date-fns";

type TypeFilter = "All" | "Job" | "Internship" | "Contract";

export default function Jobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TypeFilter>("All");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const jobsData = await jobsApi.getJobs().catch(() => []);
      setJobs(jobsData);

      if (user) {
        const appsData = await jobsApi.getMyApplications().catch(() => []);
        const appMap: Record<string, any> = {};
        appsData.forEach((app: any) => {
          const jobId = app.job?._id || app.job;
          appMap[jobId] = app;
        });
        setApplications(appMap);
      }
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const filtered = jobs.filter((j) => {
    if (filter !== "All" && j.type !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        j.title?.toLowerCase().includes(q) ||
        j.company?.toLowerCase().includes(q) ||
        j.location?.toLowerCase().includes(q) ||
        j.requiredSkills?.some((s: any) =>
          s.skillName?.toLowerCase().includes(q)
        )
      );
    }
    return true;
  });

  const tabs: TypeFilter[] = ["All", "Job", "Internship", "Contract"];
  const tabLabels: Record<TypeFilter, string> = {
    All: "All",
    Job: "Full-time",
    Internship: "Internship",
    Contract: "Contract",
  };

  const appliedCount = Object.keys(applications).length;

  return (
    <PublicShell>
            <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-10">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Careers</div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Jobs & Internships</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground max-w-xl">
            Browse opportunities matched to your skills.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-[1300px] px-6 py-8">
        {/* Filters row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors whitespace-nowrap shrink-0 ${ filter === tab ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
                onClick={() => setFilter(tab)}
              >
                {tabLabels[tab]}
                {tab !== "All" && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    ({jobs.filter((j) => j.type === tab).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search jobs, skills, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-secondary border border-border rounded text-[12px] w-full sm:w-56 focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {/* Summary bar */}
        <div className="flex items-center justify-between mb-4 text-[11px] text-muted-foreground">
          <span>
            {filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"} available
          </span>
          {user && appliedCount > 0 && (
            <button
              onClick={() => navigate("/jobs/applications")}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ClipboardList className="h-3 w-3" />
              {appliedCount} application{appliedCount !== 1 ? "s" : ""} submitted
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Surface className="p-10 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-[13px] text-muted-foreground">
              {search.trim()
                ? "No jobs match your search."
                : "No open opportunities right now. Check back soon!"}
            </p>
          </Surface>
        ) : (
          <div className="space-y-3">
            {filtered.map((job) => {
              const appStatus = applications[job._id]?.status;
              const isApplied = !!applications[job._id];
              const typeVariant =
                job.type === "Internship"
                  ? "success"
                  : job.type === "Contract"
                  ? "warning"
                  : "primary";
              const deadlinePast = job.deadline && isPast(new Date(job.deadline));

              return (
                <Surface
                  key={job._id}
                  hover
                  className="p-4 sm:p-5 cursor-pointer transition-colors"
                  onClick={() => navigate(`/jobs/${job._id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-start gap-2 mb-1.5">
                        <h3 className="text-[14px] font-semibold leading-tight">
                          {job.title}
                        </h3>
                        <Pill variant={typeVariant}>{job.type === "Job" ? "Full-time" : job.type}</Pill>
                      </div>

                      {/* Company & location */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-[12px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {job.company}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {job.location}
                          </span>
                        )}
                        {job.isRemote && (
                          <span className="flex items-center gap-1 text-success">
                            <Wifi className="h-3.5 w-3.5" />
                            Remote
                          </span>
                        )}
                      </div>

                      {/* Meta chips */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                        {job.experience && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {job.experience}
                          </span>
                        )}
                        {job.salary?.min != null && (
                          <span className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {job.salary.currency || "INR"}{" "}
                            {job.salary.min.toLocaleString()}
                            {job.salary.max ? ` - ${job.salary.max.toLocaleString()}` : "+"}
                          </span>
                        )}
                        {job.deadline && (
                          <span
                            className={`flex items-center gap-1 ${
                              deadlinePast ? "text-danger" : ""
                            }`}
                          >
                            <CalendarClock className="h-3 w-3" />
                            {deadlinePast
                              ? "Deadline passed"
                              : `Due ${format(new Date(job.deadline), "MMM dd, yyyy")}`}
                          </span>
                        )}
                        {(job.applicationCount ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {job.applicationCount} applied
                          </span>
                        )}
                      </div>

                      {/* Skills */}
                      {job.requiredSkills && job.requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {job.requiredSkills
                            .slice(0, 6)
                            .map((s: any, i: number) => (
                              <span
                                key={i}
                                className="text-[10px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded"
                              >
                                {s.skillName || s}
                              </span>
                            ))}
                          {job.requiredSkills.length > 6 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{job.requiredSkills.length - 6}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side — status + CTA */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-3 shrink-0">
                      {isApplied ? (
                        <Pill
                          variant={
                            appStatus === "Accepted"
                              ? "success"
                              : appStatus === "Rejected"
                              ? "danger"
                              : appStatus === "Interviewing"
                              ? "warning"
                              : undefined
                          }
                        >
                          {appStatus || "Applied"}
                        </Pill>
                      ) : (
                        <Button
                          size="sm"
                          className="text-[11px] h-7 gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/jobs/${job._id}`);
                          }}
                        >
                          View & Apply
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {job.createdAt
                          ? formatDistanceToNow(new Date(job.createdAt), {
                              addSuffix: true,
                            })
                          : ""}
                      </span>
                    </div>
                  </div>
                </Surface>
              );
            })}
          </div>
        )}
      </div>
    </PublicShell>
  );
}

