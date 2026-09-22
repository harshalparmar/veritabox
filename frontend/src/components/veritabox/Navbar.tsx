import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { VeritaBoxLogo } from "../VeritaBoxLogo";
import {
  Moon, Sun, Menu, X, Search, Bell, MessageSquare, Plus,
  User as UserIcon, Settings, LogOut, Trophy, Target, BookOpen,
  Code2, LayoutDashboard, Cpu, FileText, Sparkles, Building2, Shield,
} from "lucide-react";
import {
  MissionControlIcon,
  BountiesIcon,
  CodeForgeIcon,
  CircuitLabIcon
} from "./PlatformIcons";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";

const publicLinks = [
  { label: "Hackathons", path: "/hackathons" },
  { label: "Competitions", path: "/competitions" },
  { label: "Workshops", path: "/workshops" },
  { label: "Events", path: "/events" },
  { label: "Knowledge", path: "/knowledge" },
  { label: "Institutes", path: "/chapters" },
  { label: "Circuit Lab", path: "/lab" },
  { label: "Tutorials", path: "/tutorials" },
  { label: "Leaderboard", path: "/leaderboard" },
  { label: "Jobs", path: "/jobs" },
];


function ThemeBtn() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-8 w-8 flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="h-4 w-4 hidden dark:block" />
    </button>
  );
}

function PublicNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur border-b border-border">
        <div className="mx-auto flex h-[56px] max-w-[1300px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <VeritaBoxLogo className="h-6 text-foreground" />
          </Link>


          <div className="hidden md:flex items-center gap-0.5">
            {publicLinks.map((l) => {
              const active = location.pathname === l.path || location.pathname.startsWith(l.path + "/");
              return (
                <Link key={l.path} to={l.path}
                  className={cn(
                    "px-3 py-1.5 text-[13px] rounded transition-colors",
                    active ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}>
                  {l.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <ThemeBtn />
            <Link to="/auth" className="hidden sm:inline-flex">
              <button className="text-[13px] text-foreground/70 hover:text-foreground h-8 px-3">Sign in</button>
            </Link>
            <Link to="/register">
              <button className="text-[13px] h-8 px-3 border border-foreground/40 text-foreground hover:bg-foreground hover:text-background transition-colors">
                Enlist
              </button>
            </Link>
            <button className="md:hidden h-8 w-8 flex items-center justify-center" onClick={() => setOpen(!open)} aria-label="Menu">
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="md:hidden border-t border-border bg-background">
            {publicLinks.map((l) => (
              <Link key={l.path} to={l.path} onClick={() => setOpen(false)}
                className="block px-6 py-3 text-[13px] border-b border-border/50 text-foreground/80 hover:bg-secondary">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}

function AuthedNav({ hideLogo = false, onMenuClick, fullWidth = false }: { hideLogo?: boolean; onMenuClick?: () => void; fullWidth?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === 'Admin' || user?.role === 'Founder';
  const inAdmin = location.pathname === '/cmd' || location.pathname.startsWith('/cmd/');

  const match = location.pathname.match(/^\/squadrons\/([^/]+)\/console$/);
  const squadId = match ? match[1] : null;

  const { data: squadDetails } = useQuery({
    queryKey: ["squad-details", squadId],
    queryFn: () => hackathonsApi.getTeamById(squadId!),
    enabled: !!squadId,
  });

  const initials = profile?.name
    ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? "O").toUpperCase();

  // âŒ˜K opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-command-palette'));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur border-b border-border h-12">
      <div className={cn("mx-auto flex h-12 items-center gap-3 px-4 md:px-6", fullWidth ? "w-full max-w-none" : "max-w-[1400px]")}>
        {/* Logo + primary links */}
        <div className={cn("items-center gap-4 shrink-0", hideLogo ? "flex md:hidden" : "flex")}>
          <Link to="/dashboard" className="flex items-center gap-2">
            <VeritaBoxLogo className="h-6 text-foreground hidden sm:inline-block" />
          </Link>
          
          <div className="h-4 w-px bg-border/50 hidden md:block" />
        </div>
        
        {/* Breadcrumbs (only show if not mobile or if logo is hidden) */}
        <div className={cn("flex items-center gap-4 shrink-0", hideLogo ? "flex" : "hidden md:flex")}>
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList>
              {(location.pathname === "/dashboard" || location.pathname === "/cmd") ? (
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground/60">{inAdmin ? "Command Center" : "Mission Control"}</BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={inAdmin ? "/cmd" : "/dashboard"} className="text-[11px] uppercase tracking-wider font-mono">{inAdmin ? "CMD" : "Control"}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {location.pathname.split("/").filter(Boolean).map((segment, i, arr) => {
                    const isLast = i === arr.length - 1;
                    let label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");

                    if (segment === "dashboard" || segment === "cmd") return null;

                    // Map paths dynamically to avoid 404s
                    let toPath = `/${arr.slice(0, i + 1).join("/")}`;
                    if (arr[0] === "squadrons" && i === 1) {
                      const slugOrId = squadDetails?.slug || segment;
                      toPath = `/squadron/${slugOrId}`;
                      if (squadDetails?.teamName) {
                        label = squadDetails.teamName;
                      }
                    } else if (segment === "squadron") {
                      toPath = "/squadrons";
                    }

                    return (
                      <React.Fragment key={toPath}>
                        <BreadcrumbSeparator className="opacity-40" />
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage className="text-[11px] uppercase tracking-wider font-mono text-primary/80">{label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <Link to={toPath} className="text-[11px] uppercase tracking-wider font-mono">{label}</Link>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    );
                  })}
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>


        <div className="flex-1" />

        {/* Right cluster */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Compact Search (GitHub Style) */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="group hidden md:flex items-center gap-2 h-8 px-2.5 rounded-md border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-foreground/20 transition-all text-muted-foreground hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5 opacity-60" />
            <span className="text-[12px] pr-4">Search or jump to...</span>
            <kbd className="flex h-[18px] w-[18px] items-center justify-center rounded border border-border bg-background/50 text-[10px] font-mono opacity-60 group-hover:opacity-100 transition-opacity">
              /
            </kbd>
          </button>

          {/* Mobile search icon only */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="md:hidden h-8 w-8 flex items-center justify-center text-foreground/70"
          >
            <Search className="h-4 w-4" />
          </button>

          <ThemeBtn />

          {user?.role !== 'Recruiter' && !isAdmin && (
            <>
              {/* Messages */}
              <Link to="/messages" className="relative h-8 w-8 flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors" aria-label="Messages">
                <MessageSquare className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
              </Link>

              {/* Notifications */}
              <Link to="/notifications" className="relative h-8 w-8 flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
              </Link>
            </>
          )}


          {/* Mobile menu */}
          <button 
            className="lg:hidden h-8 w-8 flex items-center justify-center" 
            onClick={() => onMenuClick ? onMenuClick() : setOpen(!open)} 
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="px-6 py-4 space-y-4">
             <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Quick Access</div>
             <div className="grid grid-cols-2 gap-2">
                <Link to={inAdmin ? "/cmd" : "/dashboard"} onClick={() => setOpen(false)} className="flex items-center gap-2 p-3 rounded bg-secondary/50 text-[13px]">
                   <MissionControlIcon className="h-4 w-4" /> {inAdmin ? "CMD" : "Control"}
                </Link>
                {user?.role !== 'Recruiter' && !isAdmin && (
                  <>
                    <Link to="/messages" onClick={() => setOpen(false)} className="flex items-center gap-2 p-3 rounded bg-secondary/50 text-[13px]">
                       <MessageSquare className="h-4 w-4" /> Messages
                    </Link>
                    <Link to="/notifications" onClick={() => setOpen(false)} className="flex items-center gap-2 p-3 rounded bg-secondary/50 text-[13px]">
                       <Bell className="h-4 w-4" /> Signals
                    </Link>
                  </>
                )}
             </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export function Navbar({ hideLogo = false, onMenuClick, fullWidth = false }: { hideLogo?: boolean; onMenuClick?: () => void; fullWidth?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <nav className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur border-b border-border h-12" />
    );
  }
  return user ? <AuthedNav hideLogo={hideLogo} onMenuClick={onMenuClick} fullWidth={fullWidth} /> : <PublicNav />;
}
