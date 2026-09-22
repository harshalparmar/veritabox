import { useState, useEffect, useRef, useMemo, useCallback, KeyboardEvent } from "react";
import { Hash, Lock, Plus, Search, Send, Smile, Paperclip, Menu, Pencil, Trash2, MoreHorizontal, Settings, LogOut, Pin, Reply, X, Loader2, AtSign, ArrowLeft, Home, Users, Bell, BellOff } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { VeritaBoxLogo } from "@/components/VeritaBoxLogo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { channelsApi, messagesApi, usersApi, presenceApi, resolveAssetUrl, Message, Channel, Conversation, MessageAttachment, MessageReaction, User } from "@/lib/api";

const REACTION_PALETTE = ["ðŸ‘", "ðŸŽ‰", "â¤ï¸", "ðŸ˜‚", "ðŸ‘€", "ðŸš€", "ðŸ™", "ðŸ”¥", "ðŸ’¯", "ðŸ¤–"];

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
const getId = (v: any): string => (typeof v === "object" && v ? v._id : v) as string;

// Render message text with clickable links and highlighted @mentions.
const URL_SPLIT = /(https?:\/\/[^\s]+)/g;
const MENTION_SPLIT = /(@[a-zA-Z0-9_]+)/g;
function renderRichText(text: string): React.ReactNode {
  if (!text) return text;
  const out: React.ReactNode[] = [];
  let k = 0;
  for (const chunk of text.split(URL_SPLIT)) {
    if (/^https?:\/\//.test(chunk)) {
      out.push(
        <a key={k++} href={chunk} target="_blank" rel="noopener noreferrer"
           className="text-primary underline underline-offset-2 hover:text-primary/80 break-all">{chunk}</a>
      );
    } else {
      for (const piece of chunk.split(MENTION_SPLIT)) {
        if (/^@[a-zA-Z0-9_]+$/.test(piece)) {
          out.push(<span key={k++} className="text-primary bg-primary/10 rounded px-1 font-medium">{piece}</span>);
        } else if (piece) {
          out.push(<span key={k++}>{piece}</span>);
        }
      }
    }
  }
  return out;
}

