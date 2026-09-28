import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/veritabox/UI";
import { 
  Shield, Users, Settings, 
  ExternalLink, Loader2, Zap, 
  Target, MessageSquare,
  ArrowRight, Sparkles, Building2,
  Swords, UserCog, Palette, Trophy, BookOpen, Plus, Calendar, MapPin, X, Check,
  ChevronDown, ChevronUp, ClipboardList, CheckCircle2, Circle, Edit
} from "lucide-react";
import { Link } from "react-router-dom";
import { chaptersApi, workshopsApi, resolveAssetUrl, Workshop, uploadApi } from "@/lib/api";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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

export default function ChapterCommand() {
  const [roleModalMember, setRoleModalMember] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const { data: managedChapters, isLoading } = useQuery({
    queryKey: ["managed-chapters"],
    queryFn: () => chaptersApi.getManaged(),
  });
  
  const queryClient = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: async ({ chapterId, memberId }: { chapterId: string; memberId: string }) => {
      // TODO: Add removeMember to chaptersApi
      if ((chaptersApi as any).removeMember) {
        return (chaptersApi as any).removeMember(chapterId, memberId);
      }
      return api.delete(`/api/chapters/${chapterId}/members/${memberId}`);
    },
    onSuccess: () => {
      toast.success('Member removed from institute.');
      queryClient.invalidateQueries({ queryKey: ['managed-chapters'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <VeritaBoxLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </VeritaBoxLayout>
    );
  }

  if (!managedChapters || managedChapters.length === 0) {
    return (
      <VeritaBoxLayout>
        <div className="mx-auto max-w-md py-20 text-center space-y-6">
          <div className="h-16 w-16 bg-secondary/50 rounded flex items-center justify-center border border-border mx-auto">
            <Shield className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div className="space-y-2">
            <h2 className="text-[16px] font-bold uppercase tracking-wider">Access Denied</h2>
            <p className="text-muted-foreground text-[12.5px] leading-relaxed">Your account is not registered as an Institute Lead in the network registry.</p>
          </div>
          <Link to="/chapters/apply" className="inline-block">
            <button className="h-9 px-6 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[11px] rounded hover:brightness-110 active:scale-[0.98] transition-all">
              Apply to Start Chapter
            </button>
          </Link>
        </div>
      </VeritaBoxLayout>
    );
  }

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="mb-6 border-b border-border pb-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin Portal</span>
          <h1 className="text-[28px] font-semibold tracking-tight mt-1">Institute Command</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Operational oversight and sector management for VeritaBox Institute Leads.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {managedChapters.map(chapter => (
            <div key={chapter._id} className="lg:col-span-3 space-y-6">
              {/* Chapter Overview Card */}
              <Surface className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded bg-secondary/50 border border-border flex items-center justify-center overflow-hidden shrink-0">
                      {chapter.logoUrl ? (
                        <img src={resolveAssetUrl(chapter.logoUrl)} className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-8 w-8 text-muted-foreground/45" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Pill variant={chapter.status === "Active" ? "success" : chapter.status === "Pending" ? "warning" : "danger"} className="text-[9px] uppercase tracking-wider font-bold h-5 px-2">{chapter.status.toUpperCase()}</Pill>
                        {chapter.tier && <Pill variant="info" className="text-[9px] uppercase tracking-wider font-bold h-5 px-2">{chapter.tier.toUpperCase()} Tier</Pill>}
                      </div>
                      <h2 className="mt-1.5 text-[22px] font-semibold tracking-tight leading-tight">{chapter.name}</h2>
                      <p className="mt-1 text-[11.5px] text-muted-foreground flex items-center gap-4">
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 opacity-60" /> {chapter.members?.length || 0} Operatives</span>
                        <span className="font-mono">ID: {chapter._id?.substring(0, 8).toUpperCase()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Link to={`/chapters/${chapter.slug}/manage`}>
                      <button className="h-9 px-4 bg-foreground text-background font-bold uppercase tracking-widest text-[11px] rounded hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-1.5">
                        <Settings className="h-3.5 w-3.5" /> Manage Settings
                      </button>
                    </Link>
                    <Link to={`/chapters/${chapter.slug}`}>
                      <button className="h-9 px-4 bg-secondary border border-border text-foreground font-bold uppercase tracking-widest text-[11px] rounded hover:bg-border transition-all flex items-center gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5 opacity-70" /> Public Page
                      </button>
                    </Link>
                  </div>
                </div>
              </Surface>

              {/* Stats Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Surface className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total Reputation</span>
                  <span className="text-[20px] font-bold mt-2">{chapter.stats?.totalReputation || 0} XP</span>
                </Surface>
                <Surface className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Rep. Velocity</span>
                  <span className="text-[20px] font-bold mt-2 text-success">+{chapter.stats?.reputationVelocity || 0} XP/wk</span>
                </Surface>
                <Surface className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Active Bounties</span>
                  <span className="text-[20px] font-bold mt-2 text-warning">{chapter.stats?.activeBounties || 0}</span>
                </Surface>
                <Surface className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Global Rank</span>
                  <span className="text-[20px] font-bold mt-2 text-primary">#{chapter.stats?.rank || "--"}</span>
                </Surface>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Member Management */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[12px] font-bold uppercase tracking-widest text-foreground flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-primary" /> Sector Operatives
                      </h3>
                      <span className="text-[11px] text-muted-foreground">Total: {chapter.members?.length || 0}</span>
                    </div>
                    <Surface className="divide-y divide-border/40 overflow-hidden">
                      {chapter.members?.slice(0, 5).map((member: any) => (
                        <div key={member._id} className="p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded bg-secondary border border-border flex items-center justify-center font-semibold text-primary">
                              {member.avatarUrl ? <img src={resolveAssetUrl(member.avatarUrl)} className="h-full w-full object-cover rounded" /> : member.name.substring(0, 1)}
                            </div>
                            <div>
                              <div className="text-[13px] font-semibold">{member.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono uppercase">@{member.username}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setRoleModalMember(member);
                                setSelectedChapterId(chapter._id);
                                const existingRole = (chapter.localRoles as any[])?.find(r => (r.user?._id || r.user) === member._id)?.roleName;
                                setSelectedRole(existingRole || null);
                              }}
                              className="h-8 px-3 bg-secondary border border-border hover:bg-border text-foreground rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
                            >
                              Assign Role
                            </button>
                            <button
                              onClick={() => { if (confirm(`Remove ${member.name} from this institute?`)) removeMutation.mutate({ chapterId: chapter._id, memberId: member._id }); }}
                              className="h-8 px-3 border border-destructive/30 hover:bg-destructive/10 hover:text-destructive rounded text-[10px] font-bold uppercase tracking-widest transition-all text-destructive/70"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="p-3 bg-secondary/10 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Showing 5 of {chapter.members?.length || 0} operatives</span>
                      </div>
                    </Surface>
                  </div>

                  {/* Recruitment Queue Section */}
                  <RecruitmentQueue chapterId={chapter._id} />

                  {/* Sector Challenges (CvC) Section */}
                  <SectorChallenges chapterId={chapter._id} />

                  {/* Workshops Section */}
                  <WorkshopsSection chapterId={chapter._id} />
                </div>

                {/* Quick Actions & Local Stats */}
                <div className="space-y-6">
                  <Surface className="p-5">
                    <h3 className="text-[12px] font-bold uppercase tracking-widest mb-4 flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-primary" /> Sector Settings
                    </h3>
                    <div className="space-y-2">
                      <Link to={`/chapters/${chapter.slug}/manage`} className="block">
                        <button className="w-full h-9 bg-secondary/50 border border-border rounded text-[11px] font-bold uppercase tracking-widest flex items-center gap-2.5 px-3 hover:bg-secondary transition-colors">
                          <Palette className="h-4 w-4 text-muted-foreground" /> Customize Visuals
                        </button>
                      </Link>
                      <button className="w-full h-9 bg-secondary/50 border border-border rounded text-[11px] font-bold uppercase tracking-widest flex items-center gap-2.5 px-3 hover:bg-secondary transition-colors">
                        <UserCog className="h-4 w-4 text-muted-foreground" /> Leadership Reassignment
                      </button>
                    </div>
                  </Surface>

                  <Surface className="p-5 border-dashed flex flex-col items-center text-center justify-center min-h-[140px]">
                    <div className="opacity-55 flex flex-col items-center">
                      <Sparkles className="h-5 w-5 text-primary mb-2" />
                      <h4 className="text-[12px] font-bold uppercase tracking-wider">Recruitment Status</h4>
                      <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px] leading-normal">Auto-verification active for verified university domains.</p>
                    </div>
                  </Surface>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageContent>

      <RoleAssignmentModal 
        isOpen={!!roleModalMember} 
        onClose={() => setRoleModalMember(null)}
        member={roleModalMember}
        chapterId={selectedChapterId}
        currentRole={selectedRole}
      />
    </VeritaBoxLayout>
  );
}

function WorkshopsSection({ chapterId }: { chapterId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    duration: 60,
    location: "",
    meetingLink: "",
    capacity: 30,
    xpReward: 50,
    tags: "",
    externalMentor: {
      name: "",
      designation: "",
      bio: "",
      avatarUrl: "",
    },
    coverUrl: "",
  });
  const [hasExternalMentor, setHasExternalMentor] = useState(false);

  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [rsvpsWorkshop, setRsvpsWorkshop] = useState<Workshop | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    date: "",
    duration: 60,
    location: "",
    meetingLink: "",
    capacity: 30,
    xpReward: 50,
    tags: "",
    externalMentor: {
      name: "",
      designation: "",
      bio: "",
      avatarUrl: "",
    },
    coverUrl: "",
  });
  const [editHasExternal, setEditHasExternal] = useState(false);

  useEffect(() => {
    if (editingWorkshop) {
      setEditForm({
        title: editingWorkshop.title || "",
        description: editingWorkshop.description || "",
        date: editingWorkshop.date ? new Date(editingWorkshop.date).toISOString().slice(0, 16) : "",
        duration: editingWorkshop.duration || 60,
        location: editingWorkshop.location || "",
        meetingLink: editingWorkshop.meetingLink || "",
        capacity: editingWorkshop.capacity || 30,
        xpReward: editingWorkshop.xpReward || 50,
        tags: editingWorkshop.tags ? editingWorkshop.tags.join(", ") : "",
        externalMentor: editingWorkshop.externalMentor ? {
          name: editingWorkshop.externalMentor.name || "",
          designation: editingWorkshop.externalMentor.designation || "",
          bio: editingWorkshop.externalMentor.bio || "",
          avatarUrl: editingWorkshop.externalMentor.avatarUrl || "",
        } : { name: "", designation: "", bio: "", avatarUrl: "" },
        coverUrl: editingWorkshop.coverUrl || "",
      });
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

  const { data: workshops, isLoading } = useQuery({
    queryKey: ["chapter-workshops", chapterId],
    queryFn: () => workshopsApi.getAll({ chapter: chapterId, all: "true" }),
    enabled: !!chapterId,
  });

  const resetForm = () => {
    setForm({ title: "", description: "", date: "", duration: 60, location: "", meetingLink: "", capacity: 30, xpReward: 50, tags: "", externalMentor: { name: "", designation: "", bio: "", avatarUrl: "" }, coverUrl: "" });
    setHasExternalMentor(false);
    setShowForm(false);
  };

  const createMutation = useMutation({
    mutationFn: () => workshopsApi.create({
      ...form,
      chapterId,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      externalMentor: hasExternalMentor && form.externalMentor.name ? form.externalMentor : undefined,
    } as any),
    onSuccess: () => {
      toast.success("Workshop submitted for admin approval.");
      queryClient.invalidateQueries({ queryKey: ["chapter-workshops", chapterId] });
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; form: any }) => workshopsApi.update(data.id, data.form),
    onSuccess: () => {
      toast.success("Workshop details updated.");
      queryClient.invalidateQueries({ queryKey: ["chapter-workshops", chapterId] });
      setEditingWorkshop(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workshopsApi.delete(id),
    onSuccess: () => {
      toast.success("Workshop removed.");
      queryClient.invalidateQueries({ queryKey: ["chapter-workshops", chapterId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const em = form.externalMentor;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-bold uppercase tracking-widest text-foreground flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-primary" /> Workshops
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="h-7 px-3 bg-secondary border border-border rounded text-[10px] font-bold uppercase tracking-widest hover:bg-border transition-colors flex items-center gap-1.5"
        >
          <Plus className="h-3 w-3" /> New
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Surface className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">New Workshop</div>
            <div className="text-[9px] text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded">Requires admin approval before publishing</div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Title</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Workshop title" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What will attendees learn?" rows={3} className="w-full bg-secondary/50 border border-border rounded px-3 py-2 text-[12px] outline-none focus:border-primary/50 resize-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Date & Time</label>
              <DatePickerDropdown
                value={form.date}
                duration={form.duration}
                onChange={(date, duration) => setForm({ ...form, date, duration })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Duration (min)</label>
              <input type="number" value={form.duration} onChange={e => setForm({...form, duration: parseInt(e.target.value)})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Location</label>
              <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Room 302, Block A" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Capacity</label>
              <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Meeting Link (optional)</label>
              <input value={form.meetingLink} onChange={e => setForm({...form, meetingLink: e.target.value})} placeholder="https://meet.google.com/..." className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">XP Reward per Attendee</label>
              <input type="number" min={0} max={500} value={form.xpReward} onChange={e => setForm({...form, xpReward: parseInt(e.target.value) || 0})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="ROS2, Python, PCB" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
            </div>
            <div className="md:col-span-2 space-y-1">
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
                <img src={resolveAssetUrl(form.coverUrl)} className="mt-2 h-20 w-36 object-cover border border-border rounded" alt="Cover Preview" />
              )}
            </div>
          </div>

          {/* External Mentor Toggle */}
          <div className="border-t border-border pt-3 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div
                onClick={() => setHasExternalMentor(v => !v)}
                className={`h-4 w-7 rounded-full transition-all relative shrink-0 ${hasExternalMentor ? "bg-primary" : "bg-secondary border border-border"}`}
              >
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${hasExternalMentor ? "left-3.5" : "left-0.5"}`} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">Add External / Guest Speaker</span>
            </label>

            {hasExternalMentor && (
              <div className="grid md:grid-cols-2 gap-3 pl-0.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Speaker Name *</label>
                  <input value={em.name} onChange={e => setForm({...form, externalMentor: {...em, name: e.target.value}})} placeholder="Dr. Jane Smith" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Designation / Title</label>
                  <input value={em.designation} onChange={e => setForm({...form, externalMentor: {...em, designation: e.target.value}})} placeholder="PhD Researcher, IIT Delhi" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Bio (optional)</label>
                  <textarea value={em.bio} onChange={e => setForm({...form, externalMentor: {...em, bio: e.target.value}})} placeholder="Brief speaker profile..." rows={2} className="w-full bg-secondary/50 border border-border rounded px-3 py-2 text-[12px] outline-none focus:border-primary/50 resize-none" />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Avatar URL (or paste direct link)</label>
                  <div className="flex gap-2">
                    {em.avatarUrl && (
                      <img src={em.avatarUrl} className="h-8 w-8 rounded-full object-cover border border-border shrink-0" alt="" onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                    <input value={em.avatarUrl} onChange={e => setForm({...form, externalMentor: {...em, avatarUrl: e.target.value}})} placeholder="https://... or upload in Files section" className="flex-1 h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.title || !form.date || !form.location}
              className="h-8 px-5 bg-primary text-primary-foreground rounded text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Submit for Approval
            </button>
            <button onClick={resetForm} className="h-8 px-4 bg-secondary border border-border rounded text-[10px] font-bold uppercase tracking-widest hover:bg-border transition-colors">
              Cancel
            </button>
          </div>
        </Surface>
      )}

      {/* Workshop List */}
      {isLoading ? (
        <div className="h-20 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : workshops && workshops.length > 0 ? (
        <div className="space-y-2">
          {workshops.map((w) => (
            <WorkshopCard 
              key={w._id} 
              workshop={w} 
              onDelete={(id) => deleteMutation.mutate(id)} 
              onEdit={(workshop) => setEditingWorkshop(workshop)}
              onViewRsvps={(workshop) => setRsvpsWorkshop(workshop)}
            />
          ))}
        </div>
      ) : (
        <Surface className="p-5 text-center border-dashed">
          <BookOpen className="h-4 w-4 text-muted-foreground/30 mx-auto mb-1.5" />
          <p className="text-[11px] text-muted-foreground">No workshops scheduled. Create one to get started.</p>
        </Surface>
      )}

      {/* RSVP Modal */}
      {rsvpsWorkshop && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border border-border w-full max-w-lg rounded-lg shadow-2xl p-5 text-foreground max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3 shrink-0">
              <div>
                <h3 className="font-bold text-[16px]">{rsvpsWorkshop.title}</h3>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  {format(new Date(rsvpsWorkshop.date), "MMM d, yyyy")}
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
                        <img src={resolveAssetUrl(user.avatarUrl)} className="h-7 w-7 rounded-full object-cover border border-border" alt="" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold truncate">{user.name || "Anonymous User"}</div>
                        <div className="text-[10px] text-muted-foreground truncate font-mono">@{user.username}</div>
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
                className="h-8 px-4 bg-secondary border border-border rounded text-[10px] font-bold uppercase tracking-widest hover:bg-border transition-colors"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Title */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Title *</label>
                  <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Workshop title" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                </div>

                {/* Description */}
                <div className="md:col-span-2 space-y-1">
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
                  <input type="number" value={editForm.duration} onChange={e => setEditForm({...editForm, duration: parseInt(e.target.value)})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Location *</label>
                  <input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="Room 302, Block A" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Capacity *</label>
                  <input type="number" value={editForm.capacity} onChange={e => setEditForm({...editForm, capacity: parseInt(e.target.value)})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Meeting Link (optional)</label>
                  <input value={editForm.meetingLink} onChange={e => setEditForm({...editForm, meetingLink: e.target.value})} placeholder="https://meet.google.com/..." className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">XP Reward per Attendee</label>
                  <input type="number" min={0} max={500} value={editForm.xpReward} onChange={e => setEditForm({...editForm, xpReward: parseInt(e.target.value) || 0})} className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                </div>

                {/* Cover Image */}
                <div className="md:col-span-2 space-y-1">
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
                  {editForm.coverUrl && (
                    <img src={resolveAssetUrl(editForm.coverUrl)} className="mt-2 h-20 w-36 object-cover border border-border rounded" alt="Cover Preview" />
                  )}
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Tags (comma-separated)</label>
                  <input value={editForm.tags} onChange={e => setEditForm({...editForm, tags: e.target.value})} placeholder="ROS2, Python, PCB" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                </div>
              </div>

              {/* Guest speaker fields */}
              <div className="border-t border-border pt-3 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div onClick={() => setEditHasExternal(v => !v)} className={`h-4 w-7 rounded-full transition-all relative shrink-0 ${editHasExternal ? "bg-primary" : "bg-secondary border border-border"}`}>
                    <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${editHasExternal ? "left-3.5" : "left-0.5"}`} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest">Add External / Guest Speaker</span>
                </label>

                {editHasExternal && (
                  <div className="grid md:grid-cols-2 gap-3 pl-0.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Speaker Name *</label>
                      <input value={editForm.externalMentor.name} onChange={e => setEditForm({...editForm, externalMentor: {...editForm.externalMentor, name: e.target.value}})} placeholder="Dr. Jane Smith" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Designation / Title</label>
                      <input value={editForm.externalMentor.designation} onChange={e => setEditForm({...editForm, externalMentor: {...editForm.externalMentor, designation: e.target.value}})} placeholder="PhD Researcher, IIT Delhi" className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Bio (optional)</label>
                      <textarea value={editForm.externalMentor.bio} onChange={e => setEditForm({...editForm, externalMentor: {...editForm.externalMentor, bio: e.target.value}})} placeholder="Brief speaker profile..." rows={2} className="w-full bg-secondary/50 border border-border rounded px-3 py-2 text-[12px] outline-none focus:border-primary/50 resize-none" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Avatar URL</label>
                      <input value={editForm.externalMentor.avatarUrl} onChange={e => setEditForm({...editForm, externalMentor: {...editForm.externalMentor, avatarUrl: e.target.value}})} placeholder="https://..." className="w-full h-8 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-3 mt-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  updateMutation.mutate({
                    id: editingWorkshop._id,
                    form: {
                      ...editForm,
                      tags: editForm.tags.split(",").map(t => t.trim()).filter(Boolean),
                      externalMentor: editHasExternal && editForm.externalMentor.name ? editForm.externalMentor : null,
                    }
                  });
                }}
                disabled={updateMutation.isPending || !editForm.title || !editForm.date || !editForm.location}
                className="h-8 px-5 bg-primary text-primary-foreground rounded text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save Changes
              </button>
              <button
                onClick={() => setEditingWorkshop(null)}
                className="h-8 px-4 bg-secondary border border-border rounded text-[10px] font-bold uppercase tracking-widest hover:bg-border transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkshopCard({ 
  workshop: w, 
  onDelete,
  onEdit,
  onViewRsvps
}: { 
  workshop: any; 
  onDelete: (id: string) => void;
  onEdit: (w: any) => void;
  onViewRsvps: (w: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canMarkAttendance = ['Upcoming', 'Live', 'Completed'].includes(w.status);
  const isCompleted = w.status === 'Completed';

  return (
    <Surface className={`overflow-hidden transition-all ${
      w.status === 'Pending' ? 'border-l-2 border-warning' : 
      isCompleted ? 'border-l-2 border-success/50' : ''
    }`}>
      {/* Card Header Row */}
      <div className="p-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <BookOpen className="h-4 w-4 text-muted-foreground/50 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[12.5px] font-bold truncate">{w.title}</div>
              {w.status === 'Pending' && (
                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-warning/10 text-warning border border-warning/20 rounded shrink-0">Pending</span>
              )}
              {isCompleted && (
                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-success/10 text-success border border-success/20 rounded shrink-0">Completed</span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 shrink-0"><Calendar className="h-2.5 w-2.5" />{new Date(w.date).toLocaleDateString()}</span>
              <span className="shrink-0">·</span>
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewRsvps(w); }}
                className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer text-left text-[10px] text-muted-foreground shrink-0"
              >
                <Users className="h-2.5 w-2.5" />
                <span className="underline decoration-dotted">{(w.attendees || []).length}/{w.capacity} RSVPs</span>
              </button>
              <span className="shrink-0">·</span>
              <span className="text-primary font-bold shrink-0">+{w.xpReward || 50} XP</span>
              {isCompleted && w.checkedInAttendees?.length > 0 && (
                <><span className="shrink-0">·</span><span className="text-success font-bold shrink-0">{w.checkedInAttendees.length} checked in</span></>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canMarkAttendance && (
            <button
              onClick={() => setExpanded(v => !v)}
              className={`h-7 px-2.5 flex items-center gap-1 rounded text-[10px] font-bold uppercase tracking-widest transition-colors border ${
                expanded
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-secondary border-border hover:bg-border text-foreground'
              }`}
            >
              <ClipboardList className="h-3 w-3" />
              Attendance
              {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            </button>
          )}
          <button
            onClick={() => onEdit(w)}
            className="h-7 px-2.5 flex items-center gap-1 bg-secondary border border-border rounded hover:bg-border text-foreground text-[10px] font-bold uppercase tracking-widest transition-colors"
          >
            <Edit className="h-3 w-3" />
            Edit
          </button>
          <Link to={`/workshops/${w.slug}`} target="_blank">
            <button className="h-7 w-7 flex items-center justify-center bg-secondary border border-border rounded hover:bg-border transition-colors">
              <ExternalLink className="h-3 w-3" />
            </button>
          </Link>
          <button
            onClick={() => { if (confirm('Delete this workshop?')) onDelete(w._id); }}
            className="h-7 w-7 flex items-center justify-center bg-destructive/10 border border-destructive/20 text-destructive rounded hover:bg-destructive/20 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Expandable Attendance Panel */}
      {expanded && canMarkAttendance && (
        <AttendancePanel workshop={w} onCollapse={() => setExpanded(false)} />
      )}
    </Surface>
  );
}

function AttendancePanel({ workshop, onCollapse }: { workshop: any; onCollapse: () => void }) {
  const queryClient = useQueryClient();
  const attendees: any[] = workshop.attendees || [];
  const alreadyCheckedIn: string[] = (workshop.checkedInAttendees || []).map((a: any) =>
    typeof a === 'string' ? a : a._id
  );

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set(alreadyCheckedIn));
  const allSelected = attendees.length > 0 && attendees.every((a: any) => checkedIds.has(a._id || a));

  const toggleAll = () => {
    if (allSelected) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(attendees.map((a: any) => a._id || a)));
    }
  };

  const toggle = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const attendanceMutation = useMutation({
    mutationFn: () => workshopsApi.markAttendance(workshop._id, Array.from(checkedIds)),
    onSuccess: (res: any) => {
      toast.success(`Attendance submitted!`, {
        description: `${res.awarded} attendee${res.awarded !== 1 ? 's' : ''} awarded ${res.xpPerAttendee} XP each · ${res.totalXpAwarded} XP added to chapter.`,
      });
      queryClient.invalidateQueries({ queryKey: ['chapter-workshops'] });
      onCollapse();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const newCheckins = Array.from(checkedIds).filter(id => !alreadyCheckedIn.includes(id)).length;
  const xpToAward = (workshop.xpReward || 50) * newCheckins;

  return (
    <div className="border-t border-border bg-secondary/10 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5 text-primary" /> Mark Attendance
          </div>
          <div className="text-[10px] text-muted-foreground">
            Check off who showed up. Each earns <span className="text-primary font-bold">+{workshop.xpReward || 50} XP</span>.
          </div>
        </div>
        {attendees.length > 0 && (
          <button
            onClick={toggleAll}
            className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest bg-secondary border border-border rounded hover:bg-border transition-colors"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* Attendee List */}
      {attendees.length === 0 ? (
        <div className="text-center py-4 text-[11px] text-muted-foreground border border-dashed border-border rounded">
          No attendees registered for this workshop yet.
        </div>
      ) : (
        <div className="divide-y divide-border/40 border border-border rounded overflow-hidden bg-background/40 max-h-64 overflow-y-auto">
          {attendees.map((a: any) => {
            const id = a._id || a;
            const name = a.name || 'Operative';
            const username = a.username;
            const avatar = a.avatarUrl;
            const wasAlreadyIn = alreadyCheckedIn.includes(id);
            const isChecked = checkedIds.has(id);

            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                  isChecked ? 'bg-success/5' : 'hover:bg-secondary/30'
                }`}
              >
                <span className="shrink-0">
                  {isChecked
                    ? <CheckCircle2 className="h-4 w-4 text-success" />
                    : <Circle className="h-4 w-4 text-muted-foreground/40" />
                  }
                </span>
                {avatar ? (
                  <img src={resolveAssetUrl(avatar)} className="h-7 w-7 rounded-full object-cover border border-border shrink-0" alt="" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                    {name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold truncate">{name}</div>
                  {username && <div className="text-[10px] text-muted-foreground font-mono">@{username}</div>}
                </div>
                {wasAlreadyIn && (
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-success/10 text-success border border-success/20 rounded shrink-0">
                    XP Awarded
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Footer summary + submit */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-[11px] text-muted-foreground">
          <span className="font-bold text-foreground">{checkedIds.size}</span> selected
          {newCheckins > 0 && <> · <span className="text-primary font-bold">+{xpToAward} XP</span> will be awarded</>}
          {newCheckins === 0 && checkedIds.size > 0 && <> · <span className="text-success">All XP already awarded</span></>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCollapse}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest bg-secondary border border-border rounded hover:bg-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => attendanceMutation.mutate()}
            disabled={attendanceMutation.isPending || checkedIds.size === 0}
            className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest bg-success/20 text-success border border-success/30 rounded hover:bg-success/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {attendanceMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Submit Attendance
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleAssignmentModal({ isOpen, onClose, member, chapterId, currentRole }: any) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(currentRole);

  useEffect(() => {
    setSelected(currentRole);
  }, [currentRole]);

  const assignMutation = useMutation({
    mutationFn: (roleName: string | null) => chaptersApi.assignMemberRole(chapterId, member._id, roleName),
    onSuccess: () => {
      toast.success("Role assigned successfully.");
      queryClient.invalidateQueries({ queryKey: ["managed-chapters"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message)
  });

  const ROLES = [
    "Technical Commander",
    "Logistics Lead",
    "Communications Officer",
    "Intelligence Liaison"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border shadow-2xl rounded-sm">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-bold uppercase tracking-wider">Assign Tactical Role</DialogTitle>
          <DialogDescription className="text-[11.5px] mt-1">
            Assign a specialized role to {member?.name} for local operational oversight.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-1.5">
          {ROLES.map(role => (
            <button
              key={role}
              onClick={() => setSelected(role)}
              className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", selected === role ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
            >
              {role}
              {selected === role && <Shield className="h-3.5 w-3.5" />}
            </button>
          ))}
          <button
            onClick={() => setSelected(null)}
            className={cn(
              "w-full h-9 px-3 rounded border text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-between mt-3",
              selected === null 
                ? "bg-destructive text-destructive-foreground border-destructive" 
                : "bg-secondary/50 border-border hover:bg-secondary"
            )}
          >
            Strip All Roles
          </button>
        </div>
        <DialogFooter>
          <button 
            onClick={() => assignMutation.mutate(selected)}
            disabled={assignMutation.isPending}
            className="w-full h-9 bg-foreground text-background font-bold uppercase tracking-widest text-[11px] rounded hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            {assignMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Reassignment"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecruitmentQueue({ chapterId }: { chapterId: string }) {
  const queryClient = useQueryClient();
  const { data: queue, isLoading } = useQuery({
    queryKey: ["recruitment-queue", chapterId],
    queryFn: () => chaptersApi.getRecruitmentQueue(chapterId),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string, status: 'Approved' | 'Rejected' }) => 
      chaptersApi.reviewJoinRequest(appId, status),
    onSuccess: () => {
      toast.success("Enlistment protocol updated.");
      queryClient.invalidateQueries({ queryKey: ["recruitment-queue", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["managed-chapters"] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-bold uppercase tracking-widest text-foreground flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-warning" /> Recruitment Queue
        </h3>
        <Pill variant="warning" className="h-5 text-[9px] font-mono">{queue?.length || 0} PENDING</Pill>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (queue && queue.length > 0) ? (
        <div className="grid gap-3">
          {queue.map((app: any) => (
            <Surface key={app._id} className="p-4 border-warning/20 bg-warning/[0.02]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded bg-secondary border border-border flex items-center justify-center font-bold text-primary shrink-0">
                    {app.userId?.avatarUrl ? <img src={resolveAssetUrl(app.userId.avatarUrl)} className="h-full w-full object-cover rounded" /> : app.userId?.name.substring(0, 1)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[13px] font-bold">{app.userId?.name} <span className="text-[10px] font-normal text-muted-foreground uppercase font-mono ml-1.5">@{app.userId?.username}</span></div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Target className="h-3 w-3" /> {app.userId?.reputationPoints || 0} REP · ID: {app.universityId}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => reviewMutation.mutate({ appId: app._id, status: 'Rejected' })}
                    disabled={reviewMutation.isPending}
                    className="h-8 px-3 border border-border hover:bg-destructive/10 hover:text-destructive rounded text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => reviewMutation.mutate({ appId: app._id, status: 'Approved' })}
                    disabled={reviewMutation.isPending}
                    className="h-8 px-4 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[10px] rounded hover:brightness-110 transition-all"
                  >
                    Approve
                  </button>
                </div>
              </div>
              <div className="mt-3 p-3 bg-secondary/30 border border-border rounded text-[11.5px] text-muted-foreground leading-relaxed">
                {app.motivation}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {app.skills?.map((s: string) => <Pill key={s} className="text-[9px] border-border/50">{s}</Pill>)}
              </div>
            </Surface>
          ))}
        </div>
      ) : (
        <Surface className="p-8 text-center border-dashed flex flex-col items-center justify-center min-h-[100px]">
          <p className="text-[11.5px] text-muted-foreground">Recruitment queue is empty.</p>
        </Surface>
      )}
    </div>
  );
}

function SectorChallenges({ chapterId }: { chapterId: string }) {
  const queryClient = useQueryClient();
  const { data: sprints, isLoading } = useQuery({
    queryKey: ["chapter-sprints", chapterId],
    queryFn: () => chaptersApi.getChapterSprints(chapterId),
  });

  const acceptMutation = useMutation({
    mutationFn: (sprintId: string) => chaptersApi.acceptSprint(sprintId),
    onSuccess: () => {
      toast.success("Sector challenge accepted!");
      queryClient.invalidateQueries({ queryKey: ["chapter-sprints", chapterId] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const pendingIncoming = sprints?.filter(s => s.targetChapterId._id === chapterId && s.status === 'Pending') || [];
  const activeSprints = sprints?.filter(s => s.status === 'Active') || [];

  return (
    <div className="space-y-4 pt-4 border-t border-border/50 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-1.5">
          <Swords className="h-4 w-4 text-destructive" /> Sector Challenges (CvC)
        </h3>
        <button className="h-8 px-3 bg-secondary border border-border rounded text-[10px] font-bold uppercase tracking-widest hover:bg-border transition-all">Initiate Challenge</button>
      </div>

      {/* Incoming Challenges */}
      {pendingIncoming.length > 0 && (
        <div className="space-y-2">
          <div className="text-[9px] font-bold uppercase tracking-wider text-destructive animate-pulse">Incoming Inter-Sector Signal</div>
          {pendingIncoming.map(s => (
            <Surface key={s._id} className="p-4 border-destructive/20 bg-destructive/[0.02] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive">
                  <Swords className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[13px] font-bold uppercase tracking-tight">{s.initiatorChapterId.name} challenged you!</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{s.title} · 48h Sprint</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="h-8 px-3 border border-border rounded text-[10px] font-bold uppercase tracking-widest">Reject</button>
                <button 
                  onClick={() => acceptMutation.mutate(s._id)}
                  disabled={acceptMutation.isPending}
                  className="h-8 px-4 bg-destructive text-white font-bold uppercase tracking-widest text-[10px] rounded hover:brightness-110"
                >
                  Accept
                </button>
              </div>
            </Surface>
          ))}
        </div>
      )}

      {/* Active Sprints */}
      {activeSprints.length > 0 ? (
        <div className="grid gap-3">
          {activeSprints.map(s => {
            const isInitiator = s.initiatorChapterId._id === chapterId;
            const enemy = isInitiator ? s.targetChapterId : s.initiatorChapterId;
            return (
              <Surface key={s._id} className="p-4 border-success/30 bg-success/[0.02]">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Pill variant="success" className="h-5 text-[9px] font-mono">LIVE SPRINT</Pill>
                      <span className="text-[11.5px] font-bold uppercase tracking-wider">{s.title}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-[18px] font-bold">{isInitiator ? s.stats.initiatorScore : s.stats.targetScore}</div>
                        <div className="text-[9px] uppercase text-muted-foreground font-bold">Your Score</div>
                      </div>
                      <div className="text-[14px] font-bold opacity-30">VS</div>
                      <div className="text-center">
                        <div className="text-[18px] font-bold text-destructive">{isInitiator ? s.stats.targetScore : s.stats.initiatorScore}</div>
                        <div className="text-[9px] uppercase text-muted-foreground font-bold">{enemy.name}</div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:w-44 space-y-2">
                    <div className="flex items-center justify-between text-[9px] uppercase font-bold text-muted-foreground">
                      <span>Remaining</span>
                      <span>18:42:10</span>
                    </div>
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-success" style={{ width: '62%' }} />
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 h-8 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest rounded">Feed</button>
                      <SyncSprintButton sprintId={s._id} chapterId={chapterId} />
                    </div>
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>
      ) : (
        <Surface className="p-8 text-center border-dashed flex flex-col items-center justify-center min-h-[120px]">
          <div className="opacity-55 flex flex-col items-center">
            <Trophy className="h-5 w-5 mb-1.5" />
            <p className="text-[11.5px] text-muted-foreground">No active inter-sector sprints.</p>
          </div>
        </Surface>
      )}
    </div>
  );
}

function SyncSprintButton({ sprintId, chapterId }: { sprintId: string, chapterId: string }) {
  const queryClient = useQueryClient();
  const syncMutation = useMutation({
    mutationFn: () => chaptersApi.syncSprint(sprintId),
    onSuccess: () => {
      toast.success("Telemetry synchronized.");
      queryClient.invalidateQueries({ queryKey: ["chapter-sprints", chapterId] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  return (
    <button 
      onClick={() => syncMutation.mutate()}
      disabled={syncMutation.isPending}
      className="px-2.5 bg-secondary border border-border rounded hover:bg-border transition-colors text-muted-foreground flex items-center justify-center"
      title="Sync Telemetry"
    >
      <ArrowRight className={cn("h-3.5 w-3.5", syncMutation.isPending && "animate-spin")} />
    </button>
  );
}
