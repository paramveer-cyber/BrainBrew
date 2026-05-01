import jsPDF from "jspdf";

export interface Question {
  id: string;
  questionText: string;
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: string;
  marks: number;
}

export interface TestMeta {
  title: string;
  config: Record<string, number>;
  classLevel?: string;
  subject?: string;
  chapter?: string;
  totalMarks?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const ML = 12;          // was 20 — tighter side margins = more usable width
const MR = 12;          // was 20
const MB = 12;          // was 20
const MT = 8;           // was 15 — continuation pages start closer to top
const CW = PAGE_W - ML - MR; // now 186 instead of 170

const FONT_BODY  = 9;   // was 10
const FONT_SMALL = 7.5; // was 8.5
const FONT_TITLE = 15;  // was 18

const LINE = 4.2;       // was 5.5 — the single biggest win

// ─── Measure header height (page 1) ──────────────────────────────────────────
function measureHeaderHeight(doc: jsPDF, meta: TestMeta): number {
  const chapterName = meta.chapter || meta.title;
  doc.setFont("times", "bold");
  doc.setFontSize(FONT_TITLE);
  const headingLines = doc.splitTextToSize(chapterName, CW - 45);
  const headingBottomY = 18 + (headingLines.length - 1) * 5.5;
  return headingBottomY + 16; // subheading + instructions + rule
}

// ─── Header ──────────────────────────────────────────────────────────────────
function drawHeader(
  doc: jsPDF,
  meta: TestMeta,
  type: "test" | "solution",
  pageNum: number,
  totalPages: number
): number {
  if (pageNum > 1) return MT;

  const W  = PAGE_W;
  const m  = ML;
  const centre = W / 2;

  // Top rule
  doc.setDrawColor(0);
  doc.setLineWidth(0.8);
  doc.line(m, 9, W - m, 9);

  // Chapter heading
  const chapterName = meta.chapter || meta.title;
  doc.setFont("times", "bold");
  doc.setFontSize(FONT_TITLE);
  doc.setTextColor(0);
  const headingLines = doc.splitTextToSize(chapterName, CW - 45);
  doc.text(headingLines, centre, 18, { align: "center" });

  // Date — right
  doc.setFont("times", "normal");
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(60);
  doc.text(
    new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
    W - m, 15, { align: "right" }
  );
  doc.setTextColor(0);

  const headingBottomY = 18 + (headingLines.length - 1) * 5.5;

  // Sub-heading
  const parts: string[] = [];
  if (meta.classLevel) parts.push(`Class ${meta.classLevel}`);
  if (meta.subject)    parts.push(meta.subject);
  const subheading = parts.join("  ·  ");

  doc.setFont("times", "normal");
  doc.setFontSize(FONT_BODY);
  doc.setTextColor(60);
  if (subheading) doc.text(subheading, centre, headingBottomY + 5, { align: "center" });

  // Instructions line
  const totalQs    = Object.values(meta.config).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalMarks = meta.totalMarks ?? totalQs;
  const instrLine  = type === "solution"
    ? `Solution Key  ·  Total Questions: ${totalQs}  ·  Total Marks: ${totalMarks}`
    : `Answer all questions  ·  Total Questions: ${totalQs}  ·  Total Marks: ${totalMarks}`;
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(80);
  doc.text(instrLine, centre, headingBottomY + 10, { align: "center" });
  doc.setTextColor(0);

  // Thin rule
  doc.setLineWidth(0.25);
  doc.line(m, headingBottomY + 13, W - m, headingBottomY + 13);

  return headingBottomY + 16;
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setLineWidth(0.25);
  doc.setDrawColor(0);
  doc.line(ML, PAGE_H - MB + 2, PAGE_W - MR, PAGE_H - MB + 2);
  doc.setFont("times", "normal");
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(100);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W / 2, PAGE_H - MB + 6, { align: "center" });
  doc.setTextColor(0);
}

// ─── Measure question height ──────────────────────────────────────────────────
function measureQuestion(
  doc: jsPDF,
  q: Question,
  idx: number,
  type: "test" | "solution"
): number {
  doc.setFont("times", "bold");
  doc.setFontSize(FONT_BODY);
  const qLines = doc.splitTextToSize(`${idx + 1}. ${q.questionText}`, CW - 14);
  let h = qLines.length * LINE + 1.5; // was +3

  if (q.options?.length) {
    doc.setFont("times", "normal");
    const SHORT = q.options.every((o) => o.length < 38);
    if (SHORT && q.options.length === 4) {
      h += 2 * (LINE + 1) + 1.5; // was LINE+1.5 and +3
    } else {
      q.options.forEach((opt) => {
        const ol = doc.splitTextToSize(opt, CW - 18);
        h += ol.length * LINE + 1;   // was +1.5
      });
      h += 1.5; // was +3
    }
  }

  if (type === "solution") {
    doc.setFont("times", "italic");
    const aLines = doc.splitTextToSize(`Ans. ${q.answer}`, CW - 8);
    h += aLines.length * LINE + 1;   // was +2
    if (q.explanation) {
      const eLines = doc.splitTextToSize(q.explanation, CW - 8);
      h += eLines.length * LINE + 1; // was +2
    }
    h += 2; // was +4
  }

  h += 3; // separator gap — was +6 (the hairline rule + tiny gap)
  return h;
}

