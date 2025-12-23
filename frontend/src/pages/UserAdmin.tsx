import React, { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/api/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Membership = {
  id: number;
  club_id: number;
  role: string;
  can_edit: boolean;
  team_ids: number[];
  match_ids: number[];
  is_active: boolean;
};

type User = {
  id: number;
  email: string;
  full_name?: string;
  global_role: string;
  is_active: boolean;
  is_email_verified: boolean;
  memberships: Membership[];
};

type Club = {
  id: number;
  name: string;
  logo_url?: string | null;
};

const UserAdmin: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    global_role: "user",
    club_id: "none",
    role: "viewer",
    can_edit: false,
  });

  const isSuperAdmin = useMemo(() => user?.global_role === "super_admin", [user]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, clubsRes] = await Promise.all([authFetch("/auth/users"), authFetch("/auth/clubs")]);
      if (!usersRes.ok) {
        const err = await usersRes.json().catch(() => ({}));
        throw new Error(err.error || "No se pudo cargar usuarios");
      }
      if (!clubsRes.ok) {
        const err = await clubsRes.json().catch(() => ({}));
        throw new Error(err.error || "No se pudo cargar clubes");
      }
      const usersJson = await usersRes.json();
      const clubsJson = await clubsRes.json();
      setUsers(usersJson.users || []);
      setClubs(clubsJson.clubs || []);
    } catch (e: any) {
      setError(e.message || "Error cargando datos");
      setUsers([]);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) loadData();
  }, [isSuperAdmin]);

  const toggleActive = async (u: User) => {
    const res = await authFetch(`/auth/users/${u.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !u.is_active }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "No se pudo actualizar estado");
      return;
    }
    await loadData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload: any = {
      email: form.email,
      password: form.password || undefined,
      full_name: form.full_name || undefined,
      global_role: form.global_role,
    };
    if (form.club_id && form.club_id !== "none") {
      payload.club_id = Number(form.club_id);
      payload.role = form.role;
      payload.can_edit = form.can_edit;
    }
    const res = await authFetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "No se pudo crear usuario");
      return;
    }
    setForm({
      email: "",
      password: "",
      full_name: "",
      global_role: "user",
      club_id: "none",
      role: "viewer",
      can_edit: false,
    });
    await loadData();
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Solo el super admin puede gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            {error && <div className="md:col-span-2 text-sm text-red-600">{error}</div>}
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Opcional: se genera si se deja vacío"
              />
            </div>
            <div className="space-y-1">
              <Label>Nombre completo</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Rol global</Label>
              <Select value={form.global_role} onValueChange={(v) => setForm({ ...form, global_role: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Club (opcional)</Label>
              <Select value={form.club_id} onValueChange={(v) => setForm({ ...form, club_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin club" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin club</SelectItem>
                  {clubs.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rol en club</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="club_admin">Club Admin</SelectItem>
                  <SelectItem value="analyst">Analista</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="can_edit"
                type="checkbox"
                checked={form.can_edit}
                onChange={(e) => setForm({ ...form, can_edit: e.target.checked })}
              />
              <Label htmlFor="can_edit">Puede editar</Label>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Crear usuario</Button>
            </div>
          </form>
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Email</th>
                    <th className="text-left py-2 px-2">Nombre</th>
                    <th className="text-left py-2 px-2">Rol global</th>
                    <th className="text-left py-2 px-2">Activo</th>
                    <th className="text-left py-2 px-2">Verificado</th>
                    <th className="text-left py-2 px-2">Membresías</th>
                    <th className="text-left py-2 px-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2 px-2">{u.email}</td>
                      <td className="py-2 px-2">{u.full_name}</td>
                      <td className="py-2 px-2">{u.global_role}</td>
                      <td className="py-2 px-2">{u.is_active ? "Sí" : "No"}</td>
                      <td className="py-2 px-2">{u.is_email_verified ? "Sí" : "No"}</td>
                      <td className="py-2 px-2">
                        {u.memberships?.length
                          ? u.memberships
                              .map((m) => {
                                const club = clubs.find((c) => c.id === m.club_id);
                                return `${club?.name || "Club"} (${m.role}${m.can_edit ? ", edit" : ""}${m.is_active ? "" : ", inactiva"})`;
                              })
                              .join(" • ")
                          : "—"}
                      </td>
                      <td className="py-2 px-2">
                        <Button variant="outline" size="sm" onClick={() => toggleActive(u)}>
                          {u.is_active ? "Desactivar" : "Activar"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserAdmin;
