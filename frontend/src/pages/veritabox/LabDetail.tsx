import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill, Stat } from "@/components/veritabox/UI";
import { 
  Rocket, ArrowLeft, Loader2, 
  Terminal, Zap, CheckCircle2,
  Cpu, Layers, Info, History,
  Plus, Calendar, User, ExternalLink,
  MessageSquare, Share2, AlertCircle,
  ArrowRight, Sliders, FileText,
  FileSpreadsheet, FileArchive, FileCode,
  Paperclip
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, uploadApi, resolveAssetUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function LabDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [logContent, setLogContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Editor & Uploader states for Project Briefing & Blueprint
  const [briefEditMode, setBriefEditMode] = useState<"edit" | "preview">("edit");
  const [briefDragActive, setBriefDragActive] = useState(false);
  const [isBriefUploading, setIsBriefUploading] = useState(false);

  const [editForm, setEditForm] = useState({
    title: "",
    tagline: "",
    description: "",
    status: "Ideation",
    techStackString: "",
    attachments: [] as { name: string; url: string }[],
  });

  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.getById(id!),
    enabled: !!id,
  });



  // Initialize form when project loads
  useEffect(() => {
    if (project) {
      setEditForm({
        title: project.title || "",
        tagline: project.tagline || "",
        description: project.description || "",
        status: project.status || "Ideation",
        techStackString: project.techStack ? project.techStack.join(", ") : "",
        attachments: project.attachments || [],
      });
    }
  }, [project]);

  const editMutation = useMutation({
    mutationFn: (data: any) => projectsApi.update(id!, data),
    onSuccess: () => {
      toast.success("PROJECT SETTINGS SYNCHRONIZED", {
        description: "Your build parameters have been logged and updated.",
      });
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editMutation.mutate({
      title: editForm.title,
      tagline: editForm.tagline,
      description: editForm.description,
      status: editForm.status,
      techStack: editForm.techStackString.split(",").map(t => t.trim()).filter(Boolean),
      attachments: editForm.attachments,
    });
  };

  const [mediaURL, setMediaURL] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const res = await uploadApi.uploadFile(file);
      setMediaURL(res.filePath);
      toast.success("MEDIA ATTACHED", {
        description: "Your build media was successfully uploaded and cached.",
      });
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleBriefDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setBriefDragActive(true);
    } else if (e.type === "dragleave") {
      setBriefDragActive(false);
    }
  };

  const handleBriefDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBriefDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleBriefAttachmentUpload(file);
    }
  };

  const handleBriefFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleBriefAttachmentUpload(file);
    }
  };

  const handleBriefAttachmentUpload = async (file: File) => {
    setIsBriefUploading(true);
    try {
      const res = await uploadApi.uploadFile(file);
      setEditForm(prev => ({
        ...prev,
        attachments: [
          ...(prev.attachments || []),
          { name: file.name, url: res.filePath }
        ]
      }));
      toast.success("FILE ATTACHED", {
        description: `${file.name} successfully uploaded and attached to project blueprint.`,
      });
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setIsBriefUploading(false);
    }
  };

  const logMutation = useMutation({
    mutationFn: (data: { logContent: string; isPublic: boolean; mediaURL?: string }) => 
      projectsApi.addLog(id!, data),
    onSuccess: () => {
      toast.success("MISSION LOG SYNCED", {
        description: "Your progress has been recorded in the project matrix.",
      });
      setLogContent("");
      setMediaURL("");
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <PublicShell>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PublicShell>
    );
  }

  if (error || !project) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-md py-20 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">PROJECT LOSS DETECTED</h2>
          <p className="text-muted-foreground text-sm">The project record is missing or has been retracted from the network.</p>
          <Link to="/lab" className="text-primary hover:underline">Return to Lab</Link>
        </div>
      </PublicShell>
    );
  }

  const isMember = !!user && project.associatedTeam?.members?.includes(user._id);

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="w-full max-w-[1400px] px-8 py-8 mx-auto">
          <Link to="/lab" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-all">
            <ArrowLeft className="h-3 w-3" /> Return to Catalog
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <Pill variant="warning">{project.status}</Pill>
            <span className="text-[11px] font-mono text-muted-foreground uppercase">Build Log</span>
          </div>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">{project.title}</h1>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground max-w-2xl">
            {project.tagline || "Project depth record active."}
          </p>
        </div>
      </div>

      <div className="w-full max-w-[1400px] px-8 py-6 mx-auto">
        <div className="flex items-center justify-between mb-4">
           <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Build details</div>
           <div className="flex items-center gap-2">
              {isMember && (
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="h-8 px-3 border border-primary/50 hover:bg-primary/10 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all rounded-lg text-primary animate-in fade-in slide-in-from-right-3 duration-200"
                >
                  <Sliders className="h-3.5 w-3.5" /> Manage Project
                </button>
              )}
              <button className="h-8 px-3 border border-border hover:bg-secondary text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all rounded-lg">
                  <Share2 className="h-3.5 w-3.5" /> Share Project
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 space-y-5">
            {/* Project Specifications/Briefing */}
            <Surface className="p-4 md:p-5 space-y-4 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
              <div className="flex items-center justify-between border-b border-border/20 pb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" /> Project Briefing & Blueprint
                </h3>
                <Pill variant="warning" className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5">{project.status}</Pill>
              </div>
              
              <div className="prose dark:prose-invert max-w-none">
                {project.description ? (
                  <div className="text-[13.5px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {project.description}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-[13px] leading-relaxed text-muted-foreground/60 italic">
                    No project description provided.
                  </p>
                )}
              </div>

              {/* Blueprint Attachments */}
              {project.attachments && project.attachments.length > 0 && (
                <div className="pt-4 border-t border-border/25 space-y-3">
                  <div className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-bold font-mono">Blueprint Attachments & Documents</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {project.attachments.map((file, idx) => (
                      <a
                        key={idx}
                        href={resolveAssetUrl(file.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/45 transition-all text-left group"
                      >
                        {getFileIcon(file.name)}
                        <div className="flex-grow min-w-0">
                           <div className="text-[11.5px] font-semibold truncate group-hover:text-primary transition-colors">{file.name}</div>
                           <span className="text-[8px] text-muted-foreground uppercase tracking-widest font-mono">Open Document</span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {project.techStack && project.techStack.length > 0 && (
                <div className="pt-4 border-t border-border/25 space-y-2">
                  <div className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-bold font-mono">Tech Stack Matrix</div>
                  <div className="flex flex-wrap gap-1.5">
                    {project.techStack.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-secondary/80 text-foreground/90 border border-border/60">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Surface>

            {/* Mission Progress Feed */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Mission Logs & Progress
                </h3>
                <span className="text-[9px] font-mono text-muted-foreground uppercase">{project.progressMatrix.length} Logs Synchronized</span>
              </div>

              {isMember && (
                <Surface className="p-4 md:p-5 space-y-3 border-primary/20 bg-primary/5 rounded-xl hover:border-primary/30 hover:shadow-xs transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Plus className="h-3.5 w-3.5" /> Submit Mission Log
                    </label>
                    <button 
                      type="button"
                      onClick={() => setIsPublic(!isPublic)}
                      className={cn(
                        "text-[8px] px-2 py-1 border rounded uppercase font-bold tracking-widest transition-all",
                        isPublic ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {isPublic ? "Broadcast: Public" : "Broadcast: Internal"}
                    </button>
                  </div>
                  <Textarea 
                    value={logContent}
                    onChange={(e) => setLogContent(e.target.value)}
                    placeholder="What tactical objectives were achieved today? Describe milestones..."
                    className="bg-background/50 border-border focus:border-primary/50 text-[13px] min-h-[90px] resize-none"
                  />

                  {/* Drag and Drop Upload */}
                  {!mediaURL ? (
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", dragActive ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                      onClick={() => document.getElementById("log-file-input")?.click()}
                    >
                      <input 
                        id="log-file-input"
                        type="file" 
                        className="hidden" 
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-[9px] uppercase font-bold tracking-wider text-primary">Uploading telemetry...</span>
                        </>
                      ) : (
                        <>
                          <Layers className="h-4 w-4 text-muted-foreground/60" />
                          <span className="text-[10.5px] font-medium text-muted-foreground">
                            {dragActive ? "Drop to deploy media" : "Drag media file here or click to browse"}
                          </span>
                          <span className="text-[8px] uppercase tracking-wide text-muted-foreground/40 font-bold">Standard PDF, PNG, JPG (5MB max)</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="relative border border-border/80 rounded-lg overflow-hidden bg-secondary/20 p-2 flex items-center justify-between animate-in fade-in slide-in-from-top-3 duration-250">
                      <div className="flex items-center gap-3">
                        {mediaURL.endsWith(".pdf") ? (
                          <div className="h-10 w-10 bg-destructive/10 rounded-lg flex items-center justify-center text-destructive font-mono font-bold text-[9px]">
                            PDF
                          </div>
                        ) : (
                          <img 
                            src={resolveAssetUrl(mediaURL)} 
                            alt="Uploaded attachment" 
                            className="h-10 w-10 object-cover rounded-lg border border-border/60"
                          />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold truncate">Attachment Cached</span>
                          <span className="text-[8px] font-mono text-muted-foreground truncate">{mediaURL}</span>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setMediaURL("")}
                        className="h-7 px-3 border border-destructive/30 hover:bg-destructive/10 text-destructive text-[8px] font-bold uppercase tracking-widest rounded-lg transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button 
                      type="button"
                      onClick={() => logMutation.mutate({ logContent, isPublic, mediaURL })}
                      disabled={logMutation.isPending || !logContent.trim() || isUploading}
                      className="h-8 px-5 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[9px] flex items-center gap-2 hover:brightness-110 transition-all rounded-lg disabled:opacity-50"
                    >
                      {logMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Commit Log"}
                    </button>
                  </div>
                </Surface>
              )}

              <div className="space-y-3 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-px before:bg-border/30">
                {project.progressMatrix.length > 0 ? (
                  [...project.progressMatrix].reverse().map((log, idx) => (
                    <div key={idx} className="relative pl-10">
                      <div className="absolute left-[16px] top-4 h-2.5 w-2.5 rounded-full bg-border border-2 border-background z-10" />
                      <Surface className="p-4 space-y-2.5 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {format(new Date(log.timestamp), "MMM dd, yyyy · HH:mm")}
                          </div>
                          {log.isPublic ? (
                            <Pill variant="success" className="h-4 text-[8px]">Global</Pill>
                          ) : (
                            <Pill className="h-4 text-[8px]">Internal</Pill>
                          )}
                        </div>
                        <p className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
                          {log.logContent}
                        </p>
                        {log.mediaURL && (
                          <div className="mt-3 border border-border/60 rounded-lg overflow-hidden bg-secondary/5 max-w-lg animate-in fade-in zoom-in-95 duration-200">
                            {log.mediaURL.endsWith(".pdf") ? (
                              <a 
                                href={resolveAssetUrl(log.mediaURL)} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-2.5 flex items-center justify-between text-[11px] hover:bg-secondary/15 transition-all text-primary font-bold uppercase tracking-wider"
                              >
                                View Telemetry PDF Document
                                <ExternalLink className="h-4.5 w-4.5" />
                              </a>
                            ) : (
                              <a 
                                href={resolveAssetUrl(log.mediaURL)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img 
                                  src={resolveAssetUrl(log.mediaURL)} 
                                  alt="Log attachment" 
                                  className="w-full h-auto max-h-[260px] object-cover hover:brightness-110 transition-all cursor-pointer"
                                />
                              </a>
                            )}
                          </div>
                        )}
                      </Surface>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center opacity-30 grayscale italic text-[12px] text-muted-foreground">
                    No mission logs have been committed to this matrix yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Project Vitals Card */}
            <Surface className="p-4 space-y-3 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground pb-1.5 border-b border-border/20">Project Vitals</div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-muted-foreground">Registry Status</span>
                  <span className="font-semibold text-foreground">{project.status}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-muted-foreground">Registry Date</span>
                  <span className="font-mono text-foreground font-semibold">{format(new Date(project.createdAt), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-muted-foreground">Last Synchronized</span>
                  <span className="font-mono text-foreground font-semibold">{format(new Date(project.updatedAt), "MMM dd, yyyy")}</span>
                </div>
              </div>
            </Surface>

            {/* Squadron Card */}
            <Surface className="p-4 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground pb-1.5 border-b border-border/20 mb-3">Assigned Squadron</div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {project.associatedTeam?.teamName?.substring(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold truncate">{project.associatedTeam?.teamName}</div>
                  <div className="text-[9px] text-muted-foreground uppercase">{project.associatedTeam?.members?.length || 0} Operatives</div>
                </div>
                <Link to={`/squadron/${project.associatedTeam?._id || ''}`}>
                  <ArrowRight className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors shrink-0" />
                </Link>
              </div>
            </Surface>
          </div>
        </div>
      </div>

      {/* Settings Modal overlay */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border max-w-xl w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-border/80 flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                  <Sliders className="h-4 w-4" /> Manage Build Parameters
                </h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Project Config Console</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-[11px] font-bold uppercase tracking-wider"
              >
                Close [ESC]
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Project Designation (Title) *</label>
                <Input 
                  required
                  value={editForm.title}
                  onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Project Halcyon"
                  className="h-10 bg-secondary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tagline / Mission Summary</label>
                <Input 
                  value={editForm.tagline}
                  onChange={e => setEditForm(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="e.g. Core micro-controller system with LiDAR navigation."
                  className="h-10 bg-secondary/30"
                />
              </div>



              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deployment Stage</label>
                  <select 
                    value={editForm.status}
                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full h-10 px-3 bg-secondary/30 border border-border hover:bg-secondary rounded text-[12.5px] font-medium outline-none transition-colors"
                  >
                    <option value="Ideation">Ideation</option>
                    <option value="Prototype">Prototype</option>
                    <option value="Testing">Testing</option>
                    <option value="Battle-Ready">Battle-Ready</option>
                    <option value="Mission-Complete">Mission-Complete</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tech Stack Matrix (comma separated)</label>
                  <Input 
                    value={editForm.techStackString}
                    onChange={e => setEditForm(prev => ({ ...prev, techStackString: e.target.value }))}
                    placeholder="React, Esp32, Python, MQTT"
                    className="h-10 bg-secondary/30 font-mono text-[12px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Project Briefing / Mission Parameters *</label>
                  <div className="flex border border-border rounded overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setBriefEditMode("edit")}
                      className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", briefEditMode === "edit" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setBriefEditMode("preview")}
                      className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", briefEditMode === "preview" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {briefEditMode === "edit" ? (
                  <Textarea 
                    required
                    rows={12}
                    value={editForm.description}
                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the objective, strategic justification, and tactical mechanics using Markdown..."
                    className="bg-secondary/30 text-[13.5px] font-mono leading-relaxed resize-y min-h-[220px]"
                  />
                ) : (
                  <div className="border border-border rounded-md bg-secondary/15 p-4 min-h-[260px] max-h-[400px] overflow-y-auto prose dark:prose-invert max-w-none text-[13.5px] whitespace-pre-wrap">
                    {editForm.description ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {editForm.description}
                      </ReactMarkdown>
                    ) : (
                      <span className="text-muted-foreground/45 italic text-[12px]">Nothing to preview. Write something first!</span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Blueprint Attachments (PDF, DOCX, XLSX, ZIP, etc.)</label>
                
                {editForm.attachments && editForm.attachments.length > 0 && (
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                    {editForm.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border border-border/80 bg-secondary/20 text-[12.5px]">
                        <div className="flex items-center gap-2 truncate">
                          {getFileIcon(file.name)}
                          <span className="truncate font-semibold">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditForm(prev => ({
                            ...prev,
                            attachments: prev.attachments.filter((_, i) => i !== idx)
                          }))}
                          className="px-2 py-0.5 border border-destructive/30 hover:bg-destructive/10 text-destructive text-[10px] font-bold uppercase rounded tracking-wider shrink-0 transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div 
                  onDragEnter={handleBriefDrag}
                  onDragOver={handleBriefDrag}
                  onDragLeave={handleBriefDrag}
                  onDrop={handleBriefDrop}
                  className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", briefDragActive ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                  onClick={() => document.getElementById("brief-file-input")?.click()}
                >
                  <input 
                    id="brief-file-input"
                    type="file" 
                    className="hidden" 
                    onChange={handleBriefFileChange}
                    disabled={isBriefUploading}
                  />
                  {isBriefUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-[10px] uppercase font-bold tracking-wider text-primary">Uploading attachment...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="h-4 w-4 text-muted-foreground/60" />
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {briefDragActive ? "Drop file to attach" : "Drag file here or click to attach"}
                      </span>
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground/40 font-bold">PDF, DOC, DOCX, XLS, XLSX, ZIP, JSON (10MB max)</span>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border/80">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-10 px-4 border border-border hover:bg-secondary text-[11px] font-bold uppercase tracking-widest rounded transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={editMutation.isPending}
                  className="h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/95 text-[11px] font-bold uppercase tracking-widest rounded flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {editMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Synchronizing...
                    </>
                  ) : (
                    "Save Parameters"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PublicShell>
  );
}

function Users({ className }: { className?: string }) {
    return <User className={className} />;
}

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="h-5 w-5 text-destructive shrink-0" />;
  if (['doc', 'docx'].includes(ext || '')) return <FileText className="h-5 w-5 text-sky-400 shrink-0" />;
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className="h-5 w-5 text-emerald-400 shrink-0" />;
  if (['zip', 'rar', 'tar', 'gz'].includes(ext || '')) return <FileArchive className="h-5 w-5 text-amber-500 shrink-0" />;
  if (['json', 'js', 'ts', 'py', 'c', 'cpp'].includes(ext || '')) return <FileCode className="h-5 w-5 text-purple-400 shrink-0" />;
  return <Paperclip className="h-5 w-5 text-muted-foreground shrink-0" />;
};
