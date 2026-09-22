import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/VeritaBox/AdminLayout";
import { PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface } from "@/components/VeritaBox/UI";
import { useToast } from "@/hooks/use-toast";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

interface Category {
  _id: string;
  name: string;
  parentCategory?: string;
}

export default function AdminPublishingWrite() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [readTime, setReadTime] = useState(5);
  const [tagsInput, setTagsInput] = useState("");
  const [prereqInput, setPrereqInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await api.get<Category[]>("/api/publishing/categories");
        setCategories(data || []);
        if (data && data.length > 0) setSelectedCategory(data[0]._id);
      } catch (error) {
        console.error("Failed to load categories", error);
      }
    };
    fetchCategories();
  }, []);

  const publishArticle = async (status: 'published' | 'draft') => {
    if (!title || !content || !selectedCategory) {
      return toast({ title: "Validation Error", description: "Title, content, and category are required", variant: "destructive" });
    }
    setLoading(true);
    try {
      await api.post("/api/publishing/admin/articles", {
        title,
        content,
        category: selectedCategory,
        status,
        excerpt,
        difficulty,
        estimatedReadMinutes: readTime,
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        prerequisites: prereqInput.split(',').map(t => t.trim()).filter(Boolean),
      });
      toast({ title: "Success", description: `Article ${status === 'published' ? 'published' : 'saved as draft'} successfully!` });
      navigate(`/cmd/publishing`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save article", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image', 'code-block'],
      ['clean']
    ],
  };

  return (
    <AdminLayout>
      <PageContent>
        <div className="max-w-5xl mx-auto pb-20">
          <button
            onClick={() => navigate(`/cmd/publishing`)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Publishing Dashboard
          </button>

          <Surface className="p-6 md:p-8 space-y-6 bg-secondary/10 border-border/50">

            {/* Metadata Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[12px] font-medium">Tutorial Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Understanding Closures in JavaScript"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium">Category</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-primary transition-colors appearance-none">
                  <option value="" disabled>Select...</option>
                  {categories.filter(c => !c.parentCategory).map(parent => (
                    <optgroup key={parent._id} label={parent.name}>
                      <option value={parent._id}>{parent.name}</option>
                      {categories.filter(c => c.parentCategory === parent._id).map(sub => (
                        <option key={sub._id} value={sub._id}>&nbsp;&nbsp;{sub.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium">Excerpt / Summary</label>
              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A short description that appears on the tutorial card (1-2 sentences)"
                rows={2} className="w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-primary transition-colors resize-none" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium">Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-primary transition-colors appearance-none">
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium">Read Time (min)</label>
                <input type="number" value={readTime} onChange={(e) => setReadTime(parseInt(e.target.value) || 5)} min={1} max={120}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-[12px] font-medium">Tags <span className="text-muted-foreground font-normal">(comma separated)</span></label>
                <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="javascript, closures, es6"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-primary transition-colors" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium">Prerequisites <span className="text-muted-foreground font-normal">(comma separated, optional)</span></label>
              <input type="text" value={prereqInput} onChange={(e) => setPrereqInput(e.target.value)}
                placeholder="Basic JavaScript, HTML fundamentals"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-primary transition-colors" />
            </div>

            {/* WYSIWYG Editor */}
            <div className="space-y-2 pt-2">
              <label className="text-[12px] font-medium">Tutorial Content</label>

              {/* Custom styles to invert React Quill theme */}
              <style>{`
                .quill-dark .ql-toolbar {
                  background: hsl(var(--secondary) / 0.5);
                  border-color: hsl(var(--border));
                  border-top-left-radius: 0.375rem;
                  border-top-right-radius: 0.375rem;
                }
                .quill-dark .ql-container {
                  border-color: hsl(var(--border));
                  border-bottom-left-radius: 0.375rem;
                  border-bottom-right-radius: 0.375rem;
                  background: hsl(var(--background));
                  font-size: 0.95rem;
                  font-family: inherit;
                  min-height: 400px;
                }
                .quill-dark .ql-editor {
                  min-height: 400px;
                }
                .quill-dark .ql-stroke { stroke: hsl(var(--foreground)); }
                .quill-dark .ql-fill { fill: hsl(var(--foreground)); }
                .quill-dark .ql-picker { color: hsl(var(--foreground)); }
                .quill-dark .ql-picker-options {
                  background-color: hsl(var(--background));
                  border-color: hsl(var(--border));
                }
                .quill-dark .ql-snow.ql-toolbar button:hover .ql-stroke,
                .quill-dark .ql-snow .ql-toolbar button:hover .ql-stroke,
                .quill-dark .ql-snow.ql-toolbar button:focus .ql-stroke,
                .quill-dark .ql-snow .ql-toolbar button:focus .ql-stroke,
                .quill-dark .ql-snow.ql-toolbar button.ql-active .ql-stroke,
                .quill-dark .ql-snow .ql-toolbar button.ql-active .ql-stroke,
                .quill-dark .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke,
                .quill-dark .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke,
                .quill-dark .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke,
                .quill-dark .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke,
                .quill-dark .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke,
                .quill-dark .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke,
                .quill-dark .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
                .quill-dark .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
                .quill-dark .ql-snow.ql-toolbar button:hover .ql-stroke-miter,
                .quill-dark .ql-snow .ql-toolbar button:hover .ql-stroke-miter,
                .quill-dark .ql-snow.ql-toolbar button:focus .ql-stroke-miter,
                .quill-dark .ql-snow .ql-toolbar button:focus .ql-stroke-miter,
                .quill-dark .ql-snow.ql-toolbar button.ql-active .ql-stroke-miter,
                .quill-dark .ql-snow .ql-toolbar button.ql-active .ql-stroke-miter,
                .quill-dark .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
                .quill-dark .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
                .quill-dark .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
                .quill-dark .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
                .quill-dark .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
                .quill-dark .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
                .quill-dark .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter,
                .quill-dark .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter {
                    stroke: hsl(var(--primary));
                }
              `}</style>

              <div className="quill-dark">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={modules}
                  placeholder="Write the tutorial content here..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex justify-end gap-3">
              <button
                onClick={() => publishArticle('draft')}
                disabled={loading}
                className="flex items-center gap-2 bg-secondary text-secondary-foreground border border-border px-6 py-2.5 rounded-md font-semibold hover:bg-border transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save as Draft
              </button>
              <button
                onClick={() => publishArticle('published')}
                disabled={loading}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Publish Tutorial
              </button>
            </div>

          </Surface>
        </div>
      </PageContent>
    </AdminLayout>
  );
}
