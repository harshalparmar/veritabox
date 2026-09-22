import { useState, useRef } from "react";
import { createPortal } from "react-dom";


import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import {
  Image, Send, Loader2,
  Zap, Award, History, MessageSquare,
  Cpu, Terminal, Users, Globe,
  ShieldCheck, ArrowRight, Edit2, Trash2, MessageCircle, X, Plus
} from "lucide-react";
import { MainnetIcon } from "@/components/VeritaBox/PlatformIcons";
import { useQuery } from "@tanstack/react-query";
import { feedApi, FeedItem, resolveAssetUrl, getToken } from "@/lib/api";

import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";

// Ultra-secure image renderer that prevents URL sharing by fetching via authenticated Blob
const SecureImage = ({ src, className, alt, onClick }: { src: string, className?: string, alt?: string, onClick?: (e: any) => void }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      try {
        setIsLoading(true);
        const token = getToken();

        // Ensure we build the full URL WITHOUT appending the token in the query
        const { BASE_URL } = await import("@/lib/api");
        let fetchUrl = src;
        if (!fetchUrl.startsWith("http")) {
          fetchUrl = `${BASE_URL}${fetchUrl.startsWith("/") ? "" : "/"}${fetchUrl}`;
        }

        const response = await fetch(fetchUrl, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const blob = await response.blob();
        if (isMounted) {
          setBlobUrl(URL.createObjectURL(blob));
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to securely load image:", error);
        if (isMounted) setIsLoading(false);
      }
    };

    if (src) fetchImage();

    return () => {
      isMounted = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src]);

  if (isLoading) {
    return <div className={cn("animate-pulse bg-secondary/50 flex items-center justify-center", className)}>
      <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
    </div>;
  }

  return <img src={blobUrl || src} className={className} alt={alt} onClick={onClick} />;
};

