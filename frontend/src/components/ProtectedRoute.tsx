import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ 
  children,
  allowedRoles,
  deniedRoles 
}: { 
  children: React.ReactNode,
  allowedRoles?: string[],
  deniedRoles?: string[]
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Force onboarding if not completed
  if (!user.isOnboarded) {
    return <Navigate to="/auth" replace />;
  }

  // ── Admin ⇄ User isolation ────────────────────────────────────────────
  // Admin/Founder operate only inside the command deck (/cmd, /sa) plus their
  // own settings/profile. Regular users can never load an admin area. This is
  // the client-side half; the backend enforces the same boundary on the API.
  const ADMIN_ROLES = ['Admin', 'Founder'];
  const isAdminUser = ADMIN_ROLES.includes(user.role);
  const path = location.pathname;
  const isAdminArea = path === '/cmd' || path.startsWith('/cmd/') || path === '/sa' || path.startsWith('/sa/');

  if (isAdminArea && !isAdminUser) {
    return <IsolationDenied home="/dashboard" label="Go to Dashboard" />;
  }
  if (isAdminUser && !isAdminArea) {
    const adminAllowed = path.startsWith('/settings') || path.startsWith('/profile');
    if (!adminAllowed) return <Navigate to="/cmd" replace />;
  }

  // Check role restrictions
  if (
    (allowedRoles && !allowedRoles.includes(user.role)) ||
    (deniedRoles && deniedRoles.includes(user.role))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <h1 className="text-6xl font-bold text-destructive mb-4">403</h1>
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You do not have permission to access this module. Please return to your designated dashboard.
          </p>
          <a href="/" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Return Home
          </a>
        </div>
      </div>
    );
  }

  // Recruiter global restriction: Recruiters can only access specific routes
  if (user.role === 'Recruiter') {
    const isAllowed = location.pathname === '/dashboard' ||
      location.pathname === '/settings' ||
      location.pathname.startsWith('/jobs') ||
      location.pathname.startsWith('/talent') ||
      location.pathname.startsWith('/applications') ||
      location.pathname.startsWith('/recruiter');
    if (!isAllowed) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <h1 className="text-6xl font-bold text-destructive mb-4">403</h1>
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              This area is not available for Recruiter accounts.
            </p>
            <a href="/dashboard" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  // Professional restriction: cannot apply to create institutes
  if (user.role === 'Professional' && location.pathname === '/chapters/apply') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <h1 className="text-6xl font-bold text-destructive mb-4">403</h1>
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            Only teachers can register an institute.
          </p>
          <a href="/dashboard" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function IsolationDenied({ home, label }: { home: string; label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-destructive mb-4">403</h1>
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">
          This area is isolated from your account type.
        </p>
        <a href={home} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          {label}
        </a>
      </div>
    </div>
  );
}
