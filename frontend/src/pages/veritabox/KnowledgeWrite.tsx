import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import { ChevronLeft, Plus, Trash2, Loader2, Cpu, ExternalLink, Image as ImageIcon, Upload, FileUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { knowledgeApi, api, resolveAssetUrl, hackathonsApi } from "@/lib/api";
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

type HW = { componentName: string; supplierLink: string };

export function KnowledgeAuthor({ mode }: { mode: "write" | "edit" }) {
  const nav = useNavigate();
  const { slug } = useParams();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [body, setBody] = useState("");
  const [hardware, setHardware] = useState<HW[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => knowledgeApi.getCategories(),
  });

  const { data: editData } = useQuery({
    queryKey: ["article", slug],
    queryFn: () => knowledgeApi.getBySlug(slug!),
    enabled: mode === "edit" && !!slug,
  });

  useEffect(() => {
    if (mode === "edit" && editData?.article) {
      const a = editData.article;
      setTitle(a.title);
      setBody(a.content);
      setSectorId(a.categoryId?._id || "");
      setCoverImage(a.coverImage || null);
      setAttachments(a.attachments || []);
      setHardware(a.hardwareUsed?.map((h: any) => ({ componentName: h.componentName, supplierLink: h.supplierLink })) || []);
    }
  }, [mode, editData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "cover" | "content") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid Payload", description: "Only image artifacts (.png, .jpg, .jpeg) are accepted.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("document", file);
      const res = await api.upload<{ filePath: string }>("/api/upload", formData);
      
      if (target === "cover") {
        setCoverImage(res.filePath);
        toast({ title: "Cover artifact synced", description: "Image attached to mission profile." });
      } else {
        const markdownImage = `![Image Description](${res.filePath})`;
        setBody(prev => prev + "\n\n" + markdownImage);
        setAttachments(prev => [...prev, res.filePath]);
        toast({ title: "Intel artifact uploaded", description: "Markdown reference appended to body." });
      }
    } catch (error: any) {
      toast({ title: "Uplink Failure", description: error.message || "Failed to upload image.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const insertImage = (url: string) => {
    const markdown = `![Image Description](${url})`;
    setBody(prev => prev + "\n" + markdown);
    toast({ title: "Image re-attached", description: "Reference inserted at the end of Intel body." });
  };

  const purgeArtifact = async (url: string) => {
    try {
      await hackathonsApi.deleteUpload(url);
      setAttachments(prev => prev.filter(a => a !== url));
      if (coverImage === url) setCoverImage(null);
      toast({ title: "Artifact purged", description: "File deleted from tactical registry." });
    } catch (error: any) {
      toast({ title: "Purge failed", description: error.message, variant: "destructive" });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !sectorId) {
      toast({ title: "Protocol violation", description: "Title, body, and sector are mandatory fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title,
        content: body,
        categoryId: sectorId,
        slug: slugify(title),
        metaDescription: title,
        hardwareUsed: hardware.filter(h => h.componentName),
        coverImage,
        attachments,
      };

      if (mode === "edit" && editData?.article) {
        await knowledgeApi.update(editData.article._id, payload);
        toast({ title: "Intel updated", description: "Registry modification complete." });
      } else {
        await knowledgeApi.create(payload);
        toast({ title: "Intel committed", description: "Your contribution is active in the registry." });
      }
      nav("/knowledge");
    } catch (error: any) {
      toast({ title: "Commit failed", description: error.message || "Unknown uplink error.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updHW = (i: number, k: keyof HW, v: string) =>
    setHardware(h => h.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const addHW = () => setHardware(h => [...h, { componentName: "", supplierLink: "" }]);
  const rmHW = (i: number) => setHardware(h => h.filter((_, idx) => idx !== i));

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/20">
        <div className="mx-auto max-w-[1100px] px-6 pt-6 pb-2">
          <Link to={mode === "edit" ? `/knowledge/${slug}` : "/knowledge"} className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3 w-3" /> {mode === "edit" ? "Cancel edit" : "Return to Repository"}
          </Link>
        </div>
      </div>

      <form onSubmit={submit} className="mx-auto max-w-[1100px] px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6 min-w-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-2">
              {mode === "edit" ? "Edit Intel" : "Authoring Suite — New Intel"}
            </div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title — what is this intel?"
              className="w-full text-[28px] md:text-[34px] font-semibold tracking-tight leading-tight bg-transparent outline-none border-b border-border focus:border-primary/60 pb-3 transition-colors placeholder:text-muted-foreground/40"
            />
          </div>

          <Surface className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-3 h-9 border-b border-border bg-card/60">
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Markdown · GFM</span>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer group flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">
                  <FileUp className="h-3 w-3" />
                  <span>Attach Artifact</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "content")} disabled={isUploading} />
                </label>
                <span className="text-[10px] font-mono text-muted-foreground">{body.length} chars</span>
              </div>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="# Heading&#10;&#10;Write your intelligence in markdown. Code blocks, blockquotes and headings render with custom syntax styling."
              className="w-full min-h-[460px] p-4 bg-transparent outline-none resize-y font-mono text-[13px] leading-[1.7] placeholder:text-muted-foreground/40"
            />
          </Surface>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto h-11 px-6 inline-flex items-center justify-center gap-2 bg-foreground text-background rounded font-mono text-[12px] uppercase tracking-[0.14em] hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "edit" ? "Update Intel" : "Commit Intel"}
          </button>
        </div>

        <aside className="space-y-5">
          <Surface className="p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-3 flex items-center justify-between">
              Cover Intel Image
              {coverImage && (
                <button type="button" onClick={() => setCoverImage(null)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            
            {coverImage ? (
              <div className="relative aspect-video rounded border border-border overflow-hidden group">
                <img src={resolveAssetUrl(coverImage)} className="w-full h-full object-cover" alt="Cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="cursor-pointer h-8 px-3 bg-white text-black text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-2">
                    <Upload className="h-3 w-3" /> Replace
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "cover")} disabled={isUploading} />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-video rounded border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Upload Cover Art</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "cover")} disabled={isUploading} />
              </label>
            )}
            <p className="mt-2 text-[9px] text-muted-foreground leading-relaxed italic">
              Visible on repository cards and article headers. Recommended: 1200x630px.
            </p>
          </Surface>

          {/* Attachments Gallery */}
          <Surface className="p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-3 flex items-center justify-between">
              Artifact Gallery
              <span className="text-[9px] opacity-60">{attachments.length} items</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {attachments.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded border border-border overflow-hidden group">
                  <img src={resolveAssetUrl(url)} className="w-full h-full object-cover" alt="Artifact" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity">
                    <button
                      type="button"
                      onClick={() => insertImage(url)}
                      className="h-6 px-2 bg-primary text-white text-[9px] font-bold uppercase rounded hover:bg-primary/80"
                    >
                      Insert
                    </button>
                    <button
                      type="button"
                      onClick={() => purgeArtifact(url)}
                      className="h-6 px-2 bg-destructive text-white text-[9px] font-bold uppercase rounded hover:bg-destructive/80"
                    >
                      Purge
                    </button>
                  </div>
                </div>
              ))}
              <label className="aspect-square rounded border border-dashed border-border flex flex-col items-center justify-center hover:bg-secondary cursor-pointer transition-colors group">
                <Upload className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "content")} disabled={isUploading} />
              </label>
            </div>
            <p className="mt-3 text-[9px] text-muted-foreground leading-relaxed italic">
              Click any artifact to re-insert its reference into the markdown body.
            </p>
          </Surface>

          <Surface className="p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-3">Topic Sector</div>
            <div className="flex flex-wrap gap-1.5">
              {categories?.map(c => (
                <button
                  type="button"
                  key={c._id}
                  onClick={() => setSectorId(c._id)}
                  className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${ sectorId === c._id ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </Surface>

          {/* Hardware Integration Card */}
          <Surface className="p-4 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-24 w-24 bg-primary/10 blur-2xl rounded-full" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
                  <Cpu className="h-3 w-3 text-primary" /> Tactical Hardware
                </div>
                <button type="button" onClick={addHW} className="h-6 px-2 text-[10px] font-mono uppercase tracking-wider border border-border hover:bg-secondary rounded inline-flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {hardware.map((h, i) => (
                  <div key={i} className="border border-border rounded p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        value={h.componentName}
                        onChange={e => updHW(i, "componentName", e.target.value)}
                        placeholder="Component name"
                        className="flex-1 bg-transparent text-[12.5px] outline-none px-2 h-7 border border-transparent focus:border-primary/40 rounded"
                      />
                      <button type="button" onClick={() => rmHW(i)} className="h-7 w-7 inline-flex items-center justify-center text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 h-7 border border-border rounded bg-background/50">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        value={h.supplierLink}
                        onChange={e => updHW(i, "supplierLink", e.target.value)}
                        placeholder="https://supplier.com/part"
                        className="flex-1 bg-transparent text-[11.5px] font-mono outline-none"
                      />
                    </div>
                  </div>
                ))}
                {hardware.length === 0 && (
                  <div className="text-[11.5px] text-muted-foreground py-3 text-center">No components listed.</div>
                )}
              </div>
            </div>
          </Surface>

          <Surface className="p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-2">Preview Tags</div>
            <div className="flex flex-wrap gap-1.5">
              <Pill variant="purple">{categories?.find(c => c._id === sectorId)?.name || "Select Sector"}</Pill>
              <Pill>Operative</Pill>
              {hardware.filter(h => h.componentName).length > 0 && <Pill variant="info">+{hardware.filter(h => h.componentName).length} HW</Pill>}
            </div>
          </Surface>
        </aside>
      </form>
    </PublicShell>
  );
}

export default function KnowledgeWrite() {
  return <KnowledgeAuthor mode="write" />;
}