// ─── Render one question ───────────────────────────────────────────────────────
function renderQuestion(
  doc: jsPDF,
  q: Question,
  idx: number,
  type: "test" | "solution",
  yIn: number
): number {
  let y = yIn;
  const m = ML;

  // Question text
  doc.setFont("times", "bold");
  doc.setFontSize(FONT_BODY);
  doc.setTextColor(0);
  const qLines = doc.splitTextToSize(`${idx + 1}. ${q.questionText}`, CW - 14);
  doc.text(qLines, m, y);

  // Marks — right-aligned
  doc.setFont("times", "normal");
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(80);
  doc.text(`[${q.marks ?? 1}]`, PAGE_W - MR, y, { align: "right" });
  doc.setTextColor(0);

  y += qLines.length * LINE + 1.5; // was +3

  // Options
  if (q.options?.length) {
    doc.setFontSize(FONT_BODY);
    const SHORT = q.options.every((o) => o.length < 38);

    if (SHORT && q.options.length === 4) {
      const half = 2;
      const colW = (CW - 8) / 2;
      for (let oi = 0; oi < q.options.length; oi++) {
        const col = oi < half ? 0 : 1;
        const row = oi % half;
        const cx  = m + 6 + col * (colW + 4);
        const ry  = y + row * (LINE + 1);
        const label = `(${String.fromCharCode(97 + oi)})`;
        doc.setFont("times", "bold");
        doc.text(label, cx, ry);
        doc.setFont("times", "normal");
        doc.text(` ${q.options[oi]}`, cx + 7, ry);
      }
      y += half * (LINE + 1) + 1.5; // was +3
    } else {
      q.options.forEach((opt, oi) => {
        const label = `(${String.fromCharCode(97 + oi)})`;
        const ol = doc.splitTextToSize(opt, CW - 18);
        doc.setFont("times", "bold");
        doc.text(label, m + 6, y);
        doc.setFont("times", "normal");
        doc.text(opt, m + 15, y);
        y += ol.length * LINE + 1;   // was +1.5
      });
      y += 1.5; // was +3
    }
  }

  // Solution block
  if (type === "solution") {
    doc.setFont("times", "bold");
    doc.setFontSize(FONT_SMALL);
    doc.setTextColor(50, 50, 120);
    const aLines = doc.splitTextToSize(`Ans. ${q.answer}`, CW - 8);
    doc.text(aLines, m + 4, y);
    y += aLines.length * LINE + 1;   // was +2

    if (q.explanation) {
      doc.setFont("times", "italic");
      doc.setFontSize(FONT_SMALL - 0.5);
      doc.setTextColor(80);
      const eLines = doc.splitTextToSize(q.explanation, CW - 8);
      doc.text(eLines, m + 4, y);
      y += eLines.length * LINE + 1; // was +2
    }
    doc.setTextColor(0);
    y += 2; // was +4
  }

  return y + 2.5;
}

// ─── Two-pass page count ──────────────────────────────────────────────────────
function calcTotalPages(
  doc: jsPDF,
  meta: TestMeta,
  questions: Question[],
  type: "test" | "solution"
): number {
  const page1Start = measureHeaderHeight(doc, meta);
  let page = 1;
  let y    = page1Start;

  questions.forEach((q, i) => {
    const h = measureQuestion(doc, q, i, type);
    if (y + h > PAGE_H - MB - 4) {
      page++;
      y = MT;
    }
    y += h;
  });

  return page;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export const generateTestPDF = (
  meta: TestMeta,
  questions: Question[],
  type: "test" | "solution"
) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const diffOrder: Record<string, number> = { easy: 0, medium: 1, difficult: 2, extreme: 3 };
  const sorted = [...questions].sort(
    (a, b) => (diffOrder[a.difficulty] ?? 9) - (diffOrder[b.difficulty] ?? 9)
  );

  const computedTotalMarks = sorted.reduce((sum, q) => sum + (q.marks ?? 1), 0);
  const metaWithMarks: TestMeta = { ...meta, totalMarks: computedTotalMarks };

  const totalPages = calcTotalPages(doc, metaWithMarks, sorted, type);

  let pageNum = 1;
  let y = drawHeader(doc, metaWithMarks, type, pageNum, totalPages);

  sorted.forEach((q, i) => {
    const h = measureQuestion(doc, q, i, type);
    if (y + h > PAGE_H - MB - 4) {
      drawFooter(doc, pageNum, totalPages);
      doc.addPage();
      pageNum++;
      y = drawHeader(doc, metaWithMarks, type, pageNum, totalPages);
    }
    y = renderQuestion(doc, q, i, type, y);
  });

  drawFooter(doc, pageNum, totalPages);

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`assessment-${type}-${stamp}.pdf`);
};