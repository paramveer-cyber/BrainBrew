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
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const ML = 20;
const MR = 20;
const MB = 20;
const MT = 15; // top margin for continuation pages
const CW = PAGE_W - ML - MR; // 170

const FONT_BODY = 10;
const FONT_SMALL = 8.5;
const FONT_TITLE = 18;

const LINE = 5.5;

// ─── Measure header height (page 1) ──────────────────────────────────────────
function measureHeaderHeight(doc: jsPDF, meta: TestMeta): number {
  const chapterName = meta.chapter || meta.title;
  doc.setFont("times", "bold");
  doc.setFontSize(FONT_TITLE);
  const headingLines = doc.splitTextToSize(chapterName, CW - 55);
  const headingBottomY = 22 + (headingLines.length - 1) * 7;
  // header ends at headingBottomY + 23 (subheading + instructions + rule)
  return headingBottomY + 23;
}

// ─── Header ──────────────────────────────────────────────────────────────────
function drawHeader(
  doc: jsPDF,
  meta: TestMeta,
  type: "test" | "solution",
  pageNum: number,
  totalPages: number
): number {
  // Continuation pages: no header at all — just start at top margin
  if (pageNum > 1) return MT;

  const W = PAGE_W;
  const m = ML;
  const centre = W / 2;

  // Top thick rule
  doc.setDrawColor(0);
  doc.setLineWidth(1.0);
  doc.line(m, 12, W - m, 12);

  // Chapter heading centred
  const chapterName = meta.chapter || meta.title;
  doc.setFont("times", "bold");
  doc.setFontSize(FONT_TITLE);
  doc.setTextColor(0);
  const headingLines = doc.splitTextToSize(chapterName, CW - 55);
  doc.text(headingLines, centre, 22, { align: "center" });

  // Date — right column (page 1 only, no page number in header)
  doc.setFont("times", "normal");
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(60);
  doc.text(
    new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
    W - m, 19, { align: "right" }
  );
  doc.setTextColor(0);

  const headingBottomY = 22 + (headingLines.length - 1) * 7;

  // Sub-heading: Class XX · Subject
  const parts: string[] = [];
  if (meta.classLevel) parts.push(`Class ${meta.classLevel}`);
  if (meta.subject) parts.push(meta.subject);
  const subheading = parts.join("  ·  ");

  doc.setFont("times", "normal");
  doc.setFontSize(FONT_BODY);
  doc.setTextColor(60);
  if (subheading) doc.text(subheading, centre, headingBottomY + 7, { align: "center" });

  // Instructions line
  const totalQs = Object.values(meta.config).reduce((a, b) => a + (Number(b) || 0), 0);
  const instrLine = type === "solution"
    ? `Solution Key  ·  Total Questions: ${totalQs}  ·  Total Marks: ${totalQs}`
    : `Answer all questions  ·  Total Questions: ${totalQs}  ·  Total Marks: ${totalQs}`;
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(80);
  doc.text(instrLine, centre, headingBottomY + 13, { align: "center" });
  doc.setTextColor(0);

  // Thin rule
  doc.setLineWidth(0.3);
  doc.line(m, headingBottomY + 17, W - m, headingBottomY + 17);
  return headingBottomY + 23;
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setLineWidth(0.3);
  doc.setDrawColor(0);
  doc.line(ML, PAGE_H - MB + 3, PAGE_W - MR, PAGE_H - MB + 3);
  doc.setFont("times", "normal");
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(100);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W / 2, PAGE_H - MB + 8, { align: "center" });
  doc.setTextColor(0);
}

