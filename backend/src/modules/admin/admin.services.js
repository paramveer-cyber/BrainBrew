import { db } from "../../db/index.js";
import { questions, chapters, subjects, generatedTests } from "../../db/schema.js";
import { eq, and, sql, desc, count } from "drizzle-orm";

// ── Subjects ──────────────────────────────────────────────────────────────────

export const getAllSubjects = async () => {
  // Single query: subjects + chapter/question counts via aggregation
  const rows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      code: subjects.code,
      createdAt: subjects.createdAt,
      chapterCount: sql`(SELECT COUNT(*) FROM chapters WHERE chapters.subject_id = ${subjects.id})`.as("chapter_count"),
      questionCount: sql`(SELECT COUNT(*) FROM questions WHERE questions.subject_id = ${subjects.id})`.as("question_count"),
    })
    .from(subjects)
    .orderBy(subjects.name);
  return rows;
};

export const createSubject = async ({ name, code }) => {
  if (!name?.trim() || !code?.trim()) throw new Error("Name and code are required.");
  const [row] = await db
    .insert(subjects)
    .values({ name: name.trim(), code: code.trim().toUpperCase() })
    .returning();
  return row;
};

export const updateSubject = async (id, { name, code }) => {
  if (!name?.trim() || !code?.trim()) throw new Error("Name and code are required.");
  const [row] = await db
    .update(subjects)
    .set({ name: name.trim(), code: code.trim().toUpperCase() })
    .where(eq(subjects.id, id))
    .returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
};

export const deleteSubject = async (id) => {
  const [row] = await db.delete(subjects).where(eq(subjects.id, id)).returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
};

// ── Chapters ──────────────────────────────────────────────────────────────────

export const getAllChapters = async (subjectId) => {
  const where = subjectId ? eq(chapters.subjectId, subjectId) : undefined;
  const rows = where
    ? await db
        .select({
          id: chapters.id,
          name: chapters.name,
          classLevel: chapters.classLevel,
          subjectId: chapters.subjectId,
          createdAt: chapters.createdAt,
          subjectName: subjects.name,
          questionCount: sql`(SELECT COUNT(*) FROM questions WHERE questions.chapter_id = ${chapters.id})`.as("question_count"),
        })
        .from(chapters)
        .leftJoin(subjects, eq(chapters.subjectId, subjects.id))
        .where(where)
        .orderBy(chapters.classLevel, chapters.name)
    : await db
        .select({
          id: chapters.id,
          name: chapters.name,
          classLevel: chapters.classLevel,
          subjectId: chapters.subjectId,
          createdAt: chapters.createdAt,
          subjectName: subjects.name,
          questionCount: sql`(SELECT COUNT(*) FROM questions WHERE questions.chapter_id = ${chapters.id})`.as("question_count"),
        })
        .from(chapters)
        .leftJoin(subjects, eq(chapters.subjectId, subjects.id))
        .orderBy(chapters.classLevel, chapters.name);
  return rows;
};

export const createChapter = async ({ name, subjectId, classLevel }) => {
  if (!name?.trim() || !subjectId || !classLevel?.trim())
    throw new Error("Name, subjectId, and classLevel are required.");
  const [row] = await db
    .insert(chapters)
    .values({ name: name.trim(), subjectId, classLevel: classLevel.trim() })
    .returning();
  return row;
};

export const updateChapter = async (id, { name, classLevel }) => {
  if (!name?.trim()) throw new Error("Name is required.");
  const updates = { name: name.trim() };
  if (classLevel?.trim()) updates.classLevel = classLevel.trim();
  const [row] = await db
    .update(chapters)
    .set(updates)
    .where(eq(chapters.id, id))
    .returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
};

export const deleteChapter = async (id) => {
  const [row] = await db.delete(chapters).where(eq(chapters.id, id)).returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
};

// ── Questions ─────────────────────────────────────────────────────────────────

