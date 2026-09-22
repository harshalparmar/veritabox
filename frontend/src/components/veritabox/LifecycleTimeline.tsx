import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { Pill } from "./UI";

interface Stage {
  id: number;
  name: string;
  description: string;
  status: 'done' | 'active' | 'upcoming';
  badge: string;
}

interface LifecycleTimelineProps {
  stages: Stage[];
}

export default function LifecycleTimeline({ stages }: LifecycleTimelineProps) {
  return (
    <div className="space-y-0">
      {stages.map((stage, idx) => (
        <div key={stage.id} className="relative flex gap-4">
          {/* Connector Line */}
          {idx !== stages.length - 1 && (
            <div className="absolute left-[15px] top-[30px] bottom-0 w-[1px] bg-border/60" />
          )}
          
          {/* Dot */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`h-8 w-8 rounded-full border flex items-center justify-center transition-colors ${
              stage.status === 'done' ? 'bg-success/20 border-success text-success' :
              stage.status === 'active' ? 'bg-primary/20 border-primary text-primary animate-pulse' :
              'bg-secondary border-border text-muted-foreground'
            }`}>
              {stage.status === 'done' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : stage.status === 'active' ? (
                <PlayCircle className="h-4 w-4" />
              ) : (
                <span className="text-[11px] font-bold">{stage.id}</span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="pb-8 pt-1 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className={`text-[13px] font-bold uppercase tracking-widest ${
                stage.status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'
              }`}>
                {stage.name}
              </h4>
              <Pill variant={
                stage.status === 'done' ? 'success' :
                stage.status === 'active' ? 'danger' : 'secondary'
              } className="text-[9px] h-4">
                {stage.badge}
              </Pill>
            </div>
            <p className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed">
              {stage.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
