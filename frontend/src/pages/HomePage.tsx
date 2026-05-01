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

      {/* ── Desktop: two-column layout ── */}
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "32px 24px",
        display: "grid",
        gridTemplateColumns: "1fr",
      }} className="home-grid">
        <style>{`
          @media (min-width: 900px) {
            .home-grid { grid-template-columns: 1fr 340px !important; gap: 32px; align-items: start; }
            .home-sidebar { display: flex !important; }
          }
          @media (max-width: 899px) {
            .home-sidebar { display: none !important; }
          }
        `}</style>

        {/* ── Left column / main ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Hero */}
          <div style={{
            background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)",
            border: "1px solid var(--border)", borderRadius: 16,
            padding: "40px 32px", position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", right: -30, top: -30, width: 240, height: 240,
              background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", left: -60, bottom: -60, width: 200, height: 200,
              background: "radial-gradient(circle, rgba(45,212,191,0.05) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 11, letterSpacing: "0.2em", marginBottom: 14 }}>
              // PRECISION QA ENGINE
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.15, marginBottom: 14 }}>
              Build Tests with<br />
              <span style={{ color: "var(--accent)" }}>Surgical Accuracy</span>
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 28, maxWidth: 480, lineHeight: 1.7 }}>
              Define exact question counts per difficulty. Export professional test papers and solution keys in seconds.
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/generator")}
                style={{
                  background: "var(--accent)", color: "#000", border: "none",
                  padding: "13px 28px", borderRadius: "var(--radius)", fontWeight: 700,
                  fontSize: 14, fontFamily: "var(--font-sans)", cursor: "pointer",
                  letterSpacing: "0.05em", boxShadow: "0 0 20px rgba(45,212,191,0.3)",
                }}
              >
                ⚡ Launch Generator
              </button>
              <button
                onClick={() => navigate("/results")}
                style={{
                  background: "var(--accent-dim)", color: "var(--accent)",
                  border: "1px solid var(--border-strong)",
                  padding: "13px 24px", borderRadius: "var(--radius)", fontWeight: 600,
                  fontSize: 14, fontFamily: "var(--font-sans)", cursor: "pointer",
                }}
              >
                View My Tests
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "Questions", value: stats.totalQuestions.toLocaleString() },
                { label: "Tests Run", value: stats.totalTests.toLocaleString() },
                { label: "Users", value: stats.uniqueUsers.toLocaleString() },
              ].map(s => (
                <Card key={s.label} style={{ textAlign: "center", padding: "20px 8px" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 6, letterSpacing: "0.1em" }}>
                    {s.label.toUpperCase()}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Features grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {FEATURES.map(f => (
              <Card key={f.title} style={{ padding: "20px 18px" }}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{f.desc}</div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Right sidebar (desktop only) ── */}
        <aside className="home-sidebar" style={{ display: "none", flexDirection: "column", gap: 16 }}>

          {/* Difficulty distribution */}
          {stats?.byDifficulty && stats.byDifficulty.length > 0 && (
            <Card>
              <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: 16, letterSpacing: "0.12em" }}>
                QUESTION BANK — DISTRIBUTION
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {stats.byDifficulty.map(d => {
                  const total = stats.byDifficulty.reduce((a, x) => a + Number(x.count), 0);
                  const pct = total ? Math.round((Number(d.count) / total) * 100) : 0;
                  return (
                    <div key={d.difficulty}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: DIFF_COLORS[d.difficulty] || "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {d.difficulty}
                        </span>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
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

          {/* Mobile: distribution inline */}
          {stats?.byDifficulty && stats.byDifficulty.length > 0 && (
            <div className="mobile-dist" style={{}}>
              <style>{`.mobile-dist { display: block; } @media (min-width: 900px) { .mobile-dist { display: none !important; } }`}</style>
              <Card>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: 14, letterSpacing: "0.1em" }}>
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
            </div>
          )}

          {/* Quick actions */}
          <Card>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: 14, letterSpacing: "0.1em" }}>
              QUICK ACTIONS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "→ Open Generator", path: "/generator", accent: true },
                { label: "→ View My Tests", path: "/results", accent: false },
                { label: "→ Admin Dashboard", path: "/admin", accent: false },
              ].map(a => (
                <button key={a.path} onClick={() => navigate(a.path)} style={{
                  background: a.accent ? "var(--accent-dim)" : "var(--bg-elevated)",
                  border: `1px solid ${a.accent ? "var(--border-strong)" : "var(--border)"}`,
                  color: a.accent ? "var(--accent)" : "var(--text-secondary)",
                  padding: "11px 16px", borderRadius: "var(--radius)",
                  fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "left",
                  cursor: "pointer", transition: "all 0.2s",
                }}>
                  {a.label}
                </button>
              ))}
            </div>
          </Card>
        </aside>
      </div>

      <BottomNav current="/home" />
    </div>
  );
}
