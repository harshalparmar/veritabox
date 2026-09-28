import React, { useState, useEffect } from "react";
import { Surface } from "@/components/veritabox/UI";
import { FileText, FileUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { toast } from "sonner";

interface SettingsTabProps {
  id: string;
  hackathon: any;
}

export default function SettingsTab({ id, hackathon }: SettingsTabProps) {
  const queryClient = useQueryClient();
  const [settingsData, setSettingsData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (hackathon) {
      setSettingsData({
        title: hackathon.title,
        description: hackathon.description,
        shortDescription: hackathon.shortDescription || "",
        maxTeams: hackathon.maxTeams,
        rulebookUrl: hackathon.rulebookUrl || "",
        rules: hackathon.rules || [],
        prizes: hackathon.prizes || [],
        minTeamSize: hackathon.minTeamSize ?? 1,
        maxTeamSize: hackathon.maxTeamSize ?? 5,
        resources: hackathon.resources || [],
        bannerImage: hackathon.bannerImage || "",
        thumbnailImage: hackathon.thumbnailImage || ""
      });
    }
  }, [hackathon]);

  const updateHackathonMutation = useMutation({
    mutationFn: (data: any) => hackathonsApi.updateHackathon(id, data),
    onSuccess: () => {
      toast.success("MISSION_CORE_STABILIZED: Changes synchronized with network.");
      queryClient.invalidateQueries({ queryKey: ["admin-hackathon", id] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleRulebookUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("INVALID_PAYLOAD: Only PDF files are accepted for mission rulebooks.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("document", file);
      const res = await hackathonsApi.uploadDocument(formData);
      setSettingsData((prev: any) => ({ ...prev, rulebookUrl: res.filePath }));
      toast.success("RULEBOOK_SYNCHRONIZED: Mission protocol uploaded successfully.");
    } catch (err: any) {
      toast.error(`UPLOAD_FAILURE: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!settingsData) return null;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="grid lg:grid-cols-2 gap-8">
        <Surface className="p-6 space-y-6">
          <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-border/40 pb-3">Mission Protocol</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground font-bold uppercase">Mission Title</label>
              <input 
                className="w-full h-10 bg-secondary border border-border px-4 text-[13px] rounded outline-none" 
                value={settingsData.title || ""} 
                onChange={(e) => setSettingsData({ ...settingsData, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Tactical Summary (Upside Brief)</label>
                <span className={`text-[9px] font-mono ${settingsData.shortDescription?.length > 170 ? 'text-destructive' : 'text-primary/50'}`}>
                  {settingsData.shortDescription?.length || 0}/180
                </span>
              </div>
              <textarea 
                className="w-full h-20 bg-secondary border border-border p-3 text-[13px] rounded outline-none focus:border-primary/50 transition-colors" 
                placeholder="High-impact mission summary for cards and headers..."
                maxLength={180}
                value={settingsData.shortDescription || ""} 
                onChange={(e) => setSettingsData({ ...settingsData, shortDescription: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground font-bold uppercase">Briefing (Markdown)</label>
              <textarea 
                className="w-full h-32 bg-secondary border border-border p-4 text-[13px] rounded outline-none font-mono" 
                value={settingsData.description || ""} 
                onChange={(e) => setSettingsData({ ...settingsData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Phase Grid State</label>
                <select
                  className="w-full h-10 bg-secondary border border-border px-3 text-[13px] rounded outline-none"
                  value={settingsData.chapterScope || "Local"}
                  onChange={(e) => setSettingsData({ ...settingsData, chapterScope: e.target.value })}
                >
                  <option value="Local">Local Institute Only</option>
                  <option value="National">National Network</option>
                  <option value="Global">Mainnet (Global)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Max Squadrons</label>
                <input
                  type="number"
                  className="w-full h-10 bg-secondary border border-border px-4 text-[13px] rounded outline-none"
                  value={settingsData.maxTeams || 0}
                  onChange={(e) => setSettingsData({ ...settingsData, maxTeams: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Min Team Size</label>
                <input
                  type="number" min={1} max={10}
                  className="w-full h-10 bg-secondary border border-border px-4 text-[13px] rounded outline-none"
                  value={settingsData.minTeamSize ?? 1}
                  onChange={(e) => setSettingsData({ ...settingsData, minTeamSize: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Max Team Size</label>
                <input
                  type="number" min={1} max={10}
                  className="w-full h-10 bg-secondary border border-border px-4 text-[13px] rounded outline-none"
                  value={settingsData.maxTeamSize ?? 5}
                  onChange={(e) => setSettingsData({ ...settingsData, maxTeamSize: parseInt(e.target.value) || 5 })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Cover Photo (Banner)</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input 
                      className="w-full h-10 bg-secondary border border-border px-4 text-[11px] rounded outline-none" 
                      value={settingsData.bannerImage || ""} 
                      placeholder="Image URL"
                      onChange={(e) => setSettingsData({ ...settingsData, bannerImage: e.target.value })}
                    />
                  </div>
                  <label className="h-10 w-10 bg-secondary border border-border rounded flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploading(true);
                      try {
                        const formData = new FormData();
                        formData.append("document", file);
                        const res = await hackathonsApi.uploadDocument(formData);
                        setSettingsData((prev: any) => ({ ...prev, bannerImage: res.filePath }));
                        toast.success("Cover photo uploaded successfully.");
                      } catch (err: any) {
                        toast.error(`UPLOAD_FAILURE: ${err.message}`);
                      } finally {
                        setIsUploading(false);
                      }
                    }} disabled={isUploading} />
                  </label>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Thumbnail Image</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input 
                      className="w-full h-10 bg-secondary border border-border px-4 text-[11px] rounded outline-none" 
                      value={settingsData.thumbnailImage || ""} 
                      placeholder="Image URL"
                      onChange={(e) => setSettingsData({ ...settingsData, thumbnailImage: e.target.value })}
                    />
                  </div>
                  <label className="h-10 w-10 bg-secondary border border-border rounded flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploading(true);
                      try {
                        const formData = new FormData();
                        formData.append("document", file);
                        const res = await hackathonsApi.uploadDocument(formData);
                        setSettingsData((prev: any) => ({ ...prev, thumbnailImage: res.filePath }));
                        toast.success("Thumbnail uploaded successfully.");
                      } catch (err: any) {
                        toast.error(`UPLOAD_FAILURE: ${err.message}`);
                      } finally {
                        setIsUploading(false);
                      }
                    }} disabled={isUploading} />
                  </label>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground font-bold uppercase">Mission Briefing (PDF Rulebook)</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input 
                    className="w-full h-10 bg-secondary border border-border px-4 text-[11px] rounded outline-none pr-10" 
                    value={settingsData.rulebookUrl || ""} 
                    placeholder="Artifact URL (Automatic on upload)"
                    readOnly
                  />
                  {settingsData.rulebookUrl && (
                    <FileText className="absolute right-3 top-2.5 h-4 w-4 text-primary" />
                  )}
                </div>
                <label className="h-10 w-10 bg-secondary border border-border rounded flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                  <input type="file" className="hidden" accept=".pdf" onChange={handleRulebookUpload} disabled={isUploading} />
                </label>
              </div>
            </div>
          </div>
          <button 
            onClick={() => updateHackathonMutation.mutate(settingsData)}
            disabled={updateHackathonMutation.isPending || !settingsData.shortDescription?.trim()}
            className="w-full h-10 bg-primary text-primary-foreground font-bold uppercase text-[11px] tracking-widest hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {updateHackathonMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Mission Core</>}
          </button>
        </Surface>

        <div className="space-y-6">
          <Surface className="p-6">
            <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-border/40 pb-3 flex justify-between items-center">
              Prizes & Rewards 
              <button 
                onClick={() => {
                  const newPrizes = [...(settingsData.prizes || []), { position: "New Tier", reward: "TBD", description: "" }];
                  setSettingsData({ ...settingsData, prizes: newPrizes });
                }}
                className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider"
              >
                Add Entry
              </button>
            </h3>
            <div className="mt-4 space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {(settingsData.prizes || []).map((prize: any, idx: number) => (
                <div key={idx} className="p-4 bg-secondary/30 border border-border/60 rounded space-y-3 relative group/prize">
                  <button 
                    onClick={() => {
                      const newPrizes = settingsData.prizes.filter((_: any, i: number) => i !== idx);
                      setSettingsData({ ...settingsData, prizes: newPrizes });
                    }}
                    className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover/prize:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-muted-foreground">Position</label>
                      <input 
                        className="w-full h-8 bg-background border border-border px-2 text-[11px] rounded outline-none"
                        value={prize.position}
                        onChange={(e) => {
                          const newPrizes = [...settingsData.prizes];
                          newPrizes[idx].position = e.target.value;
                          setSettingsData({ ...settingsData, prizes: newPrizes });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-muted-foreground">Reward</label>
                      <input 
                        className="w-full h-8 bg-background border border-border px-2 text-[11px] rounded outline-none"
                        value={prize.reward}
                        onChange={(e) => {
                          const newPrizes = [...settingsData.prizes];
                          newPrizes[idx].reward = e.target.value;
                          setSettingsData({ ...settingsData, prizes: newPrizes });
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground">Description</label>
                    <input 
                      className="w-full h-8 bg-background border border-border px-2 text-[11px] rounded outline-none"
                      value={prize.description || ""}
                      onChange={(e) => {
                        const newPrizes = [...settingsData.prizes];
                        newPrizes[idx].description = e.target.value;
                        setSettingsData({ ...settingsData, prizes: newPrizes });
                      }}
                    />
                  </div>
                </div>
              ))}
              {(!settingsData.prizes || settingsData.prizes.length === 0) && (
                <div className="text-center py-6 text-[11px] text-muted-foreground italic opacity-50">No rewards configured for this mission.</div>
              )}
            </div>
          </Surface>

          <Surface className="p-6">
            <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-border/40 pb-3 flex justify-between items-center">
              Mission Rules
              <button 
                onClick={() => {
                  const newRules = [...(settingsData.rules || []), "New protocol entry..."];
                  setSettingsData({ ...settingsData, rules: newRules });
                }}
                className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider"
              >
                Add Rule
              </button>
            </h3>
            <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {(settingsData.rules || []).map((rule: string, idx: number) => (
                <div key={idx} className="flex gap-2 group/rule">
                  <input 
                    className="flex-1 h-9 bg-secondary border border-border px-3 text-[12px] rounded outline-none focus:border-primary/50"
                    value={rule}
                    onChange={(e) => {
                      const newRules = [...settingsData.rules];
                      newRules[idx] = e.target.value;
                      setSettingsData({ ...settingsData, rules: newRules });
                    }}
                  />
                  <button 
                    onClick={() => {
                      const newRules = settingsData.rules.filter((_: any, i: number) => i !== idx);
                      setSettingsData({ ...settingsData, rules: newRules });
                    }}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {(!settingsData.rules || settingsData.rules.length === 0) && (
                <div className="text-center py-6 text-[11px] text-muted-foreground italic opacity-50">No rules established for this engagement.</div>
              )}
            </div>
          </Surface>

          <Surface className="p-6">
            <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-border/40 pb-3 flex justify-between items-center">
              Resources & Downloads
              <button
                onClick={() => {
                  const newResources = [...(settingsData.resources || []), { title: "", url: "", description: "" }];
                  setSettingsData({ ...settingsData, resources: newResources });
                }}
                className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider"
              >
                <Plus className="h-3.5 w-3.5 inline mr-1" />Add Resource
              </button>
            </h3>
            <div className="mt-4 space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {(settingsData.resources || []).map((res: any, idx: number) => (
                <div key={idx} className="p-4 bg-secondary/30 border border-border/60 rounded space-y-3 relative group/res">
                  <button
                    onClick={() => {
                      const newResources = settingsData.resources.filter((_: any, i: number) => i !== idx);
                      setSettingsData({ ...settingsData, resources: newResources });
                    }}
                    className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover/res:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground">Title</label>
                    <input
                      className="w-full h-8 bg-background border border-border px-2 text-[11px] rounded outline-none"
                      placeholder="e.g. Dataset CSV, Problem Statement PDF"
                      value={res.title}
                      onChange={(e) => {
                        const newResources = [...settingsData.resources];
                        newResources[idx] = { ...newResources[idx], title: e.target.value };
                        setSettingsData({ ...settingsData, resources: newResources });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground">File URL</label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 h-8 bg-background border border-border px-2 text-[11px] rounded outline-none"
                        placeholder="URL or upload a file →"
                        value={res.url}
                        onChange={(e) => {
                          const newResources = [...settingsData.resources];
                          newResources[idx] = { ...newResources[idx], url: e.target.value };
                          setSettingsData({ ...settingsData, resources: newResources });
                        }}
                      />
                      <label className="h-8 w-8 bg-background border border-border rounded flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors shrink-0">
                        <FileUp className="h-3.5 w-3.5" />
                        <input
                          type="file"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const formData = new FormData();
                              formData.append("document", file);
                              const uploadRes = await hackathonsApi.uploadDocument(formData);
                              const newResources = [...settingsData.resources];
                              newResources[idx] = { ...newResources[idx], url: uploadRes.filePath, title: newResources[idx].title || file.name };
                              setSettingsData({ ...settingsData, resources: newResources });
                              toast.success("File uploaded.");
                            } catch (err: any) {
                              toast.error(err.message);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground">Description</label>
                    <input
                      className="w-full h-8 bg-background border border-border px-2 text-[11px] rounded outline-none"
                      placeholder="Brief description of this resource"
                      value={res.description || ""}
                      onChange={(e) => {
                        const newResources = [...settingsData.resources];
                        newResources[idx] = { ...newResources[idx], description: e.target.value };
                        setSettingsData({ ...settingsData, resources: newResources });
                      }}
                    />
                  </div>
                </div>
              ))}
              {(!settingsData.resources || settingsData.resources.length === 0) && (
                <div className="text-center py-6 text-[11px] text-muted-foreground italic opacity-50">No resources attached to this mission.</div>
              )}
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
