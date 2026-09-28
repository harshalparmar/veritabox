import { useState, useEffect, useMemo, useRef } from "react";
import { AdminLayout } from "@/components/veritabox/AdminLayout";
import { PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Stat, Pill } from "@/components/veritabox/UI";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workshopsApi, chaptersApi, uploadApi, Workshop } from "@/lib/api";
import {
  BookOpen, Search, Loader2, Eye, Trash2, Plus, Check, Edit,
  Users, Calendar, Building2, AlertCircle, ShieldCheck, X, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-warning/10 text-warning border-warning/30",
  Upcoming: "bg-blue-500/10 text-blue-400 border-blue-400/30",
  Live: "bg-success/10 text-success border-success/30",
  Completed: "bg-muted/10 text-muted-foreground border-border",
  Cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  Draft: "bg-secondary/50 text-muted-foreground border-border",
};

const BLANK_FORM = {
  title: "", description: "", chapterId: "",
  date: "", duration: 60, location: "", meetingLink: "",
  capacity: 50, xpReward: 50, tags: "",
  externalMentor: { name: "", designation: "", bio: "", avatarUrl: "" },
  coverUrl: "",
  status: "",
};

interface DatePickerDropdownProps {
  value: string;
  duration: number;
  onChange: (date: string, duration: number) => void;
}

