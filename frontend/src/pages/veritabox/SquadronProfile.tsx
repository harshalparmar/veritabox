import React from "react";
import { PublicShell } from "@/components/VeritaBox/PublicShell";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import {
  Users, Zap, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// Specialized High-Fidelity Subviews
import HackathonSquadronView from "./HackathonSquadronView";
import CompetitionSquadronView from "./CompetitionSquadronView";
import CircuitLabSquadronView from "./CircuitLabSquadronView";

export default function SquadronProfile() {
  const { identifier } = useParams();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: squadron, isLoading, error } = useQuery({
    queryKey: ["squadron", identifier],
    queryFn: () => hackathonsApi.getSquadronProfile(identifier!),
    enabled: !!identifier,
  });

  // Canonicalize to slug-based URL if accessed via ObjectId
  React.useEffect(() => {
    if (squadron && squadron.slug && identifier === squadron._id) {
      const isVeritaBox = location.pathname.startsWith("/VeritaBox/");
      navigate(`${isVeritaBox ? "/VeritaBox" : ""}/squadron/${squadron.slug}`, { replace: true });
    }
  }, [squadron, identifier, navigate, location]);

  const leader = squadron?.leader as any;
  const isLeader = authUser?._id === leader?._id;

  const saluteMutation = useMutation({
    mutationFn: () => hackathonsApi.saluteSquadron(squadron?._id!),
    onSuccess: (data) => {
      toast.success("Honor salute transmitted to the unit!");
      queryClient.setQueryData(["squadron", identifier], (old: any) => ({
        ...old,
        salutes: data.salutes
      }));
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <PublicShell>
        <div className="flex h-[80vh] items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(var(--primary-rgb),0.05),transparent)]">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto animate-spin-slow" />
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing Unit Vitals...</div>
          </div>
        </div>
      </PublicShell>
    );
  }

  if (error || !squadron) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-[600px] px-6 py-28 text-center bg-[radial-gradient(ellipse_at_center,rgba(var(--primary-rgb),0.05),transparent)] relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          <Users className="h-20 w-20 mx-auto text-muted-foreground/30 mb-6 animate-bounce" />
          <h2 className="text-[22px] font-black uppercase tracking-[0.2em] text-foreground">Tactical Unit Classified</h2>
          <p className="mt-3 text-muted-foreground/75 text-[13px] leading-relaxed max-w-sm mx-auto">This tactical unit profile is currently inaccessible, restricted by high command, or has been disbanded.</p>
          <Link to="/hackathons" className="mt-8 mx-auto w-fit h-11 px-6 bg-secondary border border-primary/20 hover:border-primary/50 text-foreground hover:bg-primary hover:text-primary-foreground text-[12px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 rounded-lg">
            <Zap className="h-4 w-4" /> Return to Arena
          </Link>
        </div>
      </PublicShell>
    );
  }

  const hackathon = squadron.hackathonId as any;

  // Render the appropriate high-fidelity view based on squadron context
  const renderSquadronView = () => {
    if (!hackathon) {
      // Standalone persistent squadron -> Circuit Lab Dashboard
      return (
        <CircuitLabSquadronView
          squadron={squadron}
          authUser={authUser}
          isLeader={isLeader}
          onManageClick={() => navigate(`/squadrons/${squadron._id}/console`)}
          onSaluteClick={() => saluteMutation.mutate()}
          isSaluting={saluteMutation.isPending}
        />
      );
    }

    if (hackathon.type === "Competition") {
      // Linked to a Competition -> Prestigious Tournament Arena profile
      return (
        <CompetitionSquadronView
          squadron={squadron}
          authUser={authUser}
          isLeader={isLeader}
          onManageClick={() => navigate(`/squadrons/${squadron._id}/console`)}
          onSaluteClick={() => saluteMutation.mutate()}
          isSaluting={saluteMutation.isPending}
        />
      );
    }

    // Linked to a Hackathon (Default) -> Cyberpunk War-Room profile
    return (
      <HackathonSquadronView
        squadron={squadron}
        authUser={authUser}
        isLeader={isLeader}
        onManageClick={() => navigate(`/squadrons/${squadron._id}/console`)}
        onSaluteClick={() => saluteMutation.mutate()}
        isSaluting={saluteMutation.isPending}
      />
    );
  };

  return (
    <PublicShell>
      {renderSquadronView()}
    </PublicShell>
  );
}
