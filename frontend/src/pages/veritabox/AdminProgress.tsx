/**
 * AdminProgress.tsx — Admin panel for Learning Content Management
 */

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/veritabox/AdminLayout";
import { PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/veritabox/UI";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { adminLearningApi, pulseApi } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Target, Brain, BookOpen, Search, Plus, Trash, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AdminProgress() {
  const [activeTab, setActiveTab] = useState("goals");
  
  // Data
  const [goals, setGoals] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState("Pending");

  // Pulse state
  const [pulses, setPulses] = useState<any[]>([]);
  const [newPulse, setNewPulse] = useState<any>({ title: "", body: "", type: "Announcement", priority: "Medium", targetAudience: "All", isActive: true, startDate: new Date().toISOString().split('T')[0] });
  const [isPulseDialogOpen, setIsPulseDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadSubmissions = async (status: string) => {
    try {
      const data = await adminLearningApi.getPracticalSubmissions(status);
      setSubmissions(data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load submissions");
    }
  };

  const handleReviewSubmission = async (id: string, status: string, score: number, feedback: string) => {
    try {
      await adminLearningApi.reviewPracticalSubmission(id, { status, score, feedback });
      toast.success(`Submission ${status.toLowerCase()}!`);
      loadSubmissions(activeSubTab);
    } catch (err: any) {
      toast.error(err?.message || "Failed to review submission");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "goals") setGoals(await adminLearningApi.getCareerGoals());
      else if (activeTab === "skills") setSkills(await adminLearningApi.getSkills());
      else if (activeTab === "content") {
        const res: any = await adminLearningApi.getContent();
        setContent(res.content || []);
      }
      else if (activeTab === "submissions") loadSubmissions(activeSubTab);
      else if (activeTab === "pulse") {
        const res: any = await pulseApi.getAll();
        setPulses(res.pulses || []);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePulse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPulse.title || !newPulse.body) return toast.error("Title and body are required.");
    setIsSubmitting(true);
    try {
      if (newPulse._id) {
        await pulseApi.update(newPulse._id, newPulse);
        toast.success("Announcement updated.");
      } else {
        await pulseApi.create(newPulse);
        toast.success("Announcement created.");
      }
      setIsPulseDialogOpen(false);
      setNewPulse({ title: "", body: "", type: "Announcement", priority: "Medium", targetAudience: "All", isActive: true, startDate: new Date().toISOString().split('T')[0] });
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save announcement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePulse = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await pulseApi.remove(id);
      toast.success("Deleted.");
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete.");
    }
  };

  const handleTogglePulse = async (pulse: any) => {
    try {
      await pulseApi.update(pulse._id, { isActive: !pulse.isActive });
      toast.success(pulse.isActive ? "Announcement deactivated." : "Announcement activated.");
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update.");
    }
  };

  const [newGoal, setNewGoal] = useState<any>({ title: "", description: "", suggestedDurationDays: 90, status: "Draft" });
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateGoal = () => {
    setNewGoal({ title: "", description: "", suggestedDurationDays: 90, status: "Draft" });
    setIsGoalDialogOpen(true);
  };

  const openEditGoal = (goal: any) => {
    setNewGoal({ ...goal });
    setIsGoalDialogOpen(true);
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
      await adminLearningApi.deleteCareerGoal(id);
      toast.success("Goal deleted");
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.title) return toast.error("Title is required");
    setIsSubmitting(true);
    try {
      if (newGoal._id) {
        await adminLearningApi.updateCareerGoal(newGoal._id, newGoal);
        toast.success("Career goal updated");
      } else {
        await adminLearningApi.createCareerGoal(newGoal);
        toast.success("Career goal created");
      }
      setIsGoalDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [newSkill, setNewSkill] = useState<any>({ name: "", category: "", difficulty: "Beginner", estimatedHours: 10, status: "Draft", careerGoals: [] });
  const [isSkillDialogOpen, setIsSkillDialogOpen] = useState(false);

  const openCreateSkill = () => {
    setNewSkill({ name: "", category: "", difficulty: "Beginner", estimatedHours: 10, status: "Draft", careerGoals: [] });
    if (goals.length === 0) adminLearningApi.getCareerGoals().then(setGoals);
    setIsSkillDialogOpen(true);
  };

  const openEditSkill = (skill: any) => {
    setNewSkill({ ...skill, careerGoals: skill.careerGoals?.map((g: any) => g._id || g) || [] });
    if (goals.length === 0) adminLearningApi.getCareerGoals().then(setGoals);
    setIsSkillDialogOpen(true);
  };

  const handleDeleteSkill = async (id: string) => {
    if (!confirm("Are you sure you want to delete this skill?")) return;
    try {
      await adminLearningApi.deleteSkill(id);
      toast.success("Skill deleted");
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.name) return toast.error("Name is required");
    setIsSubmitting(true);
    try {
      if (newSkill._id) {
        await adminLearningApi.updateSkill(newSkill._id, newSkill);
        toast.success("Skill updated");
      } else {
        await adminLearningApi.createSkill(newSkill);
        toast.success("Skill created");
      }
      setIsSkillDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save skill");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [newTopic, setNewTopic] = useState<any>({ 
    title: "", description: "", conceptSummary: "", theoryContent: "", 
    difficulty: "Beginner", estimatedMinutes: 60, skill: "", careerGoals: [], status: "Draft",
    hasPracticeTask: false,
    practiceTask: { title: "", description: "", submissionType: "Text", language: "javascript", starterCode: "" },
    hasQuiz: false,
    quizPassScore: 60,
    maxQuizAttempts: 3,
    quizQuestions: []
  });
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);

  const openCreateTopic = () => {
    setNewTopic({ 
      title: "", description: "", conceptSummary: "", theoryContent: "", 
      difficulty: "Beginner", estimatedMinutes: 60, skill: "", careerGoals: [], status: "Draft",
      hasPracticeTask: false,
      practiceTask: { title: "", description: "", submissionType: "Text", language: "javascript", starterCode: "" },
      hasQuiz: false,
      quizPassScore: 60,
      maxQuizAttempts: 3,
      quizQuestions: []
    });
    if (goals.length === 0) adminLearningApi.getCareerGoals().then(setGoals);
    if (skills.length === 0) adminLearningApi.getSkills().then(setSkills);
    setIsTopicDialogOpen(true);
  };

  const openEditTopic = (topic: any) => {
    setNewTopic({ 
      ...topic, 
      skill: topic.skill?._id || topic.skill, 
      careerGoals: topic.careerGoals?.map((g: any) => g._id || g) || [],
      hasPracticeTask: !!topic.practiceTask,
      practiceTask: topic.practiceTask || { title: "", description: "", submissionType: "Text", language: "javascript", starterCode: "" },
      hasQuiz: !!(topic.quizQuestions && topic.quizQuestions.length > 0),
      quizPassScore: topic.quizPassScore || 60,
      maxQuizAttempts: topic.maxQuizAttempts || 3,
      quizQuestions: topic.quizQuestions || []
    });
    if (goals.length === 0) adminLearningApi.getCareerGoals().then(setGoals);
    if (skills.length === 0) adminLearningApi.getSkills().then(setSkills);
    setIsTopicDialogOpen(true);
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm("Are you sure you want to delete this topic?")) return;
    try {
      await adminLearningApi.deleteContent(id);
      toast.success("Topic deleted");
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete topic");
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.title || !newTopic.skill) return toast.error("Title and Skill are required");
    setIsSubmitting(true);
    try {
      const payload = { ...newTopic };
      if (!payload.hasPracticeTask) {
        payload.practiceTask = null; // Backend might handle nulling it out or ignoring it, but sending null overrides existing
      }
      if (!payload.hasQuiz) {
        payload.quizQuestions = [];
        payload.quizPassScore = 60;
        payload.maxQuizAttempts = 3;
      }
      if (payload._id) {
        await adminLearningApi.updateContent(payload._id, payload);
        toast.success("Topic updated");
      } else {
        await adminLearningApi.createContent(payload);
        toast.success("Topic created");
      }
      setIsTopicDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save topic");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <PageContent>
        <div className="max-w-5xl mx-auto space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="goals">Career Goals</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="content">Learning Content</TabsTrigger>
              <TabsTrigger value="submissions">Submissions Review</TabsTrigger>
              <TabsTrigger value="pulse">VeritaBox Pulse</TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* Career Goals */}
                <TabsContent value="goals" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                      <input type="text" placeholder="Search goals..." className="pl-9 h-8 w-full rounded-md border bg-background text-sm" />
                    </div>
                    <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={openCreateGoal}><Plus className="h-4 w-4 mr-2" /> Create Goal</Button>
                      </DialogTrigger>
                      <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{newGoal._id ? "Edit Career Goal" : "Create Career Goal"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateGoal} className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} placeholder="e.g. Frontend Developer" required />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={newGoal.description} onChange={e => setNewGoal({ ...newGoal, description: e.target.value })} placeholder="Brief description of this career path..." />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Status</Label>
                              <select 
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={newGoal.status}
                                onChange={e => setNewGoal({ ...newGoal, status: e.target.value })}
                              >
                                <option value="Draft">Draft</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Duration (Days)</Label>
                              <Input type="number" min="1" value={newGoal.suggestedDurationDays} onChange={e => setNewGoal({ ...newGoal, suggestedDurationDays: parseInt(e.target.value) || 90 })} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsGoalDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {newGoal._id ? "Update" : "Create"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="grid gap-3">
                    {goals.length === 0 ? (
                      <Surface className="p-8 text-center text-muted-foreground">No career goals found.</Surface>
                    ) : goals.map((goal: any) => (
                      <Surface key={goal._id} className="p-4 flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                            <Target className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{goal.title}</p>
                            <p className="text-xs text-muted-foreground">{goal.skills?.length || 0} skills · {goal.suggestedDurationDays} days</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Pill variant={goal.status === "Active" ? "success" : "default"}>{goal.status}</Pill>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditGoal(goal)}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteGoal(goal._id)}>Delete</Button>
                          </div>
                        </div>
                      </Surface>
                    ))}
                  </div>
                </TabsContent>

                {/* Skills */}
                <TabsContent value="skills" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                      <input type="text" placeholder="Search skills..." className="pl-9 h-8 w-full rounded-md border bg-background text-sm" />
                    </div>
                    <Dialog open={isSkillDialogOpen} onOpenChange={setIsSkillDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={openCreateSkill}><Plus className="h-4 w-4 mr-2" /> Create Skill</Button>
                      </DialogTrigger>
                      <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{newSkill._id ? "Edit Skill" : "Create Skill"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateSkill} className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={newSkill.name} onChange={e => setNewSkill({ ...newSkill, name: e.target.value })} placeholder="e.g. React.js" required />
                          </div>
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Input value={newSkill.category} onChange={e => setNewSkill({ ...newSkill, category: e.target.value })} placeholder="e.g. Frontend" required />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Associated Career Goal</Label>
                            <select 
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              value={newSkill.careerGoals?.[0] || ""}
                              onChange={e => setNewSkill({ ...newSkill, careerGoals: e.target.value ? [e.target.value] : [] })}
                            >
                              <option value="">None</option>
                              {goals.map((g: any) => (
                                <option key={g._id} value={g._id}>{g.title}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Difficulty</Label>
                              <select 
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={newSkill.difficulty}
                                onChange={e => setNewSkill({ ...newSkill, difficulty: e.target.value })}
                              >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Status</Label>
                              <select 
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={newSkill.status}
                                onChange={e => setNewSkill({ ...newSkill, status: e.target.value })}
                              >
                                <option value="Draft">Draft</option>
                                <option value="Active">Active</option>
                                <option value="Archived">Archived</option>
                              </select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsSkillDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {newSkill._id ? "Update" : "Create"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="grid gap-3">
                    {skills.length === 0 ? (
                      <Surface className="p-8 text-center text-muted-foreground">No skills found.</Surface>
                    ) : skills.map((skill: any) => (
                      <Surface key={skill._id} className="p-4 flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-blue-500/10 flex items-center justify-center">
                            <Brain className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{skill.name}</p>
                            <p className="text-xs text-muted-foreground">{skill.category} · {skill.difficulty}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-muted-foreground mt-1">Goal: {skill.careerGoals?.[0]?.title || "None"}</p>
                          </div>
                          <Pill variant={skill.status === "Active" ? "success" : "default"}>{skill.status}</Pill>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditSkill(skill)}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteSkill(skill._id)}>Delete</Button>
                          </div>
                        </div>
                      </Surface>
                    ))}
                  </div>
                </TabsContent>

                {/* Content */}
                <TabsContent value="content" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                      <input type="text" placeholder="Search topics..." className="pl-9 h-8 w-full rounded-md border bg-background text-sm" />
                    </div>
                    <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={openCreateTopic}><Plus className="h-4 w-4 mr-2" /> Create Topic</Button>
                      </DialogTrigger>
                      <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{newTopic._id ? "Edit Learning Topic" : "Create Learning Topic"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateTopic} className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={newTopic.title} onChange={e => setNewTopic({ ...newTopic, title: e.target.value })} placeholder="e.g. Introduction to Hooks" required />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={newTopic.description} onChange={e => setNewTopic({ ...newTopic, description: e.target.value })} placeholder="Brief summary of this topic..." />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Concept Summary</Label>
                            <Input value={newTopic.conceptSummary || ""} onChange={e => setNewTopic({ ...newTopic, conceptSummary: e.target.value })} placeholder="1-2 sentences summarizing the core idea..." />
                          </div>

                          <div className="space-y-2">
                            <Label>Theory Content (Markdown)</Label>
                            <Textarea 
                              className="min-h-[150px] font-mono text-sm" 
                              value={newTopic.theoryContent || ""} 
                              onChange={e => setNewTopic({ ...newTopic, theoryContent: e.target.value })} 
                              placeholder="# Introduction&#10;Write your markdown content here..." 
                            />
                          </div>

                          <div className="p-4 border rounded-md bg-secondary/30 space-y-4">
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                id="hasPractice" 
                                checked={newTopic.hasPracticeTask} 
                                onChange={e => setNewTopic({ ...newTopic, hasPracticeTask: e.target.checked })}
                              />
                              <Label htmlFor="hasPractice" className="font-semibold text-primary">Enable Practice Task ("Try" Tab)</Label>
                            </div>
                            
                            {newTopic.hasPracticeTask && (
                              <div className="space-y-4 pt-2 border-t border-border">
                                <div className="space-y-2">
                                  <Label>Task Title</Label>
                                  <Input value={newTopic.practiceTask.title} onChange={e => setNewTopic({ ...newTopic, practiceTask: { ...newTopic.practiceTask, title: e.target.value } })} placeholder="e.g. Build a simple counter" />
                                </div>
                                <div className="space-y-2">
                                  <Label>Task Description / Instructions</Label>
                                  <Textarea value={newTopic.practiceTask.description} onChange={e => setNewTopic({ ...newTopic, practiceTask: { ...newTopic.practiceTask, description: e.target.value } })} placeholder="Provide instructions for the student..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Submission Type</Label>
                                    <select 
                                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      value={newTopic.practiceTask.submissionType}
                                      onChange={e => setNewTopic({ ...newTopic, practiceTask: { ...newTopic.practiceTask, submissionType: e.target.value } })}
                                    >
                                      <option value="Text">Text Answer</option>
                                      <option value="Code">Code</option>
                                      <option value="URL">URL Link</option>
                                    </select>
                                  </div>
                                  {newTopic.practiceTask.submissionType === "Code" && (
                                    <div className="space-y-2">
                                      <Label>Language (e.g. javascript)</Label>
                                      <Input value={newTopic.practiceTask.language} onChange={e => setNewTopic({ ...newTopic, practiceTask: { ...newTopic.practiceTask, language: e.target.value } })} placeholder="javascript, python, html" />
                                    </div>
                                  )}
                                </div>
                                {newTopic.practiceTask.submissionType === "Code" && (
                                  <div className="space-y-2">
                                    <Label>Starter Code</Label>
                                    <Textarea className="font-mono text-[12px]" value={newTopic.practiceTask.starterCode} onChange={e => setNewTopic({ ...newTopic, practiceTask: { ...newTopic.practiceTask, starterCode: e.target.value } })} placeholder="function myAnswer() {\n  // write code here\n}" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="p-4 border rounded-md bg-secondary/30 space-y-4">
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                id="hasQuiz" 
                                checked={newTopic.hasQuiz} 
                                onChange={e => setNewTopic({ ...newTopic, hasQuiz: e.target.checked })}
                              />
                              <Label htmlFor="hasQuiz" className="font-semibold text-primary">Enable Quiz Assessment</Label>
                            </div>
                            
                            {newTopic.hasQuiz && (
                              <div className="space-y-4 pt-2 border-t border-border">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Pass Score (%)</Label>
                                    <Input type="number" min="0" max="100" value={newTopic.quizPassScore} onChange={e => setNewTopic({ ...newTopic, quizPassScore: parseInt(e.target.value) })} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Max Attempts</Label>
                                    <Input type="number" min="1" value={newTopic.maxQuizAttempts} onChange={e => setNewTopic({ ...newTopic, maxQuizAttempts: parseInt(e.target.value) })} />
                                  </div>
                                </div>
                                <div className="space-y-4 mt-4">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">Questions</Label>
                                    <Button type="button" size="sm" variant="outline" onClick={() => setNewTopic({ ...newTopic, quizQuestions: [...newTopic.quizQuestions, { questionText: "", type: "SingleSelect", options: [""], correctAnswer: "", correctAnswers: [], explanation: "", points: 10, difficulty: "Beginner" }] })}>
                                      <Plus className="h-4 w-4 mr-2" /> Add Question
                                    </Button>
                                  </div>
                                  {newTopic.quizQuestions.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">No questions added yet.</p>
                                  ) : (
                                    newTopic.quizQuestions.map((q: any, qIdx: number) => (
                                      <div key={qIdx} className="p-4 border border-border bg-background rounded-md relative">
                                        <Button type="button" variant="ghost" size="sm" className="absolute top-2 right-2 text-destructive" onClick={() => { const qNew = [...newTopic.quizQuestions]; qNew.splice(qIdx, 1); setNewTopic({ ...newTopic, quizQuestions: qNew }); }}>
                                          <Trash className="h-4 w-4" />
                                        </Button>
                                        <div className="space-y-3">
                                          <div className="space-y-2 pr-8">
                                            <Label>Question Text</Label>
                                            <Textarea value={q.questionText} onChange={e => { const qNew = [...newTopic.quizQuestions]; qNew[qIdx].questionText = e.target.value; setNewTopic({ ...newTopic, quizQuestions: qNew }); }} required />
                                          </div>
                                          <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-2">
                                              <Label>Type</Label>
                                              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={q.type} onChange={e => { const qNew = [...newTopic.quizQuestions]; qNew[qIdx].type = e.target.value; setNewTopic({ ...newTopic, quizQuestions: qNew }); }}>
                                                <option value="SingleSelect">Single Select</option>
                                                <option value="MultiSelect">Multi Select</option>
                                              </select>
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Points</Label>
                                              <Input type="number" min="1" value={q.points} onChange={e => { const qNew = [...newTopic.quizQuestions]; qNew[qIdx].points = parseInt(e.target.value) || 0; setNewTopic({ ...newTopic, quizQuestions: qNew }); }} />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Difficulty</Label>
                                              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={q.difficulty} onChange={e => { const qNew = [...newTopic.quizQuestions]; qNew[qIdx].difficulty = e.target.value; setNewTopic({ ...newTopic, quizQuestions: qNew }); }}>
                                                <option value="Beginner">Beginner</option>
                                                <option value="Intermediate">Intermediate</option>
                                                <option value="Advanced">Advanced</option>
                                              </select>
                                            </div>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="flex justify-between">Options <Button type="button" variant="ghost" size="sm" className="h-5 px-2 text-[10px]" onClick={() => { const qNew = [...newTopic.quizQuestions]; qNew[qIdx].options.push(""); setNewTopic({ ...newTopic, quizQuestions: qNew }); }}>+ Add Option</Button></Label>
                                            {q.options.map((opt: string, optIdx: number) => (
                                              <div key={optIdx} className="flex items-center gap-2">
                                                <Input value={opt} onChange={e => { const qNew = [...newTopic.quizQuestions]; qNew[qIdx].options[optIdx] = e.target.value; setNewTopic({ ...newTopic, quizQuestions: qNew }); }} required placeholder={`Option ${optIdx + 1}`} />
                                                <Button type="button" variant="ghost" size="sm" onClick={() => { const qNew = [...newTopic.quizQuestions]; qNew[qIdx].options.splice(optIdx, 1); setNewTopic({ ...newTopic, quizQuestions: qNew }); }}><X className="h-4 w-4" /></Button>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Correct Answer(s)</Label>
                                            {q.type === "SingleSelect" ? (
                                              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={q.correctAnswer} onChange={e => { const qNew = [...newTopic.quizQuestions]; qNew[qIdx].correctAnswer = e.target.value; setNewTopic({ ...newTopic, quizQuestions: qNew }); }} required>
                                                <option value="" disabled>Select correct answer</option>
                                                {q.options.map((opt: string, optIdx: number) => opt ? <option key={optIdx} value={opt}>{opt}</option> : null)}
                                              </select>
                                            ) : (
                                              <div className="space-y-1">
                                                {q.options.map((opt: string, optIdx: number) => opt ? (
                                                  <label key={optIdx} className="flex items-center gap-2 text-sm">
                                                    <input type="checkbox" checked={q.correctAnswers?.includes(opt)} onChange={e => {
                                                      const qNew = [...newTopic.quizQuestions];
                                                      if (!qNew[qIdx].correctAnswers) qNew[qIdx].correctAnswers = [];
                                                      if (e.target.checked) qNew[qIdx].correctAnswers.push(opt);
                                                      else qNew[qIdx].correctAnswers = qNew[qIdx].correctAnswers.filter((a: string) => a !== opt);
                                                      setNewTopic({ ...newTopic, quizQuestions: qNew });
                                                    }} />
                                                    {opt}
                                                  </label>
                                                ) : null)}
                                              </div>
                                            )}
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Explanation (optional)</Label>
                                            <Textarea value={q.explanation} onChange={e => { const qNew = [...newTopic.quizQuestions]; qNew[qIdx].explanation = e.target.value; setNewTopic({ ...newTopic, quizQuestions: qNew }); }} placeholder="Explain why this is correct..." className="h-16" />
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Associated Career Goal</Label>
                              <select 
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={newTopic.careerGoals?.[0] || ""}
                                onChange={e => setNewTopic({ ...newTopic, careerGoals: e.target.value ? [e.target.value] : [] })}
                              >
                                <option value="">None (Optional)</option>
                                {goals.map((g: any) => (
                                  <option key={g._id} value={g._id}>{g.title}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Associated Skill</Label>
                              <select 
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={newTopic.skill}
                                onChange={e => setNewTopic({ ...newTopic, skill: e.target.value })}
                                required
                              >
                                <option value="" disabled>Select a skill...</option>
                                {skills.map((s: any) => (
                                  <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Difficulty</Label>
                              <select 
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={newTopic.difficulty}
                                onChange={e => setNewTopic({ ...newTopic, difficulty: e.target.value })}
                              >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Status</Label>
                              <select 
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={newTopic.status}
                                onChange={e => setNewTopic({ ...newTopic, status: e.target.value })}
                              >
                                <option value="Draft">Draft</option>
                                <option value="Published">Published</option>
                                <option value="Archived">Archived</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Est. Minutes</Label>
                              <Input type="number" min="1" value={newTopic.estimatedMinutes} onChange={e => setNewTopic({ ...newTopic, estimatedMinutes: parseInt(e.target.value) || 60 })} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsTopicDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {newTopic._id ? "Update" : "Create"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="grid gap-3">
                    {content.length === 0 ? (
                      <Surface className="p-8 text-center text-muted-foreground">No learning content found.</Surface>
                    ) : content.map((item: any) => (
                      <Surface key={item._id} className="p-4 flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-green-500/10 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{item.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <span>{item.skill?.name || "No Skill"}</span>
                              <span>·</span>
                              <span>{item.estimatedMinutes}m</span>
                              {item.quizQuestions?.length > 0 && <span className="bg-secondary px-1.5 rounded text-[10px]">Quiz: {item.quizQuestions.length}</span>}
                              {item.practiceTask && <span className="bg-secondary px-1.5 rounded text-[10px]">Practice</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Pill variant={item.status === "Published" ? "success" : "default"}>{item.status}</Pill>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditTopic(item)}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteTopic(item._id)}>Delete</Button>
                          </div>
                        </div>
                      </Surface>
                    ))}
                  </div>
                </TabsContent>

                {/* Submissions */}
                <TabsContent value="submissions" className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    {["Pending", "Verified", "Rejected"].map(s => (
                      <Button 
                        key={s} 
                        variant={activeSubTab === s ? "default" : "outline"} 
                        size="sm"
                        onClick={() => { setActiveSubTab(s); loadSubmissions(s); }}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>

                  <div className="grid gap-4">
                    {submissions.length === 0 ? (
                      <Surface className="p-8 text-center text-muted-foreground">
                        No {activeSubTab.toLowerCase()} submissions found.
                      </Surface>
                    ) : submissions.map((sub: any) => (
                      <Surface key={sub._id} className="p-5">
                        <div className="flex justify-between items-start mb-3 border-b border-border pb-3">
                          <div>
                            <p className="font-semibold">{sub.content?.title || "Unknown Topic"}</p>
                            <p className="text-[12px] text-muted-foreground mt-0.5">
                              Submitted by <span className="font-medium text-foreground">{sub.user?.name || "Unknown User"}</span>
                              {sub.user?.email && <span> ({sub.user.email})</span>}
                              {" · "}{new Date(sub.createdAt).toLocaleDateString()} {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Type: <span className="font-medium">{sub.submissionType}</span>
                              {" · "}Attempt #{sub.attemptNumber || 1}
                            </p>
                          </div>
                          <Pill variant={sub.status === "Verified" ? "success" : sub.status === "Rejected" ? "danger" : "warning"}>
                            {sub.status}
                          </Pill>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Submitted Content</p>
                          <pre className="text-[12px] bg-secondary border border-border rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap font-mono">
                            {sub.submissionText || sub.submissionCode || sub.submissionUrl || "No content provided"}
                          </pre>
                        </div>

                        {activeSubTab === "Pending" ? (
                          <div className="space-y-3 bg-secondary/30 p-3 border border-border rounded-md">
                            <p className="text-[12px] font-medium">Review & Grade</p>
                            <div className="grid grid-cols-4 gap-3">
                              <div className="col-span-1">
                                <Label className="text-[11px]">Score (0-100)</Label>
                                <Input type="number" min="0" max="100" id={`score-${sub._id}`} defaultValue="100" className="h-8 mt-1" />
                              </div>
                              <div className="col-span-3">
                                <Label className="text-[11px]">Feedback</Label>
                                <Input id={`feedback-${sub._id}`} placeholder="Great job..." className="h-8 mt-1" />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end mt-2">
                              <Button 
                                size="sm" variant="destructive"
                                onClick={() => {
                                  const score = parseInt((document.getElementById(`score-${sub._id}`) as HTMLInputElement).value) || 0;
                                  const feedback = (document.getElementById(`feedback-${sub._id}`) as HTMLInputElement).value;
                                  handleReviewSubmission(sub._id, "Rejected", score, feedback);
                                }}
                              >
                                Reject
                              </Button>
                              <Button 
                                size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => {
                                  const score = parseInt((document.getElementById(`score-${sub._id}`) as HTMLInputElement).value) || 100;
                                  const feedback = (document.getElementById(`feedback-${sub._id}`) as HTMLInputElement).value || "Good job!";
                                  handleReviewSubmission(sub._id, "Verified", score, feedback);
                                }}
                              >
                                Verify & Approve
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[12px] bg-secondary/30 p-3 border border-border rounded-md">
                            <p><span className="font-medium">Score:</span> {sub.score ?? "—"}/100</p>
                            {sub.feedback && <p className="mt-1"><span className="font-medium">Feedback:</span> {sub.feedback}</p>}
                            {sub.reviewedAt && <p className="mt-1 text-muted-foreground">Reviewed: {new Date(sub.reviewedAt).toLocaleDateString()}</p>}
                          </div>
                        )}
                      </Surface>
                    ))}
                  </div>
                </TabsContent>

                {/* VeritaBox Pulse */}
                <TabsContent value="pulse" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">VeritaBox Pulse</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Create and manage platform-wide announcements, events, and offers.</p>
                    </div>
                    <Dialog open={isPulseDialogOpen} onOpenChange={setIsPulseDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => { setNewPulse({ title: "", body: "", type: "Announcement", priority: "Medium", targetAudience: "All", isActive: true, startDate: new Date().toISOString().split('T')[0] }); setIsPulseDialogOpen(true); }}>
                          <Plus className="h-4 w-4 mr-2" /> New Announcement
                        </Button>
                      </DialogTrigger>
                      <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{newPulse._id ? "Edit Announcement" : "Create Announcement"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreatePulse} className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <Label>Title *</Label>
                            <Input value={newPulse.title} onChange={e => setNewPulse({ ...newPulse, title: e.target.value })} placeholder="e.g. Hackathon 2026 — Register Now" required />
                          </div>
                          <div className="space-y-2">
                            <Label>Body *</Label>
                            <Textarea value={newPulse.body} onChange={e => setNewPulse({ ...newPulse, body: e.target.value })} placeholder="Details about this announcement..." rows={3} required />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Type</Label>
                              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={newPulse.type} onChange={e => setNewPulse({ ...newPulse, type: e.target.value })}>
                                {["Announcement", "Event", "Hackathon", "Competition", "Workshop", "Offer", "Opportunity", "Update"].map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Priority</Label>
                              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={newPulse.priority} onChange={e => setNewPulse({ ...newPulse, priority: e.target.value })}>
                                {["Low", "Medium", "High", "Critical"].map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Target Audience</Label>
                              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={newPulse.targetAudience} onChange={e => setNewPulse({ ...newPulse, targetAudience: e.target.value })}>
                                {["All", "CareerGoal", "Skill", "Level"].map(a => (
                                  <option key={a} value={a}>{a}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Start Date</Label>
                              <Input type="date" value={newPulse.startDate} onChange={e => setNewPulse({ ...newPulse, startDate: e.target.value })} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>CTA Label (optional)</Label>
                              <Input value={newPulse.ctaLabel || ""} onChange={e => setNewPulse({ ...newPulse, ctaLabel: e.target.value })} placeholder="Register Now" />
                            </div>
                            <div className="space-y-2">
                              <Label>CTA URL (optional)</Label>
                              <Input value={newPulse.ctaUrl || ""} onChange={e => setNewPulse({ ...newPulse, ctaUrl: e.target.value })} placeholder="https://..." />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsPulseDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {newPulse._id ? "Update" : "Create"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid gap-3">
                    {pulses.length === 0 ? (
                      <Surface className="p-8 text-center text-muted-foreground">
                        No announcements yet. Create your first pulse announcement.
                      </Surface>
                    ) : pulses.map((pulse: any) => (
                      <Surface key={pulse._id} className={`p-4 ${!pulse.isActive ? 'opacity-50' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Pill variant={pulse.priority === "Critical" || pulse.priority === "High" ? "danger" : pulse.priority === "Medium" ? "warning" : "default"}>
                                {pulse.priority}
                              </Pill>
                              <Pill variant="default">{pulse.type}</Pill>
                              {pulse.isActive ? (
                                <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded">Active</span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">Inactive</span>
                              )}
                            </div>
                            <p className="text-sm font-medium">{pulse.title}</p>
                            <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{pulse.body}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Target: {pulse.targetAudience} · Created {new Date(pulse.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => { setNewPulse({ ...pulse, startDate: pulse.startDate ? new Date(pulse.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0] }); setIsPulseDialogOpen(true); }}>Edit</Button>
                            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleTogglePulse(pulse)}>
                              {pulse.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={() => handleDeletePulse(pulse._id)}>Delete</Button>
                          </div>
                        </div>
                      </Surface>
                    ))}
                  </div>
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </PageContent>
    </AdminLayout>
  );
}
