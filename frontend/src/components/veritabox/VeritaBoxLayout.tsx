import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { VeritaBoxSidebar, VeritaBoxSidebarContent } from "./VeritaBoxSidebar";
import GhostBanner from "./GhostBanner";
import { Navbar } from "./Navbar";
import { DhritiWidget } from "./DhritiWidget";

export function VeritaBoxLayout({ children, hideSidebar = false }: { children: React.ReactNode; hideSidebar?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Tech Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05] z-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <GhostBanner />
      {!hideSidebar && <VeritaBoxSidebar />}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Navbar hideLogo={hideSidebar ? false : true} onMenuClick={() => setOpen(true)} fullWidth={hideSidebar} />
        
        {/* Mobile Sidebar Overlay (Integrated with Sheet for better UX) */}
        {!hideSidebar && (
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetContent side="left" className="p-0 w-56 bg-sidebar">
                <div className="flex flex-col h-full">
                  <VeritaBoxSidebarContent isCollapsed={false} onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
        <main className="flex-1 overflow-auto">{children}</main>
        <DhritiWidget />
      </div>
    </div>
  );
}

export function PageContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`max-w-[1400px] mx-auto px-6 py-6 ${className}`}>{children}</div>;
}
