import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/veritabox/AdminLayout";
import { PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/veritabox/UI";
import { competitionsApi, BASE_URL, resolveAssetUrl } from "@/lib/api";
import { Trophy, Plus, Save, Settings2, Users, FileText, CheckCircle2, XCircle, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

export default function AdminCompetitions() {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'manage'>('list');
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);

  const { data: competitions = [], isLoading } = useQuery({
    queryKey: ['admin_competitions'],
    queryFn: () => competitionsApi.adminGetAll()
  });

  return (
    <AdminLayout>
      <PageContent>
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-primary" />
              <div className="text-[11px] uppercase tracking-[0.2em] text-primary font-bold">Competitions CMS</div>
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight">Competition Engine</h1>
          </div>
          <div className="flex bg-secondary/50 p-1 rounded border border-border">
            <button onClick={() => { setActiveTab('list'); setSelectedCompId(null); }} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded ${activeTab === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>Directory</button>
            <button onClick={() => { setActiveTab('create'); setSelectedCompId(null); }} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded flex items-center gap-1 ${activeTab === 'create' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'} `}><Plus className="h-3 w-3" /> New</button>
            {activeTab === 'manage' && (
              <button className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded bg-primary text-primary-foreground shadow-sm flex items-center gap-1"><Settings2 className="h-3 w-3" /> Manage</button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {activeTab === 'list' && (
              <div className="grid lg:grid-cols-3 gap-6">
                {competitions.map((comp: any) => (
                  <Surface key={comp._id} className="p-4 border-l-4 border-l-primary flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{comp.title}</h3>
                      <Pill variant={comp.status === 'Published' ? 'success' : 'warning'}>{comp.status}</Pill>
                    </div>
                    <div className="text-xs text-muted-foreground mb-4 font-mono">Phase: {comp.currentPhase}</div>
                    <button 
                      onClick={() => { setSelectedCompId(comp._id); setActiveTab('manage'); }}
                      className="mt-auto w-full py-2 bg-secondary text-foreground text-xs font-bold uppercase tracking-widest rounded hover:bg-primary hover:text-primary-foreground transition-colors"
                    >Open Control Panel</button>
                  </Surface>
                ))}
              </div>
            )}
            {activeTab === 'create' && <CompetitionForm onSuccess={() => setActiveTab('list')} />}
            {activeTab === 'manage' && selectedCompId && <CompetitionManager compId={selectedCompId} comp={competitions.find((c:any)=>c._id===selectedCompId)} />}
          </>
        )}
      </PageContent>
    </AdminLayout>
  );
}

function CompetitionForm({ onSuccess, initialData }: { onSuccess: () => void, initialData?: any }) {
  const [formData, setFormData] = useState(initialData || {
    title: '', slug: '', overview: '', problemStatement: '',
    registrationDeadline: new Date().toISOString().slice(0,16),
    abstractDeadline: new Date().toISOString().slice(0,16),
    competitionDate: new Date().toISOString().slice(0,16),
    status: 'Draft', currentPhase: 'Registration',
    coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    thumbnailImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    problemStatementPdfUrl: '',
    abstractTemplateDocUrl: '',
    externalUrl: '',
    maxSquadronSize: 10,
    rubricCriteria: [] as Array<{ name: string; maxPoints: number }>,
    contacts: [
      { name: '', mobile: '', email: '' },
      { name: '', mobile: '', email: '' },
      { name: '', mobile: '', email: '' },
      { name: '', mobile: '', email: '' }
    ]
  });

  const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>({});

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: any) => initialData ? competitionsApi.adminUpdate(initialData._id, data) : competitionsApi.adminCreate(data),
    onSuccess: () => {
      toast.success(`Competition ${initialData ? 'Updated' : 'Created'}`);
      queryClient.invalidateQueries({ queryKey: ['admin_competitions'] });
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleChange = (e: any) => setFormData({...formData, [e.target.name]: e.target.value});
  
  const handleContactChange = (index: number, field: string, value: string) => {
    const updatedContacts = [...formData.contacts];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    setFormData({...formData, contacts: updatedContacts});
  };

  const handleFileUpload = async (field: string, file: File) => {
    setIsUploading(prev => ({ ...prev, [field]: true }));
    const form = new FormData();
    form.append('document', file);
    try {
      const res = await competitionsApi.uploadDocument(form);
      setFormData(prev => ({ ...prev, [field]: res.filePath }));
      toast.success(`Upload successful for ${field}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  return (
    <Surface className="p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Core Settings */}
        <section>
          <h3 className="font-bold text-sm uppercase tracking-widest text-primary mb-4 border-b border-border pb-2">Core Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Title</label><input name="title" value={formData.title} onChange={handleChange} className="w-full h-9 bg-card border border-border px-3 text-sm rounded" /></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">URL Slug</label><input name="slug" value={formData.slug} onChange={handleChange} className="w-full h-9 bg-card border border-border px-3 text-sm rounded" /></div>
          </div>
          <div className="mt-4"><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Overview</label><textarea name="overview" value={formData.overview} onChange={handleChange} className="w-full h-24 bg-card border border-border p-3 text-sm rounded resize-none" /></div>
          <div className="mt-4"><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Problem Statement (Brief)</label><textarea name="problemStatement" value={formData.problemStatement} onChange={handleChange} className="w-full h-24 bg-card border border-border p-3 text-sm rounded resize-none" placeholder="300-400 words..." /></div>
        </section>

        {/* Media & Assets */}
        <section>
          <h3 className="font-bold text-sm uppercase tracking-widest text-primary mb-4 border-b border-border pb-2">Media & Assets</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block">Thumbnail Image</label>
              <input value={formData.thumbnailImage} readOnly className="w-full h-9 bg-card/50 border border-border px-3 text-xs rounded text-muted-foreground" />
              <input type="file" onChange={(e) => e.target.files && handleFileUpload('thumbnailImage', e.target.files[0])} className="text-[10px]" />
              {isUploading['thumbnailImage'] && <span className="text-[10px] text-primary">Uploading...</span>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block">Cover Image</label>
              <input value={formData.coverImage} readOnly className="w-full h-9 bg-card/50 border border-border px-3 text-xs rounded text-muted-foreground" />
              <input type="file" onChange={(e) => e.target.files && handleFileUpload('coverImage', e.target.files[0])} className="text-[10px]" />
              {isUploading['coverImage'] && <span className="text-[10px] text-primary">Uploading...</span>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block">Problem Statement PDF</label>
              <input value={formData.problemStatementPdfUrl} readOnly className="w-full h-9 bg-card/50 border border-border px-3 text-xs rounded text-muted-foreground" />
              <input type="file" accept=".pdf" onChange={(e) => e.target.files && handleFileUpload('problemStatementPdfUrl', e.target.files[0])} className="text-[10px]" />
              {isUploading['problemStatementPdfUrl'] && <span className="text-[10px] text-primary">Uploading...</span>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block">Abstract Template (DOCX)</label>
              <input value={formData.abstractTemplateDocUrl} readOnly className="w-full h-9 bg-card/50 border border-border px-3 text-xs rounded text-muted-foreground" />
              <input type="file" accept=".doc,.docx" onChange={(e) => e.target.files && handleFileUpload('abstractTemplateDocUrl', e.target.files[0])} className="text-[10px]" />
              {isUploading['abstractTemplateDocUrl'] && <span className="text-[10px] text-primary">Uploading...</span>}
            </div>
          </div>
        </section>

        {/* Contacts */}
        <section>
          <h3 className="font-bold text-sm uppercase tracking-widest text-primary mb-4 border-b border-border pb-2">Command Contacts</h3>
          <div className="space-y-3">
            {[0, 1, 2, 3].map((idx) => {
              const c = formData.contacts[idx] || { name: '', mobile: '', email: '' };
              return (
                <div key={idx} className="flex gap-2">
                  <input placeholder="Name" value={c.name} onChange={(e) => handleContactChange(idx, 'name', e.target.value)} className="w-1/3 h-9 bg-card border border-border px-3 text-sm rounded" />
                  <input placeholder="Mobile" value={c.mobile} onChange={(e) => handleContactChange(idx, 'mobile', e.target.value)} className="w-1/3 h-9 bg-card border border-border px-3 text-sm rounded" />
                  <input placeholder="Email" value={c.email} onChange={(e) => handleContactChange(idx, 'email', e.target.value)} className="w-1/3 h-9 bg-card border border-border px-3 text-sm rounded" />
                </div>
              );
            })}
          </div>
        </section>

        {/* Logistics */}
        <section>
          <h3 className="font-bold text-sm uppercase tracking-widest text-primary mb-4 border-b border-border pb-2">Logistics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Reg. Deadline</label><input type="datetime-local" name="registrationDeadline" value={formData.registrationDeadline} onChange={handleChange} className="w-full h-9 bg-card border border-border px-3 text-sm rounded" /></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Abstract Deadline</label><input type="datetime-local" name="abstractDeadline" value={formData.abstractDeadline} onChange={handleChange} className="w-full h-9 bg-card border border-border px-3 text-sm rounded" /></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Event Date</label><input type="datetime-local" name="competitionDate" value={formData.competitionDate} onChange={handleChange} className="w-full h-9 bg-card border border-border px-3 text-sm rounded" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full h-9 bg-card border border-border px-3 text-sm rounded">
                <option value="Draft">Draft</option><option value="Published">Published</option>
              </select>
            </div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Phase Override</label>
              <select name="currentPhase" value={formData.currentPhase} onChange={handleChange} className="w-full h-9 bg-card border border-border px-3 text-sm rounded">
                <option value="Registration">1. Registration</option><option value="AbstractSelection">2. Abstract Selection</option><option value="OfflineCompetition">3. Offline Event</option>
              </select>
            </div>
          </div>
        </section>

        {/* Techfest Extensions */}
        <section>
          <h3 className="font-bold text-sm uppercase tracking-widest text-primary mb-4 border-b border-border pb-2">Techfest Settings</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">External Platform URL</label>
              <input name="externalUrl" value={formData.externalUrl || ''} onChange={handleChange} placeholder="e.g. CTFd URL" className="w-full h-9 bg-card border border-border px-3 text-sm rounded" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Max Squadron Size</label>
              <input type="number" name="maxSquadronSize" value={formData.maxSquadronSize ?? 10} onChange={(e) => setFormData({...formData, maxSquadronSize: parseInt(e.target.value) || 10})} min={1} max={20} className="w-full h-9 bg-card border border-border px-3 text-sm rounded" />
            </div>
          </div>

          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Rubric Criteria (Scoring)</label>
          <div className="space-y-2 mb-3">
            {(formData.rubricCriteria || []).map((c: any, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  placeholder="Criterion name"
                  value={c.name}
                  onChange={(e) => {
                    const updated = [...formData.rubricCriteria];
                    updated[i] = { ...updated[i], name: e.target.value };
                    setFormData({...formData, rubricCriteria: updated});
                  }}
                  className="flex-1 h-9 bg-card border border-border px-3 text-sm rounded"
                />
                <input
                  type="number"
                  placeholder="Max pts"
                  value={c.maxPoints}
                  onChange={(e) => {
                    const updated = [...formData.rubricCriteria];
                    updated[i] = { ...updated[i], maxPoints: parseInt(e.target.value) || 0 };
                    setFormData({...formData, rubricCriteria: updated});
                  }}
                  className="w-24 h-9 bg-card border border-border px-3 text-sm rounded"
                />
                <button onClick={() => {
                  const updated = formData.rubricCriteria.filter((_: any, idx: number) => idx !== i);
                  setFormData({...formData, rubricCriteria: updated});
                }} className="h-9 w-9 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setFormData({...formData, rubricCriteria: [...(formData.rubricCriteria || []), { name: '', maxPoints: 10 }]})}
            className="text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add Criterion
          </button>
          {(formData.rubricCriteria || []).length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground font-mono">
              Total max: {formData.rubricCriteria.reduce((s: number, c: any) => s + (c.maxPoints || 0), 0)} pts
            </div>
          )}
        </section>

        <button
          onClick={() => mutation.mutate(formData)}
          disabled={mutation.isPending || Object.values(isUploading).some(v => v)}
          className="w-full py-3 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-xs rounded mt-6"
        >
          {mutation.isPending ? "Saving..." : <><Save className="inline h-4 w-4 mr-2" /> Save Configuration</>}
        </button>
      </div>
    </Surface>
  );
}

function CompetitionManager({ compId, comp }: { compId: string, comp: any }) {
  const [managerTab, setManagerTab] = useState<'settings' | 'abstracts' | 'squadrons' | 'results'>('settings');

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-2">
        <button onClick={() => setManagerTab('settings')} className={`w-full text-left px-4 py-3 rounded text-sm font-bold uppercase tracking-widest border transition-all ${managerTab === 'settings' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card/50 text-muted-foreground hover:bg-secondary'}`}>Configuration</button>
        <button onClick={() => setManagerTab('abstracts')} className={`w-full text-left px-4 py-3 rounded text-sm font-bold uppercase tracking-widest border transition-all ${managerTab === 'abstracts' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card/50 text-muted-foreground hover:bg-secondary'}`}>Abstract Review</button>
        <button onClick={() => setManagerTab('squadrons')} className={`w-full text-left px-4 py-3 rounded text-sm font-bold uppercase tracking-widest border transition-all ${managerTab === 'squadrons' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card/50 text-muted-foreground hover:bg-secondary'}`}>Squadrons</button>
        <button onClick={() => setManagerTab('results')} className={`w-full text-left px-4 py-3 rounded text-sm font-bold uppercase tracking-widest border transition-all ${managerTab === 'results' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card/50 text-muted-foreground hover:bg-secondary'}`}>Results</button>
      </div>
      <div className="lg:col-span-3">
        {managerTab === 'settings' && <CompetitionForm initialData={comp} onSuccess={()=>{}} />}
        {managerTab === 'abstracts' && <AbstractReviewer compId={compId} comp={comp} />}
        {managerTab === 'squadrons' && <SquadronManager compId={compId} />}
        {managerTab === 'results' && <ResultsViewer compId={compId} />}
      </div>
    </div>
  );
}

function SquadronManager({ compId }: { compId: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: squadrons = [], isLoading } = useQuery({
    queryKey: ['admin_squadrons', compId],
    queryFn: () => competitionsApi.adminGetSquadrons(compId)
  });

  const { data: abstracts = [] } = useQuery({
    queryKey: ['admin_abstracts', compId],
    queryFn: () => competitionsApi.adminGetAbstracts(compId)
  });

  const dissolveMutation = useMutation({
    mutationFn: (squadronId: string) => competitionsApi.adminDeleteSquadron(compId, squadronId),
    onSuccess: () => {
      toast.success("Squadron dissolved successfully.");
      queryClient.invalidateQueries({ queryKey: ['admin_squadrons', compId] });
    }
  });

  const filtered = squadrons.filter((s: any) => 
    !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) || s.joinCode?.includes(search.toUpperCase())
  );

  // Stats
  const totalMembers = squadrons.reduce((acc: number, s: any) => acc + (s.members?.length || 0), 0);
  const totalPending = squadrons.reduce((acc: number, s: any) => acc + (s.members?.filter((m: any) => m.status === 'Pending').length || 0), 0);

  // Build abstract status map: squadronId -> abstract status
  const abstractMap: Record<string, string> = {};
  abstracts.forEach((reg: any) => {
    if (reg.squadronId?._id) {
      abstractMap[reg.squadronId._id] = reg.abstract?.status || 'None';
    }
  });

  if (isLoading) return <div className="p-12 text-center"><Loader2 className="animate-spin h-6 w-6 text-primary mx-auto" /></div>;

  return (
    <div className="space-y-5">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Squadrons', value: squadrons.length, icon: <Users className="h-4 w-4" /> },
          { label: 'Total Members', value: totalMembers, icon: <Users className="h-4 w-4" /> },
          { label: 'Pending Requests', value: totalPending, warn: totalPending > 0 },
        ].map((stat, i) => (
          <Surface key={i} className={`p-3 text-center ${stat.warn ? 'border-warning/30 bg-warning/5' : ''}`}>
            <div className={`text-2xl font-black font-mono ${stat.warn ? 'text-warning' : 'text-foreground'}`}>{stat.value}</div>
            <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">{stat.label}</div>
          </Surface>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by squadron name or join code..."
          className="w-full h-9 bg-card border border-border px-3 text-sm rounded pl-9 focus:outline-none focus:border-primary"
        />
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      {filtered.length === 0 ? (
        <Surface className="p-12 text-center text-muted-foreground">
          {search ? 'No squadrons match your search.' : 'No squadrons have been formed yet.'}
        </Surface>
      ) : (
        <div className="space-y-4">
          {filtered.map((squad: any) => {
            const pendingMembers = squad.members?.filter((m: any) => m.status === 'Pending') || [];
            const acceptedMembers = squad.members?.filter((m: any) => m.status === 'Accepted') || [];
            const abstractStatus = abstractMap[squad._id];

            return (
              <Surface key={squad._id} className="overflow-hidden">
                <div className="p-4 border-b border-border bg-secondary/30 flex flex-wrap justify-between items-start gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-bold text-base">{squad.name}</div>
                      {pendingMembers.length > 0 && (
                        <span className="text-[9px] font-black uppercase bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full">
                          {pendingMembers.length} Pending
                        </span>
                      )}
                      {abstractStatus && abstractStatus !== 'None' && (
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          abstractStatus === 'Selected' ? 'bg-success/10 text-success border-success/20' :
                          abstractStatus === 'Rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          'bg-secondary text-muted-foreground border-border'
                        }`}>
                          Abstract: {abstractStatus}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span>Code: <span className="text-warning font-black">{squad.joinCode}</span></span>
                      <span>Leader: <span className="text-foreground">{squad.leaderId?.name || '—'}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Members</div>
                      <div className="font-mono font-black text-foreground">
                        <span className="text-success">{acceptedMembers.length}</span>
                        {pendingMembers.length > 0 && <span className="text-warning"> +{pendingMembers.length}</span>}
                        <span className="text-muted-foreground font-normal">/{comp?.maxSquadronSize || 10}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (confirm(`Dissolve squadron "${squad.name}"? All ${squad.members?.length} members will be unenrolled. This is irreversible.`)) {
                          dissolveMutation.mutate(squad._id);
                        }
                      }} 
                      className="h-8 px-4 flex items-center justify-center bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-widest rounded hover:bg-destructive/20 transition-colors"
                      disabled={dissolveMutation.isPending}
                    >
                      Dissolve
                    </button>
                  </div>
                </div>

                {/* Member Roster */}
                <div className="p-4 bg-card/30">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Users className="h-3 w-3" /> Operatives ({squad.members?.length || 0})
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {squad.members?.map((m: any) => (
                      <div key={m.userId?._id || m._id} className={`flex justify-between items-center p-2.5 rounded border ${
                        m.status === 'Pending' ? 'border-warning/20 bg-warning/5' : 'border-border bg-card'
                      }`}>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate flex items-center gap-1.5">
                            {m.userId?.name}
                            {squad.leaderId?._id === m.userId?._id && (
                              <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded uppercase tracking-wider shrink-0">Leader</span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{m.userId?.email}</div>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 ml-2 ${m.status === 'Accepted' ? 'text-success' : 'text-warning'}`}>
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
}


function AbstractReviewer({ compId, comp }: { compId: string; comp: any }) {
  const queryClient = useQueryClient();
  const [sortByScore, setSortByScore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: abstracts = [], isLoading } = useQuery({
    queryKey: ['admin_abstracts', compId, sortByScore],
    queryFn: () => sortByScore ? competitionsApi.adminGetAbstractsSorted(compId, 'score') : competitionsApi.adminGetAbstracts(compId)
  });

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => competitionsApi.adminReviewAbstract(compId, id, data),
    onSuccess: () => {
      toast.success("Abstract review saved.");
      queryClient.invalidateQueries({ queryKey: ['admin_abstracts', compId] });
    }
  });

  const rubricCriteria = comp?.rubricCriteria || [];
  const hasRubric = rubricCriteria.length > 0;

  if (isLoading) return <div className="p-12 text-center"><Loader2 className="animate-spin h-6 w-6 text-primary mx-auto" /></div>;
  if (abstracts.length === 0) return <Surface className="p-12 text-center text-muted-foreground">No abstracts submitted yet.</Surface>;

  return (
    <div className="space-y-4">
      {hasRubric && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Rubric: {rubricCriteria.map((c: any) => `${c.name} (${c.maxPoints})`).join(' | ')}
          </div>
          <button onClick={() => setSortByScore(!sortByScore)} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">
            {sortByScore ? 'Sort by Date' : 'Sort by Score'}
          </button>
        </div>
      )}
      {abstracts.map((reg: any) => (
        <Surface key={reg._id} className="overflow-hidden">
          <div className="p-4 border-b border-border bg-secondary/30 flex justify-between items-center">
            <div>
              <div className="font-bold text-sm mb-1">{reg.participationType === 'Squadron' ? `Squad: ${reg.squadronId?.name}` : `Operative: ${reg.userId?.name}`}</div>
              <div className="text-xs text-muted-foreground font-mono">
                Date: {new Date(reg.abstract.submittedAt).toLocaleString()}
                {reg.abstract.totalScore > 0 && <span className="ml-3 text-primary font-bold">Score: {reg.abstract.totalScore}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                reg.abstract.status === 'Selected' ? 'bg-success/10 text-success border-success/20' :
                reg.abstract.status === 'Rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                'bg-secondary text-muted-foreground border-border'
              }`}>{reg.abstract.status}</span>
              {!hasRubric && (
                <>
                  <button onClick={() => mutation.mutate({ id: reg._id, data: { status: 'Selected' } })} className="h-8 w-8 flex items-center justify-center bg-success/10 text-success rounded hover:bg-success/20 transition-colors"><CheckCircle2 className="h-4 w-4" /></button>
                  <button onClick={() => mutation.mutate({ id: reg._id, data: { status: 'Rejected' } })} className="h-8 w-8 flex items-center justify-center bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"><XCircle className="h-4 w-4" /></button>
                </>
              )}
              {hasRubric && (
                <button onClick={() => setExpandedId(expandedId === reg._id ? null : reg._id)} className="h-8 px-3 flex items-center gap-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest rounded hover:bg-primary/20">
                  {expandedId === reg._id ? 'Close' : 'Score'}
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            {reg.abstract.pdfUrl ? (
              <a href={resolveAssetUrl(reg.abstract.pdfUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-4 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded transition-colors w-full justify-center">
                <FileText className="h-6 w-6" /> <span className="font-bold tracking-widest uppercase text-sm">Download Abstract PDF</span>
              </a>
            ) : (
              <div className="text-muted-foreground text-sm text-center py-4">No PDF attached.</div>
            )}
          </div>
          {hasRubric && expandedId === reg._id && (
            <RubricScoringPanel
              criteria={rubricCriteria}
              existingScores={reg.abstract.rubricScores || []}
              onSave={(rubricScores, status) => mutation.mutate({ id: reg._id, data: { rubricScores, status } })}
              isPending={mutation.isPending}
            />
          )}
        </Surface>
      ))}
    </div>
  );
}

function RubricScoringPanel({ criteria, existingScores, onSave, isPending }: {
  criteria: Array<{ name: string; maxPoints: number }>;
  existingScores: Array<{ criteriaName: string; score: number; comment?: string }>;
  onSave: (scores: any[], status: string) => void;
  isPending: boolean;
}) {
  const [scores, setScores] = useState(() =>
    criteria.map(c => {
      const existing = existingScores.find(s => s.criteriaName === c.name);
      return { criteriaName: c.name, score: existing?.score ?? 0, comment: existing?.comment ?? '' };
    })
  );

  const totalScore = scores.reduce((s, sc) => s + sc.score, 0);
  const maxTotal = criteria.reduce((s, c) => s + c.maxPoints, 0);

  return (
    <div className="p-4 border-t border-border bg-card/50 space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Rubric Scoring</h4>
      {criteria.map((c, i) => (
        <div key={c.name} className="flex items-center gap-3">
          <div className="flex-1 text-sm">{c.name}</div>
          <input
            type="number"
            min={0}
            max={c.maxPoints}
            value={scores[i].score}
            onChange={(e) => {
              const updated = [...scores];
              updated[i] = { ...updated[i], score: Math.min(parseInt(e.target.value) || 0, c.maxPoints) };
              setScores(updated);
            }}
            className="w-20 h-8 bg-card border border-border px-2 text-sm rounded text-center"
          />
          <span className="text-xs text-muted-foreground w-12">/ {c.maxPoints}</span>
          <input
            placeholder="Comment"
            value={scores[i].comment}
            onChange={(e) => {
              const updated = [...scores];
              updated[i] = { ...updated[i], comment: e.target.value };
              setScores(updated);
            }}
            className="w-48 h-8 bg-card border border-border px-2 text-xs rounded"
          />
        </div>
      ))}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="text-sm font-bold">Total: <span className="text-primary">{totalScore}</span> / {maxTotal}</div>
        <div className="flex gap-2">
          <button onClick={() => onSave(scores, 'Selected')} disabled={isPending} className="h-8 px-4 bg-success/10 text-success text-xs font-bold uppercase tracking-widest rounded hover:bg-success/20 disabled:opacity-50">
            Score & Select
          </button>
          <button onClick={() => onSave(scores, 'Rejected')} disabled={isPending} className="h-8 px-4 bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-widest rounded hover:bg-destructive/20 disabled:opacity-50">
            Score & Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsViewer({ compId }: { compId: string }) {
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['admin_results', compId],
    queryFn: () => competitionsApi.adminGetResults(compId)
  });

  if (isLoading) return <div className="p-12 text-center"><Loader2 className="animate-spin h-6 w-6 text-primary mx-auto" /></div>;
  if (results.length === 0) return <Surface className="p-12 text-center text-muted-foreground">No scored results yet.</Surface>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Ranked Results</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <th className="py-2 px-3 text-left">#</th>
              <th className="py-2 px-3 text-left">Name / Squadron</th>
              <th className="py-2 px-3 text-right">Total Score</th>
              <th className="py-2 px-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((reg: any, idx: number) => (
              <tr key={reg._id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="py-2 px-3 font-mono font-bold">{idx + 1}</td>
                <td className="py-2 px-3">
                  <div className="font-bold">{reg.participationType === 'Squadron' ? reg.squadronId?.name : reg.userId?.name}</div>
                  {reg.userId?.email && <div className="text-xs text-muted-foreground">{reg.userId.email}</div>}
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-primary">{reg.abstract?.totalScore || 0}</td>
                <td className="py-2 px-3">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    reg.abstract?.status === 'Selected' ? 'bg-success/10 text-success border-success/20' :
                    reg.abstract?.status === 'Rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                    'bg-secondary text-muted-foreground border-border'
                  }`}>{reg.abstract?.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
