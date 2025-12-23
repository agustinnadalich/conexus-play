export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

export async function authFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  const isFormData = options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (!isFormData && !("Content-Type" in headers)) {
    (headers as any)["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // token inválido; limpiar para forzar relogin
    localStorage.removeItem("access_token");
  }

  return response;
}

export async function fetchMatches(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.append(k, String(v));
  });
  const path = qs.toString() ? `/matches?${qs.toString()}` : "/matches";
  const response = await authFetch(path);
  if (!response.ok) throw new Error("Error al obtener los partidos");
  return response.json();
}

export async function fetchEvents(matchId: number) {
  const response = await authFetch(`/matches/${matchId}/events`);
  if (!response.ok) throw new Error("Error al obtener los eventos");
  return response.json();
}
