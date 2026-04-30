import { Router } from "express";
import {
  getSubjects,
  getChapters,
  getClasses,
  generateTest,
  getTest,
  getMyTests,
  getStats,
} from "./generator.controller.js";
import { authMiddleware } from "../../common/middlewares/auth.middleware.js";

const router = Router();

router.get("/subjects", authMiddleware, getSubjects);
router.get("/classes", authMiddleware, getClasses);
router.get("/chapters", authMiddleware, getChapters);
router.post("/generate", authMiddleware, generateTest);
router.get("/tests/me", authMiddleware, getMyTests);
router.get("/tests/:testId", authMiddleware, getTest);
router.get("/stats", authMiddleware, getStats);

export default router;
