import { useState } from "react";
import { Link } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface } from "@/components/VeritaBox/UI";
import { UserCheck, UserPlus, UserX, Loader2, Network as NetworkIcon, Search, AlertCircle, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Network() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'incoming' | 'outgoing'>('active');
  const [searchQuery, setSearchQuery] = useState("");

  const { data: network, isLoading } = useQuery({
    queryKey: ["network"],
    queryFn: () => usersApi.getNetwork(),
  });

  const acceptMutation = useMutation({
    mutationFn: (requesterId: string) => usersApi.acceptConnection(requesterId),
    onSuccess: () => {
      toast.success("Telemetry link established successfully.");
      queryClient.invalidateQueries({ queryKey: ["network"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: any) => toast.error(error.message || "Failed to authorize connection.")
  });

  const removeMutation = useMutation({
    mutationFn: (targetUserId: string) => usersApi.removeConnection(targetUserId),
    onSuccess: () => {
      toast.success("Link severed successfully.");
      queryClient.invalidateQueries({ queryKey: ["network"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: any) => toast.error(error.message || "Failed to modify network.")
  });

  if (isLoading) {
    return (
      <VeritaBoxLayout>
        <PageContent className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  const incoming = network?.incoming || [];
  const outgoing = network?.outgoing || [];
  const active = network?.active || [];

  const filterList = (list: any[]) => {
    if (!searchQuery) return list;
    return list.filter(item => 
      item.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.user?.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getFilteredData = () => {
    switch (activeTab) {
      case 'active': return filterList(active);
      case 'incoming': return filterList(incoming);
      case 'outgoing': return filterList(outgoing);
      default: return [];
    }
  };

  const displayList = getFilteredData();

  return (
    <VeritaBoxLayout>
      <PageContent className="max-w-[800px] space-y-6">
        
        {/* Network Tabs */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${
              activeTab === 'active' ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Active ({active.length})
          </button>
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors flex items-center gap-2 ${
              activeTab === 'incoming' ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Incoming {incoming.length > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] bg-warning/20 text-warning">{incoming.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${
              activeTab === 'outgoing' ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Sent ({outgoing.length})
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 h-12 bg-background border border-border rounded-lg shadow-inner">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input 
            placeholder="Query operatives by designation or code..." 
            className="bg-transparent text-[13px] flex-1 outline-none text-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Network List */}
        <Surface className="divide-y divide-border/50">
          {displayList.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground">
              <NetworkIcon className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-[13px] uppercase tracking-widest font-bold opacity-50">No Data Found</p>
              <p className="text-[11px] mt-1 opacity-60">The specified query returned zero operational links.</p>
            </div>
          ) : (
            displayList.map((conn: any) => (
              <div key={conn.user._id} className="p-5 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                <Link to={`/profile/${conn.user.username || conn.user._id}`} className="flex items-center gap-4 group">
                  {/* Avatar */}
                  <div className="h-12 w-12 rounded bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0 group-hover:border-primary/50 transition-colors">
                    {conn.user.avatarUrl ? (
                      <img src={conn.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-bold text-primary text-[15px]">{conn.user.name.substring(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  
                  {/* Identity */}
                  <div>
                    <div className="text-[14px] font-bold text-foreground flex items-center gap-2 group-hover:text-primary transition-colors">
                      {conn.user.name} 
                      <span className="text-muted-foreground font-normal text-[12px]">@{conn.user.username}</span>
                      {conn.user.rank === 'Elite' && <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" title="Elite Operative" />}
                    </div>
                    <div className="text-[11px] mt-0.5 text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <span className="text-primary">[ {conn.type} ]</span>
                      {conn.timestamp && (
                        <span className="flex items-center gap-1 opacity-70">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(conn.timestamp), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {activeTab === 'incoming' && (
                    <button 
                      onClick={() => acceptMutation.mutate(conn.user._id)}
                      disabled={acceptMutation.isPending}
                      className="h-8 px-4 bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-widest rounded hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                    >
                      {acceptMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                      Authorize
                    </button>
                  )}
                  
                  {activeTab === 'incoming' && (
                    <button 
                      onClick={() => removeMutation.mutate(conn.user._id)}
                      disabled={removeMutation.isPending}
                      className="h-8 px-3 bg-secondary text-foreground text-[11px] font-bold uppercase tracking-widest rounded hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50 border border-transparent transition-all"
                      title="Reject Request"
                    >
                      {removeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                    </button>
                  )}

                  {activeTab === 'outgoing' && (
                    <button 
                      onClick={() => removeMutation.mutate(conn.user._id)}
                      disabled={removeMutation.isPending}
                      className="h-8 px-4 bg-secondary text-foreground text-[11px] font-bold uppercase tracking-widest rounded hover:bg-destructive/20 hover:text-destructive transition-all flex items-center gap-2 border border-border"
                    >
                      {removeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertCircle className="h-3 w-3" />}
                      Revoke
                    </button>
                  )}

                  {activeTab === 'active' && (
                    <button 
                      onClick={() => {
                        if (confirm(`Are you sure you want to sever the link with ${conn.user.name}?`)) {
                          removeMutation.mutate(conn.user._id);
                        }
                      }}
                      disabled={removeMutation.isPending}
                      className="h-8 px-4 bg-transparent border border-border text-muted-foreground text-[11px] font-bold uppercase tracking-widest rounded hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all flex items-center gap-2"
                    >
                      {removeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3" />}
                      Sever Link
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </Surface>
      </PageContent>
    </VeritaBoxLayout>
  );
}
