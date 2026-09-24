import { useState } from "react";
import { AdminLayout } from "@/components/veritabox/AdminLayout";
import { PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Stat, Pill } from "@/components/veritabox/UI";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsApi, uploadApi } from "@/lib/api";
import {
  Globe, Search, Loader2, Trash2, Plus, Check,
  Users, Calendar, X
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";

const BLANK_FORM = {
  title: "", description: "", category: "Summit", subCategory: "Software",
  eventDate: "", registrationDeadline: "", location: "",
  capacity: 50, coverUrl: "", status: "Upcoming", rulebookUrl: ""
};

export default function AdminEvents() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events-all"],
    queryFn: () => eventsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: () => eventsApi.create(form),
    onSuccess: () => {
      toast.success("Event created successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-events-all"] });
      setForm(BLANK_FORM); setShowCreate(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => {
      toast.success("Event deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-events-all"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleFileUpload = async (file: File) => {
    try {
      const toastId = toast.loading("Uploading cover image...");
      const res = await uploadApi.uploadFile(file);
      toast.dismiss(toastId);
      toast.success("Image uploaded successfully.");
      setForm(prev => ({ ...prev, coverUrl: res.filePath }));
    } catch (err: any) {
      toast.error(err.message || "Upload failed.");
    }
  };

  const filtered = (events || []).filter((e) => {
    return !search || e.title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AdminLayout>
      <PageContent>
        <div className="mb-6 border-b border-border pb-6 flex items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin System</span>
            <h1 className="text-[28px] font-semibold tracking-tight mt-1">Events Registry</h1>
            <p className="text-[13px] text-muted-foreground mt-1">Manage tech summits, competitions, and global events.</p>
          </div>
          <button
            onClick={() => setShowCreate(v => !v)}
            className={`h-9 px-4 rounded text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all border ${
              showCreate ? "bg-secondary border-border text-muted-foreground" : "bg-primary text-primary-foreground border-primary hover:brightness-110"
            }`}
          >
            {showCreate ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showCreate ? "Cancel" : "Create Event"}
          </button>
        </div>

        {/* ── Admin Create Form ── */}
        {showCreate && (
          <Surface className="p-5 space-y-4 mb-5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-widest">New Event</div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-3 space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Title *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Event title" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
              </div>

              <div className="lg:col-span-3 space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Description *</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full bg-secondary/50 border border-border rounded px-3 py-2 text-[12px] outline-none focus:border-primary/50 resize-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none">
                  <option>Summit</option>
                  <option>Competition</option>
                  <option>Exhibition</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none">
                  <option>Draft</option>
                  <option>Upcoming</option>
                  <option>Live</option>
                  <option>Completed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Event Date</label>
                <input type="datetime-local" value={form.eventDate} onChange={e => setForm({...form, eventDate: e.target.value})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Location</label>
                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Capacity</label>
                <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: +e.target.value})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
              </div>

              <div className="lg:col-span-3 space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Cover Thumbnail</label>
                <div className="flex gap-2 items-center">
                  <input
                    value={form.coverUrl}
                    onChange={e => setForm({...form, coverUrl: e.target.value})}
                    placeholder="https://image-url.com or upload..."
                    className="flex-1 h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50"
                  />
                  <label className="h-8 px-3 bg-secondary hover:bg-border border border-border rounded text-[11px] font-bold uppercase tracking-widest cursor-pointer flex items-center justify-center shrink-0">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.title}
                className="h-9 px-6 bg-primary text-primary-foreground rounded text-[11px] font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Publish Event
              </button>
            </div>
          </Surface>
        )}

        <div className="space-y-5">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="w-full h-8.5 bg-secondary/30 border border-border rounded pl-9 pr-3 text-[12px] outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="bg-card border border-border rounded overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/30 border-b border-border">
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Event</th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-[13px]">
                  {filtered.map(event => (
                    <tr key={event._id} className="hover:bg-secondary/10 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{event.title}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <Globe className="h-3 w-3" /> {event.category}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Pill>{event.status}</Pill>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-[12px]">
                        {event.eventDate ? format(new Date(event.eventDate), "MMM d, yyyy") : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/cmd/events/${event._id}`)}
                            className="p-1.5 bg-secondary text-foreground hover:bg-border rounded transition-colors"
                            title="Manage Registrations"
                          >
                            <Users className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Delete this event?")) deleteMutation.mutate(event._id);
                            }}
                            className="p-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                        No events found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageContent>
    </AdminLayout>
  );
}
