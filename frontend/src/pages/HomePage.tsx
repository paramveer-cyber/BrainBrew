import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiFetch } from "../lib/api";
import { TopBar, BottomNav, Card } from "../components/ui";

interface Stats {
  totalQuestions: number;
  totalTests: number;
  uniqueUsers: number;
  byDifficulty: { difficulty: string; count: string }[];
}

const FEATURES = [
  { icon: "⚡", title: "Precision Selection", desc: "Choose exact counts per difficulty tier — no rounding, no averaging." },
  { icon: "◈", title: "Smart Randomization", desc: "Engine pulls unique questions from your bank every time." },
  { icon: "📋", title: "Dual PDF Export", desc: "Generate test paper + solution key in one click." },
  { icon: "◉", title: "Admin Dashboard", desc: "Monitor question bank health and recent activity in real-time." },
];

const DIFF_COLORS: Record<string, string> = {
  easy: "var(--easy)", medium: "var(--medium)", difficult: "var(--difficult)", extreme: "var(--extreme)"
};

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiFetch<Stats>("/stats").then(setStats).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", paddingBottom: 80 }}>
      <TopBar user={user} onLogout={async () => { await logout(); navigate("/login"); }} />

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)",
          border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
          padding: "32px 24px", marginBottom: 24, position: "relative", overflow: "hidden",
        }}>
          {/* BG pattern */}
          <div style={{
            position: "absolute", right: -20, top: -20, width: 180, height: 180,
            background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 11, letterSpacing: "0.2em", marginBottom: 12 }}>
            // PRECISION QA ENGINE
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginBottom: 12 }}>
            Build Tests with<br />
            <span style={{ color: "var(--accent)" }}>Surgical Accuracy</span>
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24, maxWidth: 380 }}>
            Define exact question counts per difficulty. Export professional test papers and solution keys in seconds.
          </div>
          <button
            onClick={() => navigate("/generator")}
            style={{
              background: "var(--accent)", color: "#000", border: "none",
              padding: "12px 24px", borderRadius: "var(--radius)", fontWeight: 700,
              fontSize: 14, fontFamily: "var(--font-sans)", cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            ⚡ Launch Generator
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Questions", value: stats.totalQuestions.toLocaleString() },
              { label: "Tests Run", value: stats.totalTests.toLocaleString() },
              { label: "Users", value: stats.uniqueUsers.toLocaleString() },
            ].map(s => (
              <Card key={s.label} style={{ textAlign: "center", padding: "16px 8px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                  {s.label}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Difficulty distribution */}
        {stats?.byDifficulty && stats.byDifficulty.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: 14, letterSpacing: "0.1em" }}>
              QUESTION BANK — DISTRIBUTION
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.byDifficulty.map(d => {
                const total = stats.byDifficulty.reduce((a, x) => a + Number(x.count), 0);
                const pct = total ? Math.round((Number(d.count) / total) * 100) : 0;
                return (
                  <div key={d.difficulty}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: DIFF_COLORS[d.difficulty] || "var(--text-secondary)", textTransform: "uppercase" }}>
                        {d.difficulty}
                      </span>
                      <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                        {Number(d.count).toLocaleString()} · {pct}%
                      </span>
                    </div>
                    <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 5, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${pct}%`,
                        background: DIFF_COLORS[d.difficulty] || "var(--accent)",
                        borderRadius: 4, transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Features */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {FEATURES.map(f => (
            <Card key={f.title} style={{ padding: 16 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{f.desc}</div>
            </Card>
          ))}
        </div>

        {/* Quick actions */}
        <Card>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: 14, letterSpacing: "0.1em" }}>
            QUICK ACTIONS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "→ Open Generator", path: "/generator", accent: true },
              { label: "→ View My Tests", path: "/results", accent: false },
              { label: "→ Admin Dashboard", path: "/admin", accent: false },
            ].map(a => (
              <button key={a.path} onClick={() => navigate(a.path)} style={{
                background: a.accent ? "var(--accent-dim)" : "var(--bg-elevated)",
                border: `1px solid ${a.accent ? "var(--border-strong)" : "var(--border)"}`,
                color: a.accent ? "var(--accent)" : "var(--text-secondary)",
                padding: "12px 16px", borderRadius: "var(--radius)",
                fontFamily: "var(--font-mono)", fontSize: 13, textAlign: "left",
                cursor: "pointer", transition: "all 0.2s",
              }}>
                {a.label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <BottomNav current="/home" />
    </div>
  );
}