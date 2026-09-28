import { useState, useEffect } from "react";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import {
  Building2,
  MapPin,
  Wifi,
  Loader2,
  Briefcase,
  IndianRupee,
  CalendarClock,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/veritabox/SearchField";
import { jobsApi, resolveAssetUrl } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { endOfDay, format, isAfter } from "date-fns";

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
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                  aria-pressed={filter === tab}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap border px-3 py-2 text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${ filter === tab ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground" }`}
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
          <SearchField
            label="job opportunities"
            placeholder="Search jobs, skills, location..."
            value={search}
            onChange={setSearch}
            className="sm:max-w-sm"
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
              {jobs.length === 0
                ? "No open opportunities right now. Check back soon!"
                : "No opportunities match these filters. Try another search or category."}
            </p>
          </Surface>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {filtered.map((job) => {
              const typeVariant =
                job.type === "Internship"
                  ? "success"
                  : job.type === "Contract"
                  ? "warning"
                  : "primary";
              const deadlineDate = job.deadline ? new Date(job.deadline) : null;
              const deadlinePast = deadlineDate
                ? isAfter(new Date(), endOfDay(deadlineDate))
                : false;

              const jobTypeLabel = job.type === "Job" ? "Full-time" : job.type;
              const jobSkills = (job.requiredSkills || []).map((skill: any) => skill.skillName || skill).filter(Boolean);
              const companyLogo = job.companyLogo || job.recruiter?.companyLogo;
              const applyPath = `/jobs/${job._id}?apply=1`;

              return (
                <Surface key={job._id} hover className="flex flex-col p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div role="img" aria-label={companyLogo ? `${job.company} logo` : `${job.company} logo not available`} title={companyLogo ? `${job.company} logo` : "Company logo not available in this posting"} className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-secondary text-muted-foreground">
                        <Building2 aria-hidden="true" className="h-5 w-5" />
                        {companyLogo && <img src={resolveAssetUrl(companyLogo)} alt="" className="absolute inset-0 h-full w-full bg-card object-contain p-1" onError={(event) => { event.currentTarget.hidden = true; }} />}
                      </div>
                      <p className="truncate text-[12px] font-medium">{job.company}</p>
                    </div>
                    <Pill variant={typeVariant}>{jobTypeLabel}</Pill>
                  </div>

                  <h3 className="mt-4 line-clamp-2 text-[17px] font-semibold leading-snug">{job.title}</h3>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.experience && <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-[10px] text-muted-foreground"><Briefcase className="h-3 w-3" />{job.experience}</span>}
                    {job.location && <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-[10px] text-muted-foreground"><MapPin className="h-3 w-3" />{job.location}</span>}
                    {job.isRemote && !/remote/i.test(job.location || "") && <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-[10px] text-success"><Wifi className="h-3 w-3" />Remote</span>}
                    {job.salary && (job.salary.min != null || job.salary.max != null) && <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-[10px] text-muted-foreground"><IndianRupee className="h-3 w-3" />{job.salary.currency || "INR"} {job.salary.min?.toLocaleString() ?? " - "}{job.salary.max != null ? ` - ${job.salary.max.toLocaleString()}` : "+"}</span>}
                  </div>

                  {job.description && <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{job.description}</p>}
                  {jobSkills.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{jobSkills.map((skill: string, index: number) => <span key={`${skill}-${index}`} className="rounded bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{skill}</span>)}</div>}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${deadlinePast ? "text-danger" : "text-success"}`}>
                      <CalendarClock className="h-3.5 w-3.5" />
                      {deadlinePast
                        ? `Expired ${format(deadlineDate!, "dd-MM-yyyy")}`
                        : `Open${deadlineDate ? ` · Apply by ${format(deadlineDate, "dd-MM-yyyy")}` : ""}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-[11px]" disabled={deadlinePast} onClick={() => navigate(user ? applyPath : `/auth?redirect=${encodeURIComponent(applyPath)}`)}>Apply</Button>
                      <Button size="sm" className="h-8 gap-1.5 text-[11px]" onClick={() => navigate(`/jobs/${job._id}`)}>View Details<ChevronRight className="h-3 w-3" /></Button>
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

