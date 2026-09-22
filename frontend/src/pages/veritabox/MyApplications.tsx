import { useState, useEffect } from "react";
import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import {
  Loader2,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { jobsApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

type StatusFilter = "All" | "Pending" | "Interviewing" | "Accepted" | "Rejected";

const STATUS_VARIANTS: Record<string, "warning" | "success" | "danger" | undefined> = {
  Pending: undefined,
  Interviewing: "warning",
  Accepted: "success",
  Rejected: "danger",
};

export default function MyApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("All");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await jobsApi.getMyApplications();
      setApplications(data);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const filtered =
    filter === "All"
      ? applications
      : applications.filter((a) => a.status === filter);

  const tabs: StatusFilter[] = ["All", "Pending", "Interviewing", "Accepted", "Rejected"];

  return (
    <VeritaBoxLayout>
      <PageContent>
        <button
          onClick={() => navigate("/jobs")}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Jobs
        </button>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors whitespace-nowrap shrink-0 ${ filter === tab ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
              onClick={() => setFilter(tab)}
            >
              {tab}
              {tab !== "All" && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  ({applications.filter((a) => a.status === tab).length})
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
          <Surface className="p-10 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-[13px] text-muted-foreground">
              {filter === "All"
                ? "You haven't applied to any jobs yet."
                : `No ${filter.toLowerCase()} applications.`}
            </p>
          </Surface>
        ) : (
          <div className="space-y-3">
            {filtered.map((app) => {
              const jobTitle =
                typeof app.job === "object"
                  ? app.job.title
                  : "Untitled Position";
              const jobId =
                typeof app.job === "object" ? app.job._id : app.job;
              const variant = STATUS_VARIANTS[app.status] || undefined;

              return (
                <Surface
                  key={app._id}
                  hover
                  className="p-4 cursor-pointer"
                  onClick={() => navigate(`/jobs/${jobId}`)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[13px] font-semibold truncate">
                        {jobTitle}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Applied{" "}
                        {app.createdAt
                          ? formatDistanceToNow(new Date(app.createdAt), {
                              addSuffix: true,
                            })
                          : "recently"}
                      </p>
                      {app.recruiterFeedback && (
                        <p className="text-[11px] text-foreground/70 mt-1 line-clamp-1">
                          Feedback: {app.recruiterFeedback}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Pill variant={variant}>{app.status}</Pill>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
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
