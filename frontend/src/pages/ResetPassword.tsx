import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE } from "@/api/api";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/Brand";

const ResetPassword = () => {
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "No se pudo resetear la contraseña");
      }
      setStatus("Contraseña actualizada. Ya puedes iniciar sesión.");
    } catch (err: any) {
      setError(err.message || "Error al resetear");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#181E2F] text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLockup variant="login" shadow={false} />
        </div>
        <div className="app-card p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Restablecer contraseña</h1>
          <p className="text-sm text-slate-300 mb-6">Pega el token recibido y define una nueva contraseña.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1">Token</label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="app-input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="app-input"
                required
              />
            </div>
            {status && <div className="text-sm text-blue-300">{status}</div>}
            {error && <div className="text-sm text-red-400">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando..." : "Actualizar contraseña"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
