import { useState, useRef } from "react";
import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, SectionTitle, Stat } from "@/components/VeritaBox/UI";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiApi } from "@/lib/api";
import { Loader2, FileText, UploadCloud, AlertCircle, PlusCircle, CheckCircle, FileUp } from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';
import { RadarChart } from "@/components/VeritaBox/RadarChart";

// Point pdfjs to the worker from unpkg for simplicity
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function ResumeAnalyzer() {
  const [resumeText, setResumeText] = useState("");
  const [resumeAnalysis, setResumeAnalysis] = useState<{
    score: number;
    addToResume: string[];
    addToProfile: string[];
    formattingImprovements: string[];
    missingKeywords: string[];
    skillBreakdown?: { subject: string; A: number; fullMark: number }[];
  } | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }

    setFileName(file.name);
    setResumeLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        text += strings.join(" ") + "\n";
      }
      
      setResumeText(text);
      if (text.trim().length > 50) {
        await runAnalysis(text);
      } else {
        alert("Could not extract sufficient text from this PDF. Please try pasting manually.");
        setIsManualEdit(true);
      }
    } catch (error) {
      console.error(error);
      alert("Error parsing PDF. Please use manual paste.");
      setIsManualEdit(true);
    } finally {
      setResumeLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const runAnalysis = async (textToAnalyze: string) => {
    setResumeLoading(true);
    try {
      const res = await aiApi.analyzeResume(textToAnalyze);
      setResumeAnalysis(res);
    } catch (error) {
      console.error(error);
      alert("Error analyzing resume");
    } finally {
      setResumeLoading(false);
    }
  };

  const handleAnalyzeManual = () => {
    if (!resumeText.trim()) return;
    runAnalysis(resumeText);
  };

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="max-w-5xl mx-auto space-y-6">
          <Surface className="p-8 border border-primary/20">
            <div className="flex flex-col items-center justify-center text-center py-10 border-2 border-dashed border-primary/20 rounded-xl bg-card/50 hover:bg-card/80 transition-colors">
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
              <FileUp className="h-12 w-12 text-primary/60 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload your PDF Resume</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Our AI will parse your resume and cross-check it against your platform projects, skills, and career goals.
              </p>
              <Button onClick={() => fileInputRef.current?.click()} disabled={resumeLoading}>
                {resumeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                Select PDF File
              </Button>
              {fileName && <p className="text-xs text-primary mt-4 font-mono">{fileName}</p>}
            </div>

            <div className="mt-6 flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => setIsManualEdit(!isManualEdit)}>
                {isManualEdit ? "Hide Manual Paste" : "Or paste text manually"}
              </Button>
            </div>

            {isManualEdit && (
              <div className="mt-4 pt-4 border-t border-border animate-in slide-in-from-top-4">
                <Textarea 
                  placeholder="Paste resume content here..." 
                  className="min-h-[250px] mb-4 font-mono text-sm"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
                <Button onClick={handleAnalyzeManual} disabled={resumeLoading || !resumeText.trim()} className="w-full">
                  {resumeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Analyze Text
                </Button>
              </div>
            )}
          </Surface>

          {resumeAnalysis && (
            <div className="space-y-6 animate-in fade-in zoom-in-95">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Surface className="h-full p-6 flex flex-col items-center justify-center border-primary/30">
                    <div className="text-muted-foreground text-sm uppercase tracking-widest mb-2">ATS Score</div>
                    <div className={`text-6xl font-bold ${resumeAnalysis.score >= 80 ? 'text-success' : resumeAnalysis.score >= 60 ? 'text-warning' : 'text-danger'}`}>
                      {resumeAnalysis.score}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">/ 100 Match</div>
                  </Surface>
                </div>
                
                <div className="md:col-span-3">
                  <Surface className="h-full p-6 bg-warning/5 border-warning/20">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="h-5 w-5 text-warning" />
                      <SectionTitle className="mb-0 text-warning">Formatting & Phrasing</SectionTitle>
                    </div>
                    <ul className="space-y-3">
                      {resumeAnalysis.formattingImprovements?.map((item, idx) => (
                        <li key={idx} className="flex gap-3 text-sm">
                          <span className="text-warning mt-1">•</span>
                          <span className="text-muted-foreground leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Surface>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Surface className="p-6 bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-2 mb-4">
                    <PlusCircle className="h-5 w-5 text-primary" />
                    <SectionTitle className="mb-0 text-primary">Add to Resume</SectionTitle>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Found on your platform profile but missing from your resume.</p>
                  <ul className="space-y-3">
                    {resumeAnalysis.addToResume?.length > 0 ? resumeAnalysis.addToResume.map((item, idx) => (
                      <li key={idx} className="flex gap-3 text-sm">
                        <span className="text-primary mt-1">+</span>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    )) : (
                      <li className="text-sm text-muted-foreground italic">Your resume successfully includes all your platform achievements!</li>
                    )}
                  </ul>
                </Surface>

                <Surface className="p-6 bg-info/5 border-info/20">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-info" />
                    <SectionTitle className="mb-0 text-info">Add to Platform</SectionTitle>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Found in your resume but missing from your platform profile.</p>
                  <ul className="space-y-3">
                    {resumeAnalysis.addToProfile?.length > 0 ? resumeAnalysis.addToProfile.map((item, idx) => (
                      <li key={idx} className="flex gap-3 text-sm">
                        <span className="text-info mt-1">+</span>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    )) : (
                      <li className="text-sm text-muted-foreground italic">Your platform profile is perfectly synced with your resume!</li>
                    )}
                  </ul>
                </Surface>
              </div>

              <Surface className="p-6">
                <SectionTitle>Missing Industry Keywords</SectionTitle>
                <div className="flex flex-wrap gap-2 mt-4">
                  {resumeAnalysis.missingKeywords?.map((kw, idx) => (
                    <span key={idx} className="px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded-full border border-border">
                      {kw}
                    </span>
                  ))}
                </div>
              </Surface>

              {resumeAnalysis.skillBreakdown && resumeAnalysis.skillBreakdown.length > 0 && (
                <Surface className="p-6 mt-4">
                  <SectionTitle>Skill Breakdown</SectionTitle>
                  <p className="text-xs text-muted-foreground mb-4">Visual analysis of your resume's skill distribution.</p>
                  <div className="mt-4 flex justify-center">
                    <RadarChart data={resumeAnalysis.skillBreakdown} />
                  </div>
                </Surface>
              )}
            </div>
          )}
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