function DatePickerDropdown({ value, duration, onChange }: DatePickerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [startDate, setStartDate] = useState<Date | null>(() => {
    return value ? new Date(value) : null;
  });

  const formatTimeStr = (date: Date | null): string => {
    if (!date) return "12:00 AM";
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes.toString().padStart(2, "0");
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const [startTime, setStartTime] = useState<string>(() => formatTimeStr(value ? new Date(value) : null));

  const [currentYear, setCurrentYear] = useState(() => (startDate || new Date()).getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => (startDate || new Date()).getMonth());

  const timeOptions = useMemo(() => {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const ampm = h >= 12 ? "PM" : "AM";
        const displayHour = h % 12 === 0 ? 12 : h % 12;
        const displayMin = m.toString().padStart(2, "0");
        options.push(`${displayHour}:${displayMin} ${ampm}`);
      }
    }
    return options;
  }, []);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = useMemo(() => {
    const startYear = new Date().getFullYear() - 2;
    const endYear = startYear + 15;
    const list = [];
    for (let y = startYear; y <= endYear; y++) list.push(y);
    return list;
  }, []);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const calendarCells = useMemo(() => {
    const cells: { date: Date; isCurrentMonth: boolean; label: number }[] = [];
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const currentMonthLastDay = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      cells.push({
        date: new Date(prevYear, prevMonth, d),
        isCurrentMonth: false,
        label: d
      });
    }

    for (let d = 1; d <= currentMonthLastDay; d++) {
      cells.push({
        date: new Date(currentYear, currentMonth, d),
        isCurrentMonth: true,
        label: d
      });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      cells.push({
        date: new Date(nextYear, nextMonth, d),
        isCurrentMonth: false,
        label: d
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  const parseTimeStr = (timeStr: string) => {
    const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!match) return { hours: 0, minutes: 0 };
    let [_, hoursStr, minutesStr, ampm] = match;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
    if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
    return { hours, minutes };
  };

  const handleDayClick = (cellDate: Date) => {
    const { hours, minutes } = parseTimeStr(startTime);
    const newStart = new Date(cellDate);
    newStart.setHours(hours, minutes, 0, 0);
    setStartDate(newStart);
  };

  const handleTimeClick = (timeStr: string) => {
    setStartTime(timeStr);
    if (startDate) {
      const { hours, minutes } = parseTimeStr(timeStr);
      const newStart = new Date(startDate);
      newStart.setHours(hours, minutes, 0, 0);
      setStartDate(newStart);
    }
  };

  const handleReset = () => {
    const now = new Date();
    setStartDate(now);
    setStartTime(formatTimeStr(now));
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  const handleApply = () => {
    if (!startDate) return;
    
    const startDateTime = new Date(startDate);
    const startObj = parseTimeStr(startTime);
    startDateTime.setHours(startObj.hours, startObj.minutes, 0, 0);

    const year = startDateTime.getFullYear();
    const month = String(startDateTime.getMonth() + 1).padStart(2, '0');
    const day = String(startDateTime.getDate()).padStart(2, '0');
    const hours = String(startDateTime.getHours()).padStart(2, '0');
    const minutes = String(startDateTime.getMinutes()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}T${hours}:${minutes}`;

    onChange(dateStr, duration);
    setIsOpen(false);
  };

  const formatDateLabel = (date: Date | null): string => {
    if (!date) return "";
    return format(date, "MMM dd, yyyy");
  };

  const isSameDay = (d1: Date | null, d2: Date | null) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setStartDate(d);
      setStartTime(formatTimeStr(d));
    } else {
      setStartDate(null);
    }
  }, [value, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] text-left outline-none focus:border-primary/50 flex items-center justify-between"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ? `${format(new Date(value), "MMM dd, yyyy")} at ${startTime}` : "Select Date & Time…"}
        </span>
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 right-0 sm:left-0 bg-background border border-border rounded-md shadow-2xl p-4 w-[380px] max-w-[95vw] text-foreground flex flex-col gap-3">
          <div className="flex items-center justify-between border rounded px-3 h-8 text-[11px] font-semibold text-left border-primary bg-primary/5">
            <span>{startDate ? formatDateLabel(startDate) : "Select Date"}</span>
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          <div className="flex gap-4 border-t border-border pt-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground text-[12px] font-bold"
                >
                  &lt;
                </button>
                <div className="flex gap-1 items-center text-[12px] font-bold max-w-[80%]">
                  <select
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                    className="bg-transparent border-none outline-none font-bold text-foreground cursor-pointer text-[12px] py-0.5 max-w-[65px]"
                  >
                    {months.map((m, idx) => (
                      <option key={m} value={idx} className="bg-background text-foreground">{m.slice(0, 3)}</option>
                    ))}
                  </select>
                  <select
                    value={currentYear}
                    onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                    className="bg-transparent border-none outline-none font-bold text-foreground cursor-pointer text-[12px] py-0.5 max-w-[55px]"
                  >
                    {years.map((y) => (
                      <option key={y} value={y} className="bg-background text-foreground">{y}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground text-[12px] font-bold"
                >
                  &gt;
                </button>
              </div>

              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground mb-1">
                <div>Su</div>
                <div>Mo</div>
                <div>Tu</div>
                <div>We</div>
                <div>Th</div>
                <div>Fr</div>
                <div>Sa</div>
              </div>

              <div className="grid grid-cols-7 gap-y-0.5 text-center text-[11px]">
                {calendarCells.map((cell, idx) => {
                  const isSelected = isSameDay(cell.date, startDate);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDayClick(cell.date)}
                      className={`h-7 w-7 mx-auto rounded flex items-center justify-center transition-all ${
                        cell.isCurrentMonth ? "text-foreground" : "text-muted-foreground/30"
                      } ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-sm"
                          : "hover:bg-secondary/80"
                      }`}
                    >
                      {cell.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-[90px] border-l border-border pl-3 flex flex-col shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 text-center">
                Time
              </div>
              <div className="h-56 overflow-y-auto pr-1 space-y-0.5 scrollbar-none">
                {timeOptions.map((t) => {
                  const isTimeSelected = startTime === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTimeClick(t)}
                      className={`w-full py-1 text-[11px] font-medium rounded transition-all text-center ${
                        isTimeSelected
                          ? "bg-primary text-primary-foreground font-bold"
                          : "hover:bg-secondary/60 text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline transition-colors"
            >
              Reset
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 h-7 bg-secondary border border-border text-[11px] font-bold rounded hover:bg-border transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-3 h-7 bg-primary text-primary-foreground text-[11px] font-bold rounded hover:brightness-110 transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminWorkshops() {
  const [activeTab, setActiveTab] = useState<"Pending" | "All">("Pending");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showCreate, setShowCreate] = useState(false);
  const [hasExternal, setHasExternal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const queryClient = useQueryClient();

  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [rsvpsWorkshop, setRsvpsWorkshop] = useState<Workshop | null>(null);
  const [editForm, setEditForm] = useState(BLANK_FORM);
  const [editHasExternal, setEditHasExternal] = useState(false);

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => workshopsApi.update(id, data),
    onSuccess: () => {
      toast.success("Workshop updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-workshops-all"] });
      queryClient.invalidateQueries({ queryKey: ["admin-workshops-pending"] });
      setEditingWorkshop(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  useEffect(() => {
    if (editingWorkshop) {
      setEditForm({
        title: editingWorkshop.title || "",
        description: editingWorkshop.description || "",
        chapterId: editingWorkshop.chapter?._id || "",
        date: editingWorkshop.date ? new Date(editingWorkshop.date).toISOString().slice(0, 16) : "",
        duration: editingWorkshop.duration || 60,
        location: editingWorkshop.location || "",
        meetingLink: editingWorkshop.meetingLink || "",
        capacity: editingWorkshop.capacity || 50,
        xpReward: editingWorkshop.xpReward || 50,
        tags: editingWorkshop.tags ? editingWorkshop.tags.join(", ") : "",
        externalMentor: editingWorkshop.externalMentor ? {
          name: editingWorkshop.externalMentor.name || "",
          designation: editingWorkshop.externalMentor.designation || "",
          bio: editingWorkshop.externalMentor.bio || "",
          avatarUrl: editingWorkshop.externalMentor.avatarUrl || "",
        } : { name: "", designation: "", bio: "", avatarUrl: "" },
        coverUrl: editingWorkshop.coverUrl || "",
        status: editingWorkshop.status || "Pending",
      } as any);
      setEditHasExternal(!!editingWorkshop.externalMentor?.name);
    }
  }, [editingWorkshop]);

  const handleFileUpload = async (file: File, isEdit: boolean) => {
    try {
      const toastId = toast.loading("Uploading cover image...");
      const res = await uploadApi.uploadFile(file);
      toast.dismiss(toastId);
      toast.success("Image uploaded successfully.");
      if (isEdit) {
        setEditForm(prev => ({ ...prev, coverUrl: res.filePath }));
      } else {
        setForm(prev => ({ ...prev, coverUrl: res.filePath }));
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed.");
    }
  };

  const { data: pending, isLoading: loadingPending } = useQuery({
    queryKey: ["admin-workshops-pending"],
    queryFn: () => workshopsApi.getPending(),
    enabled: activeTab === "Pending",
  });

  const { data: allWorkshops, isLoading: loadingAll } = useQuery({
    queryKey: ["admin-workshops-all"],
    queryFn: () => workshopsApi.getAll({ all: "true" }),
    enabled: activeTab === "All",
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => workshopsApi.approve(id),
    onSuccess: () => {
      toast.success("Workshop approved and is now live.");
      queryClient.invalidateQueries({ queryKey: ["admin-workshops-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-workshops-all"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => workshopsApi.reject(id, reason),
    onSuccess: () => {
      toast.success("Workshop rejected.");
      queryClient.invalidateQueries({ queryKey: ["admin-workshops-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-workshops-all"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workshopsApi.delete(id),
    onSuccess: () => {
      toast.success("Workshop deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-workshops-all"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const { data: allChapters } = useQuery({
    queryKey: ["chapters-list"],
    queryFn: () => chaptersApi.getAll(),
    enabled: showCreate || !!editingWorkshop,
  });

  const createMutation = useMutation({
    mutationFn: () => workshopsApi.create({
      ...form,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      externalMentor: hasExternal && form.externalMentor.name ? form.externalMentor : undefined,
    } as any),
    onSuccess: () => {
      toast.success("Workshop created and published.", { description: "Admin-created workshops are approved instantly." });
      queryClient.invalidateQueries({ queryKey: ["admin-workshops-all"] });
      setForm(BLANK_FORM); setHasExternal(false); setShowCreate(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const workshops = activeTab === "All" ? allWorkshops : pending;
  const isLoading = activeTab === "Pending" ? loadingPending : loadingAll;

  const filtered = (workshops || []).filter((w) => {
    const matchSearch =
      !search ||
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.chapter?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = activeTab === "Pending" || statusFilter === "All" || w.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = pending?.length || 0;
  const upcoming = allWorkshops?.filter((w) => w.status === "Upcoming" || w.status === "Live").length || 0;
  const completed = allWorkshops?.filter((w) => w.status === "Completed").length || 0;
  const totalAttendees = allWorkshops?.reduce((acc, w) => acc + w.attendees.length, 0) || 0;

  return (
    <AdminLayout>
      <PageContent>
        <div className="mb-6 border-b border-border pb-6 flex items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin System</span>
            <h1 className="text-[28px] font-semibold tracking-tight mt-1">Workshop Registry</h1>
            <p className="text-[13px] text-muted-foreground mt-1">Review pending submissions and manage all institute workshops.</p>
          </div>
          <button
            onClick={() => setShowCreate(v => !v)}
            className={`h-9 px-4 rounded text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all border ${
              showCreate ? "bg-secondary border-border text-muted-foreground" : "bg-primary text-primary-foreground border-primary hover:brightness-110"
            }`}
          >
            {showCreate ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showCreate ? "Cancel" : "Create Workshop"}
          </button>
        </div>

        {/* ── Admin Create Form ── */}
        {showCreate && (
          <Surface className="p-5 space-y-4 mb-5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-widest">New Workshop</div>
              <span className="text-[9px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-bold">Admin · Published instantly</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Chapter picker */}
              <div className="lg:col-span-3 space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Chapter *</label>
                <div className="relative">
                  <select
                    value={form.chapterId}
                    onChange={e => setForm({...form, chapterId: e.target.value})}
                    className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50 appearance-none"
                  >
                    <option value="">Select chapter…</option>
                    {(allChapters || []).map((c: any) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Title */}
              <div className="lg:col-span-3 space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Title *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Workshop title" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
              </div>

              {/* Description */}
              <div className="lg:col-span-3 space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Description *</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} placeholder="What will attendees learn?" className="w-full bg-secondary/50 border border-border rounded px-3 py-2 text-[12px] outline-none focus:border-primary/50 resize-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Date & Time *</label>
                <DatePickerDropdown
                  value={form.date}
                  duration={form.duration}
                  onChange={(date, duration) => setForm({ ...form, date, duration })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Duration (min)</label>
                <input type="number" value={form.duration} onChange={e => setForm({...form, duration: +e.target.value})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Location *</label>
                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Room / Online" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Capacity</label>
                <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: +e.target.value})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">XP Reward / Attendee</label>
                <input type="number" min={0} max={500} value={form.xpReward} onChange={e => setForm({...form, xpReward: +e.target.value})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Meeting Link</label>
                <input value={form.meetingLink} onChange={e => setForm({...form, meetingLink: e.target.value})} placeholder="https://meet.google.com/…" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
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
                        if (file) handleFileUpload(file, false);
                      }}
                    />
                  </label>
                </div>
                {form.coverUrl && (
                  <img src={form.coverUrl} className="mt-2 h-20 w-36 object-cover border border-border rounded" alt="Cover Preview" />
                )}
              </div>
              <div className="lg:col-span-3 space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Tags (comma-separated)</label>
                <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="ROS2, Python, PCB" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
              </div>
            </div>

            {/* External speaker toggle */}
            <div className="border-t border-border pt-3 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div onClick={() => setHasExternal(v => !v)} className={`h-4 w-7 rounded-full transition-all relative shrink-0 ${hasExternal ? "bg-primary" : "bg-secondary border border-border"}`}>
                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${hasExternal ? "left-3.5" : "left-0.5"}`} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest">Add External / Guest Speaker</span>
              </label>
              {hasExternal && (
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Name *</label>
                    <input value={form.externalMentor.name} onChange={e => setForm({...form, externalMentor: {...form.externalMentor, name: e.target.value}})} placeholder="Dr. Jane Smith" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Designation</label>
                    <input value={form.externalMentor.designation} onChange={e => setForm({...form, externalMentor: {...form.externalMentor, designation: e.target.value}})} placeholder="PhD Researcher, IIT Delhi" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Bio</label>
                    <textarea value={form.externalMentor.bio} onChange={e => setForm({...form, externalMentor: {...form.externalMentor, bio: e.target.value}})} rows={2} className="w-full bg-secondary/50 border border-border rounded px-3 py-2 text-[12px] outline-none focus:border-primary/50 resize-none" />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Avatar URL</label>
                    <div className="flex gap-2">
                      {form.externalMentor.avatarUrl && <img src={form.externalMentor.avatarUrl} className="h-8 w-8 rounded-full object-cover border border-border shrink-0" alt="" onError={e => (e.currentTarget.style.display='none')} />}
                      <input value={form.externalMentor.avatarUrl} onChange={e => setForm({...form, externalMentor: {...form.externalMentor, avatarUrl: e.target.value}})} placeholder="https://…" className="flex-1 h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.title || !form.chapterId || !form.date || !form.location}
                className="h-9 px-6 bg-primary text-primary-foreground rounded text-[11px] font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Publish Workshop
              </button>
              <button onClick={() => { setForm(BLANK_FORM); setHasExternal(false); setShowCreate(false); }} className="h-9 px-4 bg-secondary border border-border rounded text-[11px] font-bold uppercase tracking-widest hover:bg-border transition-colors">
                Cancel
              </button>
            </div>
          </Surface>
        )}

        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Stat label="Awaiting Approval" value={pendingCount.toString()} accent="hsl(var(--warning))" />
            <Stat label="Upcoming / Live" value={upcoming.toString()} accent="hsl(var(--primary))" />
            <Stat label="Completed" value={completed.toString()} />
            <Stat label="Total RSVPs" value={totalAttendees.toString()} icon={Users} />
          </div>

          {/* Main Tabs */}
          <div className="flex gap-1 bg-secondary/30 p-1 rounded border border-border w-fit">
            {(["Pending", "All"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${ activeTab === tab ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
              >
                {tab === "Pending" && pendingCount > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                )}
                {tab}
                {tab === "Pending" && pendingCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 text-[8px] bg-warning/20 text-warning rounded font-bold">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Secondary filter row (only on All tab) */}
          {activeTab === "All" && (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-1 bg-secondary/20 p-1 rounded border border-border">
                {["All", "Pending", "Upcoming", "Live", "Completed", "Cancelled"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${ statusFilter === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search workshops..."
                  className="w-full h-8.5 bg-secondary/30 border border-border rounded pl-9 pr-3 text-[12px] outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activeTab === "Pending" ? (
            <PendingQueue
              workshops={filtered}
              onApprove={(id) => approveMutation.mutate(id)}
              onReject={(id) => {
                const reason = prompt("Reason for rejection:");
                if (reason) rejectMutation.mutate({ id, reason });
              }}
              isPending={approveMutation.isPending || rejectMutation.isPending}
            />
          ) : (
            <AllWorkshopsTable
              workshops={filtered}
              onEdit={(w) => setEditingWorkshop(w)}
              onViewRsvps={(w) => setRsvpsWorkshop(w)}
              onDelete={(id, title) => {
                if (confirm(`Delete "${title}"? This is permanent.`)) deleteMutation.mutate(id);
              }}
              isDeleting={deleteMutation.isPending}
            />
          )}
        </div>

        {/* RSVP Modal */}
        {rsvpsWorkshop && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-background border border-border w-full max-w-lg rounded-lg shadow-2xl p-5 text-foreground max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-3 shrink-0">
                <div>
                  <h3 className="font-bold text-[16px]">{rsvpsWorkshop.title}</h3>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {rsvpsWorkshop.chapter?.name} · {format(new Date(rsvpsWorkshop.date), "MMM d, yyyy")}
                  </div>
                </div>
                <button
                  onClick={() => setRsvpsWorkshop(null)}
                  className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Registered Attendees ({rsvpsWorkshop.attendees?.length || 0})
                </div>

                {!rsvpsWorkshop.attendees || rsvpsWorkshop.attendees.length === 0 ? (
                  <div className="py-8 text-center text-[12px] text-muted-foreground border border-dashed border-border rounded">
                    No students have RSVP'd yet.
                  </div>
                ) : (
                  rsvpsWorkshop.attendees.map((user: any) => {
                    const initials = user.name
                      ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                      : "U";
                    return (
                      <div key={user._id} className="flex items-center gap-3 p-2 bg-secondary/25 border border-border/50 rounded animate-in fade-in duration-200">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} className="h-7 w-7 rounded-full object-cover border border-border" alt="" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold truncate">{user.name || "Anonymous User"}</div>
                          <div className="text-[10px] text-muted-foreground truncate">@{user.username}</div>
                        </div>
                        {user.email && (
                          <a
                            href={`mailto:${user.email}`}
                            className="text-[10px] font-mono text-primary hover:underline truncate max-w-[150px]"
                            title={user.email}
                          >
                            {user.email}
                          </a>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-border pt-3 mt-3 flex justify-end shrink-0">
                <button
                  onClick={() => setRsvpsWorkshop(null)}
                  className="h-8 px-4 bg-secondary border border-border rounded text-[11px] font-bold uppercase tracking-widest hover:bg-border transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Workshop Modal */}
        {editingWorkshop && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-background border border-border w-full max-w-2xl rounded-lg shadow-2xl p-5 text-foreground my-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div className="text-[13px] font-bold uppercase tracking-widest text-primary">Edit Workshop Information</div>
                <button
                  onClick={() => setEditingWorkshop(null)}
                  className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Chapter picker */}
                  <div className="lg:col-span-3 space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Chapter *</label>
                    <div className="relative">
                      <select
                        value={editForm.chapterId}
                        onChange={e => setEditForm({...editForm, chapterId: e.target.value})}
                        className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50 appearance-none"
                      >
                        <option value="">Select chapter…</option>
                        {(allChapters || []).map((c: any) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Title */}
                  <div className="lg:col-span-3 space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Title *</label>
                    <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Workshop title" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                  </div>

                  {/* Description */}
                  <div className="lg:col-span-3 space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Description *</label>
                    <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={3} placeholder="What will attendees learn?" className="w-full bg-secondary/50 border border-border rounded px-3 py-2 text-[12px] outline-none focus:border-primary/50 resize-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Date & Time *</label>
                    <DatePickerDropdown
                      value={editForm.date}
                      duration={editForm.duration}
                      onChange={(date, duration) => setEditForm({ ...editForm, date, duration })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Duration (min)</label>
                    <input type="number" value={editForm.duration} onChange={e => setEditForm({...editForm, duration: +e.target.value})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Location *</label>
                    <input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="Room / Online" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Capacity</label>
                    <input type="number" value={editForm.capacity} onChange={e => setEditForm({...editForm, capacity: +e.target.value})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">XP Reward / Attendee</label>
                    <input type="number" min={0} max={500} value={editForm.xpReward} onChange={e => setEditForm({...editForm, xpReward: +e.target.value})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Meeting Link</label>
                    <input value={editForm.meetingLink} onChange={e => setEditForm({...editForm, meetingLink: e.target.value})} placeholder="https://meet.google.com/…" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Status</label>
                    <div className="relative">
                      <select
                        value={editForm.status}
                        onChange={e => setEditForm({...editForm, status: e.target.value as any})}
                        className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50 appearance-none font-bold"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Draft">Draft</option>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Live">Live</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Cover Thumbnail</label>
                    <div className="flex gap-2 items-center">
                      <input
                        value={editForm.coverUrl}
                        onChange={e => setEditForm({...editForm, coverUrl: e.target.value})}
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
                            if (file) handleFileUpload(file, true);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="lg:col-span-3">
                    {editForm.coverUrl && (
                      <img src={editForm.coverUrl} className="h-28 w-52 object-cover border border-border rounded" alt="Cover Preview" />
                    )}
                  </div>

                  <div className="lg:col-span-3 space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Tags (comma-separated)</label>
                    <input value={editForm.tags} onChange={e => setEditForm({...editForm, tags: e.target.value})} placeholder="ROS2, Python, PCB" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                  </div>
                </div>

                {/* External speaker toggle */}
                <div className="border-t border-border pt-3 space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <div onClick={() => setEditHasExternal(v => !v)} className={`h-4 w-7 rounded-full transition-all relative shrink-0 ${editHasExternal ? "bg-primary" : "bg-secondary border border-border"}`}>
                      <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${editHasExternal ? "left-3.5" : "left-0.5"}`} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest">Add External / Guest Speaker</span>
                  </label>
                  {editHasExternal && (
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Name *</label>
                        <input value={editForm.externalMentor.name} onChange={e => setEditForm({...editForm, externalMentor: {...editForm.externalMentor, name: e.target.value}})} placeholder="Dr. Jane Smith" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Designation</label>
                        <input value={editForm.externalMentor.designation} onChange={e => setEditForm({...editForm, externalMentor: {...editForm.externalMentor, designation: e.target.value}})} placeholder="PhD Researcher, IIT Delhi" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Bio</label>
                        <textarea value={editForm.externalMentor.bio} onChange={e => setEditForm({...editForm, externalMentor: {...editForm.externalMentor, bio: e.target.value}})} rows={2} className="w-full bg-secondary/50 border border-border rounded px-3 py-2 text-[12px] outline-none focus:border-primary/50 resize-none" />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Avatar URL</label>
                        <div className="flex gap-2">
                          {editForm.externalMentor.avatarUrl && <img src={editForm.externalMentor.avatarUrl} className="h-8 w-8 rounded-full object-cover border border-border shrink-0" alt="" onError={e => (e.currentTarget.style.display='none')} />}
                          <input value={editForm.externalMentor.avatarUrl} onChange={e => setEditForm({...editForm, externalMentor: {...editForm.externalMentor, avatarUrl: e.target.value}})} placeholder="https://…" className="flex-1 h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-4">
                <button
                  onClick={() => setEditingWorkshop(null)}
                  className="h-9 px-4 bg-secondary border border-border rounded text-[11px] font-bold uppercase tracking-widest hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => editMutation.mutate({
                    id: editingWorkshop._id,
                    data: {
                      ...editForm,
                      tags: editForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
                      externalMentor: editHasExternal && editForm.externalMentor.name ? editForm.externalMentor : undefined,
                    }
                  })}
                  disabled={editMutation.isPending || !editForm.title || !editForm.chapterId || !editForm.date || !editForm.location}
                  className="h-9 px-6 bg-primary text-primary-foreground rounded text-[11px] font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {editMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </PageContent>
    </AdminLayout>
  );
}

function PendingQueue({ workshops, onApprove, onReject, isPending }: {
  workshops: Workshop[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isPending: boolean;
}) {
  if (workshops.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-[12px] border border-dashed border-border rounded gap-1.5">
        <ShieldCheck className="h-5 w-5 opacity-40" />
        No workshops pending approval.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workshops.map((w) => (
        <Surface key={w._id} className="p-5 border-l-4 border-warning">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[15px] font-bold truncate">{w.title}</h3>
                <Pill className="text-[9px] bg-warning/10 text-warning border-warning/30 shrink-0">PENDING</Pill>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" /> {w.chapter?.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> {format(new Date(w.date), "MMM d, yyyy · h:mm a")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> Capacity: {w.capacity}
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" /> XP Reward: {w.xpReward} pts/attendee
                </span>
              </div>

              <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-3">{w.description}</p>

              {/* External Mentor */}
              {w.externalMentor?.name && (
                <div className="flex items-center gap-2.5 p-2.5 bg-secondary/30 rounded border border-border">
                  {w.externalMentor.avatarUrl ? (
                    <img src={w.externalMentor.avatarUrl} className="h-8 w-8 rounded-full object-cover border border-border shrink-0" alt="" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                      {w.externalMentor.name[0]}
                    </div>
                  )}
                  <div>
                    <div className="text-[12px] font-bold">{w.externalMentor.name}</div>
                    {w.externalMentor.designation && (
                      <div className="text-[10px] text-muted-foreground">{w.externalMentor.designation}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 shrink-0 md:w-40">
              <button
                onClick={() => onApprove(w._id)}
                disabled={isPending}
                className="h-9 bg-success/15 text-success border border-success/20 rounded font-bold text-[11px] uppercase tracking-widest hover:bg-success/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                onClick={() => onReject(w._id)}
                disabled={isPending}
                className="h-9 bg-destructive/10 text-destructive border border-destructive/20 rounded font-bold text-[11px] uppercase tracking-widest hover:bg-destructive/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
              <Link to={`/workshops/${w.slug}`} target="_blank">
                <button className="w-full h-9 bg-secondary border border-border rounded font-bold text-[11px] uppercase tracking-widest hover:bg-border transition-colors flex items-center justify-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>
              </Link>
            </div>
          </div>
        </Surface>
      ))}
    </div>
  );
}

function AllWorkshopsTable({ workshops, onEdit, onViewRsvps, onDelete, isDeleting }: {
  workshops: Workshop[];
  onEdit: (w: Workshop) => void;
  onViewRsvps: (w: Workshop) => void;
  onDelete: (id: string, title: string) => void;
  isDeleting: boolean;
}) {
  if (workshops.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-[12px] border border-dashed border-border rounded gap-1.5">
        <AlertCircle className="h-5 w-5 opacity-40" />
        No workshops found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="px-3.5 grid grid-cols-12 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
        <div className="col-span-3">Workshop</div>
        <div className="col-span-2">Chapter</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-1 text-center">XP</div>
        <div className="col-span-1 text-center">RSVPs</div>
        <div className="col-span-1 text-center">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {workshops.map((w) => (
        <Surface key={w._id} className="p-3.5 grid grid-cols-12 items-center hover:border-primary/20 transition-all">
          <div className="col-span-3 flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 bg-secondary border border-border rounded flex items-center justify-center shrink-0 overflow-hidden">
              {w.coverUrl ? (
                <img src={w.coverUrl} className="h-full w-full object-cover" alt="" />
              ) : (
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground/40" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-bold truncate">{w.title}</div>
              <div className="text-[10px] text-muted-foreground font-mono truncate">/workshops/{w.slug}</div>
            </div>
          </div>

          <div className="col-span-2 min-w-0">
            <div className="text-[11px] text-muted-foreground truncate">{w.chapter?.name || " - "}</div>
          </div>

          <div className="col-span-2">
            <div className="text-[11px] text-muted-foreground">{format(new Date(w.date), "MMM d, yyyy")}</div>
          </div>

          <div className="col-span-1 text-center">
            <span className="text-[11px] font-mono font-bold text-primary">{w.xpReward}</span>
          </div>

          <div className="col-span-1 text-center">
            <button
              onClick={() => onViewRsvps(w)}
              className="text-[11px] font-mono font-bold text-primary hover:underline cursor-pointer"
              title="View RSVPs"
            >
              {w.attendees?.length || 0} / {w.capacity}
            </button>
          </div>

          <div className="col-span-1 flex justify-center">
            <Pill className={`text-[8px] ${STATUS_COLORS[w.status] || "bg-muted/10 text-muted-foreground border-border"}`}>
              {w.status.toUpperCase()}
            </Pill>
          </div>

          <div className="col-span-2 flex justify-end gap-1.5">
            <Link to={`/workshops/${w.slug}`} target="_blank">
              <button className="h-7 w-7 flex items-center justify-center bg-secondary border border-border rounded hover:bg-border transition-colors" title="View page">
                <Eye className="h-3.5 w-3.5" />
              </button>
            </Link>
            <button
              onClick={() => onEdit(w)}
              className="h-7 w-7 flex items-center justify-center bg-secondary border border-border rounded hover:bg-border transition-colors text-foreground"
              title="Edit info"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(w._id, w.title)}
              disabled={isDeleting}
              className="h-7 w-7 flex items-center justify-center bg-destructive/10 border border-destructive/20 text-destructive rounded hover:bg-destructive/20 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </Surface>
      ))}
    </div>
  );
}

