import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PublicShell } from "@/components/VeritaBox/PublicShell";
import { Surface } from "@/components/VeritaBox/UI";
import {
  Search, Clock, Users, Calendar,
  Loader2, Globe
} from "lucide-react";
import { eventsApi, resolveAssetUrl } from "@/lib/api";
import { format, isAfter } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  Upcoming: "bg-blue-500/10 text-blue-400 border-blue-400/30",
  Live: "bg-success/10 text-success border-success/30",
  Completed: "bg-muted/10 text-muted-foreground border-border",
  Cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  Draft: "bg-warning/10 text-warning border-warning/30",
};

export default function Events() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"Upcoming" | "Past" | "All">("Upcoming");

  const { data: events, isLoading } = useQuery({
    queryKey: ["events-all"],
    queryFn: () => eventsApi.getAll(),
  });

  const now = new Date();

  const filtered = (events || []).filter((e) => {
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.toLowerCase().includes(search.toLowerCase());

    const isPast = e.status === "Completed" || e.status === "Cancelled" || (e.status !== "Live" && e.eventDate && !isAfter(new Date(e.eventDate), now));
    const isUpcoming = e.status === "Upcoming" || e.status === "Live" || (e.status !== "Draft" && e.eventDate && isAfter(new Date(e.eventDate), now));

    if (activeTab === "Upcoming") return matchSearch && isUpcoming;
    if (activeTab === "Past") return matchSearch && isPast;
    return matchSearch;
  });

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-10">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Global</div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Events & Tech Summits</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground max-w-xl">
            Discover upcoming tech summits, competitions, and exhibitions. Register now to secure your pass.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            {(["All", "Upcoming", "Past"] as const).map((t) => (
              <button 
                key={t} 
                onClick={() => setActiveTab(t)}
                className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${
                  activeTab === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="w-full h-9 bg-card border border-border rounded pl-9 pr-3 text-[12px] outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            No events found.
          </div>
        )}
      </div>
    </PublicShell>
  );
}

function EventCard({ event }: { event: any }) {
  return (
    <Link to={`/events/${event.slug || event._id}`}>
      <Surface hover className="p-0 overflow-hidden h-full flex flex-col">
        <div className="h-40 w-full relative bg-secondary/30 border-b border-border overflow-hidden">
          {event.coverUrl ? (
            <img 
              src={resolveAssetUrl(event.coverUrl)} 
              alt={event.title} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-secondary/30">
              <Globe className="h-8 w-8 text-muted-foreground/20" />
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-xs ${STATUS_COLORS[event.status || 'Upcoming'] || "bg-muted/10 text-muted-foreground border-border"}`}>
              {event.status || 'Upcoming'}
            </span>
          </div>
          <span className="absolute bottom-3 right-3 text-[10px] font-bold uppercase tracking-widest text-white bg-black/60 px-2 py-1 rounded backdrop-blur-xs max-w-[150px] truncate">
            {event.category}
          </span>
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <h3 className="text-[15px] font-semibold tracking-tight">{event.title}</h3>
          
          <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed flex-1 line-clamp-3">
            {event.description || "No description provided."}
          </p>
          
          <div className="mt-4 pt-3 border-t border-border flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="h-3 w-3" />
              {event.eventDate ? format(new Date(event.eventDate), "MMM d, yyyy") : "TBA"}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Users className="h-3 w-3" />
              Capacity: {event.capacity || 50}
            </span>
          </div>
        </div>
      </Surface>
    </Link>
  );
}
