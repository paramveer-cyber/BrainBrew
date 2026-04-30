import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiFetch } from "../lib/api";
import { TopBar, BottomNav, Card, DiffBadge, Btn } from "../components/ui";
import { generateTestPDF } from "../lib/pdfGen";

interface Question {
  id: string;
  questionText: string;
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: string;
  marks: number;
}

interface Test {
  id: string;
  title: string;
  config: Record<string, number>;
  classLevel: string;
  createdAt: string;
}

interface PastTest {
  id: string;
  title: string;
  config: Record<string, number>;
  createdAt: string;
}

interface LocationState { testId?: string; title?: string; }

export default function ResultsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [myTests, setMyTests] = useState<PastTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Load specific test if navigated here from processing
  useEffect(() => {
    if (state?.testId) {
      loadTest(state.testId);
    }
    // Always load past tests list
    apiFetch<{ tests: PastTest[] }>("/tests/me")
      .then(d => setMyTests(d.tests))
      .catch(() => {});
  }, []);

  const loadTest = async (testId: string) => {
    setLoading(true);
    setError("");
    try {
      const d = await apiFetch<{ test: Test; questions: Question[] }>(`/tests/${testId}`);
      setTest(d.test);
      setQuestions(d.questions);
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to load test");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (type: "test" | "solution") => {
    if (!test || !questions.length) return;
    generateTestPDF({ title: test.title, config: test.config }, questions, type);
  };

  const diffOrder: Record<string, number> = { easy: 0, medium: 1, difficult: 2, extreme: 3 };
  const sorted = [...questions].sort((a, b) =>
    (diffOrder[a.difficulty] ?? 9) - (diffOrder[b.difficulty] ?? 9)
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", paddingBottom: 80 }}>
      <TopBar user={user} onLogout={async () => { await logout(); navigate("/login"); }} />

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 11, letterSpacing: "0.2em", marginBottom: 6 }}>
            // RESULTS & EXPORT
          </div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Test Results</div>
        </div>

        {error && (
          <div style={{
            background: "rgba(245,101,101,0.1)", border: "1px solid var(--danger)",
            borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 16,
            color: "var(--danger)", fontSize: 13, fontFamily: "var(--font-mono)",
          }}>⚠ {error}</div>
        )}

        {loading && (
          <Card style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 13 }}>
              loading test data...
            </div>
          </Card>
        )}

        {/* Current test */}
        {test && !loading && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--success)", letterSpacing: "0.1em", marginBottom: 10 }}>
                ✓ GENERATION SUCCESSFUL
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{test.title}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {Object.entries(test.config).filter(([, v]) => v > 0).map(([k, v]) => (
                  <span key={k} style={{
                    fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 10px",
                    borderRadius: 4, background: "var(--bg-elevated)",
                    border: "1px solid var(--border)", color: "var(--text-secondary)",
                  }}>
                    {v} {k}
                  </span>
                ))}
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 10px",
                  borderRadius: 4, background: "var(--accent-dim)",
                  border: "1px solid var(--border-strong)", color: "var(--accent)",
                }}>
                  {questions.length} total
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Btn onClick={() => handleDownload("test")} style={{ width: "100%" }}>
                  📄 Download Test
                </Btn>
                <Btn onClick={() => handleDownload("solution")} variant="ghost" style={{ width: "100%" }}>
                  🔑 Solution Key
                </Btn>
              </div>
            </Card>

            {/* Question preview */}
            <Card style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: 16, letterSpacing: "0.1em" }}>
                QUESTION PREVIEW — {questions.length} ITEMS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {sorted.map((q, i) => (
                  <div key={q.id} style={{
                    background: "var(--bg-elevated)", borderRadius: "var(--radius)",
                    border: "1px solid var(--border)", overflow: "hidden",
                  }}>
                    <button
                      onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                      style={{
                        width: "100%", background: "none", border: "none",
                        padding: "12px 14px", textAlign: "left", cursor: "pointer",
                        display: "flex", alignItems: "flex-start", gap: 10,
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", minWidth: 24 }}>
                        Q{i + 1}
                      </span>
                      <DiffBadge level={q.difficulty} />
                      <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1, lineHeight: 1.5 }}>
                        {q.questionText.length > 80 ? q.questionText.slice(0, 80) + "..." : q.questionText}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: "auto" }}>
                        {expanded === q.id ? "▲" : "▼"}
                      </span>
                    </button>

                    {expanded === q.id && (
                      <div style={{ padding: "0 14px 14px 14px", borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, marginTop: 12, marginBottom: 10 }}>
                          {q.questionText}
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                            {q.options.map((opt, idx) => (
                              <div key={idx} style={{
                                fontSize: 12, color: "var(--text-secondary)",
                                padding: "6px 10px", background: "var(--bg-card)",
                                borderRadius: 6, border: "1px solid var(--border)",
                              }}>
                                <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", marginRight: 8 }}>
                                  {String.fromCharCode(65 + idx)}.
                                </span>
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{
                          background: "rgba(45,212,191,0.08)", borderRadius: 6,
                          padding: "8px 12px", border: "1px solid var(--border-strong)",
                        }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>
                            ANSWER:
                          </span>{" "}
                          <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{q.answer}</span>
                          {q.explanation && (
                            <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* No test yet */}
        {!test && !loading && !state?.testId && (
          <Card style={{ textAlign: "center", padding: 40, marginBottom: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>No test loaded</div>
            <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>
              Generate a new test or load one from your history below.
            </div>
            <Btn onClick={() => navigate("/generator")}>⚡ Go to Generator</Btn>
          </Card>
        )}

        {/* Past tests */}
        {myTests.length > 0 && (
          <Card>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: 16, letterSpacing: "0.1em" }}>
              RECENT TESTS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {myTests.map(t => (
                <button key={t.id} onClick={() => loadTest(t.id)} style={{
                  background: test?.id === t.id ? "var(--accent-dim)" : "var(--bg-elevated)",
                  border: `1px solid ${test?.id === t.id ? "var(--border-strong)" : "var(--border)"}`,
                  borderRadius: "var(--radius)", padding: "12px 14px",
                  textAlign: "left", cursor: "pointer", transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                    {t.title}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {Object.entries(t.config).filter(([, v]) => v > 0).map(([k, v]) => (
                      <span key={k} style={{
                        fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 6px",
                        borderRadius: 3, background: "var(--bg-card)",
                        border: "1px solid var(--border)", color: "var(--text-muted)",
                      }}>
                        {v}{k[0]}
                      </span>
                    ))}
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginLeft: "auto" }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      <BottomNav current="/results" />
    </div>
  );
}