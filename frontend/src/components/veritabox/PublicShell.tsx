import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard } from "lucide-react";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { VeritaBoxSidebar, VeritaBoxSidebarContent } from "./VeritaBoxSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const excludedRoutes = [
  "/platform",
  "/docs",
  "/community",
  "/stats",
  "/contact",
  "/about",
  "/team",
  "/landing",
  "/auth",
  "/register",
  "/forgot-password",
  "/reset-password"
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const isExcluded = excludedRoutes.some(route => 
    location.pathname === route || (route !== "/" && location.pathname.startsWith(route + "/"))
  );

  const showSidebar = user && !isExcluded;

  if (showSidebar) {
    return (
      <div className="flex h-screen bg-background relative overflow-hidden">
        {/* Tech Grid Background (from VeritaBoxLayout) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05] z-0"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        
        <VeritaBoxSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          <Navbar hideLogo={true} onMenuClick={() => setOpen(true)} />
          
          {/* Mobile Sidebar Overlay */}
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetContent side="left" className="p-0 w-56 bg-sidebar">
                <div className="flex flex-col h-full">
                  <VeritaBoxSidebarContent isCollapsed={false} onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

