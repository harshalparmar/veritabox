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
import Settings from "./pages/VeritaBox/Settings";
import NotFound from "./pages/NotFound";
import { Suspense } from "react";

// VeritaBox — public
import Hackathons from "./pages/VeritaBox/Hackathons";
import HackathonDetail from "./pages/VeritaBox/HackathonDetail";
import SquadronProfile from "./pages/VeritaBox/SquadronProfile";
import SquadronsHub from "./pages/VeritaBox/SquadronsHub";
import SquadronConsole from "./pages/VeritaBox/SquadronConsole";
import Knowledge from "./pages/VeritaBox/Knowledge";
import KnowledgeArticle from "./pages/VeritaBox/KnowledgeArticle";
import KnowledgeWrite from "./pages/VeritaBox/KnowledgeWrite";
import KnowledgeEdit from "./pages/VeritaBox/KnowledgeEdit";
import CompetitionArena from "./pages/VeritaBox/CompetitionArena";
import Chapters from "./pages/VeritaBox/Chapters";
import Leaderboard from "./pages/VeritaBox/Leaderboard";
import CompetitionsList from "./pages/VeritaBox/competitions/CompetitionsList";
import CompetitionDetail from "./pages/VeritaBox/competitions/CompetitionDetail";
import Events from "./pages/VeritaBox/Events";
import EventDetail from "./pages/VeritaBox/EventDetail";
import Jobs from "./pages/VeritaBox/Jobs";
import JobDetail from "./pages/VeritaBox/JobDetail";
import MyApplications from "./pages/VeritaBox/MyApplications";
import Progress from "./pages/VeritaBox/Progress";
import Roadmaps from "./pages/VeritaBox/Roadmaps";
import RoadmapOnboarding from "./pages/VeritaBox/RoadmapOnboarding";
import DailyChecklist from "./pages/VeritaBox/DailyChecklist";
import TopicLearning from "./pages/VeritaBox/TopicLearning";
import SkillQuiz from "./pages/VeritaBox/SkillQuiz";
import DiagnosticAssessment from "./pages/VeritaBox/DiagnosticAssessment";
import ResumeAnalyzer from "./pages/VeritaBox/ResumeAnalyzer";

// VeritaBox — info
import About from "./pages/VeritaBox/info/About";
import Community from "./pages/VeritaBox/info/Community";
import Contact from "./pages/VeritaBox/info/Contact";
import Docs from "./pages/VeritaBox/info/Docs";
import Platform from "./pages/VeritaBox/info/Platform";
import Status from "./pages/VeritaBox/info/Status";
import Stats from "./pages/VeritaBox/Stats";
import Terms from "./pages/VeritaBox/info/Terms";
import Privacy from "./pages/VeritaBox/info/Privacy";
import Cookies from "./pages/VeritaBox/info/Cookies";
import Conduct from "./pages/VeritaBox/info/Conduct";


// VeritaBox — app
import MissionControl from "./pages/VeritaBox/MissionControl";
import Mainnet from "./pages/VeritaBox/Mainnet";
import Bounties from "./pages/VeritaBox/Bounties";
import BountyDetail from "./pages/VeritaBox/BountyDetail";
import Forge from "./pages/VeritaBox/Forge";
import ForgeChallenge from "./pages/VeritaBox/ForgeChallenge";
import ForgeLeaderboard from "./pages/VeritaBox/ForgeLeaderboard";
import AdminForge from "./pages/VeritaBox/AdminForge";
import Lab from "./pages/VeritaBox/Lab";
import Profile from "./pages/VeritaBox/Profile";
import Messages from "./pages/VeritaBox/Messages";
import Notifications from "./pages/VeritaBox/Notifications";
import Network from "./pages/VeritaBox/Network";
import HackathonArena from "./pages/VeritaBox/HackathonArena";
import ContestArena from "./pages/VeritaBox/ContestArena";
import ContestLeaderboardPage from "./pages/VeritaBox/ContestLeaderboardPage";
import RoundSubmissionForm from "./pages/VeritaBox/RoundSubmissionForm";
import AdminHome from "./pages/VeritaBox/AdminHome";
import AdminEvents from './pages/VeritaBox/AdminEvents';
import AdminEventManagement from './pages/VeritaBox/AdminEventManagement';
import AdminJobs from './pages/VeritaBox/AdminJobs';
import AdminMessages from './pages/VeritaBox/AdminMessages';
import AdminProgress from './pages/VeritaBox/AdminProgress';
import AdminHackathons from "./pages/VeritaBox/AdminHackathons";
import AdminHackathonManagement from "./pages/VeritaBox/AdminHackathonManagement";
import AdminCompetitions from "./pages/VeritaBox/AdminCompetitions";
import AdminBounties from "./pages/VeritaBox/AdminBounties";
import AdminUsers from "./pages/VeritaBox/AdminUsers";
import AdminMainnet from "./pages/VeritaBox/AdminMainnet";
import AdminKnowledge from "./pages/VeritaBox/AdminKnowledge";
import AdminChapters from "./pages/VeritaBox/AdminChapters";
import AdminNewsletter from "./pages/VeritaBox/AdminNewsletter";
import ChapterLeaderboard from "./pages/VeritaBox/ChapterLeaderboard";
import ChapterCommand from "./pages/VeritaBox/ChapterCommand";

import ChapterDetail from "./pages/VeritaBox/ChapterDetail";
import ChapterApply from "./pages/VeritaBox/ChapterApply";
import ChapterManage from "./pages/VeritaBox/ChapterManage";
import ProfileProjects from "./pages/VeritaBox/ProfileProjects";
import ProfileEdit from "./pages/VeritaBox/ProfileEdit";
import LabNew from "./pages/VeritaBox/LabNew";
import LabDetail from "./pages/VeritaBox/LabDetail";
import SuperAdminDashboard from "./pages/VeritaBox/SuperAdminDashboard";
import HackathonRegistration from "./pages/VeritaBox/HackathonRegistration";

import HackathonSubmission from "./pages/VeritaBox/HackathonSubmission";
import Workshops from "./pages/VeritaBox/Workshops";
import AdminPublishing from "./pages/VeritaBox/AdminPublishing";
import AdminPublishingWrite from "./pages/VeritaBox/AdminPublishingWrite";
import AdminPublishingEdit from "./pages/VeritaBox/AdminPublishingEdit";
import PublishingReader from "./pages/VeritaBox/PublishingReader";
import TutorialsIndex from "./pages/VeritaBox/TutorialsIndex";
import TutorialsCategory from "./pages/VeritaBox/TutorialsCategory";
import WorkshopDetail from "./pages/VeritaBox/WorkshopDetail";
import AdminWorkshops from "./pages/VeritaBox/AdminWorkshops";

import RecruiterDashboard from "./pages/VeritaBox/RecruiterDashboard";
import RecruiterJobs from "./pages/VeritaBox/RecruiterJobs";
import RecruiterJobNew from "./pages/VeritaBox/RecruiterJobNew";
import RecruiterTalent from "./pages/VeritaBox/RecruiterTalent";
import RecruiterApplications from "./pages/VeritaBox/RecruiterApplications";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { CommandPalette } from "./components/VeritaBox/CommandPalette";

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

                      <Route path="/VeritaBox/squadron/:identifier" element={<ProtectedRoute><SquadronProfile /></ProtectedRoute>} />
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
