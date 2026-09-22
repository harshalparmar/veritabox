import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/VeritaBox/AdminLayout";
import { PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import { Loader2, Send, Users, History, AlertCircle, CheckCircle2, Search, Mail } from "lucide-react";
import { toast } from "sonner";
import { newsletterApi } from "@/lib/api";
import Editor from "@monaco-editor/react";

export default function AdminNewsletter() {
  const [activeTab, setActiveTab] = useState<'composer' | 'subscribers' | 'history'>('composer');

  return (
    <AdminLayout>
      <PageContent>
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-5 w-5 text-primary" />
              <div className="text-[11px] uppercase tracking-[0.2em] text-primary font-bold">Comm-Link Broadcast</div>
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight">Newsletter Command</h1>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-xl">
              Manage network subscribers and dispatch encrypted HTML bulletins globally.
            </p>
          </div>
          <div className="flex bg-secondary/50 p-1 rounded border border-border">
            {[
              { id: 'composer', label: 'Composer', icon: Send },
              { id: 'subscribers', label: 'Operatives', icon: Users },
              { id: 'history', label: 'Broadcast Log', icon: History }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded flex items-center gap-1.5 transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'composer' && <CampaignComposer />}
        {activeTab === 'subscribers' && <SubscriberRoster />}
        {activeTab === 'history' && <CampaignHistory />}
      </PageContent>
    </AdminLayout>
  );
}

function CampaignComposer() {
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Courier New', monospace; background: #000; color: #00ff00; padding: 20px; }
    .header { border-bottom: 1px solid #00ff00; padding-bottom: 10px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>VeritaBox NETWORK BULLETIN</h2>
    <p>TRANSMISSION: AUTHORIZED</p>
  </div>
  <p>Greetings Operative,</p>
  <p>System updates are ready for deployment.</p>
</body>
</html>`);

  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: () => newsletterApi.sendCampaign(subject, htmlContent),
    onSuccess: (data) => {
      toast.success("Broadcast dispatched successfully!");
      setSubject("");
      queryClient.invalidateQueries({ queryKey: ['newsletter_campaigns'] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Broadcast failed");
    }
  });

  const handleSend = () => {
    if (!subject.trim()) return toast.error("Subject is required");
    if (!htmlContent.trim()) return toast.error("HTML content is required");
    
    if (confirm("Are you sure you want to broadcast this to ALL active subscribers?")) {
      sendMutation.mutate();
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 h-[70vh]">
      <Surface className="flex flex-col h-full overflow-hidden border-primary/20">
        <div className="p-3 border-b border-border bg-secondary/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Broadcast Payload</span>
          </div>
        </div>
        <div className="p-4 space-y-4 flex flex-col flex-1">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Subject Line</label>
            <input 
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Protocol Alpha Initiated"
              className="w-full h-9 bg-card/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50 font-mono"
            />
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">HTML Body</label>
            <div className="flex-1 border border-border rounded overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="html"
                theme="vs-dark"
                value={htmlContent}
                onChange={(val) => setHtmlContent(val || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace',
                  wordWrap: "on"
                }}
              />
            </div>
          </div>
          <button 
            onClick={handleSend}
            disabled={sendMutation.isPending}
            className="h-10 w-full bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[12px] rounded hover:brightness-110 flex items-center justify-center gap-2"
          >
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Transmit Broadcast</>}
          </button>
        </div>
      </Surface>

      <Surface className="flex flex-col h-full overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Live Render Preview</span>
          </div>
        </div>
        <div className="flex-1 bg-white overflow-auto relative">
          <iframe 
            srcDoc={htmlContent} 
            className="w-full h-full border-none absolute inset-0"
            title="Email Preview"
          />
        </div>
      </Surface>
    </div>
  );
}

import { Eye } from "lucide-react";

function SubscriberRoster() {
  const [search, setSearch] = useState("");
  
  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: ['newsletter_subscribers'],
    queryFn: () => newsletterApi.getSubscribers()
  });

  const filtered = subscribers.filter((s: any) => s.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search roster..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-8 bg-card/50 border border-border pl-9 pr-3 text-[12px] outline-none rounded"
          />
        </div>
        <div className="text-[11px] font-mono text-muted-foreground">
          ACTIVE_NODES: {subscribers.length}
        </div>
      </div>

      <Surface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-secondary/40 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Operative Identifier</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Linked ID</th>
                <th className="px-4 py-3 font-medium">Enlistment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((sub: any) => (
                  <tr key={sub._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 font-mono">{sub.email}</td>
                    <td className="px-4 py-3">
                      <Pill variant="success" className="text-[9px] uppercase tracking-widest h-5 px-1.5">Active</Pill>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{sub.userId || 'N/A'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(sub.subscribedAt).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[12px] text-muted-foreground">No matching operatives found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );
}

function CampaignHistory() {
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['newsletter_campaigns'],
    queryFn: () => newsletterApi.getCampaigns()
  });

  return (
    <Surface className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-secondary/40 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Subject Payload</th>
              <th className="px-4 py-3 font-medium">Nodes Reached</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Dispatched By</th>
              <th className="px-4 py-3 font-medium">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                </td>
              </tr>
            ) : campaigns.length > 0 ? (
              campaigns.map((camp: any) => (
                <tr key={camp._id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-primary">{camp.subject}</td>
                  <td className="px-4 py-3 font-mono">{camp.recipientCount}</td>
                  <td className="px-4 py-3">
                    {camp.status === 'Completed' ? (
                      <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Sent</span>
                    ) : (
                      <span className="flex items-center gap-1 text-warning"><AlertCircle className="h-3.5 w-3.5" /> {camp.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{camp.sentBy?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(camp.sentAt).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-muted-foreground">No broadcast history found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}
