/**
 * AuthContext.tsx — JWT-based auth context for the VeritaBox platform.
 * Replaces Supabase auth. Uses the Express/MongoDB backend via api.ts.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi, authSecurityApi, usersApi, setToken, getToken, removeToken, setAdminToken } from "@/lib/api";
import type { User, AuthResponse } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  profile: User | null;
  token: string | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string, universityId?: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signInWithGoogle: (idToken?: string, accessToken?: string) => Promise<AuthResponse>;
  signInWithGithub: (code: string) => Promise<AuthResponse>;
  signInWithMicrosoft: (code: string) => Promise<AuthResponse>;
  signInWithLinkedin: (code: string) => Promise<AuthResponse>;
  verifyTotp: (userId: string, token: string) => Promise<AuthResponse>;
  lost2faRequest: (userId: string, email?: string) => Promise<{ message: string }>;
  lost2faVerify: (userId: string, otp: string) => Promise<AuthResponse>;
  linkSocialWithGithub: (code: string) => Promise<void>;
  linkSocialWithMicrosoft: (code: string) => Promise<void>;
  linkSocialWithGoogle: (idToken?: string, accessToken?: string) => Promise<void>;
  linkSocialWithLinkedin: (code: string) => Promise<void>;
  requestOtpLogin: (email: string) => Promise<{ message: string }>;
  verifyOtpLogin: (email: string, otp: string) => Promise<AuthResponse>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ message: string }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [loading, setLoading] = useState(true);

  // On mount: if token exists, fetch current user profile to validate session
  useEffect(() => {
    const init = async () => {
      const storedToken = getToken();
      if (storedToken) {
        try {
          const me = await usersApi.getMe();
          setUser(me);
          setTokenState(storedToken);
        } catch (err) {
          console.error("AuthContext init error:", err);
          // Token is invalid or expired — clean up
          removeToken();
          setUser(null);
          setTokenState(null);
        }
      }
      setLoading(false);
    };
    init();

    // Listen for session-expiry events dispatched by the api.ts fetch wrapper
    const handleAuthLogout = () => {
      setUser(null);
      setTokenState(null);
    };
    window.addEventListener("auth:logout", handleAuthLogout);
    return () => window.removeEventListener("auth:logout", handleAuthLogout);
  }, []);

  const handleAuthResponse = (res: AuthResponse) => {
    setToken(res.token);
    setTokenState(res.token);
    if ((res as any).adminToken) {
      setAdminToken((res as any).adminToken);
    }
    const { token: _t, adminToken: _at, ...userData } = res as any;
    setUser(userData as User);
  };

  const signUp = async (
    name: string,
    email: string,
    password: string,
    universityId?: string
  ): Promise<AuthResponse> => {
    const res = await authApi.register(name, email, password, universityId);
    handleAuthResponse(res);
    return res;
  };

  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    const res = await authApi.login(email, password);
    if (res.token) handleAuthResponse(res);
    return res;
  };

  const signInWithGoogle = async (idToken?: string, accessToken?: string): Promise<AuthResponse> => {
    const res = await authApi.googleLogin(idToken, accessToken);
    if (res.token) handleAuthResponse(res);
    return res;
  };

  const signInWithGithub = async (code: string): Promise<AuthResponse> => {
    const res = await authApi.githubLogin(code);
    if (res.token) handleAuthResponse(res);
    return res;
  };

  const signInWithMicrosoft = async (code: string): Promise<AuthResponse> => {
    const res = await authApi.microsoftLogin(code);
    if (res.token) handleAuthResponse(res);
    return res;
  };

  const signInWithLinkedin = async (code: string): Promise<AuthResponse> => {
    const res = await authApi.linkedinLogin(code);
    if (res.token) handleAuthResponse(res);
    return res;
  };

  const verifyTotp = async (userId: string, token: string): Promise<AuthResponse> => {
    const res = await authApi.verifyTotp(userId, token);
    handleAuthResponse(res);
    return res;
  };

  const lost2faRequest = async (userId: string, email?: string) => {
    return await authSecurityApi.lost2faRequest(userId, email);
  };

  const lost2faVerify = async (userId: string, otp: string): Promise<AuthResponse> => {
    const res = await authSecurityApi.lost2faVerify(userId, otp);
    handleAuthResponse(res);
    return res;
  };

  const linkSocialWithGithub = async (code: string) => {
    const res = await authSecurityApi.linkSocialGithub(code);
    if (user) {
      setUser({ ...user, socialProviders: res.socialProviders });
    }
  };

  const linkSocialWithMicrosoft = async (code: string) => {
    const res = await authSecurityApi.linkSocialMicrosoft(code);
    if (user) {
      setUser({ ...user, socialProviders: res.socialProviders });
    }
  };

  const linkSocialWithGoogle = async (idToken?: string, accessToken?: string) => {
    const res = await authSecurityApi.linkSocialGoogle({ idToken, accessToken });
    if (user) {
      setUser({ ...user, socialProviders: res.socialProviders });
    }
  };

  const linkSocialWithLinkedin = async (code: string) => {
    const res = await authSecurityApi.linkSocialLinkedin(code);
    if (user) {
      setUser({ ...user, socialProviders: res.socialProviders });
    }
  };

  const requestOtpLogin = async (email: string) => {
    return await authApi.requestOtpLogin(email);
  };

  const verifyOtpLogin = async (email: string, otp: string): Promise<AuthResponse> => {
    const res = await authApi.verifyOtpLogin(email, otp);
    if (res.token) handleAuthResponse(res);
    return res;
  };

  const forgotPassword = async (email: string) => {
    return await authApi.forgotPassword(email);
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    return await authApi.resetPassword(email, otp, newPassword);
  };

  const signOut = () => {
    removeToken();
    setUser(null);
    setTokenState(null);
  };

  const refreshUser = async () => {
    if (getToken()) {
      try {
        const me = await usersApi.getMe();
        setUser(me);
      } catch {
        signOut();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ 
        user, profile: user, token, loading, signUp, signIn, signInWithGoogle, signInWithGithub, signInWithMicrosoft, signInWithLinkedin, verifyTotp, 
        lost2faRequest, lost2faVerify,
        linkSocialWithGithub, linkSocialWithMicrosoft, linkSocialWithGoogle, linkSocialWithLinkedin,
        requestOtpLogin, verifyOtpLogin, forgotPassword, resetPassword,
        signOut, refreshUser 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
