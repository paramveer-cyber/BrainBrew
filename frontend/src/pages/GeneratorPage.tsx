import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiFetch, adminFetch } from "../lib/api";
import { TopBar, BottomNav, Card, Btn } from "../components/ui";

interface Subject { id: string; name: string; code: string; }
interface Chapter { id: string; name: string; classLevel: string; }
interface Config { easy: number; medium: number; difficult: number; extreme: number; }
type AvailCounts = { easy: number; medium: number; difficult: number; extreme: number };

const DIFF_META = [
  { key: "easy",      label: "Easy",    color: "#22c55e", bg: "rgba(34,197,94,0.1)",   desc: "Recall & recognition" },
  { key: "medium",    label: "Medium",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  desc: "Application & analysis" },
  { key: "difficult", label: "Hard",    color: "#f97316", bg: "rgba(249,115,22,0.1)",  desc: "Synthesis & evaluation" },
  { key: "extreme",   label: "Extreme", color: "#ef4444", bg: "rgba(239,68,68,0.1)",   desc: "Expert-level challenge" },
] as const;

const CLASS_LEVELS = ["6","7","8","9","10"];

// ── Step indicator ─────────────────────────────────────────────────────────────
const Step = ({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: done ? "var(--accent)" : active ? "var(--accent)" : "var(--bg-elevated)",
      border: active || done ? "none" : "2px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: done || active ? "#000" : "var(--text-muted)",
      fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13,
      transition: "all 0.3s",
      boxShadow: active ? "0 0 12px rgba(45,212,191,0.4)" : "none",
    }}>
      {done ? "✓" : n}
    </div>
    <div style={{
      fontSize: 10, fontFamily: "var(--font-mono)", marginTop: 5,
      color: active ? "var(--accent)" : done ? "var(--text-secondary)" : "var(--text-muted)",
      letterSpacing: "0.08em", textAlign: "center",
    }}>{label}</div>
  </div>
);

const StepConnector = ({ done }: { done: boolean }) => (
  <div style={{ flex: 1, height: 2, background: done ? "var(--accent)" : "var(--border)", marginTop: 16, transition: "background 0.3s" }} />
);

const ChipSelect = ({ options, value, onChange }: {
  options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value === value ? "" : o.value)} style={{
        padding: "6px 14px", borderRadius: 999,
        background: value === o.value ? "var(--accent)" : "var(--bg-elevated)",
        color: value === o.value ? "#000" : "var(--text-secondary)",
        border: value === o.value ? "none" : "1px solid var(--border)",
        fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer",
        fontWeight: value === o.value ? 700 : 400, transition: "all 0.18s",
        boxShadow: value === o.value ? "0 0 8px rgba(45,212,191,0.3)" : "none",
      }}>{o.label}</button>
    ))}
  </div>
);

const DiffStepper = ({ value, onChange, color, max = 50, available }: {
  value: number; onChange: (n: number) => void; color: string; max?: number; available?: number;
}) => {
  const atLimit = available !== undefined && value >= available;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => onChange(Math.max(0, value - 1))} style={{
          width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
          background: "var(--bg-elevated)", color: "var(--text-secondary)",
          fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>−</button>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700,
          color: atLimit ? "#ef4444" : color, minWidth: 32, textAlign: "center",
        }}>{value}</span>
        <button onClick={() => { if (!atLimit) onChange(Math.min(max, available !== undefined ? Math.min(available, max) : max, value + 1)); }}
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: `1px solid ${atLimit ? "#ef444444" : "var(--border)"}`,
            background: atLimit ? "rgba(239,68,68,0.05)" : "var(--bg-elevated)",
            color: atLimit ? "#ef4444" : "var(--text-secondary)",
            fontSize: 18, cursor: atLimit ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: atLimit ? 0.5 : 1,
          }}>+</button>
      </div>
      {available !== undefined && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: atLimit ? "#ef4444" : "var(--text-muted)" }}>
          {available} avail.
        </span>
      )}
    </div>
  );
};

