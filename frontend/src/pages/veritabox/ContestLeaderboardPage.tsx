import { useParams, Link } from "react-router-dom";
import { PublicShell } from "@/components/VeritaBox/PublicShell";
import { PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import ContestLeaderboard from "@/components/VeritaBox/ContestLeaderboard";
import { ArrowLeft } from "lucide-react";

export default function ContestLeaderboardPage() {
  const { id, roundNumber } = useParams();
  const rn = parseInt(roundNumber || "1");

  return (
    <PublicShell>
      <PageContent className="max-w-5xl mx-auto py-8">
        <Link to={`/hackathons/${id}/rounds/${rn}/contest`} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Arena
        </Link>
        <ContestLeaderboard hackathonId={id!} roundNumber={rn} />
      </PageContent>
    </PublicShell>
  );
}
