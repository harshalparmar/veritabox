import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, User, Package, Zap, Award, 
  Terminal, Command, X, Loader2, ArrowRight
} from "lucide-react";
import { Surface, Pill } from "@/components/veritabox/UI";
import { searchApi, SearchResults } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleOpenEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
        setQuery("");
    }
  }, [isOpen]);

  const { data: results, isLoading } = useQuery({
    queryKey: ["global-search", query],
    queryFn: () => searchApi.global(query),
    enabled: query.length >= 2,
    staleTime: 500,
  });

  const handleSelect = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={() => setIsOpen(false)} 
      />
      
      <div className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-xl overflow-hidden relative animate-in slide-in-from-top-4 duration-300">
        <div className="flex items-center px-4 h-14 border-b border-border bg-secondary/20">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input 
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none px-4 text-[15px] placeholder:text-muted-foreground/50"
            placeholder="Search operatives, missions..."
          />
          <div className="flex items-center gap-2">
             <kbd className="h-6 px-1.5 bg-secondary border border-border rounded text-[10px] font-mono text-muted-foreground flex items-center justify-center">
                /
             </kbd>
             <button onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
             </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
          {query.length < 2 ? (
            <div className="p-8 text-center space-y-4">
               <div className="h-12 w-12 bg-secondary rounded-full flex items-center justify-center mx-auto">
                  <Terminal className="h-6 w-6 text-muted-foreground opacity-40" />
               </div>
               <div className="space-y-1">
                  <p className="text-[13px] font-medium text-muted-foreground">Type at least 2 characters to engage search protocols.</p>
                  <p className="text-[11px] text-muted-foreground/40 italic">Quick commands: /profile, /settings</p>
               </div>
            </div>
          ) : isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
               <Loader2 className="h-6 w-6 animate-spin text-primary" />
               <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Scanning registries...</span>
            </div>
          ) : results ? (
            <div className="space-y-6 p-2">
               {/* USERS */}
               {results.users.length > 0 && (
                 <div>
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 border-b border-border/50 mb-2">Operatives</div>
                    <div className="space-y-1">
                       {results.users.map(u => (
                         <SearchResultItem 
                            key={u._id}
                            icon={<User className="h-4 w-4" />}
                            title={u.name!}
                            subtitle={`@${u.username || "operative"}`}
                            badge={u.role}
                            onClick={() => handleSelect(`/profile/${u.username || u._id}`)}
                         />
                       ))}
                    </div>
                 </div>
               )}



               {/* PROJECTS */}
               {results.projects.length > 0 && (
                 <div>
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 border-b border-border/50 mb-2">Mission Deployments</div>
                    <div className="space-y-1">
                       {results.projects.map(p => (
                         <SearchResultItem 
                            key={p._id}
                            icon={<Zap className="h-4 w-4" />}
                            title={p.title}
                            subtitle={p.associatedTeam?.teamName || "Global Project"}
                            onClick={() => handleSelect(`/lab/${p._id}`)}
                         />
                       ))}
                    </div>
                 </div>
               )}

               {/* BOUNTIES */}
               {results.bounties.length > 0 && (
                 <div>
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 border-b border-border/50 mb-2">Bounties & Objectives</div>
                    <div className="space-y-1">
                       {results.bounties.map(b => (
                         <SearchResultItem 
                            key={b._id}
                            icon={<Award className="h-4 w-4" />}
                            title={b.title}
                            subtitle={b.difficulty}
                            badge={`${b.reward} Rep`}
                            onClick={() => handleSelect(`/bounties/${b._id}`)}
                         />
                       ))}
                    </div>
                 </div>
               )}

               {!results.users.length && !results.projects.length && !results.bounties.length && (
                  <div className="p-12 text-center text-muted-foreground text-[13px]">
                     No records matched the specified query.
                  </div>
               )}
            </div>
          ) : null}
        </div>

        <div className="h-10 border-t border-border bg-secondary/10 px-4 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
           <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <kbd className="bg-secondary border border-border px-1 rounded">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-secondary border border-border px-1 rounded">Enter</kbd> Select
              </span>
           </div>
           <div>VeritaBox Search Engine v2.0</div>
        </div>
      </div>
    </div>
  );
}

function SearchResultItem({ icon, title, subtitle, badge, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/60 text-left transition-all group"
    >
       <div className="h-9 w-9 bg-card border border-border rounded-lg flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
          {icon}
       </div>
       <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-foreground truncate">{title}</div>
          <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
       </div>
       {badge && (
         <Pill className="text-[9px] h-5 opacity-60 group-hover:opacity-100 transition-opacity">
            {badge}
         </Pill>
       )}
       <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
    </button>
  );
}
