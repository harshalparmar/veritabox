import { useState, useEffect } from "react";
import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Stat, Pill, SectionTitle } from "@/components/VeritaBox/UI";
import { jobsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Briefcase,
  FileText,
  Users,
  Clock,
  PhoneCall,
  CheckCircle2,
  Plus,
  Search,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, jobsData] = await Promise.all([
        jobsApi.getRecruiterStats(),
        jobsApi.getRecruiterPostings(),
      ]);
      setStats(statsData);
      setJobs(jobsData);
    } catch (err: any) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
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

  return (
    <VeritaBoxLayout>
      <PageContent>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Stat
                label="Active Jobs"
                value={stats?.openJobs ?? 0}
                icon={Briefcase}
              />
              <Stat
                label="Draft Jobs"
                value={stats?.draftJobs ?? 0}
                icon={FileText}
              />
              <Stat
                label="Total Applications"
                value={stats?.totalApplications ?? 0}
                icon={Users}
              />
              <Stat
                label="Pending Review"
                value={stats?.pendingReview ?? 0}
                icon={Clock}
                accent="hsl(var(--success))"
              />
              <Stat
                label="Interviewing"
                value={stats?.interviewing ?? 0}
                icon={PhoneCall}
                accent="hsl(var(--warning))"
              />
              <Stat
                label="Accepted"
                value={stats?.accepted ?? 0}
                icon={CheckCircle2}
                accent="hsl(var(--primary))"
              />
            </div>

            {/* Quick Actions */}
            <div>
              <SectionTitle>Quick Actions</SectionTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="gap-2 text-xs"
                  onClick={() => navigate("/jobs/new")}
                >
                  <Plus className="h-3.5 w-3.5" /> Post New Job
                </Button>
                <Button
                  variant="secondary"
                  className="gap-2 text-xs"
                  onClick={() => navigate("/talent")}
                >
                  <Search className="h-3.5 w-3.5" /> Search Talent
                </Button>
                <Button
                  variant="secondary"
                  className="gap-2 text-xs"
                  onClick={() => navigate("/applications")}
                >
                  <ClipboardList className="h-3.5 w-3.5" /> Review Applications
                </Button>
              </div>
            </div>

            {/* Recent Applications */}
            {stats?.recentApplications && stats.recentApplications.length > 0 && (
              <div>
                <SectionTitle>Recent Applications</SectionTitle>
                <Surface className="divide-y divide-border">
                  {stats.recentApplications.slice(0, 5).map((app: any) => {
                    const candidateName = app.candidate?.name || "Unknown Candidate";
                    const candidateAvatar = app.candidate?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${candidateName}`;
                    const jobTitle = app.job?.title || "Untitled Position";
                    const jobId = app.job?._id || app.job;
                    const statusVariant =
                      app.status === "Accepted"
                        ? "success"
                        : app.status === "Rejected"
                        ? "danger"
                        : app.status === "Interviewing"
                        ? "warning"
                        : undefined;
                    return (
                      <div
                        key={app._id}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/40 transition-colors"
                        onClick={() => navigate(`/jobs/${jobId}`)}
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
                        <Pill variant={statusVariant}>{app.status}</Pill>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {app.createdAt
                            ? format(new Date(app.createdAt), "MMM dd, yyyy")
                            : ""}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </div>
                    );
                  })}
                </Surface>
              </div>
            )}

            {/* Open Positions */}
            <div>
              <SectionTitle
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => navigate("/jobs")}
                  >
                    View All
                  </Button>
                }
              >
                Your Open Positions
              </SectionTitle>
              {jobs.filter((j) => j.status === "Open").length === 0 ? (
                <Surface className="p-6 text-center text-muted-foreground text-[13px]">
                  No open positions yet.
                </Surface>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {jobs
                    .filter((j) => j.status === "Open")
                    .slice(0, 5)
                    .map((job) => {
                      const typeVariant =
                        job.type === "Internship"
                          ? "success"
                          : job.type === "Contract"
                          ? "warning"
                          : "primary";
                      return (
                        <Surface
                          key={job._id}
                          hover
                          className="p-4 cursor-pointer"
                          onClick={() => navigate(`/jobs/${job._id}`)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-[13px] font-semibold truncate">
                              {job.title}
                            </h3>
                            <Pill variant={typeVariant}>{job.type}</Pill>
                          </div>
                          <p className="text-[11px] text-muted-foreground mb-3">
                            {job.company}
                          </p>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-primary font-medium">
                              {job.applicationCount ?? 0} applications
                            </span>
                            <span className="text-muted-foreground">
                              {job.createdAt
                                ? format(new Date(job.createdAt), "MMM dd, yyyy")
                                : ""}
                            </span>
                          </div>
                        </Surface>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </PageContent>
    </VeritaBoxLayout>
  );
}
