import { subDays, format, parseISO } from "date-fns";

export type BugStatus = "new" | "assigned" | "in_progress" | "testing" | "resolved" | "closed";
export type BugSeverity = "critical" | "high" | "medium" | "low";

export interface Bug {
  id: string;
  tracking_id: string;
  title: string;
  status: BugStatus;
  severity: BugSeverity;
  created_at: string;
}

const titles = [
  "Kernel panic on boot",
  "UI glitch in dashboard",
  "Database connection timeout",
  "API endpoint returning 500",
  "Memory leak in worker process",
  "Incorrect badge calculation",
  "Slow response time on search",
  "Broken link in settings",
  "Authentication failure on mobile",
  "CSS alignment issue in header",
];

const statuses: BugStatus[] = ["new", "assigned", "in_progress", "testing", "resolved", "closed"];
const severities: BugSeverity[] = ["critical", "high", "medium", "low"];

export const MOCK_BUGS: Bug[] = Array.from({ length: 50 }).map((_, i) => {
  const date = subDays(new Date(), Math.floor(Math.random() * 45));
  return {
    id: `bug-${i}`,
    tracking_id: `SHN-${1000 + i}`,
    title: titles[i % titles.length],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    severity: severities[Math.floor(Math.random() * severities.length)],
    created_at: date.toISOString(),
  };
});
