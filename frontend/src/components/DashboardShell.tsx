import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBarChart2, FiBook, FiHome, FiLayers, FiPlus, FiSettings, FiShuffle } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";

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
    { label: "Mapeos", to: "/admin/mappings", icon: FiLayers },
    { label: "Importar partido", to: "/import", icon: FiShuffle },
    { label: "Crear perfil", to: "/create-profile", icon: FiBook },
  ];

  return (
    <aside className="sticky top-6 h-[calc(100vh-2rem)] w-64 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 text-sm font-semibold text-slate-700">Menú</div>
      <nav className="space-y-2">
        {items.map((item) => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};

const DashboardShell = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("http://localhost:5001/api/matches")
      .then((res) => res.json())
      .then((data) => setMatches(data || []))
      .catch(() => setMatches([]));
  }, []);

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
    <Layout title="Dashboard" subtitle="Partidos disponibles" hideHeader>
      <div className="flex flex-col gap-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          <SidebarNav />
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Partidos</h1>
                <p className="text-sm text-slate-500">
                  Busca, selecciona y navega a los análisis o al reporte MultiMatch.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="search"
                  placeholder="Buscar por equipo, torneo o ubicación..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-72 rounded-xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <Button variant="secondary" onClick={goToMultiMatch} className="flex items-center gap-2">
                  <FiBarChart2 className="h-4 w-4" />
                  MultiMatch
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredMatches.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
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
                      <div className="col-span-full flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span className="h-px flex-1 bg-slate-200" />
                        {group.month} {group.year}
                        <span className="h-px flex-1 bg-slate-200" />
                      </div>
                      {group.items.map((match: Match) => (
                        <Card key={match.id} className="border-slate-200 shadow-sm">
                          <CardHeader>
                            <CardTitle className="text-lg font-semibold text-slate-800">
                              {match.team} <span className="text-gray-500">vs</span> {match.opponent}
                            </CardTitle>
                            <CardDescription>
                              {new Date(match.date).toLocaleDateString()}{" "}
                              {match.competition ? `· ${match.competition}` : ""}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm text-gray-600 space-y-1">
                              {match.location && (
                                <p>
                                  <span className="font-medium">Ubicación:</span> {match.location}
                                </p>
                              )}
                            </div>
                            <label className="mt-4 flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(match.id)}
                                onChange={() => toggleMatch(match.id)}
                                className="accent-blue-600 w-4 h-4"
                              />
                              Seleccionar para MultiMatch
                            </label>
                          </CardContent>
                          <CardFooter className="flex gap-2">
                            <button
                              className="flex-1 bg-blue-600 text-white font-medium rounded-xl px-4 py-2 hover:bg-blue-700 transition"
                              onClick={() => navigate(`/analysis/${match.id}`, { state: { match } })}
                            >
                              Ver análisis
                            </button>
                            <button
                              className="px-3 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                              onClick={() => navigate(`/admin/matches/${match.id}/edit`)}
                              title="Editar partido"
                            >
                              ⚙️
                            </button>
                          </CardFooter>
                        </Card>
                      ))}
                    </React.Fragment>
                  ))}
            </div>

            <div className="mt-4 text-center">
              <Button onClick={goToMultiMatch} disabled={matches.length === 0}>
                Ver Reporte MultiMatch
              </Button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate("/import")}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
      >
        <FiPlus className="h-5 w-5" />
        Importar partido
      </button>
    </Layout>
  );
};

export default DashboardShell;