export const getAllQuestions = async ({ chapterId, subjectId, difficulty, page = 1, limit = 50 }) => {
  const conditions = [];
  if (chapterId) conditions.push(eq(questions.chapterId, chapterId));
  if (subjectId) conditions.push(eq(questions.subjectId, subjectId));
  if (difficulty) conditions.push(eq(questions.difficulty, difficulty));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  // Paginated question list + total count in one go using a window function
  const rows = await (where
    ? db.select().from(questions).where(where).orderBy(desc(questions.createdAt)).limit(limit).offset(offset)
    : db.select().from(questions).orderBy(desc(questions.createdAt)).limit(limit).offset(offset));

  const [{ total }] = await (where
    ? db.select({ total: count() }).from(questions).where(where)
    : db.select({ total: count() }).from(questions));

  return { questions: rows, total: Number(total), page, limit };
};

export const createQuestion = async ({
  chapterId, subjectId, difficulty, questionText, options, answer, explanation, marks,
}) => {
  if (!chapterId || !subjectId || !difficulty || !questionText?.trim() || !answer?.trim())
    throw new Error("chapterId, subjectId, difficulty, questionText, and answer are required.");
  const VALID_DIFFS = ["easy", "medium", "difficult", "extreme"];
  if (!VALID_DIFFS.includes(difficulty)) throw new Error("Invalid difficulty level.");

  const [row] = await db
    .insert(questions)
    .values({
      chapterId,
      subjectId,
      difficulty,
      questionText: questionText.trim(),
      options: options || null,
      answer: answer.trim(),
      explanation: explanation?.trim() || null,
      marks: marks || 1,
    })
    .returning();
  return row;
};

export const updateQuestion = async (id, updates) => {
  const allowed = ["difficulty", "questionText", "options", "answer", "explanation", "marks"];
  const sanitised = {};
  for (const k of allowed) {
    if (updates[k] !== undefined) sanitised[k] = updates[k];
  }
  if (Object.keys(sanitised).length === 0) throw new Error("Nothing to update.");
  const VALID_DIFFS = ["easy", "medium", "difficult", "extreme"];
  if (sanitised.difficulty && !VALID_DIFFS.includes(sanitised.difficulty))
    throw new Error("Invalid difficulty level.");

  const [row] = await db
    .update(questions)
    .set(sanitised)
    .where(eq(questions.id, id))
    .returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
};

export const deleteQuestion = async (id) => {
  const [row] = await db.delete(questions).where(eq(questions.id, id)).returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
};

// ── Availability check (for generator validation) ────────────────────────────

export const getAvailableCounts = async (chapterId) => {
  if (!chapterId) throw new Error("chapterId required");
  const rows = await db
    .select({ difficulty: questions.difficulty, count: count() })
    .from(questions)
    .where(eq(questions.chapterId, chapterId))
    .groupBy(questions.difficulty);

  const counts = { easy: 0, medium: 0, difficult: 0, extreme: 0 };
  for (const r of rows) counts[r.difficulty] = Number(r.count);
  return counts;
};

// ── Dashboard stats ───────────────────────────────────────────────────────────

export const getAdminStats = async () => {
  // Run all stat queries in parallel to reduce round-trips on a free server
  const [
    [{ totalQ }],
    [{ totalT }],
    [{ totalU }],
    diffRows,
    subjectRows,
    recentTests,
  ] = await Promise.all([
    db.select({ totalQ: count() }).from(questions),
    db.select({ totalT: count() }).from(generatedTests),
    db.select({ totalU: sql`COUNT(DISTINCT user_id)` }).from(generatedTests),
    db.select({ difficulty: questions.difficulty, cnt: count() })
      .from(questions)
      .groupBy(questions.difficulty),
    db.select({
      id: subjects.id,
      name: subjects.name,
      code: subjects.code,
      questionCount: sql`(SELECT COUNT(*) FROM questions WHERE questions.subject_id = ${subjects.id})`,
      chapterCount: sql`(SELECT COUNT(*) FROM chapters WHERE chapters.subject_id = ${subjects.id})`,
    }).from(subjects),
    db.select().from(generatedTests).orderBy(desc(generatedTests.createdAt)).limit(10),
  ]);

  return {
    totalQuestions: Number(totalQ),
    totalTests: Number(totalT),
    uniqueUsers: Number(totalU),
    byDifficulty: diffRows.map((d) => ({ difficulty: d.difficulty, count: Number(d.cnt) })),
    bySubject: subjectRows.map((s) => ({
      ...s,
      questionCount: Number(s.questionCount),
      chapterCount: Number(s.chapterCount),
    })),
    recentTests,
  };
};
