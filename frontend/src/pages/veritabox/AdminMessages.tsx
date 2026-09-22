import { useState, useEffect, useRef, useMemo, useCallback, KeyboardEvent } from "react";
import { Hash, Lock, Search, Send, Smile, Paperclip, Pencil, Trash2, Shield, MessageSquare, AlertCircle } from "lucide-react";
import { AdminLayout } from "@/components/VeritaBox/AdminLayout";
import { PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Pill, Stat, Surface } from "@/components/VeritaBox/UI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { channelsApi, adminApi, Message, Channel } from "@/lib/api";

const formatTime = (ts: string | number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const formatDayLabel = (ts: string | number) => {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
};
const initialsOf = (name: string) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";

export default function AdminMessages() {
  const { profile } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const meName = profile?.name || "Admin";

  const [activeId, setActiveId] = useState<string>("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [search, setSearch] = useState("");

  const timelineRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: channels = [], isLoading: isLoadingChannels } = useQuery({
    queryKey: ["admin-channels"],
    queryFn: () => channelsApi.getAll(),
  });

  const activeChannel = useMemo(() => channels.find(c => c._id === activeId), [channels, activeId]);
  const activeTitle = activeChannel?.name || "Loading...";

  const { data: activeMessages = [] } = useQuery({
    queryKey: ["admin-messages", activeId],
    queryFn: () => channelsApi.getMessages(activeId),
    enabled: !!activeId,
  });

  const scrollToBottom = useCallback((smooth = true) => {
    const el = timelineRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }, []);

  useEffect(() => { if(isChatOpen) scrollToBottom(false); }, [isChatOpen, activeId, scrollToBottom]);
  useEffect(() => { if(isChatOpen) scrollToBottom(true); }, [activeMessages.length, isChatOpen, scrollToBottom]);

  useEffect(() => {
    if (!socket || !activeId) return;

    socket.emit("join_channel", activeId);

    const handleNewChannelMessage = (data: { channelId: string; message: Message }) => {
      if (data.channelId === activeId) {
        queryClient.invalidateQueries({ queryKey: ["admin-messages", activeId] });
      }
    };

    const handleMessageEdited = () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages", activeId] });
    };

    const handleMessageDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages", activeId] });
    };

    socket.on("NEW_CHANNEL_MESSAGE", handleNewChannelMessage);
    socket.on("MESSAGE_EDITED", handleMessageEdited);
    socket.on("MESSAGE_DELETED", handleMessageDeleted);

    return () => {
      socket.emit("leave_channel", activeId);
      socket.off("NEW_CHANNEL_MESSAGE", handleNewChannelMessage);
      socket.off("MESSAGE_EDITED", handleMessageEdited);
      socket.off("MESSAGE_DELETED", handleMessageDeleted);
    };
  }, [socket, activeId, queryClient]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !activeId) return;
    try {
      // Optimistic visual clear
      setInput("");
      
      await adminApi.adminSendMessage({ channelId: activeId, content: text });
      
      // Force invalidate immediately to show the sent message
      queryClient.invalidateQueries({ queryKey: ["admin-messages", activeId] });
      
      inputRef.current?.focus();
    } catch (err) { console.error("Admin Send Failure:", err); }
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const startEdit = (m: Message) => { setEditingId(m._id); setEditingDraft(m.content); };
  const cancelEdit = () => { setEditingId(null); setEditingDraft(""); };
  const commitEdit = async () => {
    if (!editingId) return;
    try { 
      await adminApi.adminEditMessage(editingId, editingDraft.trim()); 
      queryClient.invalidateQueries({ queryKey: ["admin-messages", activeId] });
      cancelEdit(); 
    }
    catch (err) { console.error("Admin Edit Failure:", err); }
  };

  const deleteMessage = async (id: string) => {
    try { 
      await adminApi.adminDeleteMessage(id); 
      queryClient.invalidateQueries({ queryKey: ["admin-messages", activeId] });
    }
    catch (err) { console.error("Admin Delete Failure:", err); }
  };

  const selectChannel = (c: Channel) => {
    setActiveId(c._id);
    setEditingId(null);
    setIsChatOpen(true);
  };

  const filteredChannels = channels.filter(c => c.name && c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <PageContent>
        <div className="space-y-6">
          {/* Tactical Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Stat label="Total Channels" value={channels.length || 0} />
            <Stat label="Oversight Mode" value="Active" hint="Monitoring public/private frequencies" accent="hsl(var(--primary))" />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels..." 
              className="pl-10 bg-secondary/30 border-border max-w-md"
            />
          </div>

          {/* Threads Table */}
          <Surface className="overflow-hidden border-border/50">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4">Channel Name</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4">Visibility</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4">Status</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingChannels ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center text-muted-foreground">Scanning comm frequencies...</TableCell>
                  </TableRow>
                ) : filteredChannels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center">
                      <Shield className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                      <div className="text-[14px] font-bold text-muted-foreground uppercase tracking-widest">No matching channels found</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredChannels.map((c) => (
                    <TableRow key={c._id} className="border-border/40 hover:bg-secondary/10 transition-colors">
                      <TableCell className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                            {c.isPrivate ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Hash className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-bold text-foreground truncate">
                              #{c.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono uppercase truncate">
                              {c.isPrivate ? "Private Operations" : "Public Frequency"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Pill variant="primary" className="text-[9px] h-5">
                          Channel
                        </Pill>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="text-[12px] font-medium text-muted-foreground">
                          Active
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <button 
                          onClick={() => selectChannel(c)}
                          className="inline-flex items-center gap-2 h-8 px-3 bg-secondary border border-border rounded text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all"
                        >
                          <Shield className="h-3.5 w-3.5" /> Manage
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Surface>
        </div>

        {/* Chat / Transmit Modal */}
        <Dialog open={isChatOpen} onOpenChange={(open) => !open && setIsChatOpen(false)}>
          <DialogContent className="max-w-4xl p-0 h-[85vh] flex flex-col bg-background border-border overflow-hidden rounded-xl shadow-2xl">
            <header className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0 bg-secondary/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded bg-secondary border border-border flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-bold text-[14px] truncate flex items-center gap-2">
                    #{activeTitle}
                    <Pill variant="warning" className="text-[9px] uppercase font-bold px-1.5 py-px border-warning/30 bg-warning/5 ml-2">
                      Oversight Enabled
                    </Pill>
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Admin Transmit Authorized</div>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-hidden relative flex flex-col bg-background/50">
              {/* Chat Messages */}
              <div ref={timelineRef} className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                {activeMessages.length === 0 && (
                  <div className="text-center py-20">
                    <Shield className="h-8 w-8 mx-auto text-primary/30 animate-pulse" />
                    <p className="mt-3 text-[14px] font-bold text-muted-foreground uppercase tracking-widest">
                      No Transmissions Recorded
                    </p>
                  </div>
                )}

                {activeMessages.map((m: any, i: number) => {
                  const prev = activeMessages[i - 1];
                  const showDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                  const mSenderId = typeof m.senderId === "object" ? m.senderId._id : m.senderId;
                  const prevSenderId = prev ? (typeof prev.senderId === "object" ? prev.senderId._id : prev.senderId) : null;
                  
                  const grouped = prev && prevSenderId === mSenderId && 
                    (new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 1000 * 60 * 5) && !showDay;

                  const senderName = typeof m.senderId === "object" ? m.senderId.name : "Operative";
                  const senderAvatar = typeof m.senderId === "object" ? m.senderId.avatarUrl : undefined;

                  return (
                    <div key={m._id}>
                      {showDay && (
                        <div className="flex items-center gap-3 py-3">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{formatDayLabel(m.createdAt)}</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      )}
                      
                      <div className={cn("group relative flex gap-3 px-2 py-0.5 rounded hover:bg-muted/40", grouped ? "pt-0.5" : "pt-2")}>
                        <div className="w-8 shrink-0 flex justify-center">
                          {!grouped ? (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={senderAvatar} alt="" />
                              <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">{initialsOf(senderName)}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 self-start mt-0.5 tabular-nums">
                              {formatTime(m.createdAt)}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          {!grouped && (
                            <div className="flex items-baseline gap-2">
                              <span className="text-[12px] font-bold text-foreground/90">{senderName}</span>
                              <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(m.createdAt)}</span>
                            </div>
                          )}

                          {editingId === m._id ? (
                            <div className="mt-1 border border-input rounded bg-background">
                              <Textarea
                                value={editingDraft}
                                onChange={(e) => setEditingDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
                                  if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
                                }}
                                autoFocus
                                rows={1}
                                className="border-0 resize-none min-h-[36px] text-[12px] focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                              />
                              <div className="flex justify-end gap-1 px-1.5 pb-1.5">
                                <Button size="sm" variant="ghost" className="h-5 text-[10px]" onClick={cancelEdit}>Cancel</Button>
                                <Button size="sm" className="h-5 text-[10px]" onClick={commitEdit}>Save Override</Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words text-foreground/80">
                              {m.content}
                              {m.isEdited && <span className="text-[9px] text-muted-foreground ml-2 italic">(admin edited)</span>}
                            </p>
                          )}
                        </div>

                        {!editingId && (
                          <div className="absolute -top-3 right-3 hidden group-hover:flex items-center gap-px bg-popover border border-border rounded-md shadow-sm px-0.5 py-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-warning" onClick={() => startEdit(m)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteMessage(m._id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Composer */}
              <div className="border-t border-border/50 p-4 shrink-0 bg-background">
                <div className="max-w-[900px] mx-auto">
                  <div className="border border-border/60 rounded-lg bg-secondary/10 focus-within:bg-background focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/40 transition-all">
                    <Textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={onInputKeyDown}
                      placeholder={`Transmit message as ${meName}...`}
                      rows={1}
                      className="border-0 resize-none min-h-[44px] max-h-32 text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-3"
                    />
                    <div className="flex items-center justify-between px-2 pb-2">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded hover:bg-secondary"><Paperclip className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded hover:bg-secondary"><Smile className="h-3.5 w-3.5" /></Button>
                      </div>
                      <Button
                        onClick={sendMessage}
                        disabled={!input.trim()}
                        size="sm"
                        className="h-8 text-[11px] gap-2 bg-primary text-primary-foreground font-bold uppercase tracking-widest hover:brightness-110 shadow-lg shadow-primary/20 rounded"
                      >
                        <Send className="h-3.5 w-3.5" /> Transmit
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageContent>
    </AdminLayout>
  );
}
