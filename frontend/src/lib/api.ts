/**
 * api.ts — Central API client for the VeritaBox platform.
 * All HTTP calls to the Express/MongoDB backend go through here.
 * JWT token is automatically attached from localStorage.
 */

// Dynamic API resolution for cross-device network access
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

  // If we are accessing via a network IP (e.g., 192.168.x.x), 
  // we should point to the same IP for the backend.
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    return `http://${hostname}:5000`;
  }

  return "http://localhost:5000";
};

export const BASE_URL = getBaseUrl();

export const resolveAssetUrl = (url?: string) => {
  if (!url) return "";

  if (!url.startsWith("http")) {
    return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  return url;
};

// For auth-gated assets (e.g. proctor snapshots) that load via <img> and thus
// cannot send an Authorization header — carries the JWT as a query token.
// Do NOT use for public assets: keeps tokens out of ordinary image URLs.
export const resolveGatedAssetUrl = (url?: string) => {
  if (!url) return "";
  // data: and blob: URIs pass through untouched
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  const base = resolveAssetUrl(url);
  // Only append the token for URLs served by our own backend — never leak to external CDNs
  if (!base.startsWith(BASE_URL)) return base;
  const token = getToken();
  if (!token) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}token=${token}`;
};

// ─── Token helpers ────────────────────────────────────────────────────────────

export const getToken = (): string | null => localStorage.getItem("token");
export const setToken = (token: string) => localStorage.setItem("token", token);
export const removeToken = () => { localStorage.removeItem("token"); localStorage.removeItem("adminToken"); };

export const getAdminToken = (): string | null => localStorage.getItem("adminToken");
export const setAdminToken = (token: string) => localStorage.setItem("adminToken", token);
const adminBase = () => `/api/panel/${getAdminToken() || ''}`;

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...rest } = options;

  // Build URL with optional query params
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.append(key, String(value))
    );
  }

  const token = endpoint.startsWith("/api/sa")
    ? localStorage.getItem("sa_token")
    : getToken();

  const isFormData = options.body instanceof FormData;

  let response;
  try {
    response = await fetch(url.toString(), {
      ...rest,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: isFormData ? (options.body as any) : options.body,
    });
  } catch (err) {
    console.error("API FETCH ERROR:", err);
    throw err;
  }

  // Handle 401 — token expired or invalid (except for auth routes)
  if (response.status === 401 && !endpoint.startsWith("/api/auth/")) {
    removeToken();
    // Dispatch a custom event so React components can intercept and navigate without a hard reload
    window.dispatchEvent(new CustomEvent("auth:logout"));
    throw new Error("Session expired. Please log in again.");
  }

  // Safely parse JSON — server may return an HTML error page on gateway errors
  let data: any = {};
  try {
    data = await response.json();
  } catch {
    // Non-JSON body (e.g., 502 HTML from NGINX) — leave data as empty object
  }

  if (!response.ok) {
    console.error("API Error Response:", data);
    throw new Error(data?.message || `Request failed: ${response.status}`);
  }

  return data as T;
}

// ─── HTTP method shortcuts ────────────────────────────────────────────────────

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: "GET", ...options }),

  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: "DELETE", ...options }),

  upload: <T>(endpoint: string, formData: FormData, options?: RequestOptions) => {
    const token = getToken();
    return fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      body: formData,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      return data as T;
    });
  },
};

// ─── Typed API modules ────────────────────────────────────────────────────────

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/api/auth/login", { email, password }),
  googleLogin: (idToken?: string, accessToken?: string) =>
    api.post<AuthResponse>("/api/auth/google", { idToken, accessToken }),
  githubLogin: (code: string) =>
    api.post<AuthResponse>("/api/auth/github", { code }),
  microsoftLogin: (code: string) =>
    api.post<AuthResponse>("/api/auth/microsoft", { code }),
  linkedinLogin: (code: string) =>
    api.post<AuthResponse>("/api/auth/linkedin", { code }),

  register: (name: string, email: string, password: string, universityId?: string) =>
    api.post<AuthResponse>("/api/auth/register", { name, email, password, universityId }),
  verifyTotp: (userId: string, token: string) =>
    api.post<AuthResponse>("/api/auth/verify-totp", { userId, token }),

  // OTP Login & Password Reset
  requestOtpLogin: (email: string) =>
    api.post<{ message: string }>("/api/auth/request-otp-login", { email }),
  verifyOtpLogin: (email: string, otp: string) =>
    api.post<AuthResponse>("/api/auth/verify-otp-login", { email, otp }),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/api/auth/forgot-password", { email }),
  resetPassword: (email: string, otp: string, newPassword: string) =>
    api.post<{ message: string }>("/api/auth/reset-password", { email, otp, newPassword }),
};

// Security & Auth Management
export const authSecurityApi = {
  setup2FA: () => api.post<{ secret: string; qrCodeUrl: string }>("/api/auth-security/2fa/setup"),
  verify2FA: (token: string) => api.post<{ message: string; backupCodes: string[] }>("/api/auth-security/2fa/verify", { token }),
  disable2FA: (password: string, token: string) => api.post<{ message: string }>("/api/auth-security/2fa/disable", { password, token }),
  linkSocial: (data: { provider: string; providerId: string; email?: string; username?: string }) =>
    api.post<{ message: string; socialProviders: any }>("/api/auth-security/social/link", data),
  linkSocialGithub: (code: string) => api.post<{ message: string; socialProviders: any }>("/api/auth-security/social/link/github", { code }),
  linkSocialMicrosoft: (code: string) => api.post<{ message: string; socialProviders: any }>("/api/auth-security/social/link/microsoft", { code }),
  linkSocialGoogle: (data: { idToken?: string; accessToken?: string }) => api.post<{ message: string; socialProviders: any }>("/api/auth-security/social/link/google", data),
  linkSocialLinkedin: (code: string) => api.post<{ message: string; socialProviders: any }>("/api/auth-security/social/link/linkedin", { code }),
  unlinkSocial: (provider: string) => api.post<{ message: string; socialProviders: any }>("/api/auth-security/social/unlink", { provider }),
  lost2faRequest: (userId: string, email?: string) => api.post<{ message: string }>("/api/auth-security/2fa/lost-request", { userId, email }),
  lost2faVerify: (userId: string, otp: string) => api.post<AuthResponse>("/api/auth-security/2fa/lost-verify", { userId, otp }),
};

// Users
export const usersApi = {
  getMe: () => api.get<User>("/api/users/me"),
  updatePassword: (data: any) => api.put<{ message: string }>("/api/users/password", data),
  getProfile: (id: string) => api.get<User>(`/api/users/profile/${id}`),
  getLeaderboard: (params?: { chapter?: string; limit?: number; page?: number }) =>
    api.get<{ leaders: User[]; totalPages: number; currentPage: number; totalCount: number }>("/api/users/leaderboard", { params }),
  updateProfile: (data: Partial<User>) => api.put<User>("/api/users/profile", data),
  updatePersonaProfile: (data: Record<string, any>) => api.put<Record<string, any>>("/api/users/profile/persona", data),
  requestConnection: (targetUserId: string, type: 'Collaborator' | 'Mentor' | 'Squadmate') =>
    api.post("/api/users/connection/request", { targetUserId, type }),
  acceptConnection: (requesterId: string) =>
    api.post("/api/users/connection/accept", { requesterId }),
  removeConnection: (targetUserId: string) =>
    api.post("/api/users/connection/remove", { targetUserId }),
  getNetwork: () =>
    api.get<{ incoming: any[], outgoing: any[], active: any[] }>("/api/users/network"),
  revokeSession: (sessionId: string) =>
    api.post("/api/users/me/sessions/revoke", { sessionId }),
  revokeAllSessions: () =>
    api.post("/api/users/me/sessions/revoke-all"),
  deactivateAccount: () =>
    api.post("/api/users/me/deactivate"),
  checkUsername: (username: string) =>
    api.get<{ available: boolean }>("/api/users/check-username", { params: { username } }),
  completeOnboarding: (persona: string, profileData: any, baseData?: any) =>
    api.post<{ message: string; role: string; profileId: string }>("/api/users/onboarding", { persona, profileData, baseData }),
  talentSearch: (params?: { skills?: string; role?: string }) =>
    api.get<User[]>("/api/users/talent-search", { params }),
};

// Knowledge
export const knowledgeApi = {
  getAll: (params?: Record<string, string>) =>
    api.get<KnowledgeArticle[]>("/api/knowledge", { params }),
  getCategories: () => api.get<Category[]>("/api/knowledge/categories"),
  createCategory: (data: { name: string; slug: string }) => api.post<Category>("/api/knowledge/categories", data),
  getBySlug: (slug: string) =>
    api.get<{ article: KnowledgeArticle; parentCollection: any }>(`/api/knowledge/slug/${slug}`),
  create: (data: Partial<Omit<KnowledgeArticle, "categoryId">> & { categoryId?: string; coverImage?: string; attachments?: string[] }) => api.post<KnowledgeArticle>("/api/knowledge", data),
  update: (id: string, data: Partial<Omit<KnowledgeArticle, "categoryId">> & { categoryId?: string; coverImage?: string; attachments?: string[] }) =>
    api.put<KnowledgeArticle>(`/api/knowledge/${id}`, data),
  delete: (id: string) => api.delete(`/api/knowledge/${id}`),
  toggleUpvote: (id: string) => api.post(`/api/knowledge/${id}/upvote`),
  toggleBookmark: (id: string) => api.post(`/api/knowledge/${id}/bookmark`),
  registerView: (id: string) => api.post<{ viewsCount: number }>(`/api/knowledge/${id}/view`),
  markAsSolution: (commentId: string) =>
    api.put(`/api/knowledge/comments/${commentId}/solution`),
  getCollections: () => api.get<ArticleCollection[]>("/api/knowledge/collections"),
};

// Events & Competitions
export const eventsApi = {
  getAll: (category?: string) =>
    api.get<any[]>("/api/events", { params: category ? { category } : {} }),
  getById: (id: string) => api.get<any>(`/api/events/${id}`),
  create: (data: any) => api.post<any>("/api/events", data),
  update: (id: string, data: any) => api.put<any>(`/api/events/${id}`, data),
  delete: (id: string) => api.delete<any>(`/api/events/${id}`),
  register: (id: string, data: any) => api.post<any>(`/api/events/${id}/register`, data),
  getRegistration: (token: string) => api.get<any>(`/api/events/registration/${token}`),
  getRegistrations: (id: string) => api.get<any[]>(`/api/events/${id}/registrations`),
};

export const newsletterApi = {
  subscribe: (email: string) => api.post<{ message: string }>('/api/newsletter/subscribe', { email }),
  unsubscribe: (email: string) => api.post<{ message: string }>('/api/newsletter/unsubscribe', { email }),
  getSubscribers: () => api.get<any[]>('/api/newsletter/subscribers'),
  getCampaigns: () => api.get<any[]>('/api/newsletter/campaigns'),
  sendCampaign: (subject: string, htmlContent: string) => api.post<{ message: string }>('/api/newsletter/send', { subject, htmlContent }),
};

// Chapters
export const chaptersApi = {
  getAll: () => api.get<Chapter[]>("/api/chapters"),
  getManaged: () => api.get<Chapter[]>("/api/chapters/managed"),
  getBySlug: (slug: string) => api.get<Chapter>(`/api/chapters/${slug}`),
  apply: (data: Partial<ChapterApplication>) => api.post<ChapterApplication>("/api/chapters/apply", data),
  getApplications: () => api.get<ChapterApplication[]>("/api/chapters/applications/all"),
  reviewApplication: (id: string, status: 'Approved' | 'Rejected', adminNote?: string) =>
    api.patch<ChapterApplication>(`/api/chapters/applications/${id}/review`, { status, adminNote }),
  manage: (id: string, data: any) => api.put<Chapter>(`/api/chapters/${id}/manage`, data),
  join: (id: string) => api.post<Chapter>(`/api/chapters/${id}/join`),
  verify: (id: string) => api.patch<Chapter>(`/api/chapters/${id}/verify`),
  applyToJoin: (id: string, data: { motivation: string; universityId: string; skills: string[] }) =>
    api.post(`/api/chapters/${id}/apply-to-join`, data),
  getRecruitmentQueue: (id: string) =>
    api.get<any[]>(`/api/chapters/${id}/recruitment-queue`),
  reviewJoinRequest: (appId: string, status: 'Approved' | 'Rejected', adminNote?: string) =>
    api.patch(`/api/chapters/recruitment/${appId}/review`, { status, adminNote }),
  initiateSprint: (data: { title: string, description: string, initiatorChapterId: string, targetChapterId: string, durationHours?: number }) =>
    api.post(`/api/chapters/sprints/initiate`, data),
  acceptSprint: (sprintId: string) =>
    api.patch(`/api/chapters/sprints/${sprintId}/accept`, {}),
  getChapterSprints: (id: string) =>
    api.get<any[]>(`/api/chapters/${id}/sprints`),
  assignMemberRole: (chapterId: string, userId: string, roleName: string | null) =>
    api.patch(`/api/chapters/${chapterId}/member-role`, { userId, roleName }),
  syncSprint: (sprintId: string) =>
    api.patch(`/api/chapters/sprints/${sprintId}/sync`, {}),
};

// Hackathons
export const hackathonsApi = {
  getAll: (params?: { type?: string; subCategory?: string }) => api.get<Hackathon[]>("/api/hackathons", { params }),
  getById: (id: string) => api.get<Hackathon>(`/api/hackathons/id/${id}`),
  getBySlug: (slug: string) => api.get<Hackathon>(`/api/hackathons/slug/${slug}`),
  register: (id: string, data: unknown) =>
    api.post(`/api/hackathons/${id}/register`, data),
  submit: (id: string, data: unknown) =>
    api.post(`/api/hackathons/${id}/submit`, data),
  getTeamsMe: () => api.get<Squad[]>("/api/hackathons/teams/me"),
  createStandaloneTeam: (data: { teamName: string; maxMembers?: number; isPublic?: boolean }) =>
    api.post<Squad>("/api/hackathons/teams/standalone", data),
  joinTeam: (inviteCode: string) =>
    api.post<Squad>("/api/hackathons/join", { inviteCode }),
  getTeamStatus: (id: string) =>
    api.get<Squad>(`/api/hackathons/${id}/team-status`),
  takeControl: (id: string) =>
    api.post<Squad>(`/api/hackathons/${id}/take-control`),
  getTeamById: (id: string) =>
    api.get<Squad>(`/api/hackathons/teams/${id}`),
  getSquadronProfile: (identifier: string) =>
    api.get<Squad>(`/api/hackathons/squadron/${identifier}`),
  saluteSquadron: (id: string) =>
    api.post<{ salutes: number }>(`/api/hackathons/squadron/${id}/salute`),

  manageSquadron: (id: string, data: Partial<Squad>) =>
    api.put<{ message: string; team: Squad }>(`/api/hackathons/squadron/${id}/manage`, data),
  removeMember: (teamId: string, userId: string) =>
    api.delete<{ message: string }>(`/api/hackathons/teams/${teamId}/members/${userId}`),
  leaveSquadron: (teamId: string) =>
    api.delete<{ message: string }>(`/api/hackathons/teams/${teamId}/leave`),
  dissolveSquadron: (teamId: string) =>
    api.delete<{ message: string }>(`/api/hackathons/teams/${teamId}/dissolve`),
  getActiveQuestions: (id: string) =>
    api.get<{ questions: any[]; roundInfo: any; resumeData?: any }>(`/api/hackathons/${id}/questions-active`),

  submitAnswer: (hackathonId: string, data: { questionId: string; answer: string; isCorrect?: boolean }) =>
    api.post<{ message: string; score: number }>(`/api/hackathons/submit-answer/${hackathonId}`, data),
  finalizeRound: (id: string) =>
    api.post(`/api/hackathons/${id}/finalize-round`),
  getLeaderboard: (id: string) =>
    api.get<any[]>(`/api/hackathons/${id}/leaderboard`),
  updateRounds: (id: string, rounds: any[]) =>
    api.put(`/api/hackathons/${id}/rounds`, { rounds }),
  getRoundDebrief: (id: string, roundNumber: number) =>
    api.get<{ round: any; questions: any[]; submissions: any[]; teamScore: number }>(`/api/hackathons/${id}/round-debrief/${roundNumber}`),
  submitProctorSnapshot: (id: string, data: { imageData: string; roundNumber: number }) =>
    api.post(`/api/hackathons/${id}/proctor/snapshot`, data),
  getProctorSnapshots: (id: string) =>
    api.get<any[]>(`/api/hackathons/${id}/proctor/snapshots`),
  purgeProctorSnapshots: (id: string) =>
    api.delete(`/api/hackathons/${id}/proctor/snapshots`),
  syncProgress: (id: string, data: { draftAnswers: any[]; lastViewedIndex: number; roundNumber: number }) =>
    api.patch(`/api/hackathons/${id}/progress`, data),
  submitProject: (id: string, data: {
    title: string;
    description: string;
    repoUrl: string;
    demoUrl?: string;
    techStack: string[];
    videoUrl?: string;
  }) => api.post(`/api/hackathons/${id}/submit-project`, data),
  addQuestions: (id: string, questions: any[]) =>
    api.post(`/api/hackathons/${id}/questions`, { questions }),
  massAdvance: (id: string, targetRound: number) =>
    api.post(`/api/hackathons/${id}/mass-advance`, { targetRound }),
  syncAllScores: (id: string) =>
    api.post(`/api/hackathons/${id}/sync-all-scores`),
  announce: (id: string) =>
    api.post(`/api/hackathons/${id}/announce`),
  getAllAdmin: (params?: { type?: string }) => api.get<Hackathon[]>("/api/hackathons/admin/all", { params }),
  create: (data: { title: string; description: string; shortDescription?: string; type?: string; subCategory?: string }) =>
    api.post<Hackathon>("/api/hackathons", data),
  updateHackathon: (id: string, data: any) =>
    api.patch(`/api/hackathons/${id}`, data),
  uploadDocument: (formData: FormData) =>
    api.post<{ message: string; filePath: string }>("/api/upload", formData),
  deleteUpload: (filePath: string) => {
    const filename = filePath.split("/").pop();
    if (!filename) throw new Error("Invalid file path: cannot delete upload");
    return api.delete(`/api/upload/${encodeURIComponent(filename)}`);
  },
  updateSettings: (id: string, data: any) =>
    api.put(`/api/hackathons/${id}/settings`, data),
  deleteQuestion: (id: string, questionId: string) =>
    api.delete(`/api/hackathons/${id}/questions/${questionId}`),
  updateQuestion: (id: string, questionId: string, data: any) =>
    api.put(`/api/hackathons/${id}/questions/${questionId}`, data),
  updateTeamStatus: (id: string, teamId: string, data: { isDisqualified?: boolean; reason?: string; currentRound?: number }) =>
    api.patch(`/api/hackathons/${id}/teams/${teamId}/status`, data),
  awardPoints: (id: string, teamId: string, data: { points: number, reason: string, roundNumber?: number }) =>
    api.post(`/api/hackathons/${id}/teams/${teamId}/award-points`, data),
  getQuestionsAdmin: (id: string) =>
    api.get<Question[]>(`/api/hackathons/${id}/questions-admin`),
  getViolations: (id: string) =>
    api.get<any[]>(`/api/hackathons/${id}/violations`),
  pardonMissionBreach: (id: string, teamId: string, reinstateIfDisqualified: boolean) =>
    api.patch(`/api/hackathons/${id}/teams/${teamId}/pardon-mission-breach`, { reinstateIfDisqualified }),
  getReport: (id: string) =>
    api.get<any>(`/api/hackathons/${id}/report`),
  terminateRound: (id: string, roundNumber: number) =>
    api.post(`/api/hackathons/${id}/rounds/${roundNumber}/pause`),
  resumeRound: (id: string, roundNumber: number) =>
    api.post(`/api/hackathons/${id}/rounds/${roundNumber}/resume`),
  extendRound: (id: string, roundNumber: number, extraMinutes: number) =>
    api.put(`/api/hackathons/${id}/rounds/${roundNumber}/extend`, { extraMinutes }),
  transferLeader: (teamId: string, newLeaderId: string) =>
    api.post(`/api/hackathons/teams/${teamId}/transfer-leader`, { newLeaderId }),
  validateInvite: (code: string) =>
    api.get<{ valid: boolean; hackathonId: string; teamName: string }>(`/api/hackathons/invite-validate/${code}`),

  // GROUP 2 — Lifecycle completion
  closeRound: (id: string, roundNumber: number) =>
    api.post(`/api/hackathons/${id}/rounds/${roundNumber}/close`),
  conclude: (id: string) =>
    api.post(`/api/hackathons/${id}/conclude`),
  awardReputation: (id: string, tiers: Array<{ rank: number; points: number }>) =>
    api.post<{ message: string; awards: any[] }>(`/api/hackathons/${id}/award-reputation`, { tiers }),

  // GROUP 3A — Offline deliverable
  submitOfflineDeliverable: (id: string, data: { roundNumber: number; notes: string; link: string }) =>
    api.post(`/api/hackathons/${id}/submit-offline-deliverable`, data),

  logArenaEntry: (id: string) =>
    api.post(`/api/hackathons/${id}/log-entry`),
  logAbort: (id: string) =>
    api.post(`/api/hackathons/${id}/log-abort`),

  // Round submissions (Phase 2)
  submitRound: (id: string, roundNumber: number, data: { fields?: Record<string, string>; files?: string[] }) =>
    api.post(`/api/hackathons/${id}/rounds/${roundNumber}/submit`, data),
  getMyRoundSubmissions: (id: string, roundNumber: number) =>
    api.get<any[]>(`/api/hackathons/${id}/rounds/${roundNumber}/my-submissions`),
  adminGetRoundSubmissions: (id: string, roundNumber: number) =>
    api.get<any[]>(`/api/hackathons/admin/${id}/rounds/${roundNumber}/submissions`),
  adminScoreRoundSubmission: (id: string, roundNumber: number, subId: string, data: { score?: number; feedback?: string; status?: string }) =>
    api.put(`/api/hackathons/admin/${id}/rounds/${roundNumber}/submissions/${subId}/score`, data),

  // Contest routes (Phase 3 — CodeBlitz)
  getContestProblems: (id: string, roundNumber: number) =>
    api.get<any>(`/api/hackathons/${id}/rounds/${roundNumber}/contest-problems`),
  contestRun: (id: string, roundNumber: number, data: { code: string; language: string; input?: string }) =>
    api.post<any>(`/api/hackathons/${id}/rounds/${roundNumber}/contest-run`, data),
  contestSubmit: (id: string, roundNumber: number, data: { code: string; language: string; challengeId: string }) =>
    api.post<any>(`/api/hackathons/${id}/rounds/${roundNumber}/contest-submit`, data),
  getContestLeaderboard: (id: string, roundNumber: number) =>
    api.get<any>(`/api/hackathons/${id}/rounds/${roundNumber}/contest-leaderboard`),
};

// Bounties

export const bountiesApi = {
  getAll: () => api.get<Bounty[]>("/api/bounties"),
  getById: (id: string) => api.get<Bounty>(`/api/bounties/${id}`),
  create: (data: any) => api.post<Bounty>("/api/bounties", data),
  update: (id: string, data: any) => api.put<Bounty>(`/api/bounties/${id}`, data),
  delete: (id: string) => api.delete(`/api/bounties/${id}`),
  claim: (id: string) => api.put<Bounty>(`/api/bounties/${id}/claim`),
  resolve: (id: string) => api.put(`/api/bounties/${id}/resolve`),
  submit: (id: string, data: { proofOfWork: string, links?: string[], attachments?: string[] }) =>
    api.post<BountySubmission>(`/api/bounties/${id}/submit`, data),
  getSubmissions: (id: string) =>
    api.get<BountySubmission[]>(`/api/bounties/${id}/submissions`),
  reviewSubmission: (submissionId: string, status: 'Approved' | 'Rejected', adminNote?: string) =>
    api.patch<BountySubmission>(`/api/bounties/submissions/${submissionId}/review`, { status, adminNote }),
};

// Missions
export const missionsApi = {
  getAll: () => api.get<Mission[]>("/api/missions"),
  create: (data: unknown) => api.post<Mission>("/api/missions", data),
  update: (id: string, data: unknown) =>
    api.put<Mission>(`/api/missions/${id}`, data),
  delete: (id: string) => api.delete(`/api/missions/${id}`),
};

// Projects / Lab
export const projectsApi = {
  getMainnet: () => api.get<Project[]>("/api/projects/mainnet"),
  getById: (id: string) => api.get<Project>(`/api/projects/${id}`),
  create: (data: {
    title: string;
    tagline?: string;
    description: string;
    associatedTeam: string;
    techStack: string[];
  }) => api.post<Project>("/api/projects", data),
  addLog: (id: string, data: {
    logContent: string;
    mediaURL?: string;
    isPublic?: boolean;
  }) => api.patch<{ message: string; entry: any }>(`/api/projects/${id}/log`, data),
  update: (id: string, data: Partial<Project>) =>
    api.put<{ message: string; project: Project }>(`/api/projects/${id}`, data),
  getByTeamId: (teamId: string) => api.get<Project[]>(`/api/projects/team/${teamId}`),
};

// File Upload
export const uploadApi = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append("document", file);
    return api.post<{ message: string; filePath: string }>("/api/upload", formData);
  }
};

// Messages
export const messagesApi = {
  getConversations: () => api.get<Conversation[]>("/api/messages/conversations"),
  getHistory: (otherUserId: string, opts?: { before?: string; limit?: number }) =>
    api.get<Message[]>(`/api/messages/${otherUserId}`, {
      params: {
        ...(opts?.before ? { before: opts.before } : {}),
        ...(opts?.limit ? { limit: opts.limit } : {})
      }
    }),
  sendMessage: (
    receiverId: string,
    content: string,
    opts?: { attachments?: MessageAttachment[]; replyTo?: string }
  ) => api.post<Message>("/api/messages", { receiverId, content, ...opts }),
  editMessage: (id: string, content: string) =>
    api.put<Message>(`/api/messages/${id}`, { content }),
  deleteMessage: (id: string) =>
    api.delete<{ message: string }>(`/api/messages/${id}`),
  react: (id: string, emoji: string) =>
    api.post<Message>(`/api/messages/${id}/react`, { emoji }),
  pin: (id: string) =>
    api.post<Message>(`/api/messages/${id}/pin`),
  markDmRead: (otherUserId: string) =>
    api.post<{ message: string }>(`/api/messages/${otherUserId}/read`),
  search: (params: { q: string; channelId?: string; userId?: string }) =>
    api.get<Message[]>("/api/messages/search", { params: params as any }),
  uploadAttachment: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.upload<MessageAttachment>("/api/messages/attachments", fd);
  }
};

// Channels
export const channelsApi = {
  getAll: () => api.get<Channel[]>("/api/channels"),
  create: (data: { name: string; topic?: string; isPrivate?: boolean }) =>
    api.post<Channel>("/api/channels", data),
  delete: (id: string) => api.delete<{ message: string }>(`/api/channels/${id}`),
  join: (id: string) => api.post<Channel>(`/api/channels/${id}/join`),
  leave: (id: string) => api.post<{ message: string }>(`/api/channels/${id}/leave`),
  markRead: (id: string) => api.post<{ message: string }>(`/api/channels/${id}/read`),
  getMessages: (channelId: string, opts?: { before?: string; limit?: number }) =>
    api.get<Message[]>(`/api/channels/${channelId}/messages`, {
      params: {
        ...(opts?.before ? { before: opts.before } : {}),
        ...(opts?.limit ? { limit: opts.limit } : {})
      }
    }),
  getPinned: (channelId: string) =>
    api.get<Message[]>(`/api/channels/${channelId}/pinned`),
  getMembers: (channelId: string) =>
    api.get<{ members: User[]; admins: User[] }>(`/api/channels/${channelId}/members`),
  sendMessage: (
    channelId: string,
    content: string,
    opts?: { attachments?: MessageAttachment[]; replyTo?: string }
  ) => api.post<Message>(`/api/channels/${channelId}/messages`, { content, ...opts })
};

// Presence
export const presenceApi = {
  getOnline: () => api.get<{ online: string[] }>("/api/users/presence")
};

// Forge
export const forgeApi = {
  getAll: (params?: { all?: boolean }) => api.get<Challenge[]>("/api/forge", { params }),
  getById: (id: string) => api.get<Challenge>(`/api/forge/${id}`),
  submit: (id: string, code: string, language: string) =>
    api.post<ChallengeSubmission>(`/api/forge/${id}/submit`, { code, language }),
  run: (id: string, code: string, language: string, customInput: string) =>
    api.post<{ status: string; testCaseResults: any[] }>(`/api/forge/${id}/run`, { code, language, customInput }),
  getSubmissions: (id: string) =>
    api.get<ChallengeSubmission[]>(`/api/forge/${id}/submissions`),
  getLeaderboard: () => api.get<any[]>("/api/forge/leaderboard"),
  create: (data: any) => api.post<Challenge>("/api/forge", data),
  update: (id: string, data: any) => api.put<Challenge>(`/api/forge/${id}`, data),
  delete: (id: string) => api.delete<any>(`/api/forge/${id}`),
  getAnalytics: (id: string) => api.get<any>(`/api/forge/${id}/analytics`),
};

// Feed
export const feedApi = {
  getMainnet: () => api.get<FeedItem[]>("/api/feed/mainnet"),
  transmit: (data: { content: string; type?: string; tags?: string[]; isPublic?: boolean; code?: string; attachments?: string[] }) =>
    api.post<any>("/api/feed/transmit", data),
  updateSignal: (id: string, data: { content?: string; code?: string; attachments?: string[] }) =>
    api.put<any>(`/api/feed/signal/${id}`, data),
  deleteSignal: (id: string) =>
    api.delete<any>(`/api/feed/signal/${id}`),

  addComment: (id: string, content: string) =>
    api.post<any>(`/api/feed/signal/${id}/comment`, { content }),
  getAdminSignals: () => api.get<any[]>("/api/feed/admin/signals"),
  deleteComment: (signalId: string, commentId: string) =>
    api.delete<any>(`/api/feed/signal/${signalId}/comment/${commentId}`),
};

// Activities
export const activityApi = {
  getPersonal: (userId: string) => api.get<ActivityItem[]>(`/api/activity/${userId}`),
};

// Search
export const searchApi = {
  global: (query: string) => api.get<SearchResults>('/api/search', { params: { q: query } }),
};

// Admin
export const adminApi = {
  getStats: () => api.get<{
    activeMembers: number;
    bountyCompletion: number;
    hardwareUtilization: number;
    pendingQueues: number;
    totalUsers: number;
  }>(`${adminBase()}/stats`),

  getUsers: () => api.get<User[]>(`${adminBase()}/users`),

  updateUserRole: (userId: string, role: string) =>
    api.put(`${adminBase()}/users/${userId}/role`, { role }),
  verifyUser: (userId: string, isVerified: boolean, method?: string) =>
    api.put<{ message: string; isVerified: boolean }>(`${adminBase()}/users/${userId}/verify`, { isVerified, method }),
  suspendUser: (userId: string, isSuspended: boolean) =>
    api.put<{ message: string; isSuspended: boolean }>(`${adminBase()}/users/${userId}/suspend`, { isSuspended }),
  editUserProfile: (userId: string, data: any) =>
    api.put<{ message: string; user: User }>(`${adminBase()}/users/${userId}/profile`, data),




  getEvents: () => api.get<any[]>(`${adminBase()}/events`),
  createEvent: (data: any) => api.post(`${adminBase()}/events`, data),
  updateEvent: (id: string, data: any) => api.put(`${adminBase()}/events/${id}`, data),
  deleteEvent: (id: string) => api.delete(`${adminBase()}/events/${id}`),

  // Knowledge CMS
  getKnowledgeArticles: () => api.get<KnowledgeArticle[]>(`${adminBase()}/knowledge`),
  publishKnowledgeArticle: (id: string, isPublished: boolean) =>
    api.put<KnowledgeArticle>(`${adminBase()}/knowledge/${id}/publish`, { isPublished }),
  deleteKnowledgeArticle: (id: string) => api.delete(`${adminBase()}/knowledge/${id}`),

  // Chapter Management
  getChapters: () => api.get<Chapter[]>(`${adminBase()}/chapters`),
  getApplications: () => api.get<ChapterApplication[]>("/api/chapters/applications/all"),
  reviewApplication: (id: string, status: 'Approved' | 'Rejected', adminNote?: string) =>
    api.patch<ChapterApplication>(`/api/chapters/applications/${id}/review`, { status, adminNote }),
  getOperativeStats: (userId: string) => api.get<any>(`${adminBase()}/users/${userId}/stats`),

  // Admin Comms Oversight
  adminGetConversations: () => api.get<any[]>(`${adminBase()}/messages/conversations`),
  adminGetConversationHistory: (user1: string, user2: string) =>
    api.get<Message[]>(`${adminBase()}/messages/conversations/${user1}/${user2}`),
  adminSendMessage: (data: { channelId?: string; receiverId?: string; content: string }) =>
    api.post<Message>(`${adminBase()}/messages/send`, data),
  adminEditMessage: (messageId: string, content: string) =>
    api.put<Message>(`${adminBase()}/messages/${messageId}`, { content }),
  adminDeleteMessage: (messageId: string) =>
    api.delete<{ message: string }>(`${adminBase()}/messages/${messageId}`),
  adminGetChannels: () =>
    api.get<(Channel & { lastMessage?: Message; messageCount?: number })[]>(`${adminBase()}/messages/channels`),
  adminMuteInChannel: (channelId: string, userId: string) =>
    api.post<{ message: string; channel: Channel }>(`${adminBase()}/channels/${channelId}/mute`, { userId }),
  adminUnmuteInChannel: (channelId: string, userId: string) =>
    api.post<{ message: string; channel: Channel }>(`${adminBase()}/channels/${channelId}/unmute`, { userId }),
  adminKickFromChannel: (channelId: string, userId: string) =>
    api.delete<{ message: string }>(`${adminBase()}/channels/${channelId}/members/${userId}`),
};

// System
export const systemApi = {
  getStatus: () => api.get<SystemStatus>("/api/system/status"),
};

// Comments
export const commentsApi = {
  getByArticle: (articleId: string) =>
    api.get<Comment[]>(`/api/knowledge/${articleId}/comments`),
  create: (articleId: string, content: string) =>
    api.post<Comment>(`/api/knowledge/${articleId}/comments`, { content }),
  markAsSolution: (commentId: string) =>
    api.put<Comment>(`/api/knowledge/comments/${commentId}/solution`),
};

// Workshops
export const workshopsApi = {
  getAll: (params?: { chapter?: string; status?: string; search?: string; all?: string }) =>
    api.get<Workshop[]>("/api/workshops", { params: params as any }),
  getPending: () =>
    api.get<Workshop[]>("/api/workshops/pending/all"),
  getBySlug: (slug: string) =>
    api.get<Workshop>(`/api/workshops/${slug}`),
  create: (data: Partial<Workshop> & { chapterId: string }) =>
    api.post<Workshop>("/api/workshops", data),
  update: (id: string, data: Partial<Workshop>) =>
    api.put<Workshop>(`/api/workshops/${id}`, data),
  delete: (id: string) =>
    api.delete(`/api/workshops/${id}`),
  approve: (id: string) =>
    api.patch<Workshop>(`/api/workshops/${id}/approve`),
  reject: (id: string, reason: string) =>
    api.patch<Workshop>(`/api/workshops/${id}/reject`, { reason }),
  register: (id: string) =>
    api.post<Workshop>(`/api/workshops/${id}/register`),
  unregister: (id: string) =>
    api.post<Workshop>(`/api/workshops/${id}/unregister`),
  markAttendance: (id: string, checkedInUserIds: string[]) =>
    api.post<{ workshop: Workshop; awarded: number; xpPerAttendee: number; totalXpAwarded: number }>(`/api/workshops/${id}/attendance`, { checkedInUserIds }),
};

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface AuthResponse {
  _id: string;
  name: string;
  universityId: string;
  role: string;
  bio?: string;
  avatarUrl?: string;
  skills?: string[];
  skillMatrix?: Record<string, number>;
  settings?: any;
  socialLinks?: Record<string, string>;
  currentProjects?: string[];
  reputationPoints?: number;
  badges?: string[];
  isOnboarded?: boolean;
  token: string;
  requireTotp?: boolean;
  userId?: string;
  socialProviders?: any;
}

export interface Conversation {
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  otherParticipantId: string;
  otherParticipant: User;
}

export interface Channel {
  _id: string;
  name: string;
  topic?: string;
  isPrivate?: boolean;
  isDefault?: boolean;
  members?: string[];
  admins?: string[];
  mutedUsers?: string[];
  createdBy?: string;
  unreadCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageAttachment {
  url: string;
  fileType: string;
  fileName: string;
  size?: number;
}

export interface MessageReaction {
  emoji: string;
  users: string[];
}

export interface Message {
  _id: string;
  senderId: User | string | any;
  receiverId?: User | string | any;
  channelId?: string;
  content: string;
  isRead?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
  replyTo?: Message | string | null;
  mentions?: string[];
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  _id: string;
  name: string;
  email?: string;
  universityId?: string;
  isSuspended?: boolean;
  activeSessions?: any[];
  twoFactorBackupCodes?: string[];
  lastLoginDate?: string;
  username?: string;
  chapterId?: string;
  role: 'Student' | 'Professional' | 'Recruiter' | 'Teacher' | 'Admin' | 'SuperAdmin' | 'Member' | 'Intern' | 'Core Developer' | 'Team Lead' | 'Faculty' | 'Alumni' | 'Industry' | 'Founder';
  reputationPoints?: number;
  reputationVelocity?: number;
  forgeRank?: string;
  forgeTotals?: {
    total: number;
    rookie: number;
    operative: number;
    elite: number;
  };
  vouchers?: string[];
  institutionalDomain?: string;
  graduationYear?: number;
  isVerified?: boolean;
  verificationMethod?: 'Domain' | 'ID' | 'Vouch' | 'Admin' | 'None';
  bio?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  skills?: string[];
  skillMatrix?: {
    software: number;
    hardware: number;
    embedded: number;
    mechanical: number;
    leadership: number;
    research: number;
  };
  settings?: {
    notifications: any;
    privacy: any;
  };
  socialLinks?: {
    github?: string;
    linkedin?: string;
    portfolio?: string;
    twitter?: string;
  };
  currentProjects?: string[];
  badges?: string[];
  loginHistory?: any[];
  connections?: any[];

  // Detailed Profile Fields
  phone?: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  whatsappNo?: string;
  alternateNo?: string;
  permanentAddress?: string;
  country?: string;
  state?: string;
  city?: string;
  employmentStatus?: 'Studying' | 'Working' | 'Both' | 'None';
  occupation?: string;
  designation?: string;
  workExperience?: number;
  companyName?: string;
  eduInstitutionType?: 'College' | 'University' | 'None';
  eduInstitutionName?: string;
  eduInstitutionAddress?: string;
  eduState?: string;
  eduCity?: string;
  course?: string;
  branch?: string;
  batch?: string;
  isOnboarded?: boolean;
  hackathons?: any[];
  knowledge?: any[];
  competitions?: any[];
  chapter?: any;
  bounties?: any[];
  projects?: any[];
  rank?: number | string;
  requisitions?: any[];
  forgeSolves?: any[];
  createdAt?: string;


  // Persona profile (populated from profileId)
  profileModel?: 'StudentProfile' | 'ProfessionalProfile' | 'RecruiterProfile' | 'TeacherProfile';
  personaProfile?: Record<string, any>;

  // Security
  isTwoFactorEnabled?: boolean;
  socialProviders?: {
    google?: { id: string; email: string; linkedAt: string };
    github?: { id: string; username: string; linkedAt: string };
    microsoft?: { id: string; email: string; linkedAt: string };
  };
}

// SuperAdmin
export const superAdminApi = {
  login: (email: string, password: string) =>
    api.post<{ requireTotp: boolean; message: string }>("/api/sa/auth/login", { email, password }),

  verify: (data: { email: string; password: string; token: string }) =>
    api.post<{ token: string; email: string }>("/api/sa/auth/verify", data),

  ghost: (userId: string) =>
    api.post<{ token: string; user: any }>(`/api/sa/ghost/${userId}`),

  getUsers: () => api.get<User[]>("/api/sa/users"),

  getAudit: () => api.get<any[]>("/api/sa/audit"),
};

export interface KnowledgeArticle {
  _id: string;
  title: string;
  slug: string;
  content: string;
  author: { _id: string; name: string; role: string };
  categoryId?: Category;
  tags?: string[];
  upvotes?: string[];
  bookmarks?: string[];
  hardwareUsed?: any[];
  isPublished: boolean;
  coverImage?: string;
  attachments?: string[];
  createdAt: string;
  viewsCount?: number;
  metaDescription?: string;
}

export interface ArticleCollection {
  _id: string;
  title: string;
  description: string;
  articles: string[] | KnowledgeArticle[];
  author: { _id: string; name: string; role: string };
  createdAt: string;
}

export interface Question {
  _id: string;
  questionText: string;
  options: string[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
  roundId: string;
}

export interface Hackathon {
  _id: string;
  title: string;
  slug: string;
  description: string;
  status: 'Draft' | 'Announced' | 'Live' | 'Concluded' | 'Upcoming' | 'Ended';
  rounds: Array<{
    _id: string;
    roundNumber: number;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    qualifyingThreshold: number;
    status: 'Draft' | 'Scheduled' | 'Live' | 'Closed';
    type?: 'Online MCQ' | 'Offline Assessment' | 'Presentation' | 'Physical Build' | 'Report Submission' | 'Data Challenge' | 'Coding Contest';
    maxQuestions?: number;
    snapshotInterval?: number;
    submissionConfig?: {
      maxAttempts?: number;
      requiredFields?: Array<{
        fieldName: string;
        fieldType: 'text' | 'textarea' | 'url' | 'file' | 'select';
        required?: boolean;
        maxLength?: number;
        options?: string[];
      }>;
    };
    codingContestConfig?: {
      challengeIds?: string[];
      penaltyMinutes?: number;
    };
  }>;
  prizes?: Array<{
    position: string;
    reward: string;
    description: string;
  }>;
  rules?: string[];
  rulebookUrl?: string;
  chapterScope: 'Local' | 'National' | 'Global';
  maxTeams: number;
  minTeamSize?: number;
  maxTeamSize?: number;
  resources?: Array<{ title: string; url: string; description?: string }>;
  totalParticipants?: number;
  teamsCount?: number;
  questionsCount?: number;
  reputationAwarded?: boolean;
  reputationTiers?: Array<{ rank: number; points: number }>;
  shortDescription?: string;
  subCategory?: string;
  teamCount?: number;
  bannerImage?: string;
  createdAt?: string;
}

export interface Bounty {
  _id: string;
  title: string;
  description: string;
  pointReward: number;
  difficulty: string;
  status: 'Open' | 'Assigned' | 'Resolved';
  assignedTo?: any;
  createdBy: any;
  createdAt: string;
  techStack?: string[];
  tags?: string[];
}

export interface BountySubmission {
  _id: string;
  bountyId: string | Bounty;
  userId: any;
  proofOfWork: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminNote?: string;
  reviewedBy?: any;
  reviewedAt?: string;
  createdAt: string;
  links?: string[];
  attachments?: string[];
}




export interface Mission {
  _id: string;
  title: string;
  description: string;
  status: string;
  assignedTo?: string[];
}

export interface ActivityItem {
  date: string;
  level: number;
}

export interface Comment {
  _id: string;
  articleId: string;
  author: { _id: string; name: string; role: string };
  content: string;
  isSolution: boolean;
  createdAt: string;
  upvotes?: string[];
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
}

export interface Squad {
  _id: string;
  teamName: string;
  slug?: string;
  inviteCode?: string;
  leader: string | { _id: string; name: string; username?: string; avatarUrl?: string };
  members: Array<string | {
    _id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
    role: string;
    reputationPoints?: number;
    skills?: string[]
  }>;
  hackathonId?: string | {
    _id: string;
    title: string;
    slug: string;
    status: string;
    rounds: any[];
    bannerImage?: string;
    description?: string
  };
  score: number;
  activeSolver?: string | { _id: string; name: string };
  isDisqualified: boolean;
  warnings: number;
  projectSubmission?: {
    title: string;
    description: string;
    repoUrl: string;
    demoUrl?: string;
    techStack: string[];
    videoUrl?: string;
    submittedAt: string | null;
  };
  squadronBio?: string;
  squadronAvatarUrl?: string;
  memberRoles?: Record<string, string>;
  salutes?: number;
  rank?: number | string;
  // Arena / round lifecycle
  arenaEntries?: number;
  finalizedRounds?: any[];
  abortCount?: number;
  offlineDeliverables?: any[];
  maxMembers?: number;
  isPublic?: boolean;
  judgedPoints?: any[];
  isRoundComplete?: boolean;
  roundScores?: any[];
  disqualificationReason?: string;
  currentRound?: number;
  createdAt?: string;
}

export interface ProgressLog {
  _id?: string;
  logContent: string;
  mediaURL?: string;
  isPublic?: boolean;
  timestamp: string;
}

export interface ProjectAttachment {
  name: string;
  url: string;
}

export interface Project {
  _id: string;
  title: string;
  tagline?: string;
  description: string;
  headerImage?: string;
  associatedTeam?: Squad;
  techStack: string[];
  status: 'Ideation' | 'Prototype' | 'Testing' | 'Battle-Ready' | 'Mission-Complete';
  progressMatrix: ProgressLog[];
  attachments?: ProjectAttachment[];
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}



export interface Chapter {
  _id: string;
  name: string;
  slug: string;
  university: string;
  city: string;
  founder: string | Partial<User>;
  leads: string[] | Partial<User>[];
  members: string[] | Partial<User>[];
  status: 'Pending' | 'Active' | 'Suspended';
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  socialLinks?: {
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  stats?: {
    totalReputation: number;
    rank?: number;
    eventsCount: number;
    projectsCount: number;
    reputationVelocity?: number;
    activeBounties?: number;
    hardwareUtilization?: number;
  };
  memberCount?: number;
  createdAt: string;
  verifiedDomains?: string[];
  tier?: string;
  themeColor?: string;
  localRoles?: any[];
}

export interface ChapterApplication {
  _id: string;
  universityName: string;
  proposedSlug: string;
  applicantId: any;
  missionStatement: string;
  expectedMembers: number;
  socialProofUrl?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminNote?: string;
  createdAt: string;
}

export interface Challenge {
  _id: string;
  title: string;
  difficulty: 'Rookie' | 'Operative' | 'Elite';
  tags: string[];
  problemStatement: string;
  constraints: string;
  exampleInput: string;
  exampleOutput: string;
  reputationReward: number;
  acceptanceRate: number;
  totalSolved: number;
  solvedStatus?: 'Solved' | 'Attempted' | 'Unsolved';
  activeFrom?: string;
}

export interface ChallengeSubmission {
  _id: string;
  challengeId: string;
  userId: string;
  code: string;
  language: string;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Pending';
  runtime: number;
  memory: number;
  testCaseResults: Array<{
    caseIndex: number;
    status: string;
    message: string;
    output?: string;
    expected?: string;
    stdout?: string;
  }>;
  createdAt: string;
}

export interface FeedItem {
  id: string;
  type: 'PROJECT_LOG' | 'NEW_BOUNTY' | 'BOUNTY_RESOLVED' | 'KNOWLEDGE_SHARE' | 'SIGNAL';
  user: string;
  title: string;
  content: string;
  chapter: string;
  tags: string[];
  timestamp: string;
  meta: any;
}

export interface SystemStatus {
  overallStatus: string;
  overallUptime: number;
  services: Array<{
    name: string;
    uptime: number;
    status: string;
    latency: number;
  }>;
  stats: {
    requestsPerMin: number;
    activeSessions?: number;
    simPods?: number;
    openIncidents?: number;
  };
  incidents?: any[];
}

export interface SearchResults {
  users: Partial<User>[];
  projects: any[];
  bounties: any[];
}

export interface Workshop {
  _id: string;
  title: string;
  slug: string;
  chapter: {
    _id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    leads?: string[];
  };
  description: string;
  mentor?: Partial<User>;
  externalMentor?: {
    name: string;
    designation?: string;
    bio?: string;
    avatarUrl?: string;
  };
  date: string;
  duration: number;
  location: string;
  meetingLink?: string;
  status: 'Pending' | 'Draft' | 'Upcoming' | 'Live' | 'Completed' | 'Cancelled';
  capacity: number;
  xpReward: number;
  attendees: (string | Partial<User>)[];
  checkedInAttendees: (string | Partial<User>)[];
  tags: string[];
  resources: Array<{ name: string; url: string }>;
  coverUrl?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// Notifications
export const notificationsApi = {
  getAll: () => api.get<{notifications: any[], unreadCount: number}>('/api/notifications'),
  markAllRead: () => api.put('/api/notifications/read-all'),
  markRead: (id: string) => api.put(`/api/notifications/${id}/read`),
  clearRead: () => api.delete('/api/notifications'),
};


export interface Competition {
  _id: string;
  title: string;
  slug: string;
  coverImage?: string;
  thumbnailImage?: string;
  overview: string;
  problemStatement: string;
  problemStatementPdfUrl?: string;
  abstractTemplateDocUrl?: string;
  contacts: Array<{ name: string; email: string; mobile: string }>;
  currentPhase: 'Registration' | 'AbstractSelection' | 'OfflineCompetition';
  registrationDeadline: string;
  abstractDeadline: string;
  competitionDate: string;
  status: 'Draft' | 'Published';
  rubricCriteria?: Array<{ name: string; maxPoints: number }>;
  externalUrl?: string;
  maxSquadronSize: number;
  createdAt: string;
  updatedAt: string;
}

export const competitionsApi = {
  getAll: () => api.get<Competition[]>('/api/competitions'),
  getBySlug: (slug: string) => api.get<Competition>(`/api/competitions/${slug}`),
  getEnrollment: (id: string) => api.get<any>(`/api/competitions/${id}/enrollment`),
  enroll: (id: string, data: { mode: string; squadronName?: string; inviteCode?: string }) => api.post<any>(`/api/competitions/${id}/enroll`, data),
  submitAbstract: (id: string, data: { content: string; pdfUrl?: string }) => api.post<any>(`/api/competitions/${id}/abstract`, data),
  getSquadronDetails: (compId: string) => api.get<any>(`/api/competitions/${compId}/squadron`),
  leaveSquadron: (compId: string) => api.post<any>(`/api/competitions/${compId}/squadron/leave`, {}),
  adminGetAll: () => api.get<Competition[]>('/api/competitions/admin/all'),
  adminCreate: (data: Partial<Competition>) => api.post<Competition>('/api/competitions/admin/create', data),
  adminUpdate: (id: string, data: Partial<Competition>) => api.put<Competition>(`/api/competitions/admin/${id}`, data),
  adminGetAbstracts: (id: string) => api.get<any[]>(`/api/competitions/admin/${id}/abstracts`),
  adminReviewAbstract: (id: string, registrationId: string, data: { status?: string; rubricScores?: Array<{ criteriaName: string; score: number; comment?: string }> }) =>
    api.put<any>(`/api/competitions/admin/${id}/abstracts/${registrationId}`, data),
  adminGetResults: (id: string) => api.get<any[]>(`/api/competitions/admin/${id}/results`),
  adminGetAbstractsSorted: (id: string, sort?: string) => api.get<any[]>(`/api/competitions/admin/${id}/abstracts${sort ? `?sort=${sort}` : ''}`),
  uploadDocument: (formData: FormData) => api.post<{ message: string; filePath: string }>('/api/upload', formData),
  acceptSquadronMember: (compId: string, userId: string) => api.put<any>(`/api/competitions/${compId}/squadron/members/${userId}/accept`),
  rejectSquadronMember: (compId: string, userId: string) => api.put<any>(`/api/competitions/${compId}/squadron/members/${userId}/reject`),
  adminGetSquadrons: (compId: string) => api.get<any[]>(`/api/competitions/admin/${compId}/squadrons`),
  adminDeleteSquadron: (compId: string, squadronId: string) => api.delete<any>(`/api/competitions/admin/${compId}/squadrons/${squadronId}`),
};
export const roadmapApi = {
  // Onboarding
  getCareerGoals: () => api.get<any[]>('/api/roadmaps/career-goals'),
  getSkillsForGoal: (goalId: string) => api.get<any[]>(`/api/roadmaps/skills/${goalId}`),
  getOnboarding: () => api.get<any>('/api/roadmaps/onboarding'),
  saveOnboarding: (data: any) => api.post<any>('/api/roadmaps/onboarding', data),
  // Roadmap
  getRoadmap: () => api.get<any>('/api/roadmaps'),
  generateRoadmap: (data?: { regenerate?: boolean }) => api.post<any>('/api/roadmaps/generate', data || {}),
  adaptRoadmap: () => api.post<any>('/api/roadmaps/adapt'),
};

export const checklistApi = {
  getChecklist: () => api.get<any>('/api/checklist'),
  getPending: () => api.get<any[]>('/api/checklist/pending'),
  startTask: (itemId: string) => api.put<any>(`/api/checklist/task/${itemId}/start`),
  completeTask: (itemId: string) => api.put<any>(`/api/checklist/task/${itemId}/complete`),
  getWeeklyStats: () => api.get<any>('/api/checklist/weekly'),
};

export const progressApi = {
  getOverall: () => api.get<any>('/api/progress/overall'),
  getSkills: () => api.get<any[]>('/api/progress/skills'),
  getJourney: () => api.get<any>('/api/progress/journey'),
  getDailyDashboard: () => api.get<any>('/api/progress/dashboard/daily'),
  getWeeklyDashboard: () => api.get<any>('/api/progress/dashboard/weekly'),
  getAssessments: () => api.get<any>('/api/progress/assessments'),
  getWeeklyRecap: () => api.get<any>('/api/progress/weekly-recap'),
  getPeerComparison: () => api.get<any>('/api/progress/peer-comparison'),
};

export const jobsApi = {
  getJobs: () => api.get<any[]>('/api/jobs'),
  getMyApplications: () => api.get<any[]>('/api/jobs/my-applications'),
  apply: (jobId: string, data?: any) => api.post<any>(`/api/jobs/${jobId}/apply`, data),
  // Recruiter specific
  getRecruiterStats: () => api.get<any>("/api/jobs/recruiter/stats"),
  getRecruiterPostings: () => api.get<any[]>("/api/jobs/recruiter/my-postings"),
  getRecruiterJob: (jobId: string) => api.get<any>(`/api/jobs/recruiter/job/${jobId}`),
  getJobApplicationsForJob: (jobId: string) => api.get<any[]>(`/api/jobs/${jobId}/applications`),
  createJob: (data: any) => api.post<any>("/api/jobs", data),
  updateJob: (jobId: string, data: any) => api.put<any>(`/api/jobs/${jobId}`, data),
  getJobApplications: (params?: { status?: string; jobId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.jobId) q.set('jobId', params.jobId);
    return api.get<any[]>(`/api/jobs/recruiter/applications${q.toString() ? '?' + q.toString() : ''}`);
  },
  updateApplicationStatus: (appId: string, data: any) => api.put<any>(`/api/jobs/application/${appId}`, data),
};

export const learningApi = {
  getTopic: (id: string) => api.get<any>(`/api/learning/topic/${id}`),
  getTopicResources: (id: string) => api.get<any[]>(`/api/learning/topic/${id}/resources`),
  completeTopic: (id: string) => api.post<any>(`/api/learning/topic/${id}/complete`),
  getQuiz: (contentId: string) => api.get<any>(`/api/learning/quiz/${contentId}`),
  submitQuiz: (contentId: string, answers: any[]) => api.post<any>(`/api/learning/quiz/${contentId}/submit`, { answers }),
  getQuizAttempts: (contentId: string) => api.get<any[]>(`/api/learning/quiz/${contentId}/attempts`),
  submitPractical: (contentId: string, data: any) => api.post<any>(`/api/learning/practical/${contentId}/submit`, data),
  startDiagnostic: (skillId: string) => api.post<any>('/api/learning/diagnostic/start', { skillId }),
  submitDiagnostic: (id: string, answers: any[]) => api.post<any>(`/api/learning/diagnostic/${id}/submit`, { answers }),
  getDiagnostic: (id: string) => api.get<any>(`/api/learning/diagnostic/${id}`),
};

export const aiApi = {
  chat: (message: string) => api.post<any>('/api/ai/chat', { message }),
  analyzeResume: (resumeText: string) => api.post<{
    score: number;
    addToResume: string[];
    addToProfile: string[];
    formattingImprovements: string[];
    missingKeywords: string[];
    skillBreakdown: { subject: string; A: number; fullMark: number }[];
  }>('/api/ai/resume', { resumeText }),
  mockInterview: (data: { question: string, answer: string }) => api.post<any>('/api/ai/mock-interview', data),
  explainTopic: (topicId: string, question: string) => api.post<any>('/api/ai/explain-topic', { topicId, question }),
};

export const adminLearningApi = {
  getCareerGoals: () => api.get<any[]>(`${adminBase()}/career-goals`),
  createCareerGoal: (data: any) => api.post<any>(`${adminBase()}/career-goals`, data),
  updateCareerGoal: (id: string, data: any) => api.put<any>(`${adminBase()}/career-goals/${id}`, data),
  deleteCareerGoal: (id: string) => api.delete<any>(`${adminBase()}/career-goals/${id}`),

  getSkills: (goalId?: string) => api.get<any[]>(`${adminBase()}/skills${goalId ? `?goalId=${goalId}` : ''}`),
  createSkill: (data: any) => api.post<any>(`${adminBase()}/skills`, data),
  updateSkill: (id: string, data: any) => api.put<any>(`${adminBase()}/skills/${id}`, data),
  deleteSkill: (id: string) => api.delete<any>(`${adminBase()}/skills/${id}`),

  getContent: (skillId?: string) => api.get<any[]>(`${adminBase()}/content${skillId ? `?skillId=${skillId}` : ''}`),
  createContent: (data: any) => api.post<any>(`${adminBase()}/content`, data),
  updateContent: (id: string, data: any) => api.put<any>(`${adminBase()}/content/${id}`, data),
  deleteContent: (id: string) => api.delete<any>(`${adminBase()}/content/${id}`),

  getPracticalSubmissions: (status?: string) => api.get<any[]>(`${adminBase()}/submissions${status ? `?status=${status}` : ''}`),
  reviewPracticalSubmission: (id: string, data: { status: string, feedback: string, score: number }) => api.put<any>(`${adminBase()}/submissions/${id}/review`, data),
};

// ── VeritaBox Pulse ────────────────────────────────────────────────────────────
export const pulseApi = {
  getActive: () => api.get<any[]>('/api/pulse'),
  getAll: () => api.get<any>('/api/pulse/all'),
  create: (data: any) => api.post<any>('/api/pulse', data),
  update: (id: string, data: any) => api.put<any>(`/api/pulse/${id}`, data),
  remove: (id: string) => api.delete<any>(`/api/pulse/${id}`),
};



