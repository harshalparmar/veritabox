import {
  LayoutDashboard, Users, Cpu, Target, Trophy, BookOpen, Building2, Package, Shield, LogOut, ChevronLeft, ChevronRight, Award, Globe, GraduationCap, Code2, Mail, MessageSquare, Briefcase, TrendingUp
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VeritaBoxLogo } from "@/components/VeritaBoxLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BountiesIcon,
  HackathonsIcon,
  CompetitionsIcon,
  CodeForgeIcon,
  KnowledgeHubIcon,
  InstitutesIcon,
  WorkshopsIcon
} from "./PlatformIcons";
function getAdminSections() {
  const base = '/cmd';
  return [
    {
      items: [
        { icon: LayoutDashboard, label: "Command Center", path: base },
      ],
    },
    {
      title: "Intelligence & Ops",
      items: [
        { icon: Users, label: "Operative Registry", path: `${base}/users` },
        { icon: Globe, label: "Mainnet Oversight", path: `${base}/mainnet` },
        { icon: BountiesIcon, label: "Bounty Board", path: `${base}/bounties` },
        { icon: MessageSquare, label: "Secure Comms", path: `${base}/messages` },
      ],
    },
    {
      title: "Arena Management",
      items: [
        { icon: HackathonsIcon, label: "Hackathons", path: `${base}/hackathons` },
        { icon: CompetitionsIcon, label: "Competitions", path: `${base}/competitions` },
        { icon: CodeForgeIcon, label: "Code Forge", path: `${base}/forge` },
        { icon: Globe, label: "Events", path: `${base}/events` },
      ],
    },
    {
      title: "Network CMS",
      items: [
        { icon: WorkshopsIcon, label: "Workshops", path: `${base}/workshops` },
        { icon: InstitutesIcon, label: "Institute Admin", path: `${base}/chapters` },
        { icon: KnowledgeHubIcon, label: "Knowledge Base", path: `${base}/knowledge` },
        { icon: BookOpen, label: "Tech Publishing", path: `${base}/publishing` },
        { icon: Mail, label: "Newsletter", path: `${base}/newsletter` },
      ],
    },
    {
      title: "Learning & Careers",
      items: [
        { icon: Briefcase, label: "Job Postings", path: `${base}/jobs` },
        { icon: BookOpen, label: "Learning Content", path: `${base}/progress` },
      ],
    },
  ];
}

// Reusing the same styling as VeritaBoxSidebar but specialized for Admin
export function AdminSidebarContent({ onNavigate, isCollapsed, toggleCollapse }: { onNavigate?: () => void, isCollapsed?: boolean, toggleCollapse?: () => void }) {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const initials = profile?.name
    ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "AD";
  const adminSections = getAdminSections();
  const adminHomePath = '/cmd';

  return (
    <>
      <Link to={adminHomePath} className="flex items-center gap-2 px-3 h-12 border-b border-sidebar-border shrink-0 overflow-hidden">
        {!isCollapsed ? (
          <>
            <VeritaBoxLogo className="h-6 text-sidebar-accent-foreground" />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground border border-border rounded px-1 py-px">CMD</span>
          </>
        ) : (
          <Shield className="h-4 w-4 text-foreground" />
        )}
      </Link>

      <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-3">
        {adminSections.map((section, i) => (
          <div key={i} className="space-y-px">
            {section.title && !isCollapsed && (
              <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-[0.1em] text-sidebar-foreground/50 font-medium">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== adminHomePath && location.pathname.startsWith(item.path));
              
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
               <div className="text-[12px] font-medium text-sidebar-foreground truncate">{profile?.name || "Admin"}</div>
               <div className="text-[9px] text-muted-foreground uppercase tracking-tighter">Command Authority</div>
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

export function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin-sidebar-collapsed") === "true";
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem("admin-sidebar-collapsed", String(newState));
      return newState;
    });
  };

  return (
    <aside className={cn(
      "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 z-30 transition-all duration-300",
      isCollapsed ? "w-14" : "w-56"
    )}>
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminSidebarContent isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />
      </div>
    </aside>
  );
}

