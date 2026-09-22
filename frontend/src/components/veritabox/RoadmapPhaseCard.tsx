/** RoadmapPhaseCard — Phase and module display card */
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, CheckCircle2, Lock, BookOpen, Code, Cpu, Trophy } from "lucide-react";
import { useState } from "react";
import { Surface } from "./UI";
import { Progress } from "@/components/ui/progress";

const TOPIC_ICONS: Record<string, any> = {
  Theory: BookOpen,
  Quiz: Cpu,
  Practical: Code,
  Diagnostic: Cpu,
  Project: Code,
  Milestone: Trophy,
};

const STATUS_DOT: Record<string, string> = {
  Locked: "bg-muted-foreground",
  Available: "bg-blue-500",
  InProgress: "bg-primary animate-pulse",
  Completed: "bg-green-500",
};

export function RoadmapPhaseCard({
  phase,
  phaseIndex,
  onSelectTopic,
}: {
  phase: any;
  phaseIndex: number;
  onSelectTopic?: (phase: any, module: any, topic: any) => void;
}) {
  const [expanded, setExpanded] = useState(phase.status === "Active");

  const totalTopics = phase.modules?.reduce((s: number, m: any) => s + (m.topics?.length || 0), 0) || 0;
  const completedTopics = phase.modules?.reduce(
    (s: number, m: any) => s + (m.topics?.filter((t: any) => t.status === "Completed").length || 0),
    0
  ) || 0;
  const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const statusColor: Record<string, string> = {
    Locked: "text-muted-foreground",
    Active: "text-primary",
    Completed: "text-green-500",
  };

  return (
    <Surface className={cn(
      "overflow-hidden transition-colors",
      phase.status === "Active" && "border-primary/40",
      phase.status === "Completed" && "border-green-500/30"
    )}>
      {/* Phase header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold border shrink-0",
          phase.status === "Completed" ? "bg-green-500/10 border-green-500/30 text-green-500" :
          phase.status === "Active" ? "bg-primary/10 border-primary/30 text-primary" :
          "bg-secondary border-border text-muted-foreground"
        )}>
          {phase.status === "Completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : phaseIndex + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn("text-[13px] font-semibold", statusColor[phase.status] || "text-foreground")}>
              {phase.title}
            </p>
            {phase.status === "Active" && (
              <span className="text-[9px] font-medium uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-px">
                Active
              </span>
            )}
            {phase.status === "Locked" && <Lock className="h-3 w-3 text-muted-foreground" />}
          </div>
          {phase.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{phase.description}</p>
          )}
          {totalTopics > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <Progress value={progress} className="h-1 flex-1" />
              <span className="text-[10px] text-muted-foreground shrink-0">{completedTopics}/{totalTopics}</span>
            </div>
          )}
        </div>

        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded modules and topics */}
      {expanded && (
        <div className="border-t border-border">
          {phase.modules?.map((module: any, mi: number) => (
            <div key={mi} className="border-b border-border/60 last:border-b-0">
              {/* Module header */}
              <div className="px-4 py-2.5 bg-accent/20 flex items-center gap-2">
                <div className={cn("h-1.5 w-1.5 rounded-full shrink-0",
                  module.status === "Completed" ? "bg-green-500" :
                  module.status === "Active" ? "bg-primary" : "bg-muted-foreground"
                )} />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
                  {module.title}
                </p>
                {module.status === "Locked" && <Lock className="h-3 w-3 text-muted-foreground ml-auto" />}
              </div>

              {/* Topics */}
              <div className="divide-y divide-border/40">
                {module.topics?.map((topic: any, ti: number) => {
                  const TopicIcon = TOPIC_ICONS[topic.type] || BookOpen;
                  const canClick = topic.status !== "Locked" && topic.status !== "Completed";
                  return (
                    <button
                      key={ti}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        canClick ? "hover:bg-accent/30 cursor-pointer" : "cursor-default",
                        topic.status === "Completed" && "opacity-60"
                      )}
                      onClick={() => canClick && onSelectTopic?.(phase, module, topic)}
                      disabled={topic.status === "Locked"}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[topic.status] || "bg-muted-foreground")} />
                      <TopicIcon className={cn("h-3.5 w-3.5 shrink-0",
                        topic.status === "Completed" ? "text-green-500" :
                        topic.status === "InProgress" ? "text-primary" :
                        topic.status === "Locked" ? "text-muted-foreground" :
                        "text-foreground/70"
                      )} />
                      <p className={cn("text-[12px] flex-1 truncate",
                        topic.status === "Completed" ? "line-through text-muted-foreground" :
                        topic.status === "InProgress" ? "text-primary font-medium" :
                        topic.status === "Locked" ? "text-muted-foreground" :
                        "text-foreground"
                      )}>
                        {topic.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{topic.estimatedMinutes}m</span>
                      {canClick && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Milestone */}
          {phase.milestoneTitle && (
            <div className="px-4 py-2.5 flex items-center gap-2 bg-green-500/5 border-t border-green-500/20">
              <Trophy className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <p className="text-[11px] text-green-600 dark:text-green-400 font-medium">{phase.milestoneTitle}</p>
            </div>
          )}
        </div>
      )}
    </Surface>
  );
}
