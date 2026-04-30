import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) { navigate("/home"); return; }
  }, [user]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (resp: { credential: string }) => {
        try {
          await login(resp.credential);
          navigate("/home");
        } catch (e: unknown) {
          alert((e as Error).message || "Login failed");
        }
      },
    });

    if (btnRef.current) {
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: 280,
      });
    }
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-base)", padding: 24,
    }}>
      {/* BG grid */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.04,
        backgroundImage: "linear-gradient(var(--accent) 1px,transparent 1px),linear-gradient(90deg,var(--accent) 1px,transparent 1px)",
        backgroundSize: "40px 40px", pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, background: "var(--accent)", borderRadius: 16,
            fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 20, color: "#000",
            marginBottom: 20, boxShadow: "0 0 32px var(--accent-glow)",
          }}>TG</div>
          <div style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.25em", fontSize: 22, fontWeight: 700 }}>
            TESTGEN
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 6, fontFamily: "var(--font-mono)" }}>
            precision QA engine / v2.0
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: 36,
          boxShadow: "0 0 40px rgba(0,0,0,0.5)",
        }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Access Terminal</div>
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              Authenticate with your Google account to proceed
            </div>
          </div>

          {/* Terminal line */}
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)",
            background: "var(--bg-elevated)", borderRadius: 6, padding: "10px 14px",
            marginBottom: 28, borderLeft: "2px solid var(--accent)",
          }}>
            <span style={{ opacity: 0.5 }}>$ </span>
            auth --provider google --mode oauth2
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div ref={btnRef} />
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", textAlign: "center" }}>
              secure google oauth2 · no passwords stored
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 24, color: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
          testgen © {new Date().getFullYear()} · precision assessment platform
        </div>
      </div>

      {/* Load Google GSI script */}
      <script src="https://accounts.google.com/gsi/client" async defer />
    </div>
  );
}