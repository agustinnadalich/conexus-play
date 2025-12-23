import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE, authFetch } from "@/api/api";

type MembershipScope = {
  id: number;
  club_id: number;
  role: string;
  can_edit: boolean;
  team_ids: number[];
  match_ids: number[];
  is_active: boolean;
};

export type AuthUser = {
  id: number;
  email: string;
  full_name?: string;
  global_role: string;
  is_active: boolean;
  is_email_verified: boolean;
  memberships: MembershipScope[];
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("access_token"));
  const [loading, setLoading] = useState<boolean>(true);

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("access_token");
  };

  const refreshUser = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`/auth/me`);
      if (!res.ok) {
        logout();
        return;
      }
      const data = await res.json();
      setUser(data.user as AuthUser);
    } catch (e) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "No se pudo iniciar sesión");
    }
    const data = await res.json();
    const accessToken = data.access_token as string;
    localStorage.setItem("access_token", accessToken);
    setToken(accessToken);
    setUser(data.user as AuthUser);
  };

  const value = useMemo(
    () => ({ user, token, loading, login, logout, refreshUser }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
