// src/features/hostApplications/routes/host-application.routes.ts

import { Router } from "express";
import { HostApplicationController } from "../controller/host-application.controller";
import { requireAdmin, requireAuth } from "../../../core/middleware/auth";

export const publicHostApplicationRouter = Router();
export const adminHostApplicationRouter = Router();

// =======================
// Public routes
// Base: /api/public/host-applications
// =======================

// "Become a host" form submission
// ✅ Must be logged in, but still under /public path
publicHostApplicationRouter.post(
  "/",
  requireAuth,
  HostApplicationController.createHostApplication,
);

// =======================
// Admin routes
// Base: /api/admin/host-applications
// =======================

// List applications
adminHostApplicationRouter.get(
  "/",
  requireAuth,
  requireAdmin(),
  HostApplicationController.listHostApplications,
);

// Get single application
adminHostApplicationRouter.get(
  "/:id",
  requireAuth,
  requireAdmin(),
  HostApplicationController.getHostApplicationById,
);

// Update status
adminHostApplicationRouter.patch(
  "/:id/status",
  requireAuth,
  requireAdmin(),
  HostApplicationController.updateHostApplicationStatus,
);
