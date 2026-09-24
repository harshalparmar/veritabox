import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Settings from "./pages/veritabox/Settings";
import NotFound from "./pages/NotFound";
import { Suspense } from "react";

// VeritaBox — public
import Hackathons from "./pages/veritabox/Hackathons";
import HackathonDetail from "./pages/veritabox/HackathonDetail";
import SquadronProfile from "./pages/veritabox/SquadronProfile";
import SquadronsHub from "./pages/veritabox/SquadronsHub";
import SquadronConsole from "./pages/veritabox/SquadronConsole";
import Knowledge from "./pages/veritabox/Knowledge";
import KnowledgeArticle from "./pages/veritabox/KnowledgeArticle";
import KnowledgeWrite from "./pages/veritabox/KnowledgeWrite";
import KnowledgeEdit from "./pages/veritabox/KnowledgeEdit";
import CompetitionArena from "./pages/veritabox/CompetitionArena";
import Chapters from "./pages/veritabox/Chapters";
import Leaderboard from "./pages/veritabox/Leaderboard";
import CompetitionsList from "./pages/veritabox/competitions/CompetitionsList";
import CompetitionDetail from "./pages/veritabox/competitions/CompetitionDetail";
import Events from "./pages/veritabox/Events";
import EventDetail from "./pages/veritabox/EventDetail";
import Jobs from "./pages/veritabox/Jobs";
import JobDetail from "./pages/veritabox/JobDetail";
import MyApplications from "./pages/veritabox/MyApplications";
import Progress from "./pages/veritabox/Progress";
import Roadmaps from "./pages/veritabox/Roadmaps";
import RoadmapOnboarding from "./pages/veritabox/RoadmapOnboarding";
import DailyChecklist from "./pages/veritabox/DailyChecklist";
import TopicLearning from "./pages/veritabox/TopicLearning";
import SkillQuiz from "./pages/veritabox/SkillQuiz";
import DiagnosticAssessment from "./pages/veritabox/DiagnosticAssessment";
import ResumeAnalyzer from "./pages/veritabox/ResumeAnalyzer";

// VeritaBox — info
import About from "./pages/veritabox/info/About";
import Community from "./pages/veritabox/info/Community";
import Contact from "./pages/veritabox/info/Contact";
import Docs from "./pages/veritabox/info/Docs";
import Platform from "./pages/veritabox/info/Platform";
import Status from "./pages/veritabox/info/Status";
import Stats from "./pages/veritabox/Stats";
import Terms from "./pages/veritabox/info/Terms";
import Privacy from "./pages/veritabox/info/Privacy";
import Cookies from "./pages/veritabox/info/Cookies";
import Conduct from "./pages/veritabox/info/Conduct";


// VeritaBox — app
import MissionControl from "./pages/veritabox/MissionControl";
import Mainnet from "./pages/veritabox/Mainnet";
import Bounties from "./pages/veritabox/Bounties";
import BountyDetail from "./pages/veritabox/BountyDetail";
import Forge from "./pages/veritabox/Forge";
import ForgeChallenge from "./pages/veritabox/ForgeChallenge";
import ForgeLeaderboard from "./pages/veritabox/ForgeLeaderboard";
import AdminForge from "./pages/veritabox/AdminForge";
import Lab from "./pages/veritabox/Lab";
import Profile from "./pages/veritabox/Profile";
import Messages from "./pages/veritabox/Messages";
import Notifications from "./pages/veritabox/Notifications";
import Network from "./pages/veritabox/Network";
import HackathonArena from "./pages/veritabox/HackathonArena";
import ContestArena from "./pages/veritabox/ContestArena";
import ContestLeaderboardPage from "./pages/veritabox/ContestLeaderboardPage";
import RoundSubmissionForm from "./pages/veritabox/RoundSubmissionForm";
import AdminHome from "./pages/veritabox/AdminHome";
import AdminEvents from './pages/veritabox/AdminEvents';
import AdminEventManagement from './pages/veritabox/AdminEventManagement';
import AdminJobs from './pages/veritabox/AdminJobs';
import AdminMessages from './pages/veritabox/AdminMessages';
import AdminProgress from './pages/veritabox/AdminProgress';
import AdminHackathons from "./pages/veritabox/AdminHackathons";
import AdminHackathonManagement from "./pages/veritabox/AdminHackathonManagement";
import AdminCompetitions from "./pages/veritabox/AdminCompetitions";
import AdminBounties from "./pages/veritabox/AdminBounties";
import AdminUsers from "./pages/veritabox/AdminUsers";
import AdminMainnet from "./pages/veritabox/AdminMainnet";
import AdminKnowledge from "./pages/veritabox/AdminKnowledge";
import AdminChapters from "./pages/veritabox/AdminChapters";
import AdminNewsletter from "./pages/veritabox/AdminNewsletter";
import ChapterLeaderboard from "./pages/veritabox/ChapterLeaderboard";
import ChapterCommand from "./pages/veritabox/ChapterCommand";

