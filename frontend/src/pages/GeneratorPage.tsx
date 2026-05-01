import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiFetch } from "../lib/api";
import { TopBar, BottomNav, Card, Btn } from "../components/ui";

interface Subject { id: string; name: string; code: string; }
interface Chapter { id: string; name: string; classLevel: string; }
interface Config { easy: number; medium: number; difficult: number; extreme: number; }
type AvailCounts = { easy: number; medium: number; difficult: number; extreme: number };

// Per-chapter selection state
interface ChapterEntry {
  chapterId: string;
  weight: number; // 1-100, will be normalized
  available: AvailCounts | null;
}

const DIFF_META = [
  { key: "easy",      label: "Easy",    color: "#22c55e", bg: "rgba(34,197,94,0.1)",   desc: "Recall & recognition" },
  { key: "medium",    label: "Medium",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  desc: "Application & analysis" },
  { key: "difficult", label: "Hard",    color: "#f97316", bg: "rgba(249,115,22,0.1)",  desc: "Synthesis & evaluation" },
  { key: "extreme",   label: "Extreme", color: "#ef4444", bg: "rgba(239,68,68,0.1)",   desc: "Expert-level challenge" },
] as const;

const CLASS_LEVELS = ["6","7","8","9","10"];

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

// ── Weight slider for a chapter entry ────────────────────────────────────────
const WeightSlider = ({ value, onChange, chapterName, totalWeight, available, onRemove }: {
  value: number;
  onChange: (v: number) => void;
  chapterName: string;
  totalWeight: number;
  available: AvailCounts | null;
  onRemove: () => void;
}) => {
  const pct = totalWeight > 0 ? Math.round((value / totalWeight) * 100) : 0;
  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--accent)44",
      borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--accent)" }}>✓</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{chapterName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
            color: "var(--accent)", minWidth: 38, textAlign: "right",
          }}>{pct}%</span>
          <button onClick={onRemove} style={{
            width: 22, height: 22, borderRadius: 6, border: "1px solid var(--border)",
            background: "rgba(239,68,68,0.08)", color: "#ef4444",
            fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}>×</button>
        </div>
      </div>

      {/* Weight input */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", minWidth: 48 }}>WEIGHT</span>
        <input
          type="range" min={1} max={100} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: "var(--accent)", height: 4 }}
        />
        <input
          type="number" min={1} max={100} value={value}
          onChange={e => onChange(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
          style={{
            width: 42, padding: "3px 6px", borderRadius: 6,
            border: "1px solid var(--border)", background: "var(--bg-base)",
            color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: 12,
            textAlign: "center",
          }}
        />
      </div>

      {/* Available counts pill row */}
      {available && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DIFF_META.map(d => (
            <span key={d.key} style={{
              fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 7px",
              borderRadius: 4, background: "var(--bg-base)",
              border: `1px solid ${d.color}44`, color: available[d.key] > 0 ? d.color : "var(--text-muted)",
            }}>
              {d.label[0]}: {available[d.key]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Compute effective per-difficulty available counts across all selected chapters ──
function mergedAvailable(entries: ChapterEntry[]): AvailCounts | null {
  if (entries.length === 0 || entries.some(e => e.available === null)) return null;
  return {
    easy:      entries.reduce((s, e) => s + (e.available?.easy ?? 0), 0),
    medium:    entries.reduce((s, e) => s + (e.available?.medium ?? 0), 0),
    difficult: entries.reduce((s, e) => s + (e.available?.difficult ?? 0), 0),
    extreme:   entries.reduce((s, e) => s + (e.available?.extreme ?? 0), 0),
  };
}

export default function GeneratorPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [classLevel, setClassLevel] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Multi-chapter selection
  const [chapterEntries, setChapterEntries] = useState<ChapterEntry[]>([]);

  const [config, setConfig] = useState<Config>({ easy: 5, medium: 5, difficult: 3, extreme: 2 });
  const [error, setError] = useState("");

  const totalWeight = chapterEntries.reduce((s, e) => s + e.weight, 0);
  const merged = mergedAvailable(chapterEntries);
  const total = config.easy + config.medium + config.difficult + config.extreme;
  const step = !classLevel ? 1 : !subjectId ? 2 : chapterEntries.length === 0 ? 3 : 4;

  useEffect(() => {
    if (!classLevel) { setSubjects([]); setSubjectId(""); setChapters([]); setChapterEntries([]); return; }
    setLoadingSubjects(true);
    apiFetch<{ subjects: Subject[] }>("/subjects")
      .then(d => setSubjects(d.subjects))
      .catch(() => setError("Failed to load subjects"))
      .finally(() => setLoadingSubjects(false));
    setSubjectId(""); setChapters([]); setChapterEntries([]);
  }, [classLevel]);

  useEffect(() => {
    if (!subjectId || !classLevel) { setChapters([]); setChapterEntries([]); return; }
    setLoadingChapters(true);
    apiFetch<{ chapters: Chapter[] }>(`/chapters?subjectId=${subjectId}&classLevel=${classLevel}`)
      .then(d => setChapters(d.chapters))
      .catch(() => {})
      .finally(() => setLoadingChapters(false));
    setChapterEntries([]);
  }, [subjectId, classLevel]);

  // Fetch available counts for a chapter and add/update entry
  const toggleChapter = useCallback(async (chId: string) => {
    const exists = chapterEntries.find(e => e.chapterId === chId);
    if (exists) {
      setChapterEntries(prev => prev.filter(e => e.chapterId !== chId));
      return;
    }
    // Add with default weight=10, available=null (fetch async)
    setChapterEntries(prev => [...prev, { chapterId: chId, weight: 10, available: null }]);
    try {
      const avail = await apiFetch<AvailCounts>(`/admin/available?chapterId=${chId}`, { admin: false });
      setChapterEntries(prev => prev.map(e => e.chapterId === chId ? { ...e, available: avail } : e));
    } catch {
      // leave available: null — server still validates
    }
  }, [chapterEntries]);

  const updateWeight = (chId: string, w: number) => {
    setChapterEntries(prev => prev.map(e => e.chapterId === chId ? { ...e, weight: w } : e));
  };

  const removeChapter = (chId: string) => {
    setChapterEntries(prev => prev.filter(e => e.chapterId !== chId));
  };

  // Clamp config when merged availability changes
  useEffect(() => {
    if (!merged) return;
    setConfig(prev => ({
      easy:      Math.min(prev.easy, merged.easy),
      medium:    Math.min(prev.medium, merged.medium),
      difficult: Math.min(prev.difficult, merged.difficult),
      extreme:   Math.min(prev.extreme, merged.extreme),
    }));
  }, [merged?.easy, merged?.medium, merged?.difficult, merged?.extreme]);

  const setDiff = (key: keyof Config, val: number) => {
    const max = merged ? merged[key] : 50;
    setConfig(c => ({ ...c, [key]: Math.min(val, max) }));
  };

  const handleGenerate = () => {
    if (!subjectId || chapterEntries.length === 0) { setError("Select subject and at least one chapter"); return; }
    if (total === 0) { setError("Set at least 1 question"); return; }
    if (merged) {
      const violations = (["easy","medium","difficult","extreme"] as const)
        .filter(k => config[k] > merged[k])
        .map(k => `${k}: need ${config[k]}, only ${merged[k]} available`);
      if (violations.length) { setError("Not enough questions: " + violations.join("; ")); return; }
    }
    setError("");

    // Build per-chapter question distributions based on weight
    const chaptersPayload = chapterEntries.map(e => {
      const ratio = totalWeight > 0 ? e.weight / totalWeight : 1 / chapterEntries.length;
      return {
        chapterId: e.chapterId,
        weight: e.weight,
        config: {
          easy:      Math.round(config.easy * ratio),
          medium:    Math.round(config.medium * ratio),
          difficult: Math.round(config.difficult * ratio),
          extreme:   Math.round(config.extreme * ratio),
        },
      };
    });

    // Distribute rounding remainder to first chapter
    const diffKeys = ["easy","medium","difficult","extreme"] as const;
    for (const k of diffKeys) {
      const distributed = chaptersPayload.reduce((s, c) => s + c.config[k], 0);
      const remainder = config[k] - distributed;
      if (remainder !== 0 && chaptersPayload.length > 0) {
        chaptersPayload[0].config[k] = Math.max(0, chaptersPayload[0].config[k] + remainder);
      }
    }

    navigate("/processing", {
      state: {
        subjectId,
        classLevel,
        config,
        total,
        // multi-chapter mode
        chapters: chaptersPayload,
        // legacy single-chapter compat (first chapter)
        chapterId: chapterEntries[0]?.chapterId,
      },
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", paddingBottom: 96 }}>
      <TopBar user={user} onLogout={async () => { await logout(); navigate("/login"); }} />

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 16px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 10, letterSpacing: "0.2em", marginBottom: 6 }}>// TEST GENERATOR</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Configure Assessment</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 6 }}>
            Select class, subject, and one or more chapters. Assign weightages to control question distribution.
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 28, padding: "0 8px" }}>
          <Step n={1} label="CLASS"   active={step === 1} done={step > 1} />
          <StepConnector done={step > 1} />
          <Step n={2} label="SUBJECT" active={step === 2} done={step > 2} />
          <StepConnector done={step > 2} />
          <Step n={3} label="CHAPTERS" active={step === 3} done={step > 3} />
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

        {/* Step 3: Chapters (multi-select with weightage) */}
        {subjectId && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", letterSpacing: "0.1em" }}>03 — SELECT CHAPTERS & WEIGHTAGE</div>
              {chapterEntries.length > 0 && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", padding: "2px 10px", borderRadius: 999, border: "1px solid var(--accent)", background: "rgba(45,212,191,0.08)" }}>
                  {chapterEntries.length} selected
                </span>
              )}
            </div>

            {loadingChapters
              ? <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: 12 }}>loading chapters...</div>
              : chapters.length === 0
                ? <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: 12 }}>No chapters for this class.</div>
                : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* Chapter toggle list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                      {chapters.map(c => {
                        const selected = chapterEntries.some(e => e.chapterId === c.id);
                        return (
                          <button key={c.id} onClick={() => toggleChapter(c.id)} style={{
                            padding: "10px 14px", borderRadius: 10, textAlign: "left",
                            background: selected ? "rgba(45,212,191,0.1)" : "var(--bg-elevated)",
                            border: selected ? "1px solid var(--accent)" : "1px solid var(--border)",
                            color: selected ? "var(--accent)" : "var(--text-primary)",
                            cursor: "pointer", fontSize: 13, fontWeight: selected ? 600 : 400,
                            transition: "all 0.18s", display: "flex", alignItems: "center", gap: 10,
                          }}>
                            <span style={{
                              width: 16, height: 16, borderRadius: 4,
                              border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                              background: selected ? "var(--accent)" : "transparent",
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, color: "#000", flexShrink: 0, transition: "all 0.15s",
                            }}>
                              {selected && "✓"}
                            </span>
                            {c.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* Weightage sliders for selected chapters */}
                    {chapterEntries.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 4 }}>
                          WEIGHT DISTRIBUTION — adjust sliders to control question share per chapter
                        </div>
                        {/* Visual weight bar */}
                        <div style={{ height: 6, borderRadius: 3, overflow: "hidden", display: "flex", gap: 2, marginBottom: 8 }}>
                          {chapterEntries.map((e, i) => {
                            const hues = ["#2dd4bf","#818cf8","#f59e0b","#f97316","#22c55e","#ec4899"];
                            const color = hues[i % hues.length];
                            return (
                              <div key={e.chapterId} style={{
                                flex: e.weight, background: color, borderRadius: 3,
                                transition: "flex 0.3s",
                              }} />
                            );
                          })}
                        </div>
                        {chapterEntries.map((e, i) => {
                          const chName = chapters.find(c => c.id === e.chapterId)?.name ?? e.chapterId;
                          return (
                            <WeightSlider
                              key={e.chapterId}
                              value={e.weight}
                              onChange={w => updateWeight(e.chapterId, w)}
                              chapterName={chName}
                              totalWeight={totalWeight}
                              available={e.available}
                              onRemove={() => removeChapter(e.chapterId)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
            }
          </Card>
        )}

        {/* Step 4: Config */}
        {chapterEntries.length > 0 && (
          <>
            {/* Merged availability banner */}
            {merged && (
              <div style={{
                background: "rgba(45,212,191,0.06)", border: "1px solid var(--border-strong)",
                borderRadius: 10, padding: "10px 14px", marginBottom: 14,
                fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)",
                display: "flex", gap: 12, flexWrap: "wrap",
              }}>
                <span style={{ color: "var(--accent)", fontWeight: 700 }}>AVAILABLE (all chapters):</span>
                {DIFF_META.map(d => (
                  <span key={d.key} style={{ color: merged[d.key] > 0 ? d.color : "var(--text-muted)" }}>
                    {d.label}: {merged[d.key]}
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
                  const avail = merged ? merged[d.key] : undefined;
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
              {total > 0 && chapterEntries.length > 1 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginBottom: 6, letterSpacing: "0.08em" }}>CHAPTER BREAKDOWN (approx.)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {chapterEntries.map((e, i) => {
                      const hues = ["#2dd4bf","#818cf8","#f59e0b","#f97316","#22c55e","#ec4899"];
                      const color = hues[i % hues.length];
                      const pct = totalWeight > 0 ? Math.round((e.weight / totalWeight) * 100) : 0;
                      const approxQ = Math.round(total * e.weight / totalWeight);
                      const chName = chapters.find(c => c.id === e.chapterId)?.name ?? "Chapter";
                      return (
                        <div key={e.chapterId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chName}</span>
                          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color, flexShrink: 0 }}>~{approxQ}q ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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