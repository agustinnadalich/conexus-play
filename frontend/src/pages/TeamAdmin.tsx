import React, { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/api/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Club = {
  id: number;
  name: string;
};

type Team = {
  id: number;
  name: string;
  category?: string | null;
  season?: string | null;
  club_id: number;
};

const TeamAdmin: React.FC = () => {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [form, setForm] = useState({
    club_id: "",
    name: "",
    category: "",
    season: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const isSuperAdmin = useMemo(() => user?.global_role === "super_admin", [user]);
  const clubAdminIds = useMemo(() => user?.memberships?.filter((m) => m.role === "club_admin" && m.is_active).map((m) => m.club_id) || [], [user]);

  const loadClubs = async () => {
    const res = await authFetch("/auth/clubs");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "No se pudo cargar clubes");
    }
    const data = await res.json();
    setClubs(data.clubs || []);
  };

  const loadTeams = async (clubId?: string) => {
    const query = clubId ? `?club_id=${clubId}` : "";
    const res = await authFetch(`/teams${query}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "No se pudo cargar equipos");
    }
    const data = await res.json();
    setTeams(data.teams || []);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        await loadClubs();
        await loadTeams();
      } catch (e: any) {
        setError(e.message || "Error inicial");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const allowedClubs = useMemo(() => {
    if (isSuperAdmin) return clubs;
    return clubs.filter((c) => clubAdminIds.includes(c.id));
  }, [clubs, isSuperAdmin, clubAdminIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      const isEditing = Boolean(editingId);
      const url = isEditing ? `/teams/${editingId}` : "/teams";
      const method = isEditing ? "PUT" : "POST";
      console.log("TEAM SUBMIT", { url, method, form });
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          club_id: form.club_id ? Number(form.club_id) : undefined,
          name: form.name,
          category: form.category || undefined,
          season: form.season || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `No se pudo guardar el equipo (status ${res.status})`);
      }
      setForm({ club_id: "", name: "", category: "", season: "" });
      setEditingId(null);
      await loadTeams();
      setInfo(isEditing ? "Equipo actualizado" : "Equipo creado");
    } catch (e: any) {
      setError(e.message || "Error guardando equipo");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este equipo?")) return;
    const res = await authFetch(`/teams/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "No se pudo eliminar el equipo");
      return;
    }
    await loadTeams();
    setInfo("Equipo eliminado");
  };

  const startEdit = (t: Team) => {
    setEditingId(t.id);
    setForm({
      club_id: String(t.club_id),
      name: t.name,
      category: t.category || "",
      season: t.season || "",
    });
  };

  if (!isSuperAdmin && clubAdminIds.length === 0) {
    return <div className="p-6 text-sm text-slate-600">Solo super admin o club admins pueden gestionar equipos.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar equipo" : "Crear equipo"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            {error && <div className="md:col-span-2 text-sm text-red-600">{error}</div>}
            {info && <div className="md:col-span-2 text-sm text-green-600">{info}</div>}
            {editingId && (
              <div className="md:col-span-2 text-xs text-slate-500">
                Editando equipo ID #{editingId}
              </div>
            )}
            <div className="space-y-1">
              <Label>Club</Label>
              <Select value={form.club_id} onValueChange={(v) => setForm({ ...form, club_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar club" />
                </SelectTrigger>
                <SelectContent>
                  {allowedClubs.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Categoría (opcional)</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Temporada (opcional)</Label>
              <Input value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <Button type="submit" disabled={!form.club_id || !form.name}>{editingId ? "Guardar cambios" : "Crear equipo"}</Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ club_id: "", name: "", category: "", season: "" });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando...</p>
          ) : teams.length === 0 ? (
            <p className="text-sm text-slate-600">No hay equipos.</p>
          ) : (
            <div className="grid gap-3">
              {teams.map((t) => {
                const club = clubs.find((c) => c.id === t.club_id);
                return (
                  <div key={t.id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-xs text-slate-500">
                        {club ? club.name : "Club"} · {t.category || "—"} · {t.season || ""}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(t)}>
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(t.id)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamAdmin;