export default function Mainnet() {
  const [signalContent, setSignalContent] = useState("");
  const [filter, setFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editAttachments, setEditAttachments] = useState<string[]>([]);
  const [editCode, setEditCode] = useState("");
  const [commentValues, setCommentValues] = useState<Record<string, string>>({});
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const queryClient = useQueryClient();

  const { data: feed, isLoading } = useQuery({
    queryKey: ["mainnet-feed"],
    queryFn: () => feedApi.getMainnet(),
    refetchInterval: 30000,
  });

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNewSignal = (newSignal: FeedItem) => {
      queryClient.setQueryData(["mainnet-feed"], (old: FeedItem[] | undefined) => {
        if (!old) return [newSignal];
        if (old.some(item => item.id === newSignal.id)) return old;
        return [newSignal, ...old];
      });
    };

    const handleSignalUpdated = (updatedSignal: FeedItem) => {
      queryClient.setQueryData(["mainnet-feed"], (old: FeedItem[] | undefined) => {
        if (!old) return old;
        return old.map(item => item.id === updatedSignal.id ? updatedSignal : item);
      });
    };

    const handleSignalDeleted = (signalId: string) => {
      const feedId = `sig-${signalId}`;
      queryClient.setQueryData(["mainnet-feed"], (old: FeedItem[] | undefined) => {
        if (!old) return old;
        return old.filter(item => item.id !== feedId);
      });
    };

    socket.on('new_signal', handleNewSignal);
    socket.on('signal_updated', handleSignalUpdated);
    socket.on('signal_deleted', handleSignalDeleted);

    return () => {
      socket.off('new_signal', handleNewSignal);
      socket.off('signal_updated', handleSignalUpdated);
      socket.off('signal_deleted', handleSignalDeleted);
    };
  }, [socket, queryClient]);

  const { mutate: transmitSignal, isPending: isTransmitting } = useMutation({
    mutationFn: (data: any) => feedApi.transmit(data),
    onSuccess: () => {
      setSignalContent("");
      setCodeSnippet("");
      setAttachedImage(null);
      setIsCodeMode(false);
      queryClient.invalidateQueries({ queryKey: ["mainnet-feed"] });
      toast.success("Signal transmitted");
    },
  });

  const { mutate: updateSignal } = useMutation({
    mutationFn: (data: { id: string; content: string; attachments: string[]; code: string }) =>
      feedApi.updateSignal(data.id, { content: data.content, attachments: data.attachments, code: data.code }),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["mainnet-feed"] });
      toast.success("Signal updated");
    },
  });

  const { mutate: deleteSignal } = useMutation({
    mutationFn: (id: string) => feedApi.deleteSignal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mainnet-feed"] });
      toast.success("Signal decommissioned");
    },
  });

  const { mutate: addComment } = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => feedApi.addComment(id, content),
    onSuccess: (data, variables) => {
      setCommentValues(prev => ({ ...prev, [variables.id]: "" }));
      queryClient.invalidateQueries({ queryKey: ["mainnet-feed"] });
      toast.success("Comment deployed");
    },
  });

  const handleTransmit = () => {
    if (!signalContent.trim() && !codeSnippet.trim()) return;
    transmitSignal({
      content: signalContent,
      code: codeSnippet,
      attachments: attachedImage ? [attachedImage] : []
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', file);

    try {
      const { hackathonsApi } = await import("@/lib/api");
      const res = await hackathonsApi.uploadDocument(formData);
      setAttachedImage(res.filePath);
      toast.success("Artifact uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failure");
    } finally {
      setIsUploading(false);
    }
  };

  const startEditing = (item: any) => {
    setEditingId(item.meta.signalId);
    setEditValue(item.content);
    setEditAttachments(item.meta.attachments || []);
    setEditCode(item.meta.code || "");
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', file);

    try {
      const { hackathonsApi } = await import("@/lib/api");
      const res = await hackathonsApi.uploadDocument(formData);
      setEditAttachments(prev => [...prev, res.filePath]);
      toast.success("Artifact uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failure");
    } finally {
      setIsUploading(false);
    }
  };

  const getIcon = (type: FeedItem['type']) => {
    switch (type) {
      case 'PROJECT_LOG': return <History className="h-4 w-4 text-warning" />;
      case 'NEW_BOUNTY': return <Zap className="h-4 w-4 text-success" />;
      case 'BOUNTY_RESOLVED': return <Award className="h-4 w-4 text-info" />;
      case 'KNOWLEDGE_SHARE': return <MessageSquare className="h-4 w-4 text-primary" />;
      case 'SIGNAL': return <Send className="h-4 w-4 text-primary animate-pulse" />;
      default: return <MainnetIcon className="h-4 w-4" />;
    }

  };

  const getLink = (item: FeedItem) => {
    if (item.meta.projectId) return `/lab/${item.meta.projectId}`;
    if (item.meta.bountyId) return `/bounties/${item.meta.bountyId}`;
    if (item.meta.articleSlug) return `/knowledge/${item.meta.articleSlug}`;
    return "#";
  };

  return (
    <VeritaBoxLayout>
      <div style={{ "--primary": "151.7 88.4% 44.1%", "--ring": "151.7 88.4% 44.1%" } as React.CSSProperties} className="contents">
        <PageContent>
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                {["All", "Missions", "Intelligence", "Signals"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${
                      filter === t
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="relative group cursor-help hidden sm:block">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-primary/10 transition-colors">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Tactical Tip</span>
                </div>
                <div className="absolute right-0 top-full mt-2 w-72 p-4 bg-black border border-primary/20 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-[50] translate-y-1 group-hover:translate-y-0">
                  <p className="text-[12px] text-muted-foreground leading-relaxed italic">
                    "Maintain a high project heartbeat by committing mission logs at least twice per week. This increases your squad's visibility on the Mainnet."
                  </p>
                </div>
              </div>
            </div>

            <Surface className="p-4 bg-primary/5 border-primary/20">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />

              <div className="space-y-3">
                <textarea
                  placeholder="Broadcast a tactical field note..."
                  className="w-full bg-transparent resize-none text-[14px] outline-none placeholder:text-muted-foreground/60 min-h-[40px]"
                  value={signalContent}
                  onChange={(e) => setSignalContent(e.target.value)}
                  disabled={isTransmitting}
                />

                {isCodeMode && (
                  <div className="relative group">
                    <textarea
                      placeholder="Paste tactical code or logs here..."
                      className="w-full bg-black/40 border border-primary/20 p-3 rounded font-mono text-[12px] text-primary outline-none min-h-[120px]"
                      value={codeSnippet}
                      onChange={(e) => setCodeSnippet(e.target.value)}
                    />
                    <div className="absolute top-2 right-2 text-[8px] font-mono uppercase text-primary/40">Code Engine Active</div>
                  </div>
                )}

                {attachedImage && (
                  <div className="relative w-24 h-24 rounded border border-border overflow-hidden group">
                    <SecureImage src={attachedImage} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setAttachedImage(null)}
                      className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", attachedImage ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setIsCodeMode(!isCodeMode)}
                    className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", isCodeMode ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                  >
                    <Terminal className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={handleTransmit}
                  disabled={isTransmitting || isUploading || (!signalContent.trim() && !codeSnippet.trim())}
                  className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] h-8 px-3 sm:px-4 bg-foreground text-background inline-flex items-center gap-2 hover:brightness-110 transition-all rounded shadow-lg shadow-foreground/10 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isTransmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden xs:inline">Transmit Signal</span>
                  <span className="xs:hidden">Transmit</span>
                </button>
              </div>
            </Surface>



            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">Synchronizing feed...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {feed?.filter(item => {
                  if (filter === "All") return true;
                  if (filter === "Missions") return item.type === 'PROJECT_LOG' || item.type === 'NEW_BOUNTY' || item.type === 'BOUNTY_RESOLVED';
                  if (filter === "Intelligence") return item.type === 'KNOWLEDGE_SHARE';
                  if (filter === "Signals") return item.type === 'SIGNAL';
                  return true;
                }).map((item) => {
                  const isOwner = user?._id === item.meta.userId;
                  const isEditing = editingId === item.meta.signalId;

                  return (
                    <Surface key={item.id} className="p-4 sm:p-6 transition-all hover:border-primary/30 group relative">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                          {item.type === 'SIGNAL' && item.meta.avatarUrl ? (
                            <Link to={`/profile/${item.meta.userId}`}>
                              <SecureImage src={resolveAssetUrl(item.meta.avatarUrl)} className="h-full w-full object-cover" />
                            </Link>
                          ) : (
                            getIcon(item.type)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                              {item.meta.userId ? (
                                <Link to={`/profile/${item.meta.userId}`} className="text-[13px] font-bold text-foreground hover:text-primary transition-colors truncate">
                                  {item.user}
                                </Link>
                              ) : (
                                <span className="text-[13px] font-bold text-foreground truncate">{item.user}</span>
                              )}
                              <span className="text-muted-foreground/40">·</span>
                              <span className="text-[11px] text-muted-foreground truncate">{item.chapter}</span>
                              {item.meta.isEdited && (
                                <span className="text-[9px] text-primary/60 uppercase font-bold tracking-tighter">Edited</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground uppercase whitespace-nowrap">
                                {formatDistanceToNow(new Date(item.timestamp))} ago
                              </span>
                              {isOwner && item.type === 'SIGNAL' && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                                  <button
                                    onClick={() => startEditing(item)}
                                    className="p-1 hover:text-primary transition-colors"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm("Decommission this signal?")) deleteSignal(item.meta.signalId);
                                    }}
                                    className="p-1 hover:text-destructive transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Mobile action buttons - visible only on touch/mobile */}
                          {isOwner && item.type === 'SIGNAL' && (
                            <div className="flex gap-2 sm:hidden mb-2">
                              <button
                                onClick={() => startEditing(item)}
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-secondary/50 rounded flex items-center gap-1"
                              >
                                <Edit2 className="h-3 w-3" /> Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Decommission this signal?")) deleteSignal(item.meta.signalId);
                                }}
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-destructive/10 text-destructive rounded flex items-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </button>
                            </div>
                          )}

                          <div className="mb-3">
                            <Link to={getLink(item)} className="text-[15px] font-bold tracking-tight hover:text-primary transition-colors inline-flex items-center gap-2">
                              {item.title}
                              <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </Link>

                            {isEditing ? (
                              <div className="mt-2 space-y-3">
                                <textarea
                                  className="w-full bg-secondary/30 border border-border p-2 rounded text-[14px] outline-none"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  autoFocus
                                />

                                {editCode && (
                                  <textarea
                                    className="w-full bg-black/40 border border-primary/20 p-3 rounded font-mono text-[12px] text-primary outline-none min-h-[100px]"
                                    value={editCode}
                                    onChange={(e) => setEditCode(e.target.value)}
                                  />
                                )}

                                <div className="flex flex-wrap gap-2">
                                  {editAttachments.map((url, idx) => (
                                    <div key={idx} className="relative w-16 h-16 rounded border border-border overflow-hidden group/edit">
                                      <SecureImage src={resolveAssetUrl(url)} className="w-full h-full object-cover" />
                                      <button
                                        onClick={() => setEditAttachments(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute top-0.5 right-0.5 h-4 w-4 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover/edit:opacity-100 transition-opacity"
                                      >
                                        <X className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => document.getElementById(`edit-upload-${item.meta.signalId}`)?.click()}
                                    className="w-16 h-16 rounded border border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center text-muted-foreground transition-colors"
                                  >
                                    <Plus className="h-4 w-4" />
                                    <span className="text-[8px] uppercase mt-1">Add</span>
                                  </button>
                                  <input
                                    type="file"
                                    id={`edit-upload-${item.meta.signalId}`}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleEditImageUpload}
                                  />
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
                                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-[11px] hover:bg-secondary rounded flex items-center gap-1 font-bold uppercase tracking-wider">
                                    <X className="h-3 w-3" /> Cancel
                                  </button>
                                  <button
                                    onClick={() => updateSignal({ id: item.meta.signalId, content: editValue, attachments: editAttachments, code: editCode })}
                                    className="px-3 py-1.5 text-[11px] bg-foreground text-background rounded flex items-center gap-1 font-bold uppercase tracking-wider"
                                  >
                                    Save Changes
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed">
                                  {item.content}
                                </p>

                                {item.meta.code && (
                                  <div className="bg-black/60 border border-primary/20 rounded p-4 font-mono text-[12px] text-primary/90 overflow-x-auto">
                                    <pre className="whitespace-pre-wrap">{item.meta.code}</pre>
                                  </div>
                                )}

                                {item.meta.attachments?.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {item.meta.attachments.map((url: string, i: number) => (
                                      <div
                                        key={i}
                                        onClick={() => setSelectedZoomImage(url)}
                                        className="rounded-lg overflow-hidden border border-border/50 cursor-zoom-in hover:brightness-110 transition-all"
                                      >
                                        <SecureImage src={url} className="w-full h-auto object-cover max-h-[300px]" alt="Signal attachment" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {item.tags.map(tag => (
                              <Pill key={tag} className="text-[9px] h-5 bg-secondary/50">#{tag}</Pill>
                            ))}
                          </div>

                          {/* Comments Section for Signals */}
                          {item.type === 'SIGNAL' && (
                            <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                              {item.meta.comments?.map((c: any, i: number) => (
                                <div key={i} className="flex gap-2 sm:gap-3">
                                  <Link to={`/profile/${c.user?._id}`} className="shrink-0">
                                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-secondary border border-border flex items-center justify-center overflow-hidden">
                                      {c.user?.avatarUrl ? (
                                        <SecureImage src={resolveAssetUrl(c.user.avatarUrl)} className="h-full w-full object-cover" />
                                      ) : (
                                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/40" />
                                      )}
                                    </div>
                                  </Link>
                                  <div className="flex-1 bg-secondary/10 p-2 sm:p-2.5 rounded-lg border border-border/10">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-0.5 sm:gap-0">
                                      <Link to={`/profile/${c.user?._id}`} className="text-[10px] sm:text-[11px] font-bold hover:text-primary transition-colors">
                                        {c.user?.name || "Operative"}
                                      </Link>
                                      <span className="text-[8px] sm:text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt))} ago</span>
                                    </div>
                                    <p className="text-[11px] sm:text-[12px] text-muted-foreground/90 leading-relaxed">{c.content}</p>
                                  </div>
                                </div>
                              ))}

                              <div className="flex gap-2 items-center pt-2">
                                <input
                                  placeholder="Reply to signal..."
                                  className="flex-1 bg-secondary/20 border border-border/20 rounded-lg text-[12px] px-3 py-2 outline-none focus:border-primary/50 transition-colors"
                                  value={commentValues[item.meta.signalId] || ""}
                                  onChange={(e) => setCommentValues(prev => ({ ...prev, [item.meta.signalId]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && commentValues[item.meta.signalId]) {
                                      addComment({ id: item.meta.signalId, content: commentValues[item.meta.signalId] });
                                    }
                                  }}
                                />
                                <button
                                  disabled={!commentValues[item.meta.signalId]}
                                  onClick={() => addComment({ id: item.meta.signalId, content: commentValues[item.meta.signalId] })}
                                  className="h-9 w-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-30 disabled:hover:bg-primary/10 disabled:hover:text-primary"
                                >
                                  <Send className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Surface>
                  );
                })}

              </div>
            )}
          </div>
        </PageContent>
      </div>

      {/* Tactical Lightbox Overlay - Rendered via Portal to escape stacking contexts */}
      {selectedZoomImage && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-in fade-in zoom-in duration-200"
          onClick={() => setSelectedZoomImage(null)}
        >
          <div className="relative w-full h-full flex items-center justify-center p-8">
            <button className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all z-[100000] shadow-xl">
              <X className="h-5 w-5" />
            </button>
            <SecureImage
              src={selectedZoomImage}
              className="max-w-full max-h-full object-contain shadow-2xl rounded-sm border border-white/5 select-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>,
        document.body
      )}
    </VeritaBoxLayout>
  );
}
