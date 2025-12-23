import React, { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/api/api";
import { useAuth } from "@/context/AuthContext";
import { useClub } from "@/context/ClubContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Club = {
  id: number;
  name: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  landing_copy?: string | null;
};

const ClubAdmin: React.FC = () => {
  const { user } = useAuth();
  const { reloadClubs } = useClub();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    logo_url: "",
    primary_color: "#0f172a",
    secondary_color: "#e2e8f0",
    accent_color: "#2563eb",
    landing_copy: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const isSuperAdmin = useMemo(() => user?.global_role === "super_admin", [user]);
  const isClubAdmin = useMemo(() => user?.memberships?.some((m) => m.role === "club_admin" && m.is_active), [user]);

  const loadClubs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/auth/clubs");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "No se pudo cargar clubes");
      }
      const data = await res.json();
      const all = data.clubs || [];
      if (isSuperAdmin) {
        setClubs(all);
      } else if (isClubAdmin) {
        const clubIds = user?.memberships?.filter((m) => m.role === "club_admin" && m.is_active).map((m) => m.club_id) || [];
        setClubs(all.filter((c: any) => clubIds.includes(c.id)));
      } else {
        setClubs([]);
      }
    } catch (e: any) {
      setError(e.message || "Error cargando clubes");
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin || isClubAdmin) loadClubs();
  }, [isSuperAdmin, isClubAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (!isSuperAdmin && !editingId) {
        setError("Solo el super admin puede crear clubes nuevos.");
        return;
      }
      const isEditing = Boolean(editingId);
      const url = isEditing ? `/auth/clubs/${editingId}` : "/auth/clubs";
      const method = isEditing ? "PUT" : "POST";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "No se pudo guardar el club");
      }
      setForm({
        name: "",
        logo_url: "",
        primary_color: "#0f172a",
        secondary_color: "#e2e8f0",
        accent_color: "#2563eb",
        landing_copy: "",
      });
      setEditingId(null);
      await loadClubs();
      await reloadClubs(); // 🔄 Recargar clubs en el contexto global
      console.log("✅ Club guardado y contexto recargado");
    } catch (e: any) {
      setError(e.message || "Error guardando club");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este club?")) return;
    const res = await authFetch(`/auth/clubs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "No se pudo eliminar el club");
      return;
    }
    await loadClubs();
  };

  const startEdit = (c: Club) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      logo_url: c.logo_url || "",
      primary_color: c.primary_color || "#0f172a",
      secondary_color: c.secondary_color || "#e2e8f0",
      accent_color: c.accent_color || "#2563eb",
      landing_copy: c.landing_copy || "",
    });
  };

  if (!isSuperAdmin && !isClubAdmin) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Solo el super admin o un admin de club pueden gestionar clubes.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear club</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
            {error && <div className="md:col-span-2 text-sm text-red-600">{error}</div>}
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Logo URL (opcional)</Label>
              <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Color primario</Label>
              <Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Color secundario</Label>
              <Input type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Color acento</Label>
              <Input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Descripción / landing copy</Label>
              <Input value={form.landing_copy} onChange={(e) => setForm({ ...form, landing_copy: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">{editingId ? "Guardar cambios" : "Crear club"}</Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  className="ml-2"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      name: "",
                      logo_url: "",
                      primary_color: "#0f172a",
                      secondary_color: "#e2e8f0",
                      accent_color: "#2563eb",
                      landing_copy: "",
                    });
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
          <CardTitle>Clubes existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando...</p>
          ) : clubs.length === 0 ? (
            <p className="text-sm text-slate-600">No hay clubes creados.</p>
          ) : (
            <div className="grid gap-3">
              {clubs.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-slate-500 flex gap-2">
                      <span>Primario: {c.primary_color}</span>
                      <span>Secundario: {c.secondary_color}</span>
                      <span>Acento: {c.accent_color}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.logo_url && <img src={c.logo_url} alt={c.name} className="h-8 w-8 object-contain" />}
                    <Button variant="outline" size="sm" onClick={() => startEdit(c)}>
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClubAdmin;
