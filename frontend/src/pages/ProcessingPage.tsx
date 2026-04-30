import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { ProgressBar } from "../components/ui";

interface LocationState {
  subjectId: string;
  chapterId: string;
  classLevel: string;
  config: { easy: number; medium: number; difficult: number; extreme: number };
  total: number;
}

const STEPS = [
  { pct: 8,  msg: "connecting to question bank..." },
  { pct: 20, msg: "validating configuration params..." },
  { pct: 35, msg: "scanning difficulty pools..." },
  { pct: 55, msg: "randomizing selection vectors..." },
  { pct: 72, msg: "applying distribution constraints..." },
  { pct: 88, msg: "assembling test payload..." },
  { pct: 95, msg: "finalizing question set..." },
];

export default function ProcessingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [logs, setLogs] = useState<string[]>(["[testgen] initializing precision engine..."]);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const called = useRef(false);

  const addLog = (msg: string) => setLogs(p => [...p, msg]);

  useEffect(() => {
    if (!state) { navigate("/generator"); return; }
    if (called.current) return;
    called.current = true;

    (async () => {
      // Animate steps
      let si = 0;
      const interval = setInterval(() => {
        if (si < STEPS.length) {
          const s = STEPS[si];
          setPct(s.pct);
          addLog(`[engine] ${s.msg}`);
          si++;
        } else {
          clearInterval(interval);
        }
      }, 350);

      try {
        const result = await apiFetch<{
          testId: string; title: string; totalQuestions: number;
          missing?: { difficulty: string; requested: number; available: number }[];
        }>("/generate", {
          method: "POST",
          body: {
            subjectId: state.subjectId,
            chapterId: state.chapterId,
            classLevel: state.classLevel || undefined,
            config: state.config,
          },
        });

        clearInterval(interval);
        setPct(100);
        addLog(`[engine] test compiled → ${result.totalQuestions} questions`);
        addLog(`[engine] test id: ${result.testId.slice(0, 8)}...`);

        if (result.missing && result.missing.length > 0) {
          result.missing.forEach(m => {
            addLog(`[warn] ${m.difficulty}: requested ${m.requested}, got ${m.available}`);
          });
        }

        addLog("[testgen] ✓ generation complete");

        setTimeout(() => {
          navigate("/results", { state: { testId: result.testId, title: result.title } });
        }, 800);
      } catch (e: unknown) {
        clearInterval(interval);
        setPct(0);
        const msg = (e as Error).message || "Unknown error";
        addLog(`[error] ${msg}`);
        setError(msg);
      }
    })();
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 540 }}>
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 56, height: 56, background: "var(--accent)", borderRadius: 14,
            fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 18, color: "#000",
            marginBottom: 16, boxShadow: "0 0 24px var(--accent-glow)",
            animation: pct < 100 ? "pulse 1.5s ease-in-out infinite" : "none",
          }}>TG</div>
          <div style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.15em", fontSize: 13, color: "var(--text-secondary)" }}>
            PRECISION ENGINE — ACTIVE
          </div>
        </div>

        {/* Progress */}
        <div style={{
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: 24, marginBottom: 20,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
              {pct === 100 ? "COMPLETE" : "PROCESSING"}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--accent)", fontWeight: 700 }}>
              {pct}%
            </span>
          </div>
          <ProgressBar pct={pct} />

          {/* Config display */}
          {state && (
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(state.config).filter(([, v]) => v > 0).map(([k, v]) => (
                <span key={k} style={{
                  fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 8px",
                  borderRadius: 4, background: "var(--bg-elevated)",
                  border: "1px solid var(--border)", color: "var(--text-secondary)",
                  textTransform: "uppercase",
                }}>
                  {v} {k}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Terminal log */}
        <div style={{
          background: "#020810", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: 20,
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: "var(--accent)", marginBottom: 12, letterSpacing: "0.1em",
          }}>
            ● TESTGEN / TERMINAL OUTPUT
          </div>
          <div ref={logRef} style={{
            maxHeight: 220, overflowY: "auto", display: "flex",
            flexDirection: "column", gap: 4,
          }}>
            {logs.map((l, i) => (
              <div key={i} style={{
                fontFamily: "var(--font-mono)", fontSize: 12,
                color: l.startsWith("[error]") ? "var(--danger)"
                  : l.startsWith("[warn]") ? "var(--warn)"
                  : l.includes("✓") ? "var(--success)"
                  : "var(--text-secondary)",
                lineHeight: 1.6,
              }}>
                {l}
              </div>
            ))}
            {pct < 100 && !error && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)" }}>
                <span style={{ animation: "blink 1s step-end infinite" }}>▌</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <button
              onClick={() => navigate("/generator")}
              style={{
                background: "none", border: "1px solid var(--danger)",
                color: "var(--danger)", padding: "10px 20px", borderRadius: "var(--radius)",
                fontFamily: "var(--font-mono)", fontSize: 13, cursor: "pointer",
              }}
            >
              ← Return to Generator
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { box-shadow: 0 0 24px var(--accent-glow); } 50% { box-shadow: 0 0 40px var(--accent-glow); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}