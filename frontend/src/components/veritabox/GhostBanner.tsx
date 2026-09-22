import { useAuth } from "@/contexts/AuthContext";
import { jwtDecode } from "jwt-decode";
import { AlertTriangle, Ghost, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function GhostBanner() {
  const { token, signOut } = useAuth();
  const [ghostInfo, setGhostInfo] = useState<{ saId: string; user: string } | null>(null);

  useEffect(() => {
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        if (decoded.isGhost) {
          setGhostInfo({ saId: decoded.saId, user: decoded.id });
        } else {
          setGhostInfo(null);
        }
      } catch {
        setGhostInfo(null);
      }
    } else {
      setGhostInfo(null);
    }
  }, [token]);

  if (!ghostInfo) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground h-10 flex items-center justify-between px-4 shadow-lg animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-1 rounded animate-pulse">
          <Ghost className="h-4 w-4" />
        </div>
        <div className="text-[12px] font-bold uppercase tracking-wider flex items-center gap-2">
          <span>Ghost mode active</span>
          <span className="opacity-50">|</span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Viewing as user {ghostInfo.user}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-[10px] uppercase font-bold tracking-widest hidden md:block">
          All actions are logged to the shadow audit trail
        </div>
        <button 
          onClick={() => signOut()}
          className="h-7 px-3 bg-white/10 hover:bg-white/20 rounded text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border border-white/20"
        >
          Terminate Session <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
