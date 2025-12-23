import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/api/api";
import { useAuth } from "@/context/AuthContext";

type Club = {
  id: number;
  name: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  landing_copy?: string | null;
};

type ClubContextValue = {
  clubs: Club[];
  allowedClubs: Club[];
  activeClubId: number | null;
  setActiveClubId: (id: number | null) => void;
  reloadClubs: () => Promise<void>;
  branding: {
    primary: string;
    secondary: string;
    accent: string;
    logo?: string | null;
  };
};

const ClubContext = createContext<ClubContextValue | undefined>(undefined);

const DEFAULT_BRANDING = {
  primary: "#0f172a",
  secondary: "#f8fafc",
  accent: "#2563eb",
  logo: null,
};

export const ClubProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [activeClubId, setActiveClubIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const setActiveClubId = (id: number | null) => {
    setActiveClubIdState(id);
    if (id) localStorage.setItem("active_club_id", String(id));
    else localStorage.removeItem("active_club_id");
  };

  const loadClubs = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await authFetch("/auth/clubs");
      if (res.ok) {
        const data = await res.json();
        console.log("🔄 Clubs recargados:", data.clubs);
        setClubs(data.clubs || []);
      }
    } catch {
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClubs();
  }, [user]);

  useEffect(() => {
    const stored = localStorage.getItem("active_club_id");
    if (stored) setActiveClubIdState(Number(stored));
  }, []);

  // Si el usuario solo tiene un club, seleccionarlo por defecto
  useEffect(() => {
    if (!user?.memberships?.length) return;
    if (activeClubId) return;
    if (user.memberships.length === 1) {
      setActiveClubId(user.memberships[0].club_id);
    }
  }, [user, activeClubId]);

  const allowedClubs = useMemo(() => {
    if (!user) return [];
    if (user.global_role === "super_admin") return clubs;
    const allowedIds = user.memberships?.filter((m: any) => m.is_active).map((m: any) => m.club_id) || [];
    return clubs.filter((c) => allowedIds.includes(c.id));
  }, [user, clubs]);

  // Garantizar que activeClubId esté dentro de allowedClubs cuando cambia la lista
  useEffect(() => {
    if (!allowedClubs.length) {
      setActiveClubIdState(null);
      return;
    }
    if (activeClubId && !allowedClubs.some((c) => c.id === activeClubId)) {
      setActiveClubIdState(allowedClubs[0].id);
    }
  }, [allowedClubs, activeClubId]);

  const branding = useMemo(() => {
    const club = allowedClubs.find((c) => c.id === activeClubId);
    return {
      primary: club?.primary_color || DEFAULT_BRANDING.primary,
      secondary: club?.secondary_color || DEFAULT_BRANDING.secondary,
      accent: club?.accent_color || DEFAULT_BRANDING.accent,
      logo: club?.logo_url || null,
    };
  }, [allowedClubs, activeClubId]);

  return (
    <ClubContext.Provider value={{ clubs, allowedClubs, activeClubId, setActiveClubId, reloadClubs: loadClubs, branding }}>
      {children}
    </ClubContext.Provider>
  );
};

export const useClub = () => {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error("useClub must be used within ClubProvider");
  return ctx;
};
