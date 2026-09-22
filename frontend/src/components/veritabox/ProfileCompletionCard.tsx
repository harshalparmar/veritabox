import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const PROFILE_FIELDS = [
  { key: "bio", label: "Add a bio" },
  { key: "phone", label: "Add phone number" },
  { key: "dob", label: "Add date of birth" },
  { key: "avatarUrl", label: "Upload a profile photo" },
  { key: "socialLinks.github", label: "Link GitHub profile" },
  { key: "socialLinks.linkedin", label: "Link LinkedIn profile" },
  { key: "state", label: "Add your location" },
  { key: "permanentAddress", label: "Add your address" },
] as const;

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

export function ProfileCompletionCard() {
  const { user } = useAuth();
  if (!user) return null;

  const completed = PROFILE_FIELDS.filter(f => {
    const val = getNestedValue(user, f.key);
    return val && val !== "";
  });

  const missing = PROFILE_FIELDS.filter(f => {
    const val = getNestedValue(user, f.key);
    return !val || val === "";
  });

  const percentage = Math.round((completed.length / PROFILE_FIELDS.length) * 100);

  if (percentage === 100) return null;

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Complete Your Profile</span>
        </div>
        <span className="text-xs font-bold text-muted-foreground">{percentage}%</span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            percentage < 40 ? "bg-red-500" : percentage < 70 ? "bg-yellow-500" : "bg-green-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="space-y-1">
        {missing.slice(0, 3).map(f => (
          <Link
            key={f.key}
            to="/profile/me/edit"
            className="flex items-center justify-between py-1.5 px-2 rounded-md text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors group"
          >
            <span>{f.label}</span>
            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
        {missing.length > 3 && (
          <Link to="/profile/me/edit" className="block text-[11px] text-muted-foreground hover:text-foreground text-center pt-1">
            +{missing.length - 3} more fields
          </Link>
        )}
      </div>
    </div>
  );
}
