import { useState, useEffect } from "react";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/veritabox/UI";
import { usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Search, MessageSquare, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function RecruiterTalent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [talents, setTalents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [skillFilter, setSkillFilter] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    loadTalents();
  }, []);

  const loadTalents = async (skills = "") => {
    setLoading(true);
    try {
      const data = await usersApi.talentSearch(skills ? { skills } : undefined);
      setTalents(data);
      setSearched(true);
    } catch {
      toast.error("Failed to load talent pool");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadTalents(skillFilter);
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
        {/* Search bar */}
        <Surface className="p-4 flex items-center gap-3 mb-6">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Filter by skills (e.g. React, Python, Node.js)"
              className="flex-1 bg-transparent border-none outline-none text-[13px]"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
            />
            <Button type="submit" size="sm" variant="secondary" className="text-xs">
              Search
            </Button>
          </form>
        </Surface>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !searched ? null : talents.length === 0 ? (
          <Surface className="p-10 text-center">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-[13px] text-muted-foreground">
              No candidates found matching those criteria.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Try broadening your skill filters.
            </p>
          </Surface>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {talents.map((t) => {
              const userSkills: string[] = [];
              if (t.skills)
                userSkills.push(
                  ...t.skills.map((s: any) =>
                    typeof s === "string" ? s : s.skillName || ""
                  )
                );
              if (t.profileId?.currentSkills)
                userSkills.push(...t.profileId.currentSkills);
              if (t.profileId?.techStack)
                userSkills.push(...t.profileId.techStack);
              const uniqueSkills = Array.from(new Set(userSkills)).filter(Boolean);

              const rolePill =
                t.role === "Student" || t.role === "student"
                  ? "info"
                  : "primary";

              return (
                <Surface key={t._id} hover className="p-4 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={
                        t.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${t.name}`
                      }
                      alt={t.name}
                      className="h-10 w-10 rounded-full bg-secondary shrink-0"
                    />
                    <div className="min-w-0">
                      <h3
                        className="text-[13px] font-semibold truncate cursor-pointer hover:underline"
                        onClick={() =>
                          navigate(`/profile/${t.username || t._id}`)
                        }
                      >
                        {t.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Pill variant={rolePill as any}>{t.role || "User"}</Pill>
                      </div>
                    </div>
                  </div>

                  {t.careerGoal && (
                    <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">
                      {t.careerGoal}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-4">
                    {uniqueSkills.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground italic">
                        No skills listed
                      </span>
                    ) : (
                      uniqueSkills.slice(0, 6).map((s) => (
                        <span
                          key={s}
                          className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded"
                        >
                          {s}
                        </span>
                      ))
                    )}
                    {uniqueSkills.length > 6 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{uniqueSkills.length - 6}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[11px] h-7 gap-1"
                      onClick={() =>
                        navigate(`/profile/${t.username || t._id}`)
                      }
                    >
                      <ExternalLink className="h-3 w-3" /> View Profile
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-[11px] h-7 gap-1"
                      onClick={() => navigate(`/messages?user=${t._id}`)}
                    >
                      <MessageSquare className="h-3 w-3" /> Message
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
