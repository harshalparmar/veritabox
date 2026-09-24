import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface } from "@/components/veritabox/UI";
import { Zap, Target, Trophy, BookOpen, Users, Building2, Bell, Loader2, ArrowRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { notificationsApi as notifApi } from "@/lib/api";
import { isToday, isYesterday, format } from "date-fns";

const getIconForType = (type: string) => {
  if (type.startsWith('xp_')) return <Zap className="h-4 w-4 text-info" />;
  if (type.startsWith('bounty_')) return <Target className="h-4 w-4 text-primary" />;
  if (type.startsWith('hackathon_')) return <Trophy className="h-4 w-4 text-warning" />;
  if (type.startsWith('workshop_')) return <BookOpen className="h-4 w-4 text-secondary-foreground" />;
  if (type.startsWith('connection_')) return <Users className="h-4 w-4 text-success" />;
  if (type.startsWith('chapter_')) return <Building2 className="h-4 w-4 text-info" />;
  return <Bell className="h-4 w-4 text-muted-foreground" />;
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: notifApi.getAll,
    refetchInterval: 30000,
  });

  const markAllReadMut = useMutation({
    mutationFn: notifApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All signals marked as read");
    }
  });

  const markReadMut = useMutation({
    mutationFn: notifApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const clearReadMut = useMutation({
    mutationFn: notifApi.clearRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Read signals cleared");
    }
  });

  const handleNotificationClick = (notif: any) => {
    if (!notif.isRead) {
      markReadMut.mutate(notif._id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const notifications = data?.notifications || [];
  
  // Group by date
  const groups: Record<string, any[]> = { Today: [], Yesterday: [], Earlier: [] };
  notifications.forEach((n: any) => {
    const d = new Date(n.createdAt);
    if (isToday(d)) groups.Today.push(n);
    else if (isYesterday(d)) groups.Yesterday.push(n);
    else groups.Earlier.push(n);
  });

  return (
    <VeritaBoxLayout>
      <PageContent className="max-w-[760px] space-y-6">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Bell className="h-3 w-3" />
            Signal History
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => markAllReadMut.mutate()}
              disabled={markAllReadMut.isPending || notifications.every((n: any) => n.isRead)}
              className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-border hover:bg-secondary rounded transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Mark All Read
            </button>
            <button 
              onClick={() => clearReadMut.mutate()}
              disabled={clearReadMut.isPending || !notifications.some((n: any) => n.isRead)}
              className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 rounded transition-colors text-muted-foreground disabled:opacity-50"
            >
              Clear Read Signals
            </button>
          </div>
        </div>

        {isLoading ? (
          <Surface className="p-12 flex justify-center">
             <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
          </Surface>
        ) : notifications.length === 0 ? (
          <Surface className="p-12 text-center text-[12px] text-muted-foreground italic border border-border">
            No active signals in the registry.
          </Surface>
        ) : (
          <div className="space-y-6">
            {Object.entries(groups).map(([label, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={label} className="space-y-3">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-2">
                    {label}
                  </div>
                  <Surface className="divide-y divide-border/50">
                    {items.map(notif => (
                      <div 
                        key={notif._id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-4 flex items-start gap-4 transition-colors cursor-pointer hover:bg-secondary/20 ${!notif.isRead ? 'bg-primary/[0.02] border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
                      >
                        <div className="h-9 w-9 rounded bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                           {getIconForType(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[13px] truncate pr-4 text-foreground">{notif.title}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">{format(new Date(notif.createdAt), "HH:mm")}</span>
                          </div>
                          <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                        {notif.link && (
                          <div className="text-muted-foreground opacity-30 hover:opacity-100 self-center">
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </Surface>
                </div>
              );
            })}
          </div>
        )}
      </PageContent>
    </VeritaBoxLayout>
  );
}
