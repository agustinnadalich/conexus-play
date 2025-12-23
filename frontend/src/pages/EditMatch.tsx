import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authFetch } from "@/api/api";

type Match = {
  id: number;
  team: string;
  team_id?: number;
  opponent: string;
  date: string;
  location: string;
  competition?: string;
  round?: string;
  result?: string;
  video_url?: string;
  import_profile_name?: string;
  global_delay_seconds?: number;
  event_delays?: Record<string, number>;
  manual_period_times?: {
    kick_off_1?: number;
    end_1?: number;
    kick_off_2?: number;
    end_2?: number;
  };
};

type ImportProfile = {
  name: string;
  description: string;
};

type Team = {
  id: number;
  name: string;
  club_id: number;
};

const EditMatch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<ImportProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualTimes, setManualTimes] = useState({
    kick_off_1: 0,
    end_1: 2400,
    kick_off_2: 2700,
    end_2: 4800,
  });
  const [globalDelay, setGlobalDelay] = useState(0);
  const [eventDelays, setEventDelays] = useState<Record<string, number>>({});
  const [newEventType, setNewEventType] = useState("");
  const [newEventDelay, setNewEventDelay] = useState(0);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matchRes, profilesRes, teamsRes] = await Promise.all([
          authFetch(`/matches/${id}`),
          authFetch("/import/profiles"),
          authFetch("/teams"),
        ]);
        const matchData = await matchRes.json();
        const profileData = await profilesRes.json();
        const teamsData = await teamsRes.json();
        if (!matchRes.ok) throw new Error(matchData.error || "No se pudo cargar el partido");
        setMatch(matchData);
        setManualTimes({
          kick_off_1: matchData.manual_period_times?.kick_off_1 ?? matchData.kick_off_1_seconds ?? 0,
          end_1: matchData.manual_period_times?.end_1 ?? matchData.end_1_seconds ?? 2400,
          kick_off_2: matchData.manual_period_times?.kick_off_2 ?? matchData.kick_off_2_seconds ?? 2700,
          end_2: matchData.manual_period_times?.end_2 ?? matchData.end_2_seconds ?? 4800,
        });
        setGlobalDelay(matchData.global_delay_seconds || 0);
        setEventDelays(matchData.event_delays || {});
        setProfiles(profileData || []);
        setTeams(teamsData.teams || []);
        setMatch((prev) => ({ ...(prev || matchData), team_id: matchData.team_id } as any));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (key: keyof Match, value: string) => {
    if (!match) return;
    setMatch({ ...match, [key]: value });
  };

  const handleSave = async () => {
    if (!match) return;
    setSaving(true);
    setError(null);
    try {
      const { id: matchId, ...payload } = match;
      const res = await authFetch(`/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          manual_period_times: manualTimes,
          kick_off_1_seconds: manualTimes.kick_off_1,
          end_1_seconds: manualTimes.end_1,
          kick_off_2_seconds: manualTimes.kick_off_2,
          end_2_seconds: manualTimes.end_2,
          global_delay_seconds: globalDelay,
          event_delays: eventDelays,
          team_id: (match as any).team_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el partido");
      navigate("/admin/matches");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout
      title="Editar partido"
      breadcrumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Administrar partidos", to: "/admin/matches" },
        { label: "Editar" },
      ]}
    >
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{match ? `${match.team} vs ${match.opponent}` : "Cargando partido..."}</CardTitle>
          <CardDescription>Actualiza la info básica y los tiempos/delays del partido</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p>Cargando partido...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {match && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Equipo</Label>
                  <Select
                    value={match.team_id ? String(match.team_id) : "none"}
                    onValueChange={(v) => setMatch({ ...match, team_id: v === "none" ? undefined : Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin equipo asignado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin equipo</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rival</Label>
                  <Input value={match.opponent || ""} onChange={(e) => handleChange("opponent", e.target.value)} />
                </div>
                <div>
                  <Label>Fecha</Label>
                  <Input type="date" value={match.date || ""} onChange={(e) => handleChange("date", e.target.value)} />
                </div>
                <div>
                  <Label>Ubicación</Label>
                  <Input value={match.location || ""} onChange={(e) => handleChange("location", e.target.value)} />
                </div>
                <div>
                  <Label>Competición</Label>
                  <Input value={match.competition || ""} onChange={(e) => handleChange("competition", e.target.value)} />
                </div>
                <div>
                  <Label>Ronda</Label>
                  <Input value={match.round || ""} onChange={(e) => handleChange("round", e.target.value)} />
                </div>
                <div>
                  <Label>Resultado</Label>
                  <Input value={match.result || ""} onChange={(e) => handleChange("result", e.target.value)} />
                </div>
                <div>
                  <Label>URL del Video</Label>
                  <Input value={match.video_url || ""} onChange={(e) => handleChange("video_url", e.target.value)} />
                </div>
                <div>
                  <Label>Perfil de importación</Label>
                  <Select
                    value={match.import_profile_name || ""}
                    onValueChange={(v) => handleChange("import_profile_name", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar perfil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name} - {p.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <Label>Kick Off 1er Tiempo (segundos)</Label>
                  <Input
                    type="number"
                    value={manualTimes.kick_off_1}
                    onChange={(e) => setManualTimes((prev) => ({ ...prev, kick_off_1: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label>Fin 1er Tiempo (segundos)</Label>
                  <Input
                    type="number"
                    value={manualTimes.end_1}
                    onChange={(e) => setManualTimes((prev) => ({ ...prev, end_1: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label>Kick Off 2do Tiempo (segundos)</Label>
                  <Input
                    type="number"
                    value={manualTimes.kick_off_2}
                    onChange={(e) => setManualTimes((prev) => ({ ...prev, kick_off_2: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label>Fin 2do Tiempo (segundos)</Label>
                  <Input
                    type="number"
                    value={manualTimes.end_2}
                    onChange={(e) => setManualTimes((prev) => ({ ...prev, end_2: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <Label>Delay global (segundos)</Label>
                  <Input
                    type="number"
                    value={globalDelay}
                    onChange={(e) => setGlobalDelay(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Agregar delay por tipo de evento</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tipo (ej: TRY)"
                      value={newEventType}
                      onChange={(e) => setNewEventType(e.target.value)}
                    />
                    <Input
                      type="number"
                      className="w-28"
                      placeholder="Segundos"
                      value={newEventDelay}
                      onChange={(e) => setNewEventDelay(parseInt(e.target.value) || 0)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (!newEventType.trim()) return;
                        setEventDelays((prev) => ({ ...prev, [newEventType.trim().toUpperCase()]: newEventDelay }));
                        setNewEventType("");
                        setNewEventDelay(0);
                      }}
                    >
                      Añadir
                    </Button>
                  </div>
                </div>
              </div>

              {Object.keys(eventDelays).length > 0 && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-sm font-semibold text-slate-700 mb-2">Delays por evento</div>
                  <div className="space-y-2">
                    {Object.entries(eventDelays).map(([type, delay]) => (
                      <div key={type} className="flex items-center gap-2">
                        <span className="w-24 text-xs font-medium text-slate-600">{type}</span>
                        <Input
                          type="number"
                          className="w-28"
                          value={delay}
                          onChange={(e) =>
                            setEventDelays((prev) => ({
                              ...prev,
                              [type]: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEventDelays((prev) => {
                              const updated = { ...prev };
                              delete updated[type];
                              return updated;
                            });
                          }}
                        >
                          Quitar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default EditMatch;
