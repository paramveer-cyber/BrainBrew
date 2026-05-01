import { db } from "../../db/index.js";
import { questions, generatedTests, subjects, chapters } from "../../db/schema.js";
import { eq, and, inArray, sql } from "drizzle-orm";

const DIFFICULTIES = ["easy", "medium", "difficult", "extreme"];

export const fetchSubjects = async () => {
  return db.select().from(subjects);
};

export const fetchClasses = async (subjectId) => {
  const where = subjectId ? eq(chapters.subjectId, subjectId) : undefined;
  const rows = where
    ? await db.selectDistinct({ classLevel: chapters.classLevel }).from(chapters).where(where)
    : await db.selectDistinct({ classLevel: chapters.classLevel }).from(chapters);
  return rows.map((r) => r.classLevel);
};

export const fetchChapters = async (subjectId, classLevel) => {
  if (!subjectId) throw new Error("subjectId required");
  const where = classLevel
    ? and(eq(chapters.subjectId, subjectId), eq(chapters.classLevel, classLevel))
    : eq(chapters.subjectId, subjectId);
  return db.select().from(chapters).where(where);
};

/**
 * Build a test from a single chapter (legacy mode).
 */
export const buildTest = async (userId, subjectId, chapterId, classLevel, config) => {
  const totalRequested = Object.values(config).reduce((a, b) => a + (Number(b) || 0), 0);
  if (totalRequested === 0) throw new Error("Must request at least 1 question");

  const availRows = await db
    .select({ difficulty: questions.difficulty, cnt: sql`COUNT(*)` })
    .from(questions)
    .where(eq(questions.chapterId, chapterId))
    .groupBy(questions.difficulty);

  const available = { easy: 0, medium: 0, difficult: 0, extreme: 0 };
  for (const r of availRows) available[r.difficulty] = Number(r.cnt);

  const violations = [];
  for (const diff of DIFFICULTIES) {
    const requested = Number(config[diff] || 0);
    if (requested > 0 && requested > available[diff]) {
      violations.push({ difficulty: diff, requested, available: available[diff] });
    }
  }
  if (violations.length > 0) {
    const details = violations
      .map((v) => `${v.difficulty}: requested ${v.requested}, only ${v.available} available`)
      .join("; ");
    throw Object.assign(new Error(`Not enough questions: ${details}`), {
      code: "INSUFFICIENT_QUESTIONS",
      violations,
    });
  }

  const selectedIds = [];
  const missing = [];

  for (const diff of DIFFICULTIES) {
    const count = Number(config[diff] || 0);
    if (count === 0) continue;

    const pool = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(questions.chapterId, chapterId), eq(questions.difficulty, diff)))
      .orderBy(sql`RANDOM()`)
      .limit(count);

    pool.forEach((q) => selectedIds.push(q.id));
  }

  if (selectedIds.length === 0) throw new Error("No questions found for this selection");

  const subject = await db.query.subjects.findFirst({ where: eq(subjects.id, subjectId) });
  const chapter = await db.query.chapters.findFirst({ where: eq(chapters.id, chapterId) });

  const title = `${subject?.name || "Test"} – ${chapter?.name || "Chapter"} (Class ${classLevel || chapter?.classLevel})`;

  const [test] = await db
    .insert(generatedTests)
    .values({
      userId,
      subjectId,
      chapterId,
      classLevel: classLevel || chapter?.classLevel || "unknown",
      config,
      questionIds: selectedIds,
      title,
      status: "completed",
    })
    .returning();

  return { test, selectedIds, missing };
};

/**
 * Build a test from multiple chapters with per-chapter configs (multi-chapter mode).
 * chaptersPayload: Array of { chapterId, weight, config: { easy, medium, difficult, extreme } }
 */