import ChapterDetail from "./pages/veritabox/ChapterDetail";
import ChapterApply from "./pages/veritabox/ChapterApply";
import ChapterManage from "./pages/veritabox/ChapterManage";
import ProfileProjects from "./pages/veritabox/ProfileProjects";
import ProfileEdit from "./pages/veritabox/ProfileEdit";
import LabNew from "./pages/veritabox/LabNew";
import LabDetail from "./pages/veritabox/LabDetail";
import SuperAdminDashboard from "./pages/veritabox/SuperAdminDashboard";
import HackathonRegistration from "./pages/veritabox/HackathonRegistration";

import HackathonSubmission from "./pages/veritabox/HackathonSubmission";
import Workshops from "./pages/veritabox/Workshops";
import AdminPublishing from "./pages/veritabox/AdminPublishing";
import AdminPublishingWrite from "./pages/veritabox/AdminPublishingWrite";
import AdminPublishingEdit from "./pages/veritabox/AdminPublishingEdit";
import PublishingReader from "./pages/veritabox/PublishingReader";
import TutorialsIndex from "./pages/veritabox/TutorialsIndex";
import TutorialsCategory from "./pages/veritabox/TutorialsCategory";
import WorkshopDetail from "./pages/veritabox/WorkshopDetail";
import AdminWorkshops from "./pages/veritabox/AdminWorkshops";

import RecruiterDashboard from "./pages/veritabox/RecruiterDashboard";
import RecruiterJobs from "./pages/veritabox/RecruiterJobs";
import RecruiterJobNew from "./pages/veritabox/RecruiterJobNew";
import RecruiterTalent from "./pages/veritabox/RecruiterTalent";
import RecruiterApplications from "./pages/veritabox/RecruiterApplications";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { CommandPalette } from "./components/veritabox/CommandPalette";

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const queryClient = new QueryClient();

function DashboardRouter() {
  const { user } = useAuth();
  return user?.role === "Recruiter" ? <RecruiterDashboard /> : <MissionControl />;
}

const SettingsRedirect = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "identity";
  return <Navigate to={`/dashboard?settings=true&settingsTab=${tab}`} replace />;
};

const RecruiterJobRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/jobs/${id}`} replace />;
};

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

const App = () => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <AuthProvider>
                <SocketProvider>
                  <CommandPalette />
                  <Suspense fallback={<div className='flex items-center justify-center h-screen bg-background'>Loading...</div>}>
                    <Routes>
                      <Route path='/progress' element={<ProtectedRoute deniedRoles={["Teacher"]}><Progress /></ProtectedRoute>} />
                      <Route path='/roadmaps' element={<ProtectedRoute deniedRoles={["Teacher"]}><Roadmaps /></ProtectedRoute>} />
                      <Route path='/roadmaps/onboarding' element={<ProtectedRoute deniedRoles={["Teacher"]}><RoadmapOnboarding /></ProtectedRoute>} />
                      <Route path='/checklist' element={<ProtectedRoute deniedRoles={["Teacher"]}><DailyChecklist /></ProtectedRoute>} />
                      <Route path='/learning/topic/:topicId' element={<ProtectedRoute deniedRoles={["Teacher"]}><TopicLearning /></ProtectedRoute>} />
                      <Route path='/learning/quiz/:contentId' element={<ProtectedRoute deniedRoles={["Teacher"]}><SkillQuiz /></ProtectedRoute>} />
                      <Route path='/diagnostic' element={<ProtectedRoute deniedRoles={["Teacher"]}><DiagnosticAssessment /></ProtectedRoute>} />
                      <Route path='/resume-analyzer' element={<ProtectedRoute deniedRoles={["Teacher"]}><ResumeAnalyzer /></ProtectedRoute>} />
                      <Route path='/events' element={<Events />} />
                      <Route path='/events/:slug' element={<EventDetail />} />
                      <Route path='/jobs' element={<Jobs />} />
                      <Route path='/jobs/applications' element={<ProtectedRoute><MyApplications /></ProtectedRoute>} />
                      <Route path='/jobs/:id' element={<JobDetail />} />
                      <Route path='/settings' element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/register" element={<Auth />} />
                      <Route path="/forgot-password" element={<Auth />} />
                      <Route path="/reset-password" element={<Auth />} />
                      <Route path="/enlist" element={<Navigate to="/register" replace />} />
                      
                      <Route path="/recruiter" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/recruiter/jobs" element={<Navigate to="/jobs" replace />} />
                      <Route path="/recruiter/jobs/new" element={<Navigate to="/jobs/new" replace />} />
                      <Route path="/recruiter/jobs/:id" element={<RecruiterJobRedirect />} />
                      <Route path="/recruiter/talent" element={<Navigate to="/talent" replace />} />
                      <Route path="/recruiter/applications" element={<Navigate to="/applications" replace />} />

                      <Route path="/jobs" element={<ProtectedRoute><RecruiterJobs /></ProtectedRoute>} />
                      <Route path="/jobs/new" element={<ProtectedRoute><RecruiterJobNew /></ProtectedRoute>} />
                      <Route path="/jobs/:id" element={<ProtectedRoute><RecruiterJobNew /></ProtectedRoute>} />
                      <Route path="/talent" element={<ProtectedRoute><RecruiterTalent /></ProtectedRoute>} />
                      <Route path="/applications" element={<ProtectedRoute><RecruiterApplications /></ProtectedRoute>} />

                      <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
                      <Route path="/mainnet" element={<ProtectedRoute><Mainnet /></ProtectedRoute>} />
                      
                      <Route path="/knowledge" element={<Knowledge />} />
                      <Route path="/knowledge/write" element={<ProtectedRoute><KnowledgeWrite /></ProtectedRoute>} />
                      <Route path="/knowledge/edit/:slug" element={<ProtectedRoute><KnowledgeEdit /></ProtectedRoute>} />
                      <Route path="/knowledge/:slug" element={<KnowledgeArticle />} />
                      
                      <Route path="/hackathons" element={<Hackathons />} />
                      <Route path="/hackathons/:slug" element={<HackathonDetail />} />
                      <Route path="/hackathons/:id/arena" element={<ProtectedRoute><HackathonArena /></ProtectedRoute>} />
                      <Route path="/hackathons/:id/register" element={<ProtectedRoute><HackathonRegistration /></ProtectedRoute>} />
                      <Route path="/hackathons/:id/submit" element={<ProtectedRoute><HackathonSubmission /></ProtectedRoute>} />
                      <Route path="/hackathons/:id/rounds/:roundNumber/submit" element={<ProtectedRoute><RoundSubmissionForm /></ProtectedRoute>} />
                      <Route path="/hackathons/:id/rounds/:roundNumber/contest" element={<ProtectedRoute><ContestArena /></ProtectedRoute>} />
                      <Route path="/hackathons/:id/rounds/:roundNumber/leaderboard" element={<ContestLeaderboardPage />} />
                      
                      <Route path="/competitions" element={<CompetitionsList />} />
                      <Route path="/competitions/:slug" element={<CompetitionDetail />} />
                      <Route path="/competitions/:id/arena" element={<ProtectedRoute><CompetitionArena /></ProtectedRoute>} />

                      <Route path="/veritabox/squadron/:identifier" element={<ProtectedRoute><SquadronProfile /></ProtectedRoute>} />
                      <Route path="/squadron/:identifier" element={<ProtectedRoute><SquadronProfile /></ProtectedRoute>} />
                      <Route path="/squadrons" element={<ProtectedRoute><SquadronsHub /></ProtectedRoute>} />
                      <Route path="/squadrons/:id/console" element={<ProtectedRoute><SquadronConsole /></ProtectedRoute>} />

                      <Route path="/bounties" element={<ProtectedRoute><Bounties /></ProtectedRoute>} />
                      <Route path="/bounties/:id" element={<ProtectedRoute><BountyDetail /></ProtectedRoute>} />

                      <Route path="/forge" element={<ProtectedRoute><Forge /></ProtectedRoute>} />
                      <Route path="/forge/leaderboard" element={<Navigate to="/leaderboard?tab=forge" replace />} />
                      <Route path="/forge/:id" element={<ProtectedRoute><ForgeChallenge /></ProtectedRoute>} />

                      <Route path="/lab" element={<Lab />} />
                      <Route path="/lab/new" element={<ProtectedRoute><LabNew /></ProtectedRoute>} />
                      <Route path="/lab/:id" element={<LabDetail />} />

                      <Route path="/chapters" element={<Chapters />} />
                      <Route path="/chapters/leaderboard" element={<ChapterLeaderboard />} />
                      <Route path="/chapters/apply" element={<ProtectedRoute><ChapterApply /></ProtectedRoute>} />
                      <Route path="/chapters/:id" element={<ChapterDetail />} />
                      <Route path="/chapters/:id/manage" element={<ProtectedRoute><ChapterManage /></ProtectedRoute>} />
                      <Route path="/dashboard/chapter" element={<ProtectedRoute><ChapterCommand /></ProtectedRoute>} />

                      <Route path="/workshops" element={<Workshops />} />
                      <Route path="/workshops/:slug" element={<WorkshopDetail />} />
                      
                      <Route path="/leaderboard" element={<Leaderboard />} />
                      <Route path="/profile/me" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                      <Route path="/profile/me/edit" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
                      <Route path="/profile/:username" element={<Profile />} />
                      <Route path="/profile/:username/projects" element={<ProtectedRoute><ProfileProjects /></ProtectedRoute>} />

                      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                      <Route path="/network" element={<ProtectedRoute><Network /></ProtectedRoute>} />
                      
                      {/* Admin Routes — protected by ProtectedRoute (JWT + admin role) */}
                      <Route path='/cmd' element={<ProtectedRoute><AdminHome /></ProtectedRoute>} />
                      <Route path='/cmd/events' element={<ProtectedRoute><AdminEvents /></ProtectedRoute>} />
                      <Route path='/cmd/events/:id/manage' element={<ProtectedRoute><AdminEventManagement /></ProtectedRoute>} />
                      <Route path='/cmd/jobs' element={<ProtectedRoute><AdminJobs /></ProtectedRoute>} />
                      <Route path='/cmd/messages' element={<ProtectedRoute><AdminMessages /></ProtectedRoute>} />
                      <Route path='/cmd/progress' element={<ProtectedRoute><AdminProgress /></ProtectedRoute>} />
                      <Route path="/cmd/hackathons" element={<ProtectedRoute><AdminHackathons /></ProtectedRoute>} />
                      <Route path="/cmd/hackathons/:id/manage" element={<ProtectedRoute><AdminHackathonManagement /></ProtectedRoute>} />
                      <Route path="/cmd/competitions" element={<ProtectedRoute><AdminCompetitions /></ProtectedRoute>} />
                      <Route path="/cmd/bounties" element={<ProtectedRoute><AdminBounties /></ProtectedRoute>} />
                      <Route path="/cmd/forge" element={<ProtectedRoute><AdminForge /></ProtectedRoute>} />
                      <Route path="/cmd/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
                      <Route path="/cmd/mainnet" element={<ProtectedRoute><AdminMainnet /></ProtectedRoute>} />
                      <Route path="/cmd/knowledge" element={<ProtectedRoute><AdminKnowledge /></ProtectedRoute>} />
                      <Route path="/cmd/chapters" element={<ProtectedRoute><AdminChapters /></ProtectedRoute>} />
                      <Route path="/cmd/workshops" element={<ProtectedRoute><AdminWorkshops /></ProtectedRoute>} />
                      <Route path="/cmd/newsletter" element={<ProtectedRoute><AdminNewsletter /></ProtectedRoute>} />
                      <Route path="/cmd/publishing" element={<ProtectedRoute><AdminPublishing /></ProtectedRoute>} />
                      <Route path="/cmd/publishing/write" element={<ProtectedRoute><AdminPublishingWrite /></ProtectedRoute>} />
                      <Route path="/cmd/publishing/edit/:id" element={<ProtectedRoute><AdminPublishingEdit /></ProtectedRoute>} />

                      {/* Public Publishing Routes */}
                      <Route path="/tutorials" element={<TutorialsIndex />} />
                      <Route path="/tutorials/category/:slug" element={<TutorialsCategory />} />
                      <Route path="/tutorials/:slug" element={<PublishingReader />} />


                      <Route path="/sa/dashboard" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />

                      {/* Info Pages */}
                      <Route path="/about" element={<About />} />
                      <Route path="/community" element={<Community />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/docs" element={<Docs />} />
                      <Route path="/platform" element={<Platform />} />
                      <Route path="/status" element={<Status />} />
                      <Route path="/stats" element={<Stats />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/cookies" element={<Cookies />} />
                      <Route path="/conduct" element={<Conduct />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </SocketProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
