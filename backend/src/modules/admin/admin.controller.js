import {
  getAllSubjects, createSubject, updateSubject, deleteSubject,
  getAllChapters, createChapter, updateChapter, deleteChapter,
  getAllQuestions, createQuestion, updateQuestion, deleteQuestion,
  getAvailableCounts, getAdminStats,
} from "./admin.services.js";

const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req, res);
    return res.json(result);
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ message: "Not found." });
    if (err.message?.includes("unique")) return res.status(409).json({ message: "Duplicate entry – check name/code." });
    console.error("[admin]", err.message);
    return res.status(err.status || 400).json({ message: err.message || "Request failed." });
  }
};

// ── Auth check ────────────────────────────────────────────────────────────────
export const checkAdmin = handle(async () => ({ ok: true }));

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats = handle(async () => getAdminStats());

// ── Available counts (for generator) ─────────────────────────────────────────
export const getAvailable = handle(async (req) => {
  const { chapterId } = req.query;
  if (!chapterId) throw Object.assign(new Error("chapterId required"), { status: 400 });
  return getAvailableCounts(chapterId);
});

// ── Subjects ──────────────────────────────────────────────────────────────────
export const listSubjects = handle(async () => ({ subjects: await getAllSubjects() }));

export const addSubject = handle(async (req) => ({
  subject: await createSubject(req.body),
}));

export const editSubject = handle(async (req) => ({
  subject: await updateSubject(req.params.id, req.body),
}));

export const removeSubject = handle(async (req) => {
  await deleteSubject(req.params.id);
  return { ok: true };
});

// ── Chapters ──────────────────────────────────────────────────────────────────
export const listChapters = handle(async (req) => ({
  chapters: await getAllChapters(req.query.subjectId),
}));

export const addChapter = handle(async (req) => ({
  chapter: await createChapter(req.body),
}));

export const editChapter = handle(async (req) => ({
  chapter: await updateChapter(req.params.id, req.body),
}));

export const removeChapter = handle(async (req) => {
  await deleteChapter(req.params.id);
  return { ok: true };
});

// ── Questions ─────────────────────────────────────────────────────────────────
export const listQuestions = handle(async (req) => {
  const { chapterId, subjectId, difficulty, page, limit } = req.query;
  return getAllQuestions({
    chapterId,
    subjectId,
    difficulty,
    page: page ? Number(page) : 1,
    limit: limit ? Math.min(Number(limit), 100) : 50,
  });
});

export const addQuestion = handle(async (req) => ({
  question: await createQuestion(req.body),
}));

export const editQuestion = handle(async (req) => ({
  question: await updateQuestion(req.params.id, req.body),
}));

export const removeQuestion = handle(async (req) => {
  await deleteQuestion(req.params.id);
  return { ok: true };
});
