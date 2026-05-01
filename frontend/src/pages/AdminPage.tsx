import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { adminFetch, setAdminPassword, getAdminPassword, clearAdminSession } from "../lib/api";
import { TopBar, BottomNav, Card, Btn, DiffBadge } from "../components/ui";

// ── Types ────────────────────────────────────────────────────────────────────
interface Subject { id: string; name: string; code: string; questionCount: number; chapterCount: number; }
interface Chapter { id: string; name: string; classLevel: string; subjectId: string; subjectName?: string; questionCount: number; }
interface Question {
  id: string; chapterId: string; subjectId: string; difficulty: string;
  questionText: string; options?: string[]; answer: string; explanation?: string; marks: number;
}
interface Stats {
  totalQuestions: number; totalTests: number; uniqueUsers: number;
  byDifficulty: { difficulty: string; count: number }[];
  bySubject: { id: string; name: string; code: string; questionCount: number; chapterCount: number }[];
  recentTests: { id: string; title: string; config: Record<string, number>; createdAt: string }[];
}

const DIFFS = ["easy", "medium", "difficult", "extreme"] as const;
const DIFF_COLOR: Record<string, string> = { easy: "#22c55e", medium: "#f59e0b", difficult: "#f97316", extreme: "#ef4444" };
const CLASS_LEVELS = ["6", "7", "8", "9", "10", "11", "12"];

// ── Micro-components ──────────────────────────────────────────────────────────
const Tag = ({ children, color = "var(--accent)" }: { children: React.ReactNode; color?: string }) => (
  <span style={{
    background: color + "22", color, border: `1px solid ${color}44`,
    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
    padding: "2px 8px", borderRadius: 999, letterSpacing: "0.06em",
    textTransform: "uppercase" as const, whiteSpace: "nowrap" as const,
  }}>{children}</span>
);

const SectionHeader = ({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
    <div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.18em", marginBottom: 4 }}>
        // ADMIN
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{title}</h2>
      {sub && <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>{sub}</p>}
    </div>
    {action}
  </div>
);

const EmptyState = ({ msg }: { msg: string }) => (
  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
    {msg}
  </div>
);

const Loader = ({ msg = "loading..." }: { msg?: string }) => (
  <div style={{ textAlign: "center", padding: "32px", color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
    {msg}
  </div>
);

const ErrBox = ({ msg }: { msg: string }) => (
  <div style={{
    background: "rgba(239,68,68,0.08)", border: "1px solid #ef444455",
    borderRadius: 10, padding: "10px 14px", color: "#ef4444",
    fontSize: 13, fontFamily: "var(--font-mono)", marginBottom: 14,
  }}>⚠ {msg}</div>
);

// ── Filter row ─────────────────────────────────────────────────────────────────
const filterSelectStyle: React.CSSProperties = {
  background: "var(--bg-elevated)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text-primary)", padding: "8px 14px",
  fontSize: 13, outline: "none", cursor: "pointer", fontFamily: "inherit",
};

// ── Modal shell ───────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 999,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    backdropFilter: "blur(4px)",
  }} onClick={onClose}>
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-strong)",
      borderRadius: 16, padding: "24px 24px 20px", width: "100%", maxWidth: 540,
      maxHeight: "90vh", overflowY: "auto",
      boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
    }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{
          background: "none", border: "1px solid var(--border)", color: "var(--text-muted)",
          width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16,
        }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

// ── Form helpers ──────────────────────────────────────────────────────────────
const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
    <label style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  background: "var(--bg-elevated)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text-primary)", padding: "10px 14px",
  fontSize: 14, outline: "none", width: "100%", fontFamily: "inherit",
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

