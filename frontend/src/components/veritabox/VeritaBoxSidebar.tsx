import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { VeritaBoxLogo } from "@/components/VeritaBoxLogo";
import { 
  LogOut, ChevronLeft, ChevronRight, Map, CheckSquare, TrendingUp, Briefcase, Bot, FileText, Globe, Settings, Users, Search
} from "lucide-react";
import {
  MissionControlIcon,
  HackathonsIcon,
  CompetitionsIcon,
  WorkshopsIcon,
  BountiesIcon,
  CodeForgeIcon,
  KnowledgeHubIcon,
  CircuitLabIcon,
  MainnetIcon,
  SquadronHQIcon,
  InstitutesIcon,
  ConnectionsIcon,
  MyProfileIcon
} from "./PlatformIcons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const sections: { title?: string; items: { icon: any; label: string; path: string; badge?: string }[] }[] = [
  {
    items: [
      { icon: MissionControlIcon, label: "Mission Control", path: "/dashboard" },
      { icon: MainnetIcon, label: "Mainnet", path: "/mainnet" },
      { icon: SquadronHQIcon, label: "Squadron HQ", path: "/squadrons" },
    ],
  },
  {
    title: "Growth & Career",
    items: [
      { icon: Map, label: "Roadmaps", path: "/roadmaps", badge: "New" },
      { icon: CheckSquare, label: "Daily Checklist", path: "/checklist", badge: "New" },
      { icon: TrendingUp, label: "Progress", path: "/progress", badge: "New" },
      { icon: Briefcase, label: "Jobs", path: "/jobs", badge: "New" },
      { icon: FileText, label: "Resume Analyzer", path: "/resume-analyzer", badge: "New" },
    ],
  },
  {
    title: "Arenas",
    items: [
      { icon: HackathonsIcon, label: "Hackathons", path: "/hackathons" },
      { icon: CompetitionsIcon, label: "Competitions", path: "/competitions" },
      { icon: WorkshopsIcon, label: "Workshops", path: "/workshops" },
      { icon: Globe, label: "Events", path: "/events" },
    ],
  },
  {
    title: "Missions",
    items: [
      { icon: BountiesIcon, label: "Bounties", path: "/bounties" },
      { icon: CodeForgeIcon, label: "Codeforge", path: "/forge" },
    ],
  },
  {
    title: "Research",
    items: [
      { icon: KnowledgeHubIcon, label: "Knowledge Hub", path: "/knowledge" },
      { icon: CircuitLabIcon, label: "Circuit Lab", path: "/lab" },
      { icon: FileText, label: "Tutorials", path: "/tutorials", badge: "New" },
    ],
  },
  {
    title: "Coalition",
    items: [
      { icon: InstitutesIcon, label: "Institutes", path: "/chapters" },
    ],
  },
  {
    title: "Terminal",
    items: [
      { icon: ConnectionsIcon, label: "Connections", path: "/network" },
      { icon: MyProfileIcon, label: "My Profile", path: "/profile/me" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

export function VeritaBoxSidebarContent({ onNavigate, isCollapsed, toggleCollapse }: { onNavigate?: () => void, isCollapsed?: boolean, toggleCollapse?: () => void }) {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const initials = profile?.name
    ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "OP";

  let filteredSections = sections;
  if (user?.role === "Teacher") {
    filteredSections = sections
      .filter(s => s.title !== "Growth & Career")
      .map(s => ({
        ...s,
        items: s.items.filter(item => item.label !== "Workshops")
      }))
      .filter(s => s.items.length > 0);
  } else if (user?.role === "Professional") {
    filteredSections = sections
      .map(s => ({
        ...s,
        items: s.items.filter(item => item.label !== "Institutes")
      }))
      .filter(s => s.items.length > 0);
  } else if (user?.role === "Recruiter") {
    filteredSections = [
      {
        items: [
          { icon: MissionControlIcon, label: "Dashboard", path: "/dashboard" },
          { icon: Briefcase, label: "Job Postings", path: "/jobs" },
          { icon: Users, label: "Applications", path: "/applications" },
          { icon: Search, label: "Talent Search", path: "/talent" },
        ]
      },
      {
        title: "Terminal",
        items: [
          { icon: Settings, label: "Settings", path: "/settings" },
        ],
      }
    ];
  }

  return (
    <>
      <Link to="/dashboard" className="flex items-center gap-2 px-3 h-12 border-b border-sidebar-border shrink-0 overflow-hidden">
        {!isCollapsed ? (
          <VeritaBoxLogo className="h-6 text-sidebar-accent-foreground" />
        ) : (
          <span className="text-[15px] font-semibold tracking-[0.08em] uppercase text-sidebar-accent-foreground">A</span>
        )}
      </Link>

      <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-3">
        {filteredSections.map((section, i) => (
          <div key={i} className="space-y-px">
            {section.title && !isCollapsed && (
              <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-[0.1em] text-sidebar-foreground/50 font-medium">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== "/" && location.pathname.startsWith(item.path));
              
              const content = (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-[12px]",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                    isCollapsed ? "justify-center px-0" : ""
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {item.badge && !isCollapsed && (
                    <span className="text-[9px] px-1.5 py-px bg-primary/15 text-primary rounded">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.path} delayDuration={0}>
                    <TooltipTrigger asChild>
                      {content}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-sidebar border-sidebar-border text-sidebar-foreground text-[12px]">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return content;
            })}
          </div>
        ))}
      </nav>
      


      <div className="border-t border-sidebar-border p-2 shrink-0 space-y-2">
        <div className={cn(
          "flex items-center gap-2 px-1 rounded-md transition-all",
          isCollapsed ? "flex-col py-2" : "py-1"
        )}>
          <Avatar className="h-6 w-6 border border-primary/20 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
               <div className="text-[12px] font-medium text-sidebar-foreground truncate">{profile?.name || "Operative"}</div>
               <div className="text-[9px] text-muted-foreground uppercase tracking-tighter">Verified Unit</div>
            </div>
          )}

          <div className={cn("flex items-center", isCollapsed ? "flex-col gap-1" : "gap-0.5")}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  className="h-7 w-7 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout Session</TooltipContent>
            </Tooltip>

            {toggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className="h-7 w-7 text-sidebar-foreground/60 hover:text-primary hover:bg-primary/10"
              >
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function VeritaBoxSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem("sidebar-collapsed", String(newState));
      return newState;
    });
  };

  return (
    <aside className={cn(
      "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 z-30 transition-all duration-300",
      isCollapsed ? "w-14" : "w-56"
    )}>
      <div className="flex flex-col flex-1 overflow-hidden">
        <VeritaBoxSidebarContent isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />
      </div>
    </aside>
  );
}
