import React from "react";
import { Link } from "react-router-dom";
import { Surface } from "@/components/veritabox/UI";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api";
import {
  Wrench, Layers, Cpu, Settings, Heart,
  Users, Globe, Code2, ShieldCheck, Hammer, Plus,
  Boxes, BookOpen, Clock, Sparkles, GitBranch
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveAssetUrl } from "@/lib/api";
import { Squad } from "@/lib/api";

interface CircuitLabSquadronViewProps {
  squadron: Squad;
  authUser: any;
  isLeader: boolean;
  onManageClick: () => void;
  onSaluteClick: () => void;
  isSaluting: boolean;
}

export default function CircuitLabSquadronView({
  squadron,
  authUser,
  isLeader,
  onManageClick,
  onSaluteClick,
  isSaluting
}: CircuitLabSquadronViewProps) {

  const totalOperatives = squadron.members?.length || 0;

  // Fetch active system modules/projects from Circuit Lab
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["squadron-projects", squadron._id],
    queryFn: () => projectsApi.getByTeamId(squadron._id),
    enabled: !!squadron._id,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ===================== MINIMAL HEADER ===================== */}
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
                <span>Hardware & System Design Lab</span>
                <span className="text-muted-foreground/30">•</span>
                <span>Circuit Lab Division</span>
              </div>
              <h1 className="text-[32px] font-semibold tracking-tight">{squadron.teamName}</h1>
              
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Boxes className="h-3 w-3 mr-1" /> {totalOperatives} Engineers
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium bg-success/10 text-success border border-success/20">
                  Persistent Squadron
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isLeader && (
                <button
                  onClick={onManageClick}
                  className="h-9 px-4 bg-foreground text-background hover:bg-foreground/90 text-[12px] font-medium rounded transition-colors flex items-center gap-2"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Manage Blueprint</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== MAIN CONTENT CONTAINER ===================== */}
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* ===================== LEFT COLUMN: PROJECTS & BRIEF ===================== */}
          <div className="space-y-6">

            {/* Persistent Laboratory Brief */}
            <Surface className="p-6 bg-background/40 border-border/60">
              <div className="space-y-3">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-3 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-primary" /> Permanent Mission Brief
                </div>
                <h2 className="text-[16px] font-bold tracking-tight text-foreground">
                  Laboratory Operations Protocol
                </h2>
                <p className="text-[13.5px] text-muted-foreground leading-relaxed whitespace-pre-line pt-1 italic">
                  "{squadron.squadronBio || "This Circuit Lab division has not registered an official operational blueprint yet."}"
                </p>
              </div>
            </Surface>

            {/* Circuit Lab Build Matrix */}
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-3">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">Blueprint Repository</div>
                <Link to={`/veritabox/projects/create?team=${squadron._id}`} className="relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 text-xs h-8 px-3 border-input bg-popover hover:bg-accent/50 text-foreground shadow-sm">
                  <Plus className="h-3.5 w-3.5" /> Build Directive
                </Link>
              </div>

              {isLoadingProjects ? (
                <div className="py-10 text-center text-muted-foreground text-[13px]">
                  Pulling team blueprints from repository...
                </div>
              ) : projects && projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {projects.map((project: any) => (
                    <article key={project._id} className="rounded-xl border border-border/60 bg-background/40 p-4 transition-all hover:border-foreground/30 flex flex-col justify-between hover:shadow-xs min-h-[140px]">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Link to={`/lab/${project._id}`} className="flex items-center gap-2 font-mono text-sm text-foreground font-semibold hover:text-primary transition-colors">
                            <GitBranch className="h-3.5 w-3.5 opacity-60 text-muted-foreground" />
                            {project.title}
                          </Link>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-mono font-medium border uppercase tracking-wider shrink-0",
                            project.status === "Battle-Ready" ? "bg-success/10 border-success/20 text-success" :
                              project.status === "Testing" ? "bg-warning/10 border-warning/20 text-warning" :
                                "bg-sky-500/10 border-sky-500/20 text-sky-400"
                          )}>
                            {project.status}
                          </span>
                        </div>
                        <p className="mt-1.5 text-muted-foreground text-xs leading-relaxed line-clamp-2">
                          {project.description}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[11px] text-muted-foreground pt-3 border-t border-border/20">
                        <div className="flex gap-1.5">
                          {project.techStack?.slice(0, 2).map((tech: string, idx: number) => {
                            const techColors = ["bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500"];
                            const colorClass = techColors[idx % techColors.length];
                            return (
                              <span key={tech} className="flex items-center gap-1.5">
                                <span className={cn("size-2 rounded-full", colorClass)}></span>
                                {tech}
                              </span>
                            );
                          })}
                        </div>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <article className="rounded-xl border border-dashed border-border/60 bg-background/20 p-6 flex flex-col items-center justify-center text-center">
                  <Cpu className="h-8 w-8 text-muted-foreground/35 mb-2.5" />
                  <div className="text-[13px] font-semibold text-muted-foreground">No Blueprints Registered</div>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">Initialize a build directive to record custom system modules.</p>
                </article>
              )}
            </div>

          </div>

          {/* ===================== RIGHT COLUMN: ROSTER ===================== */}
          <div className="space-y-6">

            {/* Roster & System Engineers */}
            <div className="space-y-3">
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-3">System Engineers</div>
              <div className="flex flex-col gap-2 bg-background/40 border border-border/60 rounded-xl p-3">
                {squadron.members.map((member: any) => {
                  const role = squadron.memberRoles?.[member._id] || (member._id === (squadron.leader as any)?._id ? 'Architect' : 'Operative');

                  return (
                    <div key={member._id} className="p-2.5 rounded-lg hover:bg-secondary/40 transition-all flex items-center justify-between border border-transparent hover:border-border/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-secondary border border-border overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs">
                          {member.avatarUrl ? (
                            <img src={resolveAssetUrl(member.avatarUrl)} className="h-full w-full object-cover" alt="Engineer" />
                          ) : (
                            <span className="text-[12px] font-bold text-muted-foreground uppercase">
                              {member.name.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <Link to={`/profile/${member.username || member._id}`} className="block">
                            <div className="text-[13px] font-bold text-foreground truncate hover:text-primary transition-colors flex items-center gap-1.5 leading-none">
                              {member.name}
                              {member._id === (squadron.leader as any)?._id && (
                                <span className="text-[8px] font-bold uppercase tracking-wider font-mono px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 leading-none">
                                  Leader
                                </span>
                              )}
                            </div>
                          </Link>
                          <span className={cn("inline-block text-[9px] font-mono font-medium tracking-wider uppercase mt-1 text-muted-foreground")}>
                            {role}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-[13px] font-bold text-foreground leading-none">{member.reputationPoints || 0}</div>
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mt-0.5">Rep</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
