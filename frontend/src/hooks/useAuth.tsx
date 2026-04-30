import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiFetch, setToken } from "../lib/api";

interface User { id: string; name: string; email: string; avatarUrl?: string; }
interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem("tg_user") || "null"); } catch { return null; }
  });
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("tg_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      apiFetch<{ user: User }>("/auth/me")
        .then(d => {
          setUser(d.user);
          localStorage.setItem("tg_user", JSON.stringify(d.user));
        })
        .catch(() => {
          setUser(null);
          setTokenState(null);
          setToken(null);
          localStorage.removeItem("tg_user");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (idToken: string) => {
    const d = await apiFetch<{ token: string; user: User }>("/auth/google", {
      method: "POST",
      body: { idToken },
      auth: false,
    });
    setToken(d.token);
    setTokenState(d.token);
    localStorage.setItem("tg_user", JSON.stringify(d.user));
    setUser(d.user);
  };

  const logout = async () => {
    try { await apiFetch("/auth/logout", { method: "POST" }); } catch {}
    setToken(null);
    setTokenState(null);
    localStorage.removeItem("tg_user");
    setUser(null);
  };

  return <Ctx.Provider value={{ user, token, loading, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
};