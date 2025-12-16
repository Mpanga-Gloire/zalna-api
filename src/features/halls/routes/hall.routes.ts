// src/features/halls/routes/hall.routes.ts

import { Router } from "express";
import { HallController } from "../controller/hall.controller";
import { requireAdmin, requireAuth } from "../../../core/middleware/auth";

export const adminHallRouter = Router();
export const publicHallRouter = Router();
export const hostHallRouter = Router(); // 👈 NEW

// =======================
// Admin Hall Routes
// Base path: /api/admin/halls
// =======================

// Create hall
adminHallRouter.post(
  "/",
  requireAuth,
  requireAdmin(), // ADMIN or SUPER_ADMIN only
  HallController.createHall,
);

// List halls (with filters)
adminHallRouter.get(
  "/",
  requireAuth,
  requireAdmin(),
  HallController.listAdminHalls,
);

// Get hall by ID
adminHallRouter.get(
  "/:id",
  requireAuth,
  requireAdmin(),
  HallController.getHallById,
);

// Update hall by ID
adminHallRouter.patch(
  "/:id",
  requireAuth,
  requireAdmin(),
  HallController.updateHall,
);

// =======================
// Host Hall Routes
// Base path: /api/host/halls
// =======================

hostHallRouter.use(requireAuth); // all host routes require login

// List halls for current host
hostHallRouter.get("/", HallController.listHostHalls);

// Get a single hall owned by current host
hostHallRouter.get("/:id", HallController.getHostHallById);

// Update a hall owned by current host
hostHallRouter.patch("/:id", HallController.updateHostHall);

// =======================
// Public Hall Routes
// Base path: /api/public/halls
// =======================

// List active halls (no auth)
publicHallRouter.get("/", HallController.listPublicHalls);

// Get hall by slug (no auth)
publicHallRouter.get("/:slug", HallController.getPublicHallBySlug);