export default function GeneratorPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [classLevel, setClassLevel] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterId, setChapterId] = useState("");
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [config, setConfig] = useState<Config>({ easy: 5, medium: 5, difficult: 3, extreme: 2 });
  const [available, setAvailable] = useState<AvailCounts | null>(null);
  const [error, setError] = useState("");

  const total = config.easy + config.medium + config.difficult + config.extreme;
  const step = !classLevel ? 1 : !subjectId ? 2 : !chapterId ? 3 : 4;

  useEffect(() => {
    if (!classLevel) { setSubjects([]); setSubjectId(""); setChapters([]); setChapterId(""); return; }
    setLoadingSubjects(true);
    apiFetch<{ subjects: Subject[] }>("/subjects")
      .then(d => setSubjects(d.subjects))
      .catch(() => setError("Failed to load subjects"))
      .finally(() => setLoadingSubjects(false));
    setSubjectId(""); setChapters([]); setChapterId(""); setAvailable(null);
  }, [classLevel]);

  useEffect(() => {
    if (!subjectId || !classLevel) { setChapters([]); setChapterId(""); return; }
    setLoadingChapters(true);
    apiFetch<{ chapters: Chapter[] }>(`/chapters?subjectId=${subjectId}&classLevel=${classLevel}`)
      .then(d => setChapters(d.chapters))
      .catch(() => {})
      .finally(() => setLoadingChapters(false));
    setChapterId(""); setAvailable(null);
  }, [subjectId, classLevel]);

  // Fetch available counts when chapter changes (using admin endpoint without admin password)
  useEffect(() => {
    if (!chapterId) { setAvailable(null); return; }
    apiFetch<AvailCounts>(`/admin/available?chapterId=${chapterId}`, { admin: false })
      .then(setAvailable)
      .catch(() => {
        // Fallback: no restriction info; server will still validate
        setAvailable(null);
      });
  }, [chapterId]);

  // Clamp config when availability changes
  useEffect(() => {
    if (!available) return;
    setConfig(prev => ({
      easy: Math.min(prev.easy, available.easy),
      medium: Math.min(prev.medium, available.medium),
      difficult: Math.min(prev.difficult, available.difficult),
      extreme: Math.min(prev.extreme, available.extreme),
    }));
  }, [available]);

  const setDiff = (key: keyof Config, val: number) => {
    const max = available ? available[key] : 50;
    setConfig(c => ({ ...c, [key]: Math.min(val, max) }));
  };

  // Validation before navigating
  const handleGenerate = () => {
    if (!subjectId || !chapterId) { setError("Select subject and chapter"); return; }
    if (total === 0) { setError("Set at least 1 question"); return; }
    if (available) {
      const violations = (["easy","medium","difficult","extreme"] as const)
        .filter(k => config[k] > available[k])
        .map(k => `${k}: need ${config[k]}, only ${available[k]} available`);
      if (violations.length) { setError("Not enough questions: " + violations.join("; ")); return; }
    }
    setError("");
    navigate("/processing", { state: { subjectId, chapterId, classLevel, config, total } });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", paddingBottom: 96 }}>
      <TopBar user={user} onLogout={async () => { await logout(); navigate("/login"); }} />

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 16px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 10, letterSpacing: "0.2em", marginBottom: 6 }}>// TEST GENERATOR</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Configure Assessment</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 6 }}>
            Select class, subject, and chapter to build a precision test.
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 28, padding: "0 8px" }}>
          <Step n={1} label="CLASS"   active={step === 1} done={step > 1} />
          <StepConnector done={step > 1} />
          <Step n={2} label="SUBJECT" active={step === 2} done={step > 2} />
          <StepConnector done={step > 2} />
          <Step n={3} label="CHAPTER" active={step === 3} done={step > 3} />
          <StepConnector done={step > 3} />
          <Step n={4} label="CONFIG"  active={step === 4} done={false} />
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid #ef4444",
            borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            color: "#ef4444", fontSize: 13, fontFamily: "var(--font-mono)",
          }}>⚠ {error}</div>
        )}

        {/* Step 1: Class */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", letterSpacing: "0.1em" }}>01 — SELECT CLASS</div>
            {classLevel && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", padding: "2px 10px", borderRadius: 999, border: "1px solid var(--accent)", background: "rgba(45,212,191,0.08)" }}>Class {classLevel}</span>}
          </div>
          <ChipSelect options={CLASS_LEVELS.map(c => ({ value: c, label: `Class ${c}` }))} value={classLevel} onChange={setClassLevel} />
        </Card>

        {/* Step 2: Subject */}
        {classLevel && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", letterSpacing: "0.1em" }}>02 — SELECT SUBJECT</div>
              {subjectId && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", padding: "2px 10px", borderRadius: 999, border: "1px solid var(--accent)", background: "rgba(45,212,191,0.08)" }}>{subjects.find(s => s.id === subjectId)?.name}</span>}
            </div>
            {loadingSubjects
              ? <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: 12 }}>loading subjects...</div>
              : <ChipSelect options={subjects.map(s => ({ value: s.id, label: s.name }))} value={subjectId} onChange={setSubjectId} />
            }
          </Card>
        )}

        {/* Step 3: Chapter */}
        {subjectId && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", letterSpacing: "0.1em" }}>03 — SELECT CHAPTER</div>
              {chapterId && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", padding: "2px 10px", borderRadius: 999, border: "1px solid var(--accent)", background: "rgba(45,212,191,0.08)" }}>✓</span>}
            </div>
            {loadingChapters
              ? <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: 12 }}>loading chapters...</div>
              : chapters.length === 0
                ? <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: 12 }}>No chapters for this class.</div>
                : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {chapters.map(c => (
                      <button key={c.id} onClick={() => setChapterId(c.id === chapterId ? "" : c.id)} style={{
                        padding: "10px 14px", borderRadius: 10, textAlign: "left",
                        background: chapterId === c.id ? "rgba(45,212,191,0.1)" : "var(--bg-elevated)",
                        border: chapterId === c.id ? "1px solid var(--accent)" : "1px solid var(--border)",
                        color: chapterId === c.id ? "var(--accent)" : "var(--text-primary)",
                        cursor: "pointer", fontSize: 13, fontWeight: chapterId === c.id ? 600 : 400,
                        transition: "all 0.18s", display: "flex", alignItems: "center", gap: 10,
                      }}>
                        {chapterId === c.id && <span style={{ fontSize: 11 }}>✓</span>}
                        {c.name}
                      </button>
                    ))}
                  </div>
                )
            }
          </Card>
        )}

        {/* Step 4: Config */}
        {chapterId && (
          <>
            {/* Availability banner */}
            {available && (
              <div style={{
                background: "rgba(45,212,191,0.06)", border: "1px solid var(--border-strong)",
                borderRadius: 10, padding: "10px 14px", marginBottom: 14,
                fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)",
                display: "flex", gap: 12, flexWrap: "wrap",
              }}>
                <span style={{ color: "var(--accent)", fontWeight: 700 }}>AVAILABLE:</span>
                {DIFF_META.map(d => (
                  <span key={d.key} style={{ color: available[d.key] > 0 ? d.color : "var(--text-muted)" }}>
                    {d.label}: {available[d.key]}
                  </span>
                ))}
              </div>
            )}

            <Card style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", letterSpacing: "0.1em", marginBottom: 18 }}>
                04 — DIFFICULTY DISTRIBUTION
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {DIFF_META.map(d => {
                  const avail = available ? available[d.key] : undefined;
                  const isExhausted = avail !== undefined && avail === 0;
                  return (
                    <div key={d.key} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 14px", borderRadius: 10,
                      background: isExhausted ? "rgba(0,0,0,0.2)" : config[d.key] > 0 ? d.bg : "var(--bg-elevated)",
                      border: `1px solid ${isExhausted ? "var(--border)" : config[d.key] > 0 ? d.color + "44" : "var(--border)"}`,
                      opacity: isExhausted ? 0.45 : 1,
                      transition: "all 0.2s",
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: d.color, marginBottom: 2 }}>
                          {d.label}
                          {isExhausted && <span style={{ fontSize: 10, color: "#ef4444", marginLeft: 8 }}>no questions</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.desc}</div>
                      </div>
                      {!isExhausted
                        ? <DiffStepper value={config[d.key]} onChange={v => setDiff(d.key, v)} color={d.color} available={avail} />
                        : <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>—</span>
                      }
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Summary */}
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>TOTAL QUESTIONS</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 800, color: total > 0 ? "var(--accent)" : "var(--text-muted)" }}>{total}</span>
              </div>
              {total > 0 && (
                <>
                  <div style={{ height: 8, borderRadius: 4, overflow: "hidden", display: "flex", gap: 2 }}>
                    {DIFF_META.filter(d => config[d.key] > 0).map(d => (
                      <div key={d.key} style={{ flex: config[d.key], background: d.color, borderRadius: 4, transition: "flex 0.3s" }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                    {DIFF_META.filter(d => config[d.key] > 0).map(d => (
                      <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{config[d.key]} {d.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <Btn onClick={handleGenerate} disabled={total === 0} style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: "0.08em", fontWeight: 700 }}>
              ⚡ GENERATE TEST
            </Btn>
          </>
        )}
      </div>

      <BottomNav current="/generator" />
    </div>
  );
}