export const buildMultiChapterTest = async (userId, subjectId, classLevel, globalConfig, chaptersPayload) => {
  if (!chaptersPayload || chaptersPayload.length === 0)
    throw new Error("At least one chapter required");

  const totalRequested = chaptersPayload.reduce((sum, ch) => {
    return sum + Object.values(ch.config).reduce((a, b) => a + (Number(b) || 0), 0);
  }, 0);
  if (totalRequested === 0) throw new Error("Must request at least 1 question");

  const allViolations = [];
  const allSelectedIds = [];
  const missing = [];

  // Validate and select per chapter
  for (const ch of chaptersPayload) {
    const { chapterId, config: chConfig } = ch;

    const availRows = await db
      .select({ difficulty: questions.difficulty, cnt: sql`COUNT(*)` })
      .from(questions)
      .where(eq(questions.chapterId, chapterId))
      .groupBy(questions.difficulty);

    const available = { easy: 0, medium: 0, difficult: 0, extreme: 0 };
    for (const r of availRows) available[r.difficulty] = Number(r.cnt);

    for (const diff of DIFFICULTIES) {
      const requested = Number(chConfig[diff] || 0);
      if (requested > 0 && requested > available[diff]) {
        const chapterRow = await db.query.chapters.findFirst({ where: eq(chapters.id, chapterId) });
        allViolations.push({
          difficulty: diff,
          requested,
          available: available[diff],
          chapter: chapterRow?.name || chapterId,
        });
      }
    }
  }

  if (allViolations.length > 0) {
    const details = allViolations
      .map((v) => `${v.chapter}/${v.difficulty}: requested ${v.requested}, only ${v.available} available`)
      .join("; ");
    throw Object.assign(new Error(`Not enough questions: ${details}`), {
      code: "INSUFFICIENT_QUESTIONS",
      violations: allViolations,
    });
  }

  // Select questions per chapter
  for (const ch of chaptersPayload) {
    const { chapterId, config: chConfig } = ch;
    for (const diff of DIFFICULTIES) {
      const count = Number(chConfig[diff] || 0);
      if (count === 0) continue;

      const pool = await db
        .select({ id: questions.id })
        .from(questions)
        .where(and(eq(questions.chapterId, chapterId), eq(questions.difficulty, diff)))
        .orderBy(sql`RANDOM()`)
        .limit(count);

      pool.forEach((q) => allSelectedIds.push(q.id));
    }
  }

  if (allSelectedIds.length === 0) throw new Error("No questions found for this selection");

  const subject = await db.query.subjects.findFirst({ where: eq(subjects.id, subjectId) });

  // Build title from chapter names
  const chapterNames = await Promise.all(
    chaptersPayload.map(ch =>
      db.query.chapters.findFirst({ where: eq(chapters.id, ch.chapterId) })
    )
  );
  const chapterLabel = chapterNames
    .map(c => c?.name || "?")
    .join(", ");

  const title = `${subject?.name || "Test"} – ${chapterLabel} (Class ${classLevel || "?"})`;

  // Use first chapterId for schema compat (chapterId column); store full payload in config
  const primaryChapterId = chaptersPayload[0].chapterId;

  const [test] = await db
    .insert(generatedTests)
    .values({
      userId,
      subjectId,
      chapterId: primaryChapterId,
      classLevel: classLevel || chapterNames[0]?.classLevel || "unknown",
      config: { ...globalConfig, _chapters: chaptersPayload },
      questionIds: allSelectedIds,
      title,
      status: "completed",
    })
    .returning();

  return { test, selectedIds: allSelectedIds, missing };
};

export const fetchTest = async (testId, userId) => {
  const test = await db.query.generatedTests.findFirst({ where: eq(generatedTests.id, testId) });
  if (!test) throw new Error("NOT_FOUND");
  if (test.userId !== userId) throw new Error("FORBIDDEN");

  const qList = await db.select().from(questions).where(inArray(questions.id, test.questionIds));
  return { test, questions: qList };
};

export const fetchMyTests = async (userId) => {
  return db
    .select()
    .from(generatedTests)
    .where(eq(generatedTests.userId, userId))
    .orderBy(sql`created_at DESC`)
    .limit(20);
};

export const fetchStats = async () => {
  const [qCount] = await db.select({ count: sql`COUNT(*)` }).from(questions);
  const [tCount] = await db.select({ count: sql`COUNT(*)` }).from(generatedTests);
  const [uCount] = await db.select({ count: sql`COUNT(DISTINCT user_id)` }).from(generatedTests);
  const diffCounts = await db
    .select({ difficulty: questions.difficulty, count: sql`COUNT(*)` })
    .from(questions)
    .groupBy(questions.difficulty);
  const recent = await db.select().from(generatedTests).orderBy(sql`created_at DESC`).limit(5);

  return {
    totalQuestions: Number(qCount.count),
    totalTests: Number(tCount.count),
    uniqueUsers: Number(uCount.count),
    byDifficulty: diffCounts,
    recentTests: recent,
  };
};