export default function Messages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, signOut } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const meName = profile?.name || profile?.username || "You";

  const userIdParam = searchParams.get("userId");
  const [activeId, setActiveId] = useState<string>(userIdParam || "");
  const [activeKind, setActiveKind] = useState<"channel" | "dm">(userIdParam ? "dm" : "channel");
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, { name: string; ts: number }>>(new Map());
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());
  const [showJump, setShowJump] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [dmSeen, setDmSeen] = useState(false);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [channelDetailsOpen, setChannelDetailsOpen] = useState(false);
  const [mutedChannels, setMutedChannels] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("muted-channels") || "[]")); } catch { return new Set(); }
  });

  const timelineRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emittingTypingRef = useRef(false);
  const atBottomRef = useRef(true);
  const prevLastIdRef = useRef<string | undefined>(undefined);
  const roomKeyRef = useRef<string>("");
  const openUnreadRef = useRef(0);
  const mutedChannelsRef = useRef(mutedChannels);
  useEffect(() => { mutedChannelsRef.current = mutedChannels; }, [mutedChannels]);

  // ---------- data queries ----------
  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: () => channelsApi.getAll(),
  });

  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messagesApi.getConversations(),
  });

  const { data: network } = useQuery({
    queryKey: ["network"],
    queryFn: () => usersApi.getNetwork(),
  });

  useEffect(() => {
    if (userIdParam) {
      setActiveId(userIdParam);
      setActiveKind("dm");
    } else if (channels.length > 0 && !activeId) {
      setActiveId(channels[0]._id);
      setActiveKind("channel");
    }
  }, [channels, activeId, userIdParam]);

  const activeChannel = useMemo(() => channels.find(c => c._id === activeId), [channels, activeId]);
  const activeConversation = useMemo(() => conversations.find(c => c.otherParticipant?._id === activeId), [conversations, activeId]);

  const activeTitle = activeKind === "channel"
    ? activeChannel?.name || "Loading..."
    : activeConversation?.otherParticipant?.name || network?.active.find((conn: any) => conn.user?._id === activeId)?.user?.name || "Loading...";
  const activeTopic = activeKind === "channel" ? activeChannel?.topic : "Direct Message Secure Uplink";

  const { data: activeMessages = [] } = useQuery({
    queryKey: ["messages", activeKind, activeId],
    queryFn: () => activeKind === "channel"
      ? channelsApi.getMessages(activeId)
      : messagesApi.getHistory(activeId),
    enabled: !!activeId,
  });

  const { data: pinnedMessages = [] } = useQuery({
    queryKey: ["pinned", activeId],
    queryFn: () => channelsApi.getPinned(activeId),
    enabled: !!activeId && activeKind === "channel" && pinnedOpen,
  });

  // ---------- presence initial load ----------
  useEffect(() => {
    presenceApi.getOnline().then(({ online }) => setOnlineSet(new Set(online))).catch(() => {});
  }, []);

  // ---------- scroll ----------
  const scrollToBottom = useCallback((smooth = true) => {
    const el = timelineRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }, []);

  // Capture a channel's unread count the moment it's opened (before markRead
  // zeroes it) so the "new messages" divider knows where to sit. Also reset
  // pagination + read-receipt state for the new room.
  useEffect(() => {
    if (activeKind === "channel") {
      const ch = channels.find(c => c._id === activeId);
      openUnreadRef.current = ch?.unreadCount ?? 0;
    } else {
      openUnreadRef.current = 0;
    }
    setHasMore(true);
    setDmSeen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, activeKind]);

  // Smart auto-scroll: jump to bottom on room open and for your own sends;
  // otherwise only follow new messages when you're already near the bottom.
  useEffect(() => {
    const roomKey = `${activeKind}:${activeId}`;
    const last = activeMessages[activeMessages.length - 1];
    const lastId = last?._id;

    if (roomKeyRef.current !== roomKey) {
      roomKeyRef.current = roomKey;
      atBottomRef.current = true;
      setShowJump(false);
      scrollToBottom(false);
    } else if (lastId && lastId !== prevLastIdRef.current) {
      const isMine = last && getId(last.senderId) === profile?._id;
      if (atBottomRef.current || isMine) scrollToBottom(true);
      else setShowJump(true);
    }
    prevLastIdRef.current = lastId;
  }, [activeMessages, activeId, activeKind, scrollToBottom, profile?._id]);

  // ---------- load older (pagination) ----------
  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || !activeId) return;
    const cacheKey = ["messages", activeKind, activeId];
    const current = queryClient.getQueryData<Message[]>(cacheKey) || [];
    const oldest = current[0];
    if (!oldest) return;
    setLoadingOlder(true);
    const el = timelineRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const older = activeKind === "channel"
        ? await channelsApi.getMessages(activeId, { before: String(oldest.createdAt), limit: 50 })
        : await messagesApi.getHistory(activeId, { before: String(oldest.createdAt), limit: 50 });
      if (older.length < 50) setHasMore(false);
      if (older.length > 0) {
        queryClient.setQueryData<Message[]>(cacheKey, (prev = []) => {
          const seen = new Set(prev.map(m => m._id));
          return [...older.filter(m => !seen.has(m._id)), ...prev];
        });
        requestAnimationFrame(() => {
          const el2 = timelineRef.current;
          if (el2) el2.scrollTop = el2.scrollHeight - prevHeight;
        });
      }
    } catch {
      /* keep hasMore; user can retry by scrolling */
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, activeId, activeKind, queryClient]);

  // ---------- timeline scroll tracking ----------
  const onTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    atBottomRef.current = nearBottom;
    if (nearBottom && showJump) setShowJump(false);
    if (el.scrollTop < 80) loadOlder();
  }, [showJump, loadOlder]);

  // ---------- mark active room as read ----------
  useEffect(() => {
    if (!activeId) return;
    if (activeKind === "channel") {
      channelsApi.markRead(activeId).then(() => {
        queryClient.setQueryData<Channel[]>(["channels"], (prev) =>
          prev?.map(c => c._id === activeId ? { ...c, unreadCount: 0 } : c) ?? []
        );
      }).catch(() => {});
    } else {
      messagesApi.markDmRead(activeId).then(() => refetchConversations()).catch(() => {});
    }
  }, [activeId, activeKind, queryClient, refetchConversations]);

  // ---------- socket subscriptions ----------
  useEffect(() => {
    if (!socket || !activeId) return;

    if (activeKind === "channel") socket.emit("join_channel", activeId);

    const applyToActive = (msg: Message) => {
      queryClient.setQueryData<Message[]>(["messages", activeKind, activeId], (prev = []) => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    const handleNewMessage = (msg: Message) => {
      refetchConversations();
      const sId = getId(msg.senderId);
      const rId = getId(msg.receiverId);
      if (activeKind === "dm" && (sId === activeId || rId === activeId)) applyToActive(msg);
    };

    const handleNewChannelMessage = (data: { channelId: string; message: Message }) => {
      if (activeKind === "channel" && data.channelId === activeId) {
        applyToActive(data.message);
      } else if (!mutedChannelsRef.current.has(data.channelId)) {
        // bump unread count on the channel in sidebar (muted channels stay quiet)
        queryClient.setQueryData<Channel[]>(["channels"], (prev) =>
          prev?.map(c => c._id === data.channelId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c) ?? []
        );
      }
    };

    const updateOne = (msg: Message) => {
      queryClient.setQueryData<Message[]>(["messages", activeKind, activeId], (prev = []) =>
        prev.map(m => m._id === msg._id ? msg : m));
      queryClient.setQueryData<Message[]>(["pinned", activeId], (prev = []) =>
        prev.map(m => m._id === msg._id ? msg : m));
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      queryClient.setQueryData<Message[]>(["messages", activeKind, activeId], (prev = []) =>
        prev.filter(m => m._id !== data.messageId));
    };

    const handleMessagePinned = (msg: Message) => {
      updateOne(msg);
      queryClient.invalidateQueries({ queryKey: ["pinned", activeId] });
    };

    const handleTypingStart = ({ userId, name, channelId }: any) => {
      if (userId === profile?._id) return;
      if (activeKind === "channel" && channelId !== activeId) return;
      if (activeKind === "dm" && userId !== activeId) return;
      setTypingUsers(prev => {
        const n = new Map(prev);
        n.set(userId, { name, ts: Date.now() });
        return n;
      });
    };
    const handleTypingStop = ({ userId }: any) => {
      setTypingUsers(prev => {
        const n = new Map(prev);
        n.delete(userId);
        return n;
      });
    };

    const handleDmRead = ({ readerId }: { readerId: string }) => {
      if (activeKind === "dm" && readerId === activeId) setDmSeen(true);
    };

    const handlePresenceOnline = ({ userId }: { userId: string }) =>
      setOnlineSet(prev => { const n = new Set(prev); n.add(userId); return n; });
    const handlePresenceOffline = ({ userId }: { userId: string }) =>
      setOnlineSet(prev => { const n = new Set(prev); n.delete(userId); return n; });
    const handlePresenceSnapshot = ({ online }: { online: string[] }) => setOnlineSet(new Set(online));

    socket.on("NEW_MESSAGE", handleNewMessage);
    socket.on("NEW_CHANNEL_MESSAGE", handleNewChannelMessage);
    socket.on("MESSAGE_EDITED", updateOne);
    socket.on("MESSAGE_DELETED", handleMessageDeleted);
    socket.on("MESSAGE_REACTED", updateOne);
    socket.on("MESSAGE_PINNED", handleMessagePinned);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("DM_READ", handleDmRead);
    socket.on("presence:online", handlePresenceOnline);
    socket.on("presence:offline", handlePresenceOffline);
    socket.on("presence:snapshot", handlePresenceSnapshot);

    return () => {
      if (activeKind === "channel") socket.emit("leave_channel", activeId);
      socket.off("NEW_MESSAGE", handleNewMessage);
      socket.off("NEW_CHANNEL_MESSAGE", handleNewChannelMessage);
      socket.off("MESSAGE_EDITED", updateOne);
      socket.off("MESSAGE_DELETED", handleMessageDeleted);
      socket.off("MESSAGE_REACTED", updateOne);
      socket.off("MESSAGE_PINNED", handleMessagePinned);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("DM_READ", handleDmRead);
      socket.off("presence:online", handlePresenceOnline);
      socket.off("presence:offline", handlePresenceOffline);
      socket.off("presence:snapshot", handlePresenceSnapshot);
    };
  }, [socket, activeId, activeKind, queryClient, refetchConversations, profile?._id]);

  // ---------- prune stale typing ----------
  useEffect(() => {
    const t = setInterval(() => {
      setTypingUsers(prev => {
        const now = Date.now();
        const n = new Map(prev);
        for (const [k, v] of n) if (now - v.ts > 4000) n.delete(k);
        return n;
      });
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // ---------- send ----------
  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && pendingAttachments.length === 0) || !activeId || sending) return;

    const attachments = pendingAttachments;
    const replyId = replyTo?._id;
    const cacheKey = ["messages", activeKind, activeId];
    const tempId = `temp-${Date.now()}`;
    const optimistic: any = {
      _id: tempId,
      content: text,
      senderId: { _id: profile?._id, name: meName, avatarUrl: profile?.avatarUrl },
      channelId: activeKind === "channel" ? activeId : undefined,
      receiverId: activeKind === "dm" ? activeId : undefined,
      attachments,
      reactions: [],
      replyTo: replyTo || undefined,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    // Optimistic insert + clear the composer immediately.
    queryClient.setQueryData<Message[]>(cacheKey, (prev = []) => [...prev, optimistic]);
    setInput("");
    setPendingAttachments([]);
    setReplyTo(null);
    setDmSeen(false);
    atBottomRef.current = true;
    scrollToBottom(true);
    inputRef.current?.focus();
    if (emittingTypingRef.current) {
      socket?.emit("typing:stop", activeKind === "channel" ? { channelId: activeId } : { receiverId: activeId });
      emittingTypingRef.current = false;
    }

    setSending(true);
    try {
      const real = activeKind === "channel"
        ? await channelsApi.sendMessage(activeId, text, { attachments, replyTo: replyId })
        : await messagesApi.sendMessage(activeId, text, { attachments, replyTo: replyId });
      // Swap the temp message for the real one (socket echo dedupes by _id).
      queryClient.setQueryData<Message[]>(cacheKey, (prev = []) => {
        const withoutTemp = prev.filter(m => m._id !== tempId);
        return withoutTemp.some(m => m._id === real._id) ? withoutTemp : [...withoutTemp, real];
      });
      refetchConversations();
    } catch (err: any) {
      // Roll back the optimistic message and restore the composer.
      queryClient.setQueryData<Message[]>(cacheKey, (prev = []) => prev.filter(m => m._id !== tempId));
      setInput(text);
      setPendingAttachments(attachments);
      toast.error(err?.message || "Message send failure");
    } finally {
      setSending(false);
    }
  };

  // Detect an in-progress @mention at the caret and open the picker.
  const onComposerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    emitTyping();
    const caret = e.target.selectionStart ?? val.length;
    const m = val.slice(0, caret).match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
    if (m) {
      setMention({ query: m[1], start: caret - m[1].length - 1 });
      setMentionIdx(0);
    } else if (mention) {
      setMention(null);
    }
  };

  const insertMention = (u: any) => {
    if (!mention || !u?.username) return;
    const el = inputRef.current;
    const caret = el?.selectionStart ?? input.length;
    const before = input.slice(0, mention.start);
    const after = input.slice(caret);
    const inserted = `${before}@${u.username} ${after}`;
    setInput(inserted);
    setMention(null);
    requestAnimationFrame(() => {
      const pos = (before + "@" + u.username + " ").length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx(i => (i + 1) % mentionCandidates.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx(i => (i - 1 + mentionCandidates.length) % mentionCandidates.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(mentionCandidates[mentionIdx]); return; }
      if (e.key === "Escape") { e.preventDefault(); setMention(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const emitTyping = () => {
    if (!socket || !activeId) return;
    if (!emittingTypingRef.current) {
      socket.emit("typing:start", activeKind === "channel" ? { channelId: activeId } : { receiverId: activeId });
      emittingTypingRef.current = true;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing:stop", activeKind === "channel" ? { channelId: activeId } : { receiverId: activeId });
      emittingTypingRef.current = false;
    }, 2500);
  };

  // ---------- attachments ----------
  const onFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    try {
      const results = await Promise.all(files.map(f => messagesApi.uploadAttachment(f)));
      setPendingAttachments(prev => [...prev, ...results]);
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removePendingAttachment = (idx: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // ---------- edit / delete / react / pin ----------
  const startEdit = (m: Message) => { setEditingId(m._id); setEditingDraft(m.content); };
  const cancelEdit = () => { setEditingId(null); setEditingDraft(""); };
  const commitEdit = async () => {
    if (!editingId) return;
    try {
      await messagesApi.editMessage(editingId, editingDraft.trim());
      cancelEdit();
    } catch (err: any) {
      toast.error(err?.message || "Edit failed");
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await messagesApi.deleteMessage(id);
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    }
  };

  const react = async (id: string, emoji: string) => {
    try {
      await messagesApi.react(id, emoji);
    } catch (err: any) {
      toast.error(err?.message || "Reaction failed");
    }
  };

  const togglePin = async (id: string) => {
    try {
      await messagesApi.pin(id);
      queryClient.invalidateQueries({ queryKey: ["pinned", activeId] });
    } catch (err: any) {
      toast.error(err?.message || "Pin failed");
    }
  };

  // ---------- select room ----------
  const selectRoom = (id: string, kind: "channel" | "dm") => {
    setActiveId(id);
    setActiveKind(kind);
    setSidebarOpen(false);
    setEditingId(null);
    setReplyTo(null);
    setPendingAttachments([]);
  };

  // ---------- mute (personal, client-side) ----------
  const toggleMute = (id: string) => {
    setMutedChannels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem("muted-channels", JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  // ---------- leave channel ----------
  const leaveChannel = async (id: string) => {
    try {
      await channelsApi.leave(id);
      setChannelDetailsOpen(false);
      const remaining = channels.filter(c => c._id !== id);
      await queryClient.invalidateQueries({ queryKey: ["channels"] });
      if (activeId === id) {
        if (remaining.length > 0) selectRoom(remaining[0]._id, "channel");
        else { setActiveId(""); setActiveKind("channel"); }
      }
      toast.success("Left channel");
    } catch (err: any) {
      toast.error(err?.message || "Failed to leave channel");
    }
  };

  // ---------- create new channel ----------
  const createChannel = async (data: { name: string; topic?: string; isPrivate?: boolean }) => {
    try {
      const created = await channelsApi.create(data);
      await queryClient.invalidateQueries({ queryKey: ["channels"] });
      setNewChannelOpen(false);
      selectRoom(created._id, "channel");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create channel");
    }
  };

  // ---------- filtering ----------
  const filteredChannels = channels.filter(c => c.name.toLowerCase().includes(sidebarQuery.toLowerCase()));

  const dmUsersList = useMemo(() => {
    const list = conversations.map(c => ({
      _id: c.otherParticipant?._id || "",
      name: c.otherParticipant?.name || c.otherParticipant?.username || "Unknown Operative",
      avatarUrl: c.otherParticipant?.avatarUrl,
      unread: c.unreadCount || 0
    }));
    network?.active.forEach((conn: any) => {
      const u = conn.user;
      if (u && u._id && !list.some(d => d._id === u._id) && u._id !== profile?._id) {
        list.push({ _id: u._id, name: u.name || u.username || "Unknown", avatarUrl: u.avatarUrl, unread: 0 });
      }
    });
    return list.filter(u => u.name.toLowerCase().includes(sidebarQuery.toLowerCase()));
  }, [conversations, network, profile, sidebarQuery]);

  // First message that falls after the last-read point â€” where the
  // "New messages" divider is drawn.
  const unreadBoundaryId = useMemo(() => {
    if (!activeId || activeMessages.length === 0) return null;
    if (activeKind === "channel") {
      const u = openUnreadRef.current;
      if (u > 0 && u <= activeMessages.length) {
        return activeMessages[activeMessages.length - u]?._id ?? null;
      }
      return null;
    }
    const first = activeMessages.find(m => !m.isRead && getId(m.receiverId) === profile?._id);
    return first?._id ?? null;
  }, [activeMessages, activeKind, activeId, profile?._id]);

  // typing display for active room
  const activeTypingLabel = useMemo(() => {
    const names = [...typingUsers.values()].map(v => v.name).filter(Boolean);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typingâ€¦`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typingâ€¦`;
    return "Several people are typingâ€¦";
  }, [typingUsers]);

  // @mention autocomplete candidates (from your network connections)
  const mentionCandidates = useMemo(() => {
    if (!mention) return [] as any[];
    const q = mention.query.toLowerCase();
    const seen = new Set<string>();
    const pool = (network?.active || []).map((c: any) => c.user).filter(Boolean);
    return pool
      .filter((u: any) => {
        if (!u.username || seen.has(u._id)) return false;
        seen.add(u._id);
        return u.username.toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q);
      })
      .slice(0, 6);
  }, [network, mention]);

  /* ------------------ Sidebar ---------------------------- */
  const Sidebar = (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex items-center gap-2 px-3 h-12 border-b border-sidebar-border shrink-0">
        <Button
          variant="ghost" size="icon" className="h-6 w-6 text-sidebar-foreground mr-1"
          aria-label="Exit Messenger"
          onClick={() => navigate("/dashboard")}
          title="Exit to Platform"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="flex-1 flex items-center justify-start overflow-hidden">
          <VeritaBoxLogo className="h-6 text-sidebar-accent-foreground" />
        </div>
        <Button
          variant="ghost" size="icon" className="h-6 w-6 text-sidebar-foreground"
          aria-label="Search messages"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="p-2 border-b border-sidebar-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground" aria-hidden />
          <Input
            value={sidebarQuery}
            onChange={(e) => setSidebarQuery(e.target.value)}
            placeholder="Filter channels and people"
            className="pl-7 h-7 text-[12px] bg-sidebar-accent border-sidebar-border text-sidebar-accent-foreground placeholder:text-sidebar-foreground"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          <SectionHeader label="Channels" onAdd={() => setNewChannelOpen(true)} />
          <ul role="list" className="px-1.5 space-y-px">
            {filteredChannels.map((c) => {
              const isActive = activeKind === "channel" && activeId === c._id;
              return (
                <li key={c._id}>
                  <button
                    onClick={() => selectRoom(c._id, "channel")}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1 rounded text-[13px] text-left min-w-0",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {c.isPrivate ? <Lock className="h-3.5 w-3.5 shrink-0" /> : <Hash className="h-3.5 w-3.5 shrink-0" />}
                    <span className={cn("truncate flex-1 min-w-0", (c.unreadCount ?? 0) > 0 && !isActive && "font-semibold text-sidebar-accent-foreground")}>{c.name}</span>
                    {mutedChannels.has(c._id) && <BellOff className="h-3 w-3 shrink-0 text-sidebar-foreground/50" />}
                    {(c.unreadCount ?? 0) > 0 && !isActive && !mutedChannels.has(c._id) && (
                      <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-px font-medium shrink-0">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {filteredChannels.length === 0 && <EmptyHint text="No channels" />}
          </ul>

          <SectionHeader label="Direct messages" className="mt-3" onAdd={() => setNewDmOpen(true)} />
          <ul role="list" className="px-1.5 space-y-px">
            {dmUsersList.map((user) => {
              const isActive = activeKind === "dm" && activeId === user._id;
              const online = onlineSet.has(user._id);
              return (
                <li key={user._id}>
                  <button
                    onClick={() => selectRoom(user._id, "dm")}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1 rounded text-[13px] text-left min-w-0",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <span className="relative shrink-0">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">{initialsOf(user.name)}</AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-sidebar",
                        online ? "bg-success" : "bg-muted-foreground"
                      )} />
                    </span>
                    <span className={cn("truncate flex-1 min-w-0", user.unread > 0 && !isActive && "font-semibold text-sidebar-accent-foreground")}>{user.name}</span>
                    {user.unread > 0 && !isActive && (
                      <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-px font-medium shrink-0">
                        {user.unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {dmUsersList.length === 0 && <EmptyHint text="No operatives" />}
          </ul>
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-2">
        <div className="flex items-center gap-2 px-1">
          <Avatar className="h-6 w-6">
            <AvatarImage src={profile?.avatarUrl} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-[10px]">
              {initialsOf(meName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-sidebar-accent-foreground truncate">{meName}</p>
            <p className="text-[10px] text-sidebar-foreground flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" /> Active
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-sidebar-foreground" aria-label="Account menu">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => navigate("/settings")}><Settings className="h-3.5 w-3.5 mr-2" /> Preferences</DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}><LogOut className="h-3.5 w-3.5 mr-2" /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <aside className="hidden md:flex w-60 border-r border-sidebar-border shrink-0" aria-label="Channels and direct messages">
        {Sidebar}
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-60 bg-sidebar border-sidebar-border">
          {Sidebar}
        </SheetContent>
      </Sheet>

      <section className="flex-1 flex flex-col min-w-0" aria-label="Chat">
        <header className="flex items-center gap-2 h-12 px-3 md:px-4 border-b border-border shrink-0">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" aria-label="Open sidebar">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
          </Sheet>

          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="font-semibold text-[13px] truncate">
              {activeKind === "channel" ? `#${activeTitle}` : activeTitle}
            </span>
            {activeTopic && (
              <span className="text-[11px] text-muted-foreground truncate hidden sm:inline-block">
                â€¢ {activeTopic}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {activeKind === "channel" && (
              <>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  aria-label={mutedChannels.has(activeId) ? "Unmute channel" : "Mute channel"}
                  title={mutedChannels.has(activeId) ? "Unmute channel" : "Mute channel"}
                  onClick={() => toggleMute(activeId)}
                >{mutedChannels.has(activeId) ? <BellOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Bell className="h-3.5 w-3.5" />}</Button>
                <Button
                  variant={channelDetailsOpen ? "secondary" : "ghost"}
                  size="icon" className="h-7 w-7"
                  aria-label="Channel members"
                  onClick={() => setChannelDetailsOpen(true)}
                ><Users className="h-3.5 w-3.5" /></Button>
                <Button
                  variant={pinnedOpen ? "secondary" : "ghost"}
                  size="icon" className="h-7 w-7"
                  aria-label="Pinned items"
                  onClick={() => setPinnedOpen(o => !o)}
                ><Pin className="h-3.5 w-3.5" /></Button>
              </>
            )}
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              aria-label="Search messages"
              onClick={() => setSearchOpen(true)}
            ><Search className="h-3.5 w-3.5" /></Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              aria-label="Back to platform"
              onClick={() => navigate("/dashboard")}
              title="Back to platform"
            ><Home className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></Button>
          </div>
        </header>

        <div className="flex-1 flex min-h-0 relative">
          <div ref={timelineRef} onScroll={onTimelineScroll} className="flex-1 overflow-y-auto" role="log" aria-live="polite">
            <div className="px-3 md:px-6 py-4 space-y-1 max-w-[900px] mx-auto">
              {loadingOlder && (
                <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              )}
              {!hasMore && activeMessages.length > 0 && (
                <div className="text-center text-[10px] text-muted-foreground/60 uppercase tracking-wider py-2">Beginning of conversation</div>
              )}
              {activeMessages.length === 0 && (
                <div className="text-center py-16">
                  <div className="h-10 w-10 mx-auto rounded bg-muted text-muted-foreground flex items-center justify-center">
                    {activeKind === "channel" ? <Hash className="h-5 w-5" /> : <AtSign className="h-5 w-5" />}
                  </div>
                  <h2 className="mt-3 text-[15px] font-medium">
                    {activeKind === "channel" ? `Welcome to #${activeTitle}` : `Start of your DM thread with ${activeTitle}`}
                  </h2>
                  <p className="text-[12px] text-muted-foreground mt-1">Send a transmission to initialize the connection.</p>
                </div>
              )}

              {activeMessages.map((m, i) => {
                const prev = activeMessages[i - 1];
                const showDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                const mSenderId = getId(m.senderId);
                const prevSenderId = prev ? getId(prev.senderId) : null;
                const grouped = prev && prevSenderId === mSenderId &&
                  (new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000) && !showDay;
                const senderName = typeof m.senderId === "object" ? m.senderId.name : (mSenderId === profile?._id ? meName : "Operative");
                const senderAvatar = typeof m.senderId === "object" ? m.senderId.avatarUrl : undefined;

                return (
                  <div key={m._id}>
                    {m._id === unreadBoundaryId && (
                      <div className="flex items-center gap-3 py-2" role="separator" aria-label="New messages">
                        <div className="flex-1 h-px bg-destructive/50" />
                        <span className="text-[10px] font-semibold text-destructive uppercase tracking-wider">New messages</span>
                        <div className="flex-1 h-px bg-destructive/50" />
                      </div>
                    )}
                    {showDay && (
                      <div className="flex items-center gap-3 py-3" role="separator" aria-label={formatDayLabel(m.createdAt)}>
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{formatDayLabel(m.createdAt)}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <MessageRow
                      message={m}
                      pending={!!(m as any).pending}
                      senderName={senderName}
                      senderAvatar={senderAvatar}
                      grouped={!!grouped}
                      isMine={mSenderId === profile?._id}
                      meId={profile?._id}
                      editing={editingId === m._id}
                      editingDraft={editingDraft}
                      setEditingDraft={setEditingDraft}
                      onEditStart={() => startEdit(m)}
                      onEditCancel={cancelEdit}
                      onEditCommit={commitEdit}
                      onDelete={() => deleteMessage(m._id)}
                      onReact={(emoji) => react(m._id, emoji)}
                      onPin={activeKind === "channel" ? () => togglePin(m._id) : undefined}
                      onReply={() => { setReplyTo(m); inputRef.current?.focus(); }}
                    />
                  </div>
                );
              })}

              {activeKind === "dm" && dmSeen && activeMessages.length > 0 &&
                getId(activeMessages[activeMessages.length - 1].senderId) === profile?._id && (
                <div className="text-[10px] text-muted-foreground text-right px-2 pt-0.5">Seen</div>
              )}

              {activeTypingLabel && (
                <div className="text-[11px] text-muted-foreground italic px-2 py-1">{activeTypingLabel}</div>
              )}
            </div>
          </div>

          {showJump && (
            <button
              onClick={() => { scrollToBottom(true); setShowJump(false); }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 h-8 px-3 rounded-full bg-primary text-primary-foreground text-[12px] font-medium shadow-lg hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 -rotate-90" /> Jump to latest
            </button>
          )}

          {pinnedOpen && activeKind === "channel" && (
            <aside className="w-72 border-l border-border overflow-y-auto hidden md:block">
              <div className="flex items-center justify-between px-3 h-10 border-b border-border">
                <span className="text-[12px] font-semibold uppercase tracking-wider">Pinned</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPinnedOpen(false)}><X className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="p-2 space-y-2">
                {pinnedMessages.length === 0 && (
                  <p className="text-[12px] text-muted-foreground p-2">No pinned messages.</p>
                )}
                {pinnedMessages.map(m => (
                  <div key={m._id} className="border border-border rounded p-2 text-[12px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {typeof m.senderId === "object" ? m.senderId.name : "Operative"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(m.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1 mt-1" onClick={() => togglePin(m._id)}>Unpin</Button>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border p-3 md:p-4 shrink-0">
          <div className="max-w-[900px] mx-auto">
            {replyTo && (
              <div className="mb-2 flex items-start gap-2 border-l-2 border-primary bg-muted/40 px-2 py-1 rounded">
                <Reply className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">Replying to {typeof replyTo.senderId === "object" ? replyTo.senderId.name : "message"}</p>
                  <p className="text-[12px] truncate">{replyTo.content}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setReplyTo(null)}><X className="h-3 w-3" /></Button>
              </div>
            )}

            {pendingAttachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pendingAttachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-1 border border-border rounded px-2 py-1 text-[11px] bg-muted/40">
                    <Paperclip className="h-3 w-3" />
                    <span className="truncate max-w-[140px]">{a.fileName}</span>
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => removePendingAttachment(i)}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative border border-input rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition">
              {mention && mentionCandidates.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-64 bg-popover border border-border rounded-md shadow-lg overflow-hidden z-20">
                  <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border">Mention</div>
                  {mentionCandidates.map((u: any, i: number) => (
                    <button
                      key={u._id}
                      onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                      onMouseEnter={() => setMentionIdx(i)}
                      className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-left text-[13px]", i === mentionIdx ? "bg-secondary" : "hover:bg-muted")}
                    >
                      <Avatar className="h-5 w-5"><AvatarImage src={u.avatarUrl} /><AvatarFallback className="text-[8px]">{initialsOf(u.name || u.username)}</AvatarFallback></Avatar>
                      <span className="font-medium truncate">{u.name}</span>
                      <span className="text-muted-foreground truncate">@{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
              <Textarea
                ref={inputRef}
                value={input}
                onChange={onComposerChange}
                onKeyDown={onInputKeyDown}
                placeholder={activeKind === "channel" ? `Send message to #${activeTitle}` : `Message ${activeTitle}`}
                rows={1}
                className="border-0 resize-none min-h-[44px] max-h-40 text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
              />
              <div className="flex items-center justify-between px-2 pb-1.5">
                <div className="flex items-center gap-0.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={onFilePick}
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Attach file"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Insert emoji"><Smile className="h-3.5 w-3.5" /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="grid grid-cols-5 gap-1">
                        {REACTION_PALETTE.map(e => (
                          <button key={e} className="h-8 w-8 hover:bg-muted rounded text-lg" onClick={() => setInput(v => v + e)}>{e}</button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={(!input.trim() && pendingAttachments.length === 0) || sending}
                  size="sm"
                  className="h-7 text-[12px] gap-1.5"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
              <kbd className="px-1 py-px bg-muted rounded text-[9px]">Enter</kbd> to send Â·{" "}
              <kbd className="px-1 py-px bg-muted rounded text-[9px]">Shift + Enter</kbd> for newline Â·{" "}
              <kbd className="px-1 py-px bg-muted rounded text-[9px]">@name</kbd> to mention
            </p>
          </div>
        </div>
      </section>

      {/* --------- Dialog: New Channel --------- */}
      <NewChannelDialog open={newChannelOpen} onOpenChange={setNewChannelOpen} onCreate={createChannel} />

      {/* --------- Dialog: New DM ------------ */}
      <NewDmDialog
        open={newDmOpen}
        onOpenChange={setNewDmOpen}
        onSelect={(u) => { setNewDmOpen(false); selectRoom(u._id, "dm"); }}
        excludeId={profile?._id}
      />

      {/* --------- Dialog: Channel details ------ */}
      {activeKind === "channel" && activeChannel && (
        <ChannelDetailsDialog
          open={channelDetailsOpen}
          onOpenChange={setChannelDetailsOpen}
          channel={activeChannel}
          muted={mutedChannels.has(activeId)}
          onToggleMute={() => toggleMute(activeId)}
          onLeave={() => leaveChannel(activeId)}
          onlineSet={onlineSet}
        />
      )}

      {/* --------- Dialog: Message search ------ */}
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        query={searchQuery}
        setQuery={setSearchQuery}
        scope={activeKind === "channel" ? { channelId: activeId } : { userId: activeId }}
        onJump={(m) => {
          const sid = getId(m.senderId);
          const rid = getId(m.receiverId);
          if (m.channelId) selectRoom(m.channelId, "channel");
          else selectRoom(sid === profile?._id ? rid : sid, "dm");
          setSearchOpen(false);
        }}
      />
    </div>
  );
}

/* ================================================================== */
/*  SUB-COMPONENTS                                                     */
/* ================================================================== */

function SectionHeader({ label, className, onAdd }: { label: string; className?: string; onAdd?: () => void }) {
  return (
    <div className={cn("flex items-center justify-between px-3 mb-1", className)}>
      <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground font-medium">{label}</span>
      {onAdd && (
        <Button variant="ghost" size="icon" className="h-4 w-4 text-sidebar-foreground hover:text-sidebar-accent-foreground" aria-label={`Add ${label}`} onClick={onAdd}>
          <Plus className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <li className="px-3 py-1 text-[11px] text-sidebar-foreground italic">{text}</li>;
}

function MessageRow(props: {
  message: Message;
  pending?: boolean;
  senderName: string;
  senderAvatar?: string;
  grouped: boolean;
  isMine: boolean;
  meId?: string;
  editing: boolean;
  editingDraft: string;
  setEditingDraft: (s: string) => void;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditCommit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onPin?: () => void;
  onReply: () => void;
}) {
  const { message: m, pending, senderName, senderAvatar, grouped, isMine, meId, editing, editingDraft, setEditingDraft,
          onEditStart, onEditCancel, onEditCommit, onDelete, onReact, onPin, onReply } = props;

  const reply = typeof m.replyTo === "object" ? m.replyTo : null;

  return (
    <div className={cn("group relative flex gap-3 px-2 py-0.5 rounded hover:bg-muted/40", grouped ? "pt-0.5" : "pt-2", m.isPinned && "bg-primary/5 border-l-2 border-primary", pending && "opacity-60")}>
      <div className="w-8 shrink-0 flex justify-center">
        {!grouped ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={senderAvatar} alt="" />
            <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">{initialsOf(senderName)}</AvatarFallback>
          </Avatar>
        ) : (
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 self-start mt-0.5 tabular-nums">
            {formatTime(m.createdAt)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-medium">{senderName}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">{formatTime(m.createdAt)}</span>
            {m.isPinned && <span className="text-[10px] text-primary flex items-center gap-0.5"><Pin className="h-2.5 w-2.5" />Pinned</span>}
          </div>
        )}

        {reply && (
          <div className="mt-1 border-l-2 border-muted-foreground/40 pl-2 text-[11px] text-muted-foreground">
            <span className="font-medium">{typeof reply.senderId === "object" ? reply.senderId.name : "reply"}: </span>
            <span className="truncate inline-block max-w-full align-bottom">{reply.content?.slice(0, 120)}</span>
          </div>
        )}

        {editing ? (
          <div className="mt-1 border border-input rounded-md bg-background">
            <Textarea
              value={editingDraft}
              onChange={(e) => setEditingDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEditCommit(); }
                if (e.key === "Escape") { e.preventDefault(); onEditCancel(); }
              }}
              autoFocus
              rows={1}
              className="border-0 resize-none min-h-[36px] text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            />
            <div className="flex justify-end gap-1.5 px-2 pb-1.5">
              <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={onEditCancel}>Cancel</Button>
              <Button size="sm" className="h-6 text-[11px]" onClick={onEditCommit}>Save</Button>
            </div>
          </div>
        ) : (
          <>
            {m.content && (
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                {renderRichText(m.content)}
                {m.isEdited && <span className="text-[10px] text-muted-foreground ml-1">(edited)</span>}
              </p>
            )}
            {m.attachments && m.attachments.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {m.attachments.map((a, i) => <AttachmentPreview key={i} a={a} />)}
              </div>
            )}
            {m.reactions && m.reactions.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {m.reactions.map(r => {
                  const mine = !!meId && r.users.some(u => u.toString() === meId);
                  return (
                    <button key={r.emoji}
                      onClick={() => onReact(r.emoji)}
                      title={mine ? "Remove reaction" : "Add reaction"}
                      className={cn(
                        "inline-flex items-center gap-1 h-6 px-1.5 rounded-full border text-[12px] leading-none transition-colors",
                        mine
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <span className="text-[13px]">{r.emoji}</span>
                      <span className="tabular-nums">{r.users.length}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {!editing && !pending && (
        <div className="absolute -top-3 right-3 hidden group-hover:flex items-center gap-px bg-popover border border-border rounded-md shadow-sm px-0.5 py-0.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="React"><Smile className="h-3 w-3" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1" align="end">
              <div className="flex gap-0.5">
                {REACTION_PALETTE.map(e => (
                  <button key={e} className="h-7 w-7 hover:bg-muted rounded text-base" onClick={() => onReact(e)}>{e}</button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onReply} aria-label="Reply"><Reply className="h-3 w-3" /></Button>
          {onPin && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onPin} aria-label="Pin"><Pin className={cn("h-3 w-3", m.isPinned && "text-primary")} /></Button>
          )}
          {isMine && (
            <>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEditStart} aria-label="Edit"><Pencil className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onDelete} aria-label="Delete"><Trash2 className="h-3 w-3" /></Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AttachmentPreview({ a }: { a: MessageAttachment }) {
  const url = resolveAssetUrl(a.url);
  const isImage = /^image\//.test(a.fileType || "") || /\.(png|jpe?g|gif|webp)$/i.test(a.fileName);
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block max-w-[240px]">
        <img src={url} alt={a.fileName} className="max-h-40 rounded border border-border object-cover" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 border border-border rounded px-2 py-1 text-[12px] hover:bg-muted/60">
      <Paperclip className="h-3.5 w-3.5" />
      <span className="truncate max-w-[200px]">{a.fileName}</span>
    </a>
  );
}

function NewChannelDialog({ open, onOpenChange, onCreate }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (data: { name: string; topic?: string; isPrivate?: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setName(""); setTopic(""); setIsPrivate(false); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create channel</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. project-neptune" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Topic (optional)</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What is this channel about?" />
          </div>
          <label className="flex items-center gap-2 text-[12px]">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            Private (invite-only)
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={!name.trim()} onClick={() => onCreate({ name, topic, isPrivate })}>Create</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewDmDialog({ open, onOpenChange, onSelect, excludeId }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (u: User) => void;
  excludeId?: string;
}) {
  const [q, setQ] = useState("");
  const { data: network } = useQuery({ queryKey: ["network"], queryFn: () => usersApi.getNetwork(), enabled: open });
  const list = useMemo(() => {
    const all = [
      ...(network?.active || []),
      ...(network?.incoming || []),
      ...(network?.outgoing || [])
    ].map((conn: any) => conn.user).filter((u: any) => u && u._id && u._id !== excludeId);
    // dedupe
    const seen = new Set<string>();
    const uniq = all.filter(u => { if (seen.has(u._id)) return false; seen.add(u._id); return true; });
    if (!q.trim()) return uniq;
    return uniq.filter((u: any) => (u.name || "").toLowerCase().includes(q.toLowerCase()) || (u.username || "").toLowerCase().includes(q.toLowerCase()));
  }, [network, q, excludeId]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Message someone</DialogTitle></DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your network" />
        <div className="max-h-80 overflow-y-auto space-y-1">
          {list.map((u: any) => (
            <button
              key={u._id}
              onClick={() => onSelect(u)}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={u.avatarUrl} />
                <AvatarFallback className="text-[10px]">{initialsOf(u.name || "")}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] truncate">{u.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">@{u.username || "operative"}</p>
              </div>
            </button>
          ))}
          {list.length === 0 && (
            <p className="text-[12px] text-muted-foreground p-3 text-center">No operatives in your network yet. Send connection requests first.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChannelDetailsDialog({ open, onOpenChange, channel, muted, onToggleMute, onLeave, onlineSet }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  channel: Channel;
  muted: boolean;
  onToggleMute: () => void;
  onLeave: () => void;
  onlineSet: Set<string>;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["channel-members", channel._id],
    queryFn: () => channelsApi.getMembers(channel._id),
    enabled: open,
  });
  const admins = new Set((data?.admins || []).map(a => a._id));
  const members = data?.members || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {channel.isPrivate ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
            {channel.name}
          </DialogTitle>
        </DialogHeader>
        {channel.topic && <p className="text-[12px] text-muted-foreground -mt-2">{channel.topic}</p>}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={onToggleMute}>
            {muted ? <><Bell className="h-3.5 w-3.5" /> Unmute</> : <><BellOff className="h-3.5 w-3.5" /> Mute</>}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-2 text-destructive hover:text-destructive" onClick={onLeave}>
            <LogOut className="h-3.5 w-3.5" /> Leave
          </Button>
        </div>

        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Members {members.length > 0 && `(${members.length})`}
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1">
          {isLoading && <p className="text-[12px] text-muted-foreground p-2 text-center">Loadingâ€¦</p>}
          {!isLoading && members.length === 0 && <p className="text-[12px] text-muted-foreground p-2 text-center">No members listed.</p>}
          {members.map(u => (
            <div key={u._id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted">
              <span className="relative shrink-0">
                <Avatar className="h-7 w-7"><AvatarImage src={u.avatarUrl} /><AvatarFallback className="text-[10px]">{initialsOf(u.name || "")}</AvatarFallback></Avatar>
                <span className={cn("absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background", onlineSet.has(u._id) ? "bg-success" : "bg-muted-foreground")} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] truncate">{u.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">@{u.username || "operative"}</p>
              </div>
              {admins.has(u._id) && <span className="text-[9px] uppercase tracking-wider text-primary font-semibold">Admin</span>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchDialog({ open, onOpenChange, query, setQuery, scope, onJump }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  query: string;
  setQuery: (q: string) => void;
  scope: { channelId?: string; userId?: string };
  onJump: (m: Message) => void;
}) {
  const { data: results = [], refetch, isFetching } = useQuery({
    queryKey: ["msg-search", query, scope],
    queryFn: () => messagesApi.search({ q: query, ...scope }),
    enabled: false,
  });
  useEffect(() => {
    if (!open) return;
    if (!query.trim()) return;
    const t = setTimeout(() => refetch(), 250);
    return () => clearTimeout(t);
  }, [query, open, refetch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Search messages</DialogTitle></DialogHeader>
        <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type to searchâ€¦" />
        <div className="max-h-96 overflow-y-auto space-y-1">
          {isFetching && <p className="text-[12px] text-muted-foreground p-2 text-center">Searchingâ€¦</p>}
          {!isFetching && query.trim() && results.length === 0 && (
            <p className="text-[12px] text-muted-foreground p-2 text-center">No matches.</p>
          )}
          {results.map(m => (
            <button
              key={m._id}
              onClick={() => onJump(m)}
              className="w-full text-left p-2 rounded hover:bg-muted"
            >
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-medium">{typeof m.senderId === "object" ? m.senderId.name : "Operative"}</span>
                <span>{formatTime(m.createdAt)}</span>
                {m.channelId && <span>Â· #channel</span>}
              </div>
              <p className="text-[13px] mt-0.5 line-clamp-2">{m.content}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