// ─── Measure question height ──────────────────────────────────────────────────
function measureQuestion(
  doc: jsPDF,
  q: Question,
  idx: number,
  type: "test" | "solution"
): number {
  // Question text wraps within CW - 18 (leave 18mm for marks on right)
  doc.setFont("times", "bold");
  doc.setFontSize(FONT_BODY);
  const qLines = doc.splitTextToSize(`${idx + 1}. ${q.questionText}`, CW - 18);
  let h = qLines.length * LINE + 3;

  if (q.options?.length) {
    doc.setFont("times", "normal");
    const SHORT = q.options.every((o) => o.length < 35);
    if (SHORT && q.options.length === 4) {
      h += 2 * (LINE + 1.5) + 3; // two rows of two-column layout
    } else {
      q.options.forEach((opt) => {
        const ol = doc.splitTextToSize(opt, CW - 20);
        h += ol.length * LINE + 1.5;
      });
      h += 3;
    }
  }

  if (type === "solution") {
    doc.setFont("times", "italic");
    const aLines = doc.splitTextToSize(`Ans. ${q.answer}`, CW - 10);
    h += aLines.length * LINE + 2;
    if (q.explanation) {
      const eLines = doc.splitTextToSize(q.explanation, CW - 10);
      h += eLines.length * LINE + 2;
    }
    h += 4;
  }

  h += 6; // gap between questions
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

  // Question text — wrap within CW-18 to not overlap marks column
  doc.setFont("times", "bold");
  doc.setFontSize(FONT_BODY);
  doc.setTextColor(0);
  const qLines = doc.splitTextToSize(`${idx + 1}. ${q.questionText}`, CW - 18);
  doc.text(qLines, m, y);

  // Marks — right-aligned, same baseline as first line, just "[X]"
  doc.setFont("times", "normal");
  doc.setFontSize(FONT_SMALL);
  doc.setTextColor(80);
  doc.text(`[${q.marks ?? 1}]`, PAGE_W - MR, y, { align: "right" });
  doc.setTextColor(0);

  y += qLines.length * LINE + 3;

  // Options
  if (q.options?.length) {
    doc.setFont("times", "normal");
    doc.setFontSize(FONT_BODY);

    const SHORT = q.options.every((o) => o.length < 35);
    if (SHORT && q.options.length === 4) {
      // Two-column layout
      const half = 2;
      const colW = (CW - 10) / 2;
      for (let oi = 0; oi < q.options.length; oi++) {
        const col = oi < half ? 0 : 1;
        const row = oi % half;
        const cx = m + 8 + col * (colW + 4);
        const ry = y + row * (LINE + 1.5);
        const label = `(${String.fromCharCode(97 + oi)})`;
        doc.setFont("times", "bold");
        doc.text(label, cx, ry);
        doc.setFont("times", "normal");
        doc.text(` ${q.options[oi]}`, cx + 8, ry);
      }
      y += half * (LINE + 1.5) + 3;
    } else {
      q.options.forEach((opt, oi) => {
        const label = `(${String.fromCharCode(97 + oi)})`;
        const ol = doc.splitTextToSize(opt, CW - 20);
        doc.setFont("times", "bold");
        doc.text(label, m + 8, y);
        doc.setFont("times", "normal");
        doc.text(opt, m + 18, y);
        y += ol.length * LINE + 1.5;
      });
      y += 3;
    }
  }

  // Solution block
  if (type === "solution") {
    doc.setFont("times", "bold");
    doc.setFontSize(FONT_SMALL);
    doc.setTextColor(50, 50, 120);
    const aLines = doc.splitTextToSize(`Ans. ${q.answer}`, CW - 10);
    doc.text(aLines, m + 6, y);
    y += aLines.length * LINE + 2;

    if (q.explanation) {
      doc.setFont("times", "italic");
      doc.setFontSize(FONT_SMALL - 0.5);
      doc.setTextColor(80);
      const eLines = doc.splitTextToSize(q.explanation, CW - 10);
      doc.text(eLines, m + 6, y);
      y += eLines.length * LINE + 2;
    }
    doc.setTextColor(0);
    y += 4;
  }

  // No divider line — just spacing
  return y + 6;
}

// ─── Two-pass page count ──────────────────────────────────────────────────────
function calcTotalPages(
  doc: jsPDF,
  meta: TestMeta,
  questions: Question[],
  type: "test" | "solution"
): number {
  // Use actual measured header height instead of a hardcoded guess
  const page1Start = measureHeaderHeight(doc, meta);
  let page = 1;
  let y = page1Start;

  questions.forEach((q, i) => {
    const h = measureQuestion(doc, q, i, type);
    if (y + h > PAGE_H - MB - 5) {
      page++;
      y = MT; // continuation pages start at top margin (no header)
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

  const totalPages = calcTotalPages(doc, meta, sorted, type);

  let pageNum = 1;
  let y = drawHeader(doc, meta, type, pageNum, totalPages);

  sorted.forEach((q, i) => {
    const h = measureQuestion(doc, q, i, type);
    if (y + h > PAGE_H - MB - 5) {
      drawFooter(doc, pageNum, totalPages);
      doc.addPage();
      pageNum++;
      y = drawHeader(doc, meta, type, pageNum, totalPages);
    }
    y = renderQuestion(doc, q, i, type, y);
  });

  drawFooter(doc, pageNum, totalPages);

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`assessment-${type}-${stamp}.pdf`);
};
