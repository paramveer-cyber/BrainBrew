import {
  fetchSubjects,
  fetchClasses,
  fetchChapters,
  buildTest,
  fetchTest,
  fetchMyTests,
  fetchStats,
} from "./generator.services.js";

export const getSubjects = async (req, res) => {
  try {
    const result = await fetchSubjects();
    return res.json({ subjects: result });
  } catch (err) {
    console.error("[subjects]", err.message);
    return res.status(500).json({ message: "Failed to fetch subjects" });
  }
};

export const getClasses = async (req, res) => {
  try {
    const { subjectId } = req.query;
    const classes = await fetchClasses(subjectId);
    return res.json({ classes });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch classes" });
  }
};

export const getChapters = async (req, res) => {
  try {
    const { subjectId, classLevel } = req.query;
    if (!subjectId) return res.status(400).json({ message: "subjectId required" });
    const result = await fetchChapters(subjectId, classLevel);
    return res.json({ chapters: result });
  } catch (err) {
    console.error("[chapters]", err.message);
    return res.status(500).json({ message: "Failed to fetch chapters" });
  }
};

export const generateTest = async (req, res) => {
  try {
    const { subjectId, chapterId, classLevel, config } = req.body;
    if (!subjectId || !chapterId || !config)
      return res.status(400).json({ message: "subjectId, chapterId, config required" });

    const { test, selectedIds, missing } = await buildTest(
      req.user.userId,
      subjectId,
      chapterId,
      classLevel,
      config
    );

    return res.json({
      testId: test.id,
      title: test.title,
      totalQuestions: selectedIds.length,
      missing,
    });
  } catch (err) {
    console.error("[generateTest]", err.message);
    if (err.message === "No questions found for this selection")
      return res.status(404).json({ message: err.message });
    if (err.message === "Must request at least 1 question")
      return res.status(400).json({ message: err.message });
    if (err.code === "INSUFFICIENT_QUESTIONS")
      return res.status(400).json({ message: err.message, violations: err.violations });
    return res.status(500).json({ message: "Failed to generate test" });
  }
};

export const getTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const data = await fetchTest(testId, req.user.userId);
    return res.json(data);
  } catch (err) {
    if (err.message === "NOT_FOUND") return res.status(404).json({ message: "Test not found" });
    if (err.message === "FORBIDDEN") return res.status(403).json({ message: "Forbidden" });
    console.error("[getTest]", err.message);
    return res.status(500).json({ message: "Failed to fetch test" });
  }
};

export const getMyTests = async (req, res) => {
  try {
    const tests = await fetchMyTests(req.user.userId);
    return res.json({ tests });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch tests" });
  }
};

export const getStats = async (req, res) => {
  try {
    const stats = await fetchStats();
    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
};
