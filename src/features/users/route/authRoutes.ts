import { Router } from "express";
import { requireAuth } from "../../../core/middleware/auth";
import { emailPasswordLogin, getMe } from "../controller/authController";

const router = Router();

// POST /api/auth/login/email
router.post("/login/email", emailPasswordLogin);

// GET /api/auth/me
router.get("/me", requireAuth, getMe);

export default router;