// ── Password gate ─────────────────────────────────────────────────────────────
function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (!pw.trim()) return;
    setLoading(true); setErr("");
    setAdminPassword(pw);
    try {
      await adminFetch("/check");
      onSuccess();
    } catch {
      setAdminPassword(null);
      setErr("Incorrect admin password.");
      setPw("");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <Card style={{ width: "100%", maxWidth: 400, padding: "32px 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, background: "var(--accent)", borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, margin: "0 auto 16px", boxShadow: "0 0 24px rgba(45,212,191,0.35)",
          }}>🔐</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Admin Access</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Enter the admin password to continue.</p>
        </div>
        {err && <ErrBox msg={err} />}
        <FormField label="Password">
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && verify()}
            style={inputStyle} placeholder="••••••••"
            autoFocus
          />
        </FormField>
        <Btn onClick={verify} disabled={loading || !pw.trim()} style={{ width: "100%" }}>
          {loading ? "Verifying..." : "Enter Admin Panel"}
        </Btn>
      </Card>
    </div>
  );
}

// ── Sidebar tabs ──────────────────────────────────────────────────────────────
type Tab = "dashboard" | "subjects" | "chapters" | "questions";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "subjects",  label: "Subjects",  icon: "📚" },
  { id: "chapters",  label: "Chapters",  icon: "📖" },
  { id: "questions", label: "Questions", icon: "❓" },
];

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    adminFetch<Stats>("/stats")
      .then(setStats)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalDiff = stats?.byDifficulty.reduce((a, x) => a + x.count, 0) ?? 0;

  if (loading) return <Loader />;
  if (err) return <ErrBox msg={err} />;
  if (!stats) return null;

  return (
    <div>
      <SectionHeader title="Dashboard" sub="Platform health at a glance." />

      {/* Status bar */}
      <div style={{
        background: "rgba(104,211,145,0.08)", border: "1px solid rgba(104,211,145,0.2)",
        borderRadius: 10, padding: "10px 14px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 6px var(--success)", flexShrink: 0 }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--success)" }}>ALL SYSTEMS OPERATIONAL</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Questions", value: stats.totalQuestions, accent: true },
          { label: "Tests Generated", value: stats.totalTests },
          { label: "Unique Users", value: stats.uniqueUsers },
        ].map(s => (
          <Card key={s.label} style={{ padding: "18px 16px" }}>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-mono)", color: s.accent ? "var(--accent)" : "var(--text-primary)", lineHeight: 1 }}>
              {s.value.toLocaleString()}
            </div>
          </Card>
        ))}
      </div>

      {/* Difficulty breakdown */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: 16, letterSpacing: "0.1em" }}>QUESTION BANK — BY DIFFICULTY</div>
        {stats.byDifficulty.length === 0
          ? <EmptyState msg="no questions yet" />
          : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {DIFFS.map(d => {
                const row = stats.byDifficulty.find(r => r.difficulty === d);
                const cnt = row?.count ?? 0;
                const pct = totalDiff ? Math.round((cnt / totalDiff) * 100) : 0;
                return (
                  <div key={d}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <DiffBadge level={d} />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: DIFF_COLOR[d] }}>{cnt} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: DIFF_COLOR[d], borderRadius: 4, transition: "width 0.6s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </Card>

      {/* Subject breakdown */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: 16, letterSpacing: "0.1em" }}>BY SUBJECT</div>
        {stats.bySubject.length === 0
          ? <EmptyState msg="no subjects yet" />
          : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.bySubject.map(s => (
                <div key={s.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "var(--bg-elevated)", borderRadius: 8, padding: "10px 12px",
                  border: "1px solid var(--border)",
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                    <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{s.code}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Tag>{s.chapterCount} chapters</Tag>
                    <Tag color="var(--text-secondary)">{s.questionCount} q</Tag>
                  </div>
                </div>
              ))}
            </div>
        }
      </Card>

      {/* Recent tests */}
      {stats.recentTests.length > 0 && (
        <Card>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: 16, letterSpacing: "0.1em" }}>RECENT TESTS — LAST 10</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.recentTests.map(t => (
              <div key={t.id} style={{ background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)", padding: "10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5 }}>{t.title}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {Object.entries(t.config).filter(([, v]) => v > 0).map(([k, v]) => (
                    <span key={k} style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "var(--bg-card)", border: "1px solid var(--border)", color: DIFF_COLOR[k] || "var(--text-muted)" }}>
                      {v}{k[0].toUpperCase()}
                    </span>
                  ))}
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {new Date(t.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Subjects Tab ──────────────────────────────────────────────────────────────
function SubjectsTab({ refreshKey }: { refreshKey: number }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterClass, setFilterClass] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: "", code: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sd, cd] = await Promise.all([
        adminFetch<{ subjects: Subject[] }>("/subjects"),
        adminFetch<{ chapters: Chapter[] }>("/chapters"),
      ]);
      setSubjects(sd.subjects);
      setChapters(cd.chapters);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const openAdd = () => { setForm({ name: "", code: "" }); setEditing(null); setFormErr(""); setModal("add"); };
  const openEdit = (s: Subject) => { setForm({ name: s.name, code: s.code }); setEditing(s); setFormErr(""); setModal("edit"); };

  const save = async () => {
    setSaving(true); setFormErr("");
    try {
      if (modal === "add") await adminFetch("/subjects", { method: "POST", body: form });
      else await adminFetch(`/subjects/${editing!.id}`, { method: "PUT", body: form });
      setModal(null); load();
    } catch (e: any) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (s: Subject) => {
    if (!confirm(`Delete "${s.name}"? This will delete all its chapters and questions.`)) return;
    try {
      await adminFetch(`/subjects/${s.id}`, { method: "DELETE" });
      load();
    } catch (e: any) { alert(e.message); }
  };

  // Get class levels that exist for each subject
  const classesForSubject = (subjectId: string): string[] => {
    const cls = [...new Set(chapters.filter(c => c.subjectId === subjectId).map(c => c.classLevel))];
    return cls.sort((a, b) => Number(a) - Number(b));
  };

  // Filter subjects by selected class
  const filteredSubjects = filterClass
    ? subjects.filter(s => classesForSubject(s.id).includes(filterClass))
    : subjects;

  return (
    <div>
      <SectionHeader title="Subjects" sub="Manage top-level subjects." action={
        <Btn onClick={openAdd} style={{ fontSize: 12, padding: "8px 16px" }}>+ Add Subject</Btn>
      } />

      {/* Class filter */}
      <div style={{ marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select style={{ ...filterSelectStyle, minWidth: 160 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {CLASS_LEVELS.map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        {filterClass && (
          <button onClick={() => setFilterClass("")} style={{
            background: "none", border: "1px solid var(--border)", color: "var(--text-muted)",
            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer",
          }}>✕ Clear</button>
        )}
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {filteredSubjects.length} subject{filteredSubjects.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && <Loader />}
      {err && <ErrBox msg={err} />}
      {!loading && filteredSubjects.length === 0 && <EmptyState msg={filterClass ? `No subjects have chapters for Class ${filterClass}.` : "No subjects yet. Add one!"} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredSubjects.map(s => {
          const classTags = classesForSubject(s.id);
          return (
            <Card key={s.id} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</span>
                  <Tag>{s.code}</Tag>
                  {classTags.map(cl => (
                    <Tag key={cl} color="var(--text-secondary)">Cl {cl}</Tag>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                  {s.chapterCount} chapters · {Number(s.questionCount).toLocaleString()} questions
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Btn variant="ghost" onClick={() => openEdit(s)} style={{ fontSize: 12, padding: "6px 12px" }}>Edit</Btn>
                <Btn variant="danger" onClick={() => remove(s)} style={{ fontSize: 12, padding: "6px 12px" }}>Delete</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal === "add" ? "Add Subject" : "Edit Subject"} onClose={() => setModal(null)}>
          {formErr && <ErrBox msg={formErr} />}
          <FormField label="Subject Name">
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mathematics" />
          </FormField>
          <FormField label="Subject Code">
            <input style={inputStyle} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. MATH" />
          </FormField>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <Btn onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : "Save"}</Btn>
            <Btn variant="ghost" onClick={() => setModal(null)} style={{ flex: 1 }}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Chapters Tab ──────────────────────────────────────────────────────────────
function ChaptersTab({ refreshKey }: { refreshKey: number }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [form, setForm] = useState({ name: "", subjectId: "", classLevel: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cd, sd] = await Promise.all([
        adminFetch<{ chapters: Chapter[] }>(`/chapters${filterSubject ? `?subjectId=${filterSubject}` : ""}`),
        adminFetch<{ subjects: Subject[] }>("/subjects"),
      ]);
      setChapters(cd.chapters);
      setSubjects(sd.subjects);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [filterSubject]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const openAdd = () => { setForm({ name: "", subjectId: filterSubject || "", classLevel: filterClass || "" }); setEditing(null); setFormErr(""); setModal("add"); };
  const openEdit = (c: Chapter) => { setForm({ name: c.name, subjectId: c.subjectId, classLevel: c.classLevel }); setEditing(c); setFormErr(""); setModal("edit"); };

  const save = async () => {
    setSaving(true); setFormErr("");
    try {
      if (modal === "add") await adminFetch("/chapters", { method: "POST", body: form });
      else await adminFetch(`/chapters/${editing!.id}`, { method: "PUT", body: { name: form.name, classLevel: form.classLevel } });
      setModal(null); load();
    } catch (e: any) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (c: Chapter) => {
    if (!confirm(`Delete "${c.name}"? All questions in this chapter will be deleted.`)) return;
    try {
      await adminFetch(`/chapters/${c.id}`, { method: "DELETE" });
      load();
    } catch (e: any) { alert(e.message); }
  };

  // Apply class filter client-side
  const displayed = filterClass ? chapters.filter(c => c.classLevel === filterClass) : chapters;

  const grouped = displayed.reduce((acc, c) => {
    const key = c.subjectName || c.subjectId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, Chapter[]>);

  return (
    <div>
      <SectionHeader title="Chapters" sub="Manage chapters within subjects." action={
        <Btn onClick={openAdd} style={{ fontSize: 12, padding: "8px 16px" }}>+ Add Chapter</Btn>
      } />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <select style={{ ...filterSelectStyle, minWidth: 180 }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select style={{ ...filterSelectStyle, minWidth: 140 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {CLASS_LEVELS.map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        {(filterSubject || filterClass) && (
          <button onClick={() => { setFilterSubject(""); setFilterClass(""); }} style={{
            background: "none", border: "1px solid var(--border)", color: "var(--text-muted)",
            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer",
          }}>✕ Clear</button>
        )}
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {displayed.length} chapter{displayed.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && <Loader />}
      {err && <ErrBox msg={err} />}
      {!loading && displayed.length === 0 && <EmptyState msg="No chapters found." />}

      {Object.entries(grouped).map(([subjectName, chs]) => (
        <div key={subjectName} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>
            {subjectName}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {chs.map(c => (
              <Card key={c.id} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                    <Tag>Class {c.classLevel}</Tag>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontFamily: "var(--font-mono)" }}>
                    {Number(c.questionCount).toLocaleString()} questions
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Btn variant="ghost" onClick={() => openEdit(c)} style={{ fontSize: 12, padding: "6px 12px" }}>Edit</Btn>
                  <Btn variant="danger" onClick={() => remove(c)} style={{ fontSize: 12, padding: "6px 12px" }}>Delete</Btn>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {modal && (
        <Modal title={modal === "add" ? "Add Chapter" : "Edit Chapter"} onClose={() => setModal(null)}>
          {formErr && <ErrBox msg={formErr} />}
          <FormField label="Chapter Name">
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Quadratic Equations" />
          </FormField>
          {modal === "add" && (
            <FormField label="Subject">
              <select style={selectStyle} value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>
          )}
          <FormField label="Class Level">
            <select style={selectStyle} value={form.classLevel} onChange={e => setForm(f => ({ ...f, classLevel: e.target.value }))}>
              <option value="">Select class...</option>
              {CLASS_LEVELS.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </FormField>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <Btn onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : "Save"}</Btn>
            <Btn variant="ghost" onClick={() => setModal(null)} style={{ flex: 1 }}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Questions Tab ─────────────────────────────────────────────────────────────
function QuestionsTab({ onMutate }: { onMutate: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [filters, setFilters] = useState({ subjectId: "", chapterId: "", difficulty: "", classLevel: "" });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 30;
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState({
    subjectId: "", chapterId: "", difficulty: "easy",
    questionText: "", options: ["", "", "", ""], answer: "", explanation: "", marks: 1, isMultiChoice: false,
  });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (filters.subjectId) params.set("subjectId", filters.subjectId);
      if (filters.chapterId) params.set("chapterId", filters.chapterId);
      if (filters.difficulty) params.set("difficulty", filters.difficulty);
      const d = await adminFetch<{ questions: Question[]; total: number }>(`/questions?${params}`);
      setQuestions(d.questions);
      setTotal(d.total);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      adminFetch<{ subjects: Subject[] }>("/subjects"),
      adminFetch<{ chapters: Chapter[] }>("/chapters"),
    ]).then(([sd, cd]) => { setSubjects(sd.subjects); setChapters(cd.chapters); });
  }, []);

  useEffect(() => {
    let filtered = chapters;
    if (filters.subjectId) filtered = filtered.filter(c => c.subjectId === filters.subjectId);
    if (filters.classLevel) filtered = filtered.filter(c => c.classLevel === filters.classLevel);
    setFilteredChapters(filtered);
  }, [filters.subjectId, filters.classLevel, chapters]);

  const openAdd = () => {
    setForm({ subjectId: filters.subjectId || "", chapterId: filters.chapterId || "", difficulty: "easy", questionText: "", options: ["", "", "", ""], answer: "", explanation: "", marks: 1, isMultiChoice: false });
    setEditing(null); setFormErr(""); setModal("add");
  };
  const openEdit = (q: Question) => {
    setForm({
      subjectId: q.subjectId, chapterId: q.chapterId, difficulty: q.difficulty,
      questionText: q.questionText, options: q.options?.length ? [...q.options, ...Array(4).fill("")].slice(0, 4) : ["", "", "", ""],
      answer: q.answer, explanation: q.explanation || "", marks: q.marks,
      isMultiChoice: !!(q.options && q.options.length > 0),
    });
    setEditing(q); setFormErr(""); setModal("edit");
  };

  const save = async () => {
    setSaving(true); setFormErr("");
    try {
      const payload: Record<string, unknown> = {
        subjectId: form.subjectId, chapterId: form.chapterId,
        difficulty: form.difficulty, questionText: form.questionText,
        answer: form.answer, explanation: form.explanation || null,
        marks: form.marks,
        options: form.isMultiChoice ? form.options.filter(o => o.trim()) : null,
      };
      if (modal === "add") await adminFetch("/questions", { method: "POST", body: payload });
      else await adminFetch(`/questions/${editing!.id}`, { method: "PUT", body: payload });
      setModal(null);
      load();
      onMutate(); // notify parent to refresh subjects/chapters counts
    } catch (e: any) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (q: Question) => {
    if (!confirm("Delete this question permanently?")) return;
    try {
      await adminFetch(`/questions/${q.id}`, { method: "DELETE" });
      load();
      onMutate();
    }
    catch (e: any) { alert(e.message); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  // Chapters for form (when subjectId changes in form)
  const formChapters = form.subjectId ? chapters.filter(c => c.subjectId === form.subjectId) : chapters;

  return (
    <div>
      <SectionHeader title="Questions" sub={`${total.toLocaleString()} total questions.`} action={
        <Btn onClick={openAdd} style={{ fontSize: 12, padding: "8px 16px" }}>+ Add Question</Btn>
      } />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <select style={{ ...filterSelectStyle, flex: 1, minWidth: 140 }} value={filters.subjectId} onChange={e => { setFilters(f => ({ ...f, subjectId: e.target.value, chapterId: "" })); setPage(1); }}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select style={{ ...filterSelectStyle, minWidth: 120 }} value={filters.classLevel} onChange={e => { setFilters(f => ({ ...f, classLevel: e.target.value, chapterId: "" })); setPage(1); }}>
          <option value="">All Classes</option>
          {CLASS_LEVELS.map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select style={{ ...filterSelectStyle, flex: 1, minWidth: 140 }} value={filters.chapterId} onChange={e => { setFilters(f => ({ ...f, chapterId: e.target.value })); setPage(1); }}>
          <option value="">All Chapters</option>
          {filteredChapters.map(c => <option key={c.id} value={c.id}>{c.name} (Cl {c.classLevel})</option>)}
        </select>
        <select style={{ ...filterSelectStyle, minWidth: 120 }} value={filters.difficulty} onChange={e => { setFilters(f => ({ ...f, difficulty: e.target.value })); setPage(1); }}>
          <option value="">All Levels</option>
          {DIFFS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
        </select>
        {(filters.subjectId || filters.chapterId || filters.difficulty || filters.classLevel) && (
          <button onClick={() => { setFilters({ subjectId: "", chapterId: "", difficulty: "", classLevel: "" }); setPage(1); }} style={{
            background: "none", border: "1px solid var(--border)", color: "var(--text-muted)",
            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer",
          }}>✕ Clear</button>
        )}
      </div>

      {loading && <Loader />}
      {err && <ErrBox msg={err} />}
      {!loading && questions.length === 0 && <EmptyState msg="No questions match filters." />}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {questions.map(q => (
          <Card key={q.id} style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
                  <DiffBadge level={q.difficulty} />
                  {q.options && q.options.length > 0 && <Tag color="var(--text-secondary)">MCQ</Tag>}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{q.marks}mk</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 6 }}>
                  {q.questionText.length > 120 ? q.questionText.slice(0, 120) + "…" : q.questionText}
                </div>
                <div style={{ fontSize: 11, color: "var(--success)", fontFamily: "var(--font-mono)" }}>
                  ✓ {q.answer.length > 60 ? q.answer.slice(0, 60) + "…" : q.answer}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Btn variant="ghost" onClick={() => openEdit(q)} style={{ fontSize: 11, padding: "5px 10px" }}>Edit</Btn>
                <Btn variant="danger" onClick={() => remove(q)} style={{ fontSize: 11, padding: "5px 10px" }}>Del</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20 }}>
          <Btn variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ fontSize: 12, padding: "6px 16px" }}>← Prev</Btn>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
            {page} / {totalPages} · {total.toLocaleString()} total
          </span>
          <Btn variant="ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ fontSize: 12, padding: "6px 16px" }}>Next →</Btn>
        </div>
      )}

      {modal && (
        <Modal title={modal === "add" ? "Add Question" : "Edit Question"} onClose={() => setModal(null)}>
          {formErr && <ErrBox msg={formErr} />}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 0 }}>
            <FormField label="Subject">
              <select style={selectStyle} value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value, chapterId: "" }))}>
                <option value="">Select...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>
            <FormField label="Chapter">
              <select style={selectStyle} value={form.chapterId} onChange={e => setForm(f => ({ ...f, chapterId: e.target.value }))}>
                <option value="">Select...</option>
                {formChapters.map(c => <option key={c.id} value={c.id}>{c.name} (Cl {c.classLevel})</option>)}
              </select>
            </FormField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FormField label="Difficulty">
              <select style={selectStyle} value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                {DIFFS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </FormField>
            <FormField label="Marks">
              <input type="number" min={1} max={20} style={inputStyle} value={form.marks} onChange={e => setForm(f => ({ ...f, marks: Number(e.target.value) }))} />
            </FormField>
          </div>
          <FormField label="Question Text">
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" as const }}
              value={form.questionText} onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))}
              placeholder="Type the full question here..."
            />
          </FormField>

          {/* MCQ toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>
              <input type="checkbox" checked={form.isMultiChoice} onChange={e => setForm(f => ({ ...f, isMultiChoice: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
              Multiple choice question (MCQ)
            </label>
          </div>

          {form.isMultiChoice && (
            <FormField label="Options (fill filled ones only)">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {form.options.map((opt, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", minWidth: 20 }}>{String.fromCharCode(65 + i)}.</span>
                    <input style={{ ...inputStyle, flex: 1 }} value={opt} onChange={e => setForm(f => ({ ...f, options: f.options.map((o, j) => j === i ? e.target.value : o) }))} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                  </div>
                ))}
              </div>
            </FormField>
          )}

          <FormField label="Answer">
            <input style={inputStyle} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
              placeholder={form.isMultiChoice ? "e.g. A or the full option text" : "Correct answer..."} />
          </FormField>
          <FormField label="Explanation (optional)">
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" as const }}
              value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
              placeholder="Explain the correct answer..."
            />
          </FormField>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <Btn onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : "Save Question"}</Btn>
            <Btn variant="ghost" onClick={() => setModal(null)} style={{ flex: 1 }}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main AdminPage ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(() => !!getAdminPassword());
  const [tab, setTab] = useState<Tab>("dashboard");
  // refreshKey increments whenever questions mutate, so Subjects/Chapters re-fetch their counts
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogout = async () => { clearAdminSession(); await logout(); navigate("/login"); };
  const handleAdminLogout = () => { clearAdminSession(); setAuthed(false); };
  const handleMutate = () => setRefreshKey(k => k + 1);

  if (!authed) return <PasswordGate onSuccess={() => setAuthed(true)} />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <TopBar user={user} onLogout={handleLogout} />

      {/* Desktop layout: sidebar + content */}
      <div style={{ display: "flex", maxWidth: 1280, margin: "0 auto", minHeight: "calc(100vh - 56px)" }}>

        {/* Sidebar – desktop only */}
        <aside style={{
          width: 220, flexShrink: 0, padding: "24px 12px",
          borderRight: "1px solid var(--border)",
          display: "none",
        }} className="admin-sidebar">
          <div style={{ marginBottom: 24, padding: "0 8px" }}>
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 10, letterSpacing: "0.2em", marginBottom: 4 }}>// ADMIN PANEL</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>BrainBrew Admin</div>
          </div>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10, marginBottom: 4,
              background: tab === t.id ? "var(--accent-dim)" : "none",
              border: tab === t.id ? "1px solid var(--border-strong)" : "1px solid transparent",
              color: tab === t.id ? "var(--accent)" : "var(--text-secondary)",
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              cursor: "pointer", textAlign: "left", transition: "all 0.18s", width: "100%",
            }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
          <div style={{ marginTop: "auto", paddingTop: 20 }}>
            <Btn variant="ghost" onClick={handleAdminLogout} style={{ width: "100%", fontSize: 12 }}>Lock Admin</Btn>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: "24px 20px", paddingBottom: 80, minWidth: 0 }}>
          {/* Mobile tab bar */}
          <div className="admin-tab-bar" style={{
            display: "flex", gap: 6, marginBottom: 24, overflowX: "auto",
            scrollbarWidth: "none",
          }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 999, flexShrink: 0,
                background: tab === t.id ? "var(--accent)" : "var(--bg-elevated)",
                color: tab === t.id ? "#000" : "var(--text-secondary)",
                border: tab === t.id ? "none" : "1px solid var(--border)",
                fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
                cursor: "pointer", transition: "all 0.18s",
              }}>
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "dashboard" && <DashboardTab />}
          {tab === "subjects"  && <SubjectsTab refreshKey={refreshKey} />}
          {tab === "chapters"  && <ChaptersTab refreshKey={refreshKey} />}
          {tab === "questions" && <QuestionsTab onMutate={handleMutate} />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="admin-bottom-nav">
        <BottomNav current="/admin" />
      </div>
    </div>
  );
}
