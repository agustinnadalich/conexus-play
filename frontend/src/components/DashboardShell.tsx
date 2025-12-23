import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBarChart2, FiBook, FiHome, FiLayers, FiPlus, FiSettings, FiShuffle } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { fetchMatches } from "@/api/api";
import { useClub } from "@/context/ClubContext";
import { authFetch } from "@/api/api";

type Match = {
  id: number;
  team: string;
  opponent: string;
  date: string;
  competition?: string;
  location?: string;
  video_url?: string;
};

const SidebarNav = () => {
  const navigate = useNavigate();
  const items = [
    { label: "Dashboard", to: "/dashboard", icon: FiHome },
    { label: "Administrar partidos", to: "/admin/matches", icon: FiSettings },
    { label: "Importar partido", to: "/import", icon: FiShuffle },
  ];
  const { user } = useAuth();
  const isSuperAdmin = user?.global_role === "super_admin";
  const isClubAdmin = user?.memberships?.some((m) => m.role === "club_admin" && m.is_active);
  const extra = [];
  if (isSuperAdmin) {
    extra.push({ label: "Mapeos", to: "/admin/mappings", icon: FiLayers });
    extra.push({ label: "Crear perfil", to: "/create-profile", icon: FiBook });
  }
  if (isSuperAdmin) {
    extra.push({ label: "Usuarios", to: "/admin/users", icon: FiSettings });
    extra.push({ label: "Clubes", to: "/admin/clubs", icon: FiSettings });
    extra.push({ label: "Equipos", to: "/admin/teams", icon: FiSettings });
  } else if (isClubAdmin) {
    extra.push({ label: "Equipos", to: "/admin/teams", icon: FiSettings });
  }
  const effectiveItems = [...items, ...extra];

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
        Menú
      </div>
      <nav className="space-y-2">
        {effectiveItems.map((item) => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-sm font-semibold text-slate-100 transition hover:border-white/10 hover:bg-white/5 hover:text-white"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-cyan-200 shadow-inner">
              <item.icon className="h-4 w-4" />
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

const DashboardShell = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const [clubName, setClubName] = useState<string | null>(null);
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const { allowedClubs, activeClubId, setActiveClubId, branding } = useClub();

  useEffect(() => {
    fetchMatches(activeClubId ? { club_id: activeClubId } : {})
      .then((data) => setMatches(data || []))
      .catch(() => setMatches([]));
  }, [activeClubId]);

  useEffect(() => {
    const loadClub = async () => {
      try {
        if (!activeClubId) {
          setClubName(null);
          setClubLogo(null);
          return;
        }
        const club = allowedClubs.find((c) => c.id === activeClubId);
        if (club) {
          setClubName(club.name);
          setClubLogo(club.logo_url || null);
        } else {
          setClubName(null);
          setClubLogo(null);
        }
      } catch {
        setClubName(null);
        setClubLogo(null);
      }
    };
    loadClub();
  }, [allowedClubs, activeClubId]);

  const filteredMatches = useMemo(() => {
    const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!search) return sorted;
    const term = search.toLowerCase();
    return sorted.filter((m) =>
      [
        m.team,
        m.opponent,
        m.competition,
        m.location,
        new Date(m.date).toLocaleDateString(),
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term))
    );
  }, [matches, search]);

  const toggleMatch = (id: number) => {
    setSelectedIds((prev: number[]) =>
      prev.includes(id) ? prev.filter((i: number) => i !== id) : [...prev, id]
    );
  };

  const goToMultiMatch = () => {
    const query = selectedIds.map((id: number) => `match_id=${id}`).join("&");
    navigate(query ? `/multi-match-report?${query}` : "/multi-match-report");
  };

  return (
    <Layout
      title="Dashboard"
      subtitle="Partidos disponibles y análisis rápidos"
      showDashboardShortcut={false}
      sidebar={<SidebarNav />}
    >
      <div className="flex flex-col gap-6">
        <div className="app-card flex flex-wrap items-center gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white shadow-inner">
              {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Sesión activa</div>
              <div className="text-base font-semibold text-white">{user?.email}</div>
            </div>
          </div>
          {clubName && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 shadow-inner">
              {clubLogo ? (
                <img src={clubLogo} alt={clubName} className="h-10 w-10 object-contain rounded-lg bg-white/10 p-1" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center text-slate-200 font-bold">
                  {clubName[0]}
                </div>
              )}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Club activo</div>
                <div className="text-sm font-semibold text-white">{clubName}</div>
              </div>
            </div>
          )}
          {allowedClubs.length > 1 && (
            <div className="ml-auto">
              <select
                className="app-input w-48"
                value={activeClubId ?? ""}
                onChange={(e) => setActiveClubId(e.target.value ? Number(e.target.value) : null)}
              >
                {user?.global_role === "super_admin" && <option value="">Todos</option>}
                {allowedClubs.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#181E2F]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">Partidos</h1>
              <p className="text-sm text-slate-300">
                Busca, selecciona y navega a los análisis o al reporte MultiMatch.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="search"
                placeholder="Buscar por equipo, torneo o ubicación..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="app-input w-72"
              />
              <Button variant="secondary" onClick={goToMultiMatch} className="flex items-center gap-2">
                <FiBarChart2 className="h-4 w-4" />
                MultiMatch
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {filteredMatches.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-sm text-slate-300">
                No encontramos partidos para “{search}”.
              </div>
            )}

            {filteredMatches.length > 0 &&
              filteredMatches
                .reduce((acc, match) => {
                  const date = new Date(match.date);
                  const year = date.getFullYear();
                  const month = date.toLocaleDateString("es-ES", { month: "long" });
                  const key = `${year}-${month}`;
                  const existing = acc.find((g) => g.key === key);
                  if (existing) {
                    existing.items.push(match);
                  } else {
                    acc.push({ key, year, month, items: [match], ts: date.getTime() });
                  }
                  return acc;
                }, [] as { key: string; year: number; month: string; items: Match[]; ts: number }[])
                .sort((a, b) => b.ts - a.ts)
                .map((group) => (
                  <React.Fragment key={group.key}>
                    <div className="col-span-full flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <span className="h-px flex-1 bg-white/10" />
                      {group.month} {group.year}
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                    {group.items.map((match: Match) => (
                      <Card key={match.id}>
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg font-semibold text-white">
                            {match.team} <span className="text-slate-400">vs</span> {match.opponent}
                          </CardTitle>
                          <CardDescription className="text-slate-300">
                            {new Date(match.date).toLocaleDateString()}{" "}
                            {match.competition ? `· ${match.competition}` : ""}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <div className="text-sm text-slate-300 space-y-1">
                            {match.location && (
                              <p>
                                <span className="font-semibold text-slate-200">Ubicación:</span> {match.location}
                              </p>
                            )}
                          </div>
                          <label className="mt-4 flex items-center gap-2 text-sm text-slate-200">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(match.id)}
                              onChange={() => toggleMatch(match.id)}
                              className="h-4 w-4 accent-cyan-300"
                            />
                            Seleccionar para MultiMatch
                          </label>
                        </CardContent>
                        <CardFooter className="flex gap-2 pt-0">
                          <Button
                            className="flex-1"
                            onClick={() => navigate(`/analysis/${match.id}`, { state: { match } })}
                          >
                            Ver análisis
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/admin/matches/${match.id}/edit`)}
                            title="Editar partido"
                          >
                            ⚙️
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </React.Fragment>
                ))}
          </div>

          <div className="text-center">
            <Button onClick={goToMultiMatch} disabled={matches.length === 0}>
              Ver Reporte MultiMatch
            </Button>
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate("/import")}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-[#4FD1E5] px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_20px_45px_rgba(79,209,229,0.35)] transition hover:bg-cyan-300 hover:shadow-[0_24px_55px_rgba(79,209,229,0.4)]"
      >
        <FiPlus className="h-5 w-5" />
        Importar partido
      </button>
    </Layout>
  );
};

export default DashboardShell;
