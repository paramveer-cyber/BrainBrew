import { Router } from "express";
import { authMiddleware } from "../../common/middlewares/auth.middleware.js";
import { adminMiddleware } from "../../common/middlewares/admin.middleware.js";
import {
  checkAdmin, getStats, getAvailable,
  listSubjects, addSubject, editSubject, removeSubject,
  listChapters, addChapter, editChapter, removeChapter,
  listQuestions, addQuestion, editQuestion, removeQuestion,
} from "./admin.controller.js";

const router = Router();

// Available counts: auth only (used by generator page for real-time validation)
router.get("/available", authMiddleware, getAvailable);

// All other admin routes require auth + admin password
router.use(authMiddleware, adminMiddleware);

router.get("/check", checkAdmin);
router.get("/stats", getStats);

// Subjects
router.get("/subjects",        listSubjects);
router.post("/subjects",       addSubject);
router.put("/subjects/:id",    editSubject);
router.delete("/subjects/:id", removeSubject);

// Chapters
router.get("/chapters",        listChapters);   // ?subjectId= optional
router.post("/chapters",       addChapter);
router.put("/chapters/:id",    editChapter);
router.delete("/chapters/:id", removeChapter);

// Questions
router.get("/questions",        listQuestions); // ?chapterId= ?subjectId= ?difficulty= ?page= ?limit=
router.post("/questions",       addQuestion);
router.put("/questions/:id",    editQuestion);
router.delete("/questions/:id", removeQuestion);

export default router;
