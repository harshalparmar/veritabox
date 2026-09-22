import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AdminSidebar, AdminSidebarContent } from "./AdminSidebar";
import GhostBanner from "./GhostBanner";
import { Navbar } from "./Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  if (user && user.role !== 'Admin' && user.role !== 'Founder') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Tactical Admin Background (Darker, more professional) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05] z-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />
      
      <GhostBanner />
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Navbar hideLogo={true} onMenuClick={() => setOpen(true)} />
        
        {/* Mobile Sidebar Overlay */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="left" className="p-0 w-56 bg-sidebar">
              <div className="flex flex-col h-full">
                <AdminSidebarContent isCollapsed={false} onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
