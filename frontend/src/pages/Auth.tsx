import React, { useState, useEffect } from "react";
import { Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ArrowLeft, Mail, Lock, User as UserIcon, Eye, EyeOff, CheckCircle2, Linkedin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HeroScene } from "@/components/veritabox/HeroScene";
import { cn } from "@/lib/utils";
import { EnlistmentFlow } from "@/components/veritabox/EnlistmentFlow";
import { superAdminApi } from "@/lib/api";


type Mode = "signin" | "signup" | "forgot" | "reset" | "otplogin" | "lost2fa";

function modeFromPath(pathname: string): Mode {
  if (pathname.startsWith("/register")) return "signup";
  if (pathname.startsWith("/forgot-password")) return "forgot";
  if (pathname.startsWith("/reset-password")) return "reset";
  return "signin";
}

export default function Auth() {
  const { 
    user, loading, signIn, signUp, signInWithGoogle, signInWithGithub, signInWithMicrosoft, signInWithLinkedin, verifyTotp,
    linkSocialWithGithub, linkSocialWithMicrosoft, linkSocialWithGoogle, linkSocialWithLinkedin,
    requestOtpLogin, verifyOtpLogin, forgotPassword, resetPassword, lost2faRequest,
    lost2faVerify
  } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (m: Mode) => {
    // Reset OTP and 2FA state on mode switch
    setOtpLoginSent(false);
    setOtpLoginCode("");
    setLost2faSent(false);
    setLost2faOtp("");
    setMode(m);
    
    const path =
      m === "signup" ? "/register" :
      m === "forgot" ? "/forgot-password" :
      m === "reset" ? "/reset-password" :
      "/auth";
    navigate(path, { replace: true });
  };

  useEffect(() => { 
    setIsMounted(true); 
    
    // Check for social login callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const fullState = urlParams.get("state");

    if (code && fullState) {
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const [stateProvider, stateNonce] = fullState.split("_");
      const savedNonce = sessionStorage.getItem("oauth_nonce");
      
      // Verify CSRF nonce
      if (!savedNonce || savedNonce !== stateNonce) {
        toast({ title: "Authentication Error", description: "Security validation failed. Please try again.", variant: "destructive" });
        return;
      }
      sessionStorage.removeItem("oauth_nonce");
      
      const authenticateSocial = async () => {
        setIsSubmitting(true);
        try {
          if (stateProvider === "github") {
            const res = await signInWithGithub(code);
            if (res.requireTotp) {
              setTotpUserId(res.userId || "");
              setTotpRequired(true);
          switchMode("signin");
              toast({ title: "2FA Protocol Required" });
            } else {
              toast({ title: "Welcome back, operative." });
            }
          } else if (stateProvider === "microsoft") {
            const res = await signInWithMicrosoft(code);
            if (res.requireTotp) {
              setTotpUserId(res.userId || "");
              setTotpRequired(true);
          switchMode("signin");
              toast({ title: "2FA Protocol Required" });
            } else {
              toast({ title: "Welcome back, operative." });
            }
          } else if (stateProvider === "linkedin") {
            const res = await signInWithLinkedin(code);
            if (res.requireTotp) {
              setTotpUserId(res.userId || "");
              setTotpRequired(true);
          switchMode("signin");
              toast({ title: "2FA Protocol Required" });
            } else {
              toast({ title: "Welcome back, operative." });
            }
          } else if (stateProvider === "link_github") {
            await linkSocialWithGithub(code);
            toast({ title: "Identity Linked", description: "GitHub credentials synchronized." });
            navigate("/settings", { replace: true });
          } else if (stateProvider === "link_microsoft") {
            await linkSocialWithMicrosoft(code);
            toast({ title: "Identity Linked", description: "Microsoft credentials synchronized." });
            navigate("/settings", { replace: true });
          } else if (stateProvider === "link_linkedin") {
            await linkSocialWithLinkedin(code);
            toast({ title: "Identity Linked", description: "LinkedIn credentials synchronized." });
            navigate("/settings", { replace: true });
          } else {
            // Unknown or tampered OAuth state — reject it explicitly
            toast({ title: "Authentication Error", description: "Unknown OAuth state. Please try again.", variant: "destructive" });
          }
        } catch (error: any) {
          toast({ title: "Authentication failed", description: error.message, variant: "destructive" });
        } finally {
          setIsSubmitting(false);
        }
      };
      authenticateSocial();
    }
  }, []);

  const [mode, setMode] = useState<Mode>(modeFromPath(location.pathname));
  const [showPassword, setShowPassword] = useState(false);

  // Primary login identifier
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");

  const [otpLoginEmail, setOtpLoginEmail] = useState("");
  const [otpLoginCode, setOtpLoginCode] = useState("");
  const [otpLoginSent, setOtpLoginSent] = useState(false);

  // Lost 2FA Protocol
  const [lost2faOtp, setLost2faOtp] = useState("");
  const [lost2faSent, setLost2faSent] = useState(false);

  // 2FA Flow
  const [totpRequired, setTotpRequired] = useState(false);
  const [isSuperAdminTotp, setIsSuperAdminTotp] = useState(false);
  const [totpUserId, setTotpUserId] = useState("");
  const [totpToken, setTotpToken] = useState("");

  const generateNonce = () => {
    const nonce = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem("oauth_nonce", nonce);
    return nonce;
  };

  const handleGithubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      toast({ title: "Configuration Error", description: "GitHub OAuth is not configured.", variant: "destructive" });
      return;
    }
    const nonce = generateNonce();
    const redirectUri = window.location.origin + "/auth";
    window.location.assign(`https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user user:email&state=github_${nonce}`);
  };

  const handleMicrosoftLogin = () => {
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
    const nonce = generateNonce();
    const redirectUri = encodeURIComponent(window.location.origin + "/auth");
    const scope = encodeURIComponent("user.read openid profile email");
    window.location.assign(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}&state=microsoft_${nonce}`);
  };

  const handleLinkedinLogin = () => {
    const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
    const nonce = generateNonce();
    const redirectUri = encodeURIComponent(window.location.origin + "/auth");
    const scope = encodeURIComponent("openid profile email");
    window.location.assign(`https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=linkedin_${nonce}&scope=${scope}`);
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsSubmitting(true);
      try {
        const res = await signInWithGoogle(undefined, tokenResponse.access_token);
        if (res.requireTotp) {
          setTotpUserId(res.userId || "");
          setTotpRequired(true);
          switchMode("signin");
          toast({ title: "2FA Protocol Required" });
        } else {
          toast({ title: "Welcome back, operative." });
        }
      } catch (error: any) {
        toast({ title: "Google Auth failed", description: error.message, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    },
    onError: () => {
      toast({ title: "Google Auth Error", description: "Failed to connect to Google identity matrix.", variant: "destructive" });
    }
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user && mode !== "reset") {
    if (user.role === "Admin") {
      return <Navigate to="/cmd" replace />;
    }
    if (user.role === "Recruiter") {
      return <Navigate to="/dashboard" replace />;
    }
    if (user.isOnboarded) {
      return <Navigate to="/dashboard" replace />;
    }
    // If not onboarded, stay on Auth page for EnlistmentFlow
  }



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await signIn(loginEmail, loginPassword);
      if (res.requireTotp) {
        setTotpUserId(res.userId || "");
        setIsSuperAdminTotp(!!res.isSuperAdmin);
        setTotpRequired(true);
        toast({ title: "2FA Protocol Required", description: "Identity confirmed. Please provide your authentication token." });
      } else {
        toast({ title: "Welcome back, operative." });
      }
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isSuperAdminTotp) {
        const res = await superAdminApi.verify({ email: loginEmail, password: loginPassword, token: totpToken });
        localStorage.setItem("sa_token", res.token);
        toast({ title: "Shadow Layer Engaged", description: "Clearance granted. Welcome back." });
        navigate("/sa/dashboard", { replace: true });
      } else {
        await verifyTotp(totpUserId, totpToken);
        toast({ title: "Identity Verified", description: "Clearance granted. Welcome back." });
      }
    } catch (error: any) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(signupPassword)) {
      toast({ title: "Weak password", description: "Password must be at least 8 characters and contain a letter, number, and special character.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await signUp(signupName, signupEmail, signupPassword);
      toast({ title: "Enlistment confirmed.", description: "Your operative identity has been created." });
    } catch (error: any) {
      toast({ title: "Enlistment failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await requestOtpLogin(otpLoginEmail);
      setOtpLoginSent(true);
      toast({ title: "OTP Sent", description: "Check your inbox for the access code." });
    } catch (error: any) {
      toast({ title: "Failed to request OTP", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await verifyOtpLogin(otpLoginEmail, otpLoginCode);
      if (res.requireTotp) {
        setTotpUserId(res.userId || "");
        setTotpRequired(true);
        switchMode("signin");
        toast({ title: "2FA Protocol Required" });
      } else {
        toast({ title: "Welcome back, operative." });
      }
    } catch (error: any) {
      toast({ title: "Invalid OTP", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await forgotPassword(forgotEmail);
      setForgotSent(true);
      switchMode("reset");
      toast({ title: "Reset Code Sent", description: "Check your inbox." });
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const emailToReset = resetEmail || forgotEmail;
      await resetPassword(emailToReset, resetOtp, resetNewPassword);
      toast({ title: "Password Reset", description: "You can now sign in with your new password." });
      setMode("signin");
    } catch (error: any) {
      toast({ title: "Reset Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLost2faRequest = async () => {
    if (!totpUserId) {
      toast({ title: "Operation Failed", description: "No active session to recover. Please sign in first.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const currentIdentifier = loginEmail || forgotEmail || signupEmail;
      await lost2faRequest(totpUserId, currentIdentifier);
      setLost2faSent(true);
      switchMode("lost2fa");
      toast({ title: "OTP Sent", description: "Check your email for the 2FA bypass code." });
    } catch (error: any) {
      toast({ title: "Request Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLost2faVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await lost2faVerify(totpUserId, lost2faOtp);
      toast({ title: "2FA Disabled", description: "Identity verified. 2FA has been disabled." });
      // User is automatically logged in via AuthContext
    } catch (error: any) {
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ----------------------- Layout ----------------------- */

  const isSignup = mode === "signup";
  const sideContent = isSignup ? {
    tag: "Field network · operational",
    pingColor: "bg-success",
    title: (
      <>
        Enlist with the <br className="hidden sm:block" />
        <span className="text-primary">VeritaBox.</span>
      </>
    ),
    description: "Hackathons, bounties, circuit lab, knowledge, one identity, one reputation, every chapter.",
    stats: [
      { k: "12+", v: "modules" },
      { k: "0", v: "hidden costs" },
      { k: "24/7", v: "access" },
    ]
  } : {
    tag: "Secure gateway · authorized",
    pingColor: "bg-warning",
    title: (
      <>
        Access the <br className="hidden sm:block" />
        <span className="text-warning">VeritaBox.</span>
      </>
    ),
    description: "Synchronize your security keys, authorize your session, and connect to the core VeritaBox network dashboard.",
    stats: [
      { k: "99.98%", v: "gateway uptime" },
      { k: "14 ms", v: "latency ping" },
      { k: "Secure", v: "connection" },
    ]
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col lg:flex-row">
      {/* ============== LEFT — brand / 3D scene ============== */}
      <aside className="relative lg:w-1/2 lg:min-h-screen overflow-hidden border-b lg:border-b-0 lg:border-r border-border bg-card">
        {/* Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {/* Ambient blobs */}
        <div className="absolute -top-32 -left-32 h-[460px] w-[460px] rounded-full bg-primary/15 blur-3xl animate-blob pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 h-[420px] w-[420px] rounded-full bg-info/10 blur-3xl animate-blob pointer-events-none" style={{ animationDelay: "-7s" }} />
        {/* 3D scene */}
        {isMounted && <HeroScene className="absolute inset-0 pointer-events-none opacity-70 dark:opacity-50" mode={mode} />}
        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-background/30 via-transparent to-background/70" />

        <div className="relative h-full min-h-[280px] lg:min-h-screen flex flex-col p-6 sm:p-10 lg:p-14">
          {/* Brand */}
          <Link to="/" className="inline-flex items-center gap-2 group w-fit">
            <div className="h-7 w-7 grid place-items-center bg-foreground text-background font-bold text-sm tracking-tight">Ø</div>
            <span className="text-[15px] font-semibold tracking-[0.18em] uppercase">VeritaBox</span>
          </Link>

          {/* Headline */}
          <div className="mt-10 lg:mt-auto max-w-md">
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground border border-border px-2 py-1 rounded bg-background/60 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", sideContent.pingColor)} />
                <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", sideContent.pingColor)} />
              </span>
              {sideContent.tag}
            </div>
            <h1 className="mt-5 text-[28px] sm:text-[36px] lg:text-[42px] leading-[1.05] font-semibold tracking-tight">
              {sideContent.title}
            </h1>
            <p className="mt-4 text-[14px] text-muted-foreground leading-relaxed hidden sm:block">
              {sideContent.description}
            </p>
          </div>

          {/* Bottom strip — only on lg */}
          <div className="hidden lg:block mt-10">
            <div className="grid grid-cols-3 gap-3 text-[11px]">
              {sideContent.stats.map((s) => (
                <div key={s.v} className="border border-border bg-background/40 backdrop-blur-sm rounded p-3">
                  <div className="font-mono text-[16px] font-semibold tabular-nums">{s.k}</div>
                  <div className="text-muted-foreground uppercase tracking-[0.1em] text-[10px] mt-0.5">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>


      {/* ============== RIGHT — form ============== */}
      <main className="flex-1 flex items-start lg:items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-[440px] space-y-8">
          {/* ============ ENLISTMENT FLOW ============ */}
          {user && !user.isOnboarded ? (
            <EnlistmentFlow />
          ) : (
            <>
              {/* Top — switcher */}
              {mode === "signin" && (
                <div className="flex justify-end text-[13px] text-muted-foreground">
                  New here?{" "}
                  <button
                    onClick={() => switchMode("signup")}
                    className="ml-1 text-foreground underline underline-offset-4 hover:text-foreground transition-colors inline-flex items-center gap-0.5"
                  >
                    Enlist <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {mode === "signup" && (
                <div className="flex justify-end text-[13px] text-muted-foreground">
                  Already enlisted?{" "}
                  <button
                    onClick={() => switchMode("signin")}
                    className="ml-1 text-foreground underline underline-offset-4 hover:text-foreground transition-colors inline-flex items-center gap-0.5"
                  >
                    Sign in <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {(mode === "forgot" || mode === "reset" || mode === "lost2fa") && (
                <button
                  onClick={() => switchMode("signin")}
                  className="text-[13px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>
              )}

              {/* ============ SIGN IN ============ */}
              {mode === "signin" && !totpRequired && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Access Protocol</div>
                    <h2 className="text-[26px] font-semibold tracking-tight">Sign in to VeritaBox</h2>
                    <p className="text-[13px] text-muted-foreground">Continue your operative loop.</p>
                  </div>

                  <SocialBlock 
                    onGoogle={() => googleLogin()} 
                    onGithub={handleGithubLogin} 
                    onMicrosoft={handleMicrosoftLogin}
                    onLinkedin={handleLinkedinLogin}
                    loading={isSubmitting} 
                  />

                  <Divider />

                  <form onSubmit={handleLogin} className="space-y-4">
                    <Field
                      id="loginEmail" label="Email" icon={Mail} type="email" required
                      value={loginEmail} onChange={setLoginEmail} placeholder="you@example.com"
                    />
                    <Field
                      id="loginPw" label="Password" icon={Lock} type={showPassword ? "text" : "password"} required
                      value={loginPassword} onChange={setLoginPassword} placeholder="Your password"
                      trailing={
                        <button type="button" onClick={() => setShowPassword((s) => !s)} className="text-muted-foreground hover:text-foreground" tabIndex={-1}>
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      }
                      helper={
                        <button type="button" onClick={() => switchMode("forgot")} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                          Forgot password?
                        </button>
                      }
                    />
                    <PrimaryButton loading={isSubmitting}>Sign in <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton>
                  </form>
                  <div className="pt-2 text-center">
                    <button type="button" onClick={() => switchMode("otplogin")} className="text-[13px] text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors">
                      Use OTP Login instead
                    </button>
                  </div>
                </div>
              )}

              {/* ============ OTP LOGIN ============ */}
              {mode === "otplogin" && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Access Protocol</div>
                    <h2 className="text-[26px] font-semibold tracking-tight">OTP Login</h2>
                    <p className="text-[13px] text-muted-foreground">Sign in securely without a password.</p>
                  </div>

                  {!otpLoginSent ? (
                    <form onSubmit={handleRequestOtpLogin} className="space-y-4">
                      <Field
                        id="otpEmail" label="Email" icon={Mail} type="email" required
                        value={otpLoginEmail} onChange={setOtpLoginEmail} placeholder="you@example.com"
                      />
                      <PrimaryButton loading={isSubmitting}>Send Access Code <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtpLogin} className="space-y-4">
                      <Field
                        id="otpCode" label="6-Digit Access Code" icon={Lock} type="text" required
                        value={otpLoginCode} onChange={setOtpLoginCode} placeholder="000000"
                      />
                      <PrimaryButton loading={isSubmitting}>Verify & Sign in <CheckCircle2 className="h-3.5 w-3.5" /></PrimaryButton>
                    </form>
                  )}
                  
                  <div className="pt-2 text-center">
                    <button type="button" onClick={() => switchMode("signin")} className="text-[13px] text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors">
                      Back to password login
                    </button>
                  </div>
                </div>
              )}

              {/* ============ 2FA VERIFICATION ============ */}
              {mode === "signin" && totpRequired && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Security Protocol</div>
                    <h2 className="text-[26px] font-semibold tracking-tight">Identity Verification</h2>
                    <p className="text-[13px] text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
                  </div>

                  <form onSubmit={handleTotpVerify} className="space-y-4">
                    <Field
                      id="totpToken" label="Authentication Token" icon={Lock} type="text" required
                      value={totpToken} onChange={setTotpToken} placeholder="000000"
                    />
                    <PrimaryButton loading={isSubmitting}>Verify Identity <CheckCircle2 className="h-3.5 w-3.5" /></PrimaryButton>
                    <div className="flex flex-col gap-2 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setTotpRequired(false)} 
                        className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Use different credentials
                      </button>
                      <button 
                        type="button" 
                        onClick={handleLost2faRequest}
                        disabled={isSubmitting}
                        className="w-full text-center text-[12px] text-destructive hover:text-destructive/80 transition-colors"
                      >
                        Lost Authenticator? Disable 2FA via Email
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ============ LOST 2FA PROTOCOL ============ */}
              {mode === "lost2fa" && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-destructive">Emergency Bypass</div>
                    <h2 className="text-[26px] font-semibold tracking-tight text-destructive">Disable 2FA</h2>
                    <p className="text-[13px] text-muted-foreground">Enter the 6-digit access code sent to your email to bypass and disable 2FA.</p>
                  </div>

                  <form onSubmit={handleLost2faVerify} className="space-y-4">
                    <Field
                      id="lost2faOtp" label="6-Digit Access Code" icon={Lock} type="text" required
                      value={lost2faOtp} onChange={setLost2faOtp} placeholder="000000"
                    />
                    <Button type="submit" disabled={isSubmitting} variant="destructive" className="w-full text-[13px] h-11 tracking-wide font-semibold shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_25px_rgba(239,68,68,0.3)] transition-all duration-300">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify & Disable 2FA <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></>}
                    </Button>
                  </form>
                </div>
              )}

              {/* ============ SIGN UP ============ */}
              {mode === "signup" && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Enlistment Protocol</div>
                    <h2 className="text-[26px] font-semibold tracking-tight">Create your operative ID</h2>
                    <p className="text-[13px] text-muted-foreground">Free for individuals and chapters.</p>
                  </div>

                  <SocialBlock 
                    onGoogle={() => googleLogin()} 
                    onGithub={handleGithubLogin} 
                    onMicrosoft={handleMicrosoftLogin}
                    onLinkedin={handleLinkedinLogin}
                    loading={isSubmitting} 
                  />

                  <Divider />

                  <form onSubmit={handleSignup} className="space-y-4">
                    <Field
                      id="name" label="Full name" icon={UserIcon} type="text" required
                      value={signupName} onChange={setSignupName} placeholder="Aarav K."
                    />
                     <Field
                      id="signupEmail" label="Email" icon={Mail} type="email" required
                      value={signupEmail} onChange={setSignupEmail} placeholder="you@example.com"
                    />
                    <Field
                      id="signupPw" label="Password" icon={Lock} type={showPassword ? "text" : "password"} required minLength={8}
                      value={signupPassword} onChange={setSignupPassword} placeholder="At least 8 characters"
                      trailing={
                        <button type="button" onClick={() => setShowPassword((s) => !s)} className="text-muted-foreground hover:text-foreground" tabIndex={-1}>
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      }
                      helper={<PasswordStrength value={signupPassword} />}
                    />
                    <PrimaryButton loading={isSubmitting}>Enlist now <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton>
                  </form>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    By creating an account, you agree to VeritaBox's{" "}
                    <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">Terms of Service</Link>{" "}
                    and{" "}
                    <Link to="/conduct" className="underline underline-offset-2 hover:text-foreground">Code of Conduct</Link>.
                  </p>
                </div>
              )}

              {/* ============ FORGOT ============ */}
              {mode === "forgot" && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Recovery Protocol</div>
                    <h2 className="text-[26px] font-semibold tracking-tight">Reset your password</h2>
                    <p className="text-[13px] text-muted-foreground">Enter your operative ID to receive a bypass link.</p>
                  </div>

                  {forgotSent ? (
                    <div className="border border-border rounded-md p-5 bg-card flex gap-3 items-start">
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="text-[14px] font-medium">Check your inbox</div>
                        <p className="text-[12px] text-muted-foreground leading-relaxed">
                          If an account exists for <span className="text-foreground font-mono">{forgotEmail}</span>,
                          we've sent a reset link.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <Field
                        id="forgotEmail" label="Email / ID" icon={Mail} type="text" required
                        value={forgotEmail} onChange={setForgotEmail} placeholder="you@example.com"
                      />
                      <PrimaryButton loading={isSubmitting}>Send reset request <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton>
                    </form>
                  )}
                </div>
              )}

              {/* ============ RESET PASSWORD ============ */}
              {mode === "reset" && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Recovery Protocol</div>
                    <h2 className="text-[26px] font-semibold tracking-tight">Set new password</h2>
                    <p className="text-[13px] text-muted-foreground">Enter the 6-digit code sent to your email.</p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <Field
                      id="resetEmail" label="Email / ID" icon={Mail} type="text" required
                      value={resetEmail || forgotEmail} onChange={setResetEmail} placeholder="you@example.com"
                    />
                    <Field
                      id="resetOtp" label="6-Digit Reset Code" icon={Lock} type="text" required
                      value={resetOtp} onChange={setResetOtp} placeholder="000000"
                    />
                    <Field
                      id="resetPw" label="New Password" icon={Lock} type={showPassword ? "text" : "password"} required minLength={8}
                      value={resetNewPassword} onChange={setResetNewPassword} placeholder="At least 8 characters"
                      trailing={
                        <button type="button" onClick={() => setShowPassword((s) => !s)} className="text-muted-foreground hover:text-foreground" tabIndex={-1}>
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      }
                      helper={<PasswordStrength value={resetNewPassword} />}
                    />
                    <PrimaryButton loading={isSubmitting}>Update Password <ArrowRight className="h-3.5 w-3.5" /></PrimaryButton>
                  </form>
                </div>
              )}
            </>
          )}

          <p className="text-[11px] text-muted-foreground pt-2">
            © {new Date().getFullYear()} VeritaBox · VeritaBox
          </p>

        </div>
      </main>
    </div>
  );
}

/* ====================== Sub-components ====================== */

function Divider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-[10px] uppercase tracking-[0.15em]">
        <span className="bg-background px-3 text-muted-foreground">or with email</span>
      </div>
    </div>
  );
}

function SocialBlock({ onGoogle, onGithub, onMicrosoft, onLinkedin, loading }: { onGoogle: () => void; onGithub: () => void; onMicrosoft: () => void; onLinkedin: () => void; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {/* Top Row: GitHub & LinkedIn side-by-side */}
      <Button
        variant="outline"
        className="w-full h-11 px-0 gap-2 text-[13px] font-medium"
        onClick={onGithub}
        type="button"
        disabled={loading}
      >
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
        </svg>
        <span>GitHub</span>
      </Button>
      <Button
        variant="outline"
        className="w-full h-11 px-0 gap-2 text-[13px] font-medium"
        onClick={onLinkedin}
        type="button"
        disabled={loading}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0077B5">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
        <span>LinkedIn</span>
      </Button>

      {/* Middle Row: Google (Full Width) */}
      <Button
        variant="outline"
        className="w-full h-11 gap-2 text-[13px] font-medium col-span-2"
        onClick={onGoogle}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        <span>Continue with Google</span>
      </Button>

      {/* Bottom Row: Microsoft (Full Width) */}
      <Button
        variant="outline"
        className="w-full h-11 gap-2 text-[13px] font-medium col-span-2"
        onClick={onMicrosoft}
        type="button"
        disabled={loading}
      >
        <svg className="h-4 w-4" viewBox="0 0 23 23">
          <path fill="#f25022" d="M0 0h11v11H0z" />
          <path fill="#7fbb00" d="M12 0h11v11H12z" />
          <path fill="#00a1f1" d="M0 12h11v11H0z" />
          <path fill="#ffbb00" d="M12 12h11v11H12z" />
        </svg>
        <span>Continue with Microsoft</span>
      </Button>
    </div>
  );
}

function Field({
  id, label, icon: Icon, type, value, onChange, placeholder, required, minLength, trailing, helper,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  trailing?: React.ReactNode;
  helper?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground ml-0.5">{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          className="h-11 pl-9 pr-9 text-[14px] bg-background border-border focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
        />
        {trailing && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
      {helper && <div className="pt-0.5 flex justify-end">{helper}</div>}
    </div>
  );
}

function PrimaryButton({ children, loading, onClick }: { children: React.ReactNode; loading: boolean; onClick?: () => void }) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={loading}
      className={cn(
        "group w-full h-11 inline-flex items-center justify-center gap-2 text-[13px] font-medium",
        "bg-foreground text-background hover:bg-foreground/90 transition-all",
        "disabled:opacity-60 disabled:cursor-not-allowed rounded-md"
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}

function PasswordStrength({ value }: { value: string }) {
  const score = (() => {
    let s = 0;
    if (value.length >= 8) s++;
    if (value.length >= 12) s++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) s++;
    if (/\d/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return Math.min(s, 4);
  })();
  const labels = ["", "weak", "fair", "good", "strong"];
  const tones = ["bg-border", "bg-destructive", "bg-warning", "bg-info", "bg-success"];
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 grid grid-cols-4 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn("h-1 rounded-full transition-colors", i < score ? tones[score] : "bg-border")} />
        ))}
      </div>
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{labels[score]}</span>
    </div>
  );
}
