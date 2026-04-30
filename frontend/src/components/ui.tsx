import React, { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

// ── TopBar ──────────────────────────────────────────────────────────────────
export const TopBar = ({ user, onLogout }: { user: any; onLogout: () => void }) => (
  <header style={{
    background: "var(--bg-surface)", borderBottom: "1px solid var(--border)",
    padding: "0 20px", height: 56, display: "flex", alignItems: "center",
    justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
    backdropFilter: "blur(12px)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 30, height: 30, background: "var(--accent)", borderRadius: 7,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 12, color: "#000",
        boxShadow: "0 0 8px rgba(45,212,191,0.3)",
      }}>TG</div>
      <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "0.06em" }}>TESTGEN</span>
    </div>
    {user && (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {user.avatarUrl && (
          <img src={user.avatarUrl} alt="" style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "1.5px solid var(--border-strong)",
          }} />
        )}
        <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "none" }}
          className="sm-show">{user.name}</span>
        <button onClick={onLogout} style={{
          background: "none", border: "1px solid var(--border)", color: "var(--text-muted)",
          padding: "4px 12px", borderRadius: "var(--radius)", fontSize: 12,
          transition: "all 0.2s", fontFamily: "var(--font-mono)",
        }}
          onMouseEnter={e => {
            (e.currentTarget).style.borderColor = "var(--danger)";
            (e.currentTarget).style.color = "var(--danger)";
          }}
          onMouseLeave={e => {
            (e.currentTarget).style.borderColor = "var(--border)";
            (e.currentTarget).style.color = "var(--text-muted)";
          }}
        >logout</button>
      </div>
    )}
  </header>
);

// ── BottomNav ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { path: "/home",      label: "Home",     icon: "⌂"  },
  { path: "/generator", label: "Generate", icon: "⚡" },
  { path: "/results",   label: "Results",  icon: "📋" },
  { path: "/admin",     label: "Admin",    icon: "◈"  },
];

export const BottomNav = ({ current }: { current: string }) => {
  const navigate = useNavigate();
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "var(--bg-surface)", borderTop: "1px solid var(--border)",
      display: "flex", zIndex: 100, padding: "8px 0 max(12px, env(safe-area-inset-bottom))",
      backdropFilter: "blur(12px)",
    }}>
      {NAV_ITEMS.map(item => {
        const active = current.startsWith(item.path);
        return (
          <button key={item.path} onClick={() => navigate(item.path)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            gap: 3, color: active ? "var(--accent)" : "var(--text-muted)", fontSize: 11,
            background: "none", border: "none", cursor: "pointer", transition: "color 0.2s",
            padding: "4px 0",
          }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.03em", fontSize: 10 }}>{item.label}</span>
            {active && <div style={{ width: 20, height: 2, background: "var(--accent)", borderRadius: 1, marginTop: 1 }} />}
          </button>
        );
      })}
    </nav>
  );
};

// ── Card ────────────────────────────────────────────────────────────────────
export const Card = ({ children, style }: { children: ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)", padding: "18px 16px", ...style,
  }}>{children}</div>
);

// ── DiffBadge ───────────────────────────────────────────────────────────────
const DIFF_COLORS: Record<string, string> = {
  easy: "#22c55e", medium: "#f59e0b", difficult: "#f97316", extreme: "#ef4444",
};
export const DiffBadge = ({ level }: { level: string }) => (
  <span style={{
    background: (DIFF_COLORS[level] || "#8b9ab5") + "22",
    color: DIFF_COLORS[level] || "var(--text-muted)",
    border: `1px solid ${(DIFF_COLORS[level] || "#8b9ab5")}44`,
    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
    padding: "2px 8px", borderRadius: 999, letterSpacing: "0.06em",
    textTransform: "uppercase",
  }}>{level}</span>
);

// ── Button ──────────────────────────────────────────────────────────────────
export const Btn = ({
  children, onClick, variant = "primary", disabled = false, style, type = "button"
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger";
  disabled?: boolean; style?: React.CSSProperties; type?: "button" | "submit";
}) => {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--accent)", color: "#000", border: "none", fontWeight: 700,
      boxShadow: "0 0 16px rgba(45,212,191,0.25)",
    },
    ghost: {
      background: "rgba(45,212,191,0.06)", color: "var(--accent)",
      border: "1px solid var(--border-strong)",
    },
    danger: { background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid #ef444444" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      padding: "10px 20px", borderRadius: "var(--radius)", fontSize: 14,
      fontFamily: "var(--font-sans)", transition: "all 0.2s", letterSpacing: "0.03em",
      opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer",
      ...styles[variant], ...style,
    }}>{children}</button>
  );
};

// ── Select ──────────────────────────────────────────────────────────────────
export const Select = ({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{
      fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)",
      letterSpacing: "0.1em", textTransform: "uppercase",
    }}>{label}</label>
    <select
      value={value} onChange={e => onChange(e.target.value)}
      style={{
        background: "var(--bg-elevated)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", color: value ? "var(--text-primary)" : "var(--text-muted)",
        padding: "10px 36px 10px 14px",
        fontSize: 14, outline: "none", appearance: "none", cursor: "pointer",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' viewBox='0 0 12 7'%3E%3Cpath fill='none' stroke='%232dd4bf' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
        transition: "border-color 0.2s",
      }}
      onFocus={e => (e.target.style.borderColor = "var(--accent)")}
      onBlur={e => (e.target.style.borderColor = "var(--border)")}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ── NumInput ─────────────────────────────────────────────────────────────────
export const NumInput = ({ label, value, onChange, color, max }: {
  label: string; value: number; onChange: (v: number) => void; color?: string; max?: number;
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{
      fontSize: 10, fontFamily: "var(--font-mono)",
      color: color || "var(--text-secondary)", letterSpacing: "0.08em",
    }}>{label}</label>
    <input
      type="number" min={0} max={max || 50} value={value}
      onChange={e => onChange(Math.max(0, Number(e.target.value)))}
      style={{
        background: "var(--bg-elevated)",
        border: `1px solid ${color ? color + "44" : "var(--border)"}`,
        borderRadius: "var(--radius)", color: color || "var(--text-primary)",
        padding: "10px 14px", fontSize: 20, fontFamily: "var(--font-mono)",
        fontWeight: 600, outline: "none", width: "100%", textAlign: "center",
        transition: "border-color 0.2s",
      }}
    />
  </div>
);

// ── ProgressBar ──────────────────────────────────────────────────────────────
export const ProgressBar = ({ pct, label, color }: { pct: number; label?: string; color?: string }) => (
  <div>
    {label && (
      <div style={{
        fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: 6,
      }}>{label}</div>
    )}
    <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 6, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${Math.min(100, pct)}%`,
        background: color || "var(--accent)",
        borderRadius: 4, transition: "width 0.4s ease",
        boxShadow: `0 0 8px ${color ? color + "88" : "var(--accent-glow)"}`,
      }} />
    </div>
  </div>
);

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = () => (
  <div style={{
    width: 20, height: 20, border: "2px solid var(--border)",
    borderTopColor: "var(--accent)", borderRadius: "50%",
    animation: "spin 0.7s linear infinite", display: "inline-block",
  }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);
