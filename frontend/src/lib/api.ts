const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

let _token: string | null = localStorage.getItem("tg_token");
let _refreshing: Promise<string | null> | null = null;

export const setToken = (t: string | null) => {
  _token = t;
  if (t) localStorage.setItem("tg_token", t);
  else localStorage.removeItem("tg_token");
};

let _adminPassword: string | null = null;
export const setAdminPassword = (pw: string | null) => { _adminPassword = pw; };
export const getAdminPassword = () => _adminPassword;
export const clearAdminSession = () => { _adminPassword = null; };

const doRefresh = async (): Promise<string | null> => {
  try {
    const r = await fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" });
    if (!r.ok) throw new Error("refresh failed");
    const d = await r.json();
    setToken(d.token);
    return d.token;
  } catch {
    setToken(null);
    localStorage.removeItem("tg_user");
    window.location.href = "/login";
    return null;
  }
};

const refreshOnce = (): Promise<string | null> => {
  if (!_refreshing) _refreshing = doRefresh().finally(() => { _refreshing = null; });
  return _refreshing;
};

interface FetchOpts {
  method?: string;
  body?: unknown;
  auth?: boolean;
  admin?: boolean;
}

export async function apiFetch<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { method = "GET", body, auth = true, admin = false } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth && _token) headers["Authorization"] = `Bearer ${_token}`;
  if (admin && _adminPassword) headers["x-admin-password"] = _adminPassword;

  const res = await fetch(`${BASE}${path}`, {
    method, headers, credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    const newToken = await refreshOnce();
    if (!newToken) throw new Error("Unauthorized");
    const retried = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...headers, Authorization: `Bearer ${newToken}` },
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!retried.ok) {
      const e = await retried.json().catch(() => ({ message: "Request failed" }));
      throw new Error(e.message || "Request failed");
    }
    return retried.json() as Promise<T>;
  }

  if (!res.ok) {
    const e = await res.json().catch(() => ({ message: "Request failed" }));
    const err = new Error(e.message || "Request failed") as Error & { violations?: unknown[] };
    if (e.violations) err.violations = e.violations;
    throw err;
  }

  return res.json() as Promise<T>;
}

export const adminFetch = <T = unknown>(path: string, opts: Omit<FetchOpts, "admin"> = {}) =>
  apiFetch<T>(`/admin${path}`, { ...opts, admin: true });
