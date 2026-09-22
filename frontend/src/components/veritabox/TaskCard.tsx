/** TaskCard — Rich daily checklist task card */
import { cn } from "@/lib/utils";
import { Clock, AlertCircle, CheckCircle2, BookOpen, Code, Cpu, RotateCcw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface } from "./UI";

const TASK_TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  Theory:    { icon: BookOpen, label: "Theory",     color: "text-blue-500" },
  Quiz:      { icon: Cpu,      label: "Quiz",        color: "text-primary" },
  Practical: { icon: Code,     label: "Practice",    color: "text-orange-500" },
  Diagnostic:{ icon: Cpu,      label: "Diagnostic",  color: "text-yellow-500" },
  Project:   { icon: Code,     label: "Project",     color: "text-purple-500" },
  Review:    { icon: BookOpen, label: "Review",      color: "text-muted-foreground" },
  Milestone: { icon: CheckCircle2, label: "Milestone", color: "text-green-500" },
};

const STATUS_STYLE: Record<string, string> = {
  Available:   "border-border",
  InProgress:  "border-primary/50 bg-primary/5",
  Completed:   "border-green-500/30 bg-green-500/5 opacity-70",
  Overdue:     "border-destructive/40 bg-destructive/5",
  Locked:      "border-border opacity-40",
};

export function TaskCard({
  item,
  onStart,
  onComplete,
  onNavigate,
}: {
  item: any;
  onStart?: (id: string) => void;
  onComplete?: (id: string) => void;
  onNavigate?: (item: any) => void;
}) {
  const typeConfig = TASK_TYPE_CONFIG[item.taskType] || TASK_TYPE_CONFIG.Theory;
  const TypeIcon = typeConfig.icon;
  const isCompleted = item.status === "Completed";
  const isLocked = item.status === "Locked";

  return (
    <Surface
      className={cn(
        "p-4 transition-colors",
        STATUS_STYLE[item.status] || "border-border"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className={cn("mt-0.5 shrink-0", typeConfig.color)}>
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <TypeIcon className="h-4 w-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn("text-[10px] font-medium uppercase tracking-wider", typeConfig.color)}>
                  {typeConfig.label}
                </span>
                {item.isCarriedForward && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] text-destructive bg-destructive/10 border border-destructive/20 rounded px-1 py-px">
                    <RotateCcw className="h-2.5 w-2.5" />
                    Carried over
                  </span>
                )}
                {item.priority === "High" && !item.isCarriedForward && (
                  <span className="text-[9px] text-warning bg-warning/10 border border-warning/20 rounded px-1 py-px">
                    Priority
                  </span>
                )}
              </div>
              <p className={cn(
                "text-[13px] font-medium mt-0.5 truncate",
                isCompleted && "line-through text-muted-foreground"
              )}>
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                {item.phase && <span className="truncate">{item.phase}</span>}
                {item.module && item.phase && <span>·</span>}
                {item.module && <span className="truncate">{item.module}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{item.estimatedMinutes}m</span>
            </div>
          </div>

          {/* Actions */}
          {!isCompleted && !isLocked && (
            <div className="flex items-center gap-2 mt-3">
              {onNavigate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => onNavigate(item)}
                >
                  {item.status === "InProgress" ? "Continue" : "Start"}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              )}
              {onComplete && item.taskType === "Theory" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] text-muted-foreground"
                  onClick={() => onComplete(item._id)}
                >
                  Mark Done
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Surface>
  );
}
