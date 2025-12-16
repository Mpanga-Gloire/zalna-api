import { Application, Request, Response } from "express";
import {
  adminHallRouter,
  publicHallRouter,
} from "../features/halls/routes/hall.routes";
import {
  adminHostApplicationRouter,
  publicHostApplicationRouter,
} from "../features/hostApplications/routes/host-application.routes";
import {
  adminHallMediaRouter,
  publicHallMediaRouter,
} from "../features/media/routes/media.routes";
import { adminHallPricingRouter } from "../features/pricing/routes/admin-pricing.routes";
import authRoutes from "../features/users/route/authRoutes";

export function registerRoutes(app: Application): void {
  // Root route
  app.get("/", (req: Request, res: Response) => {
    res.json({ message: "Zalna API is running" });
  });

  // 👇 Auth routes (Supabase-authenticated)
  app.use("/api/auth", authRoutes);

  // Admin API routes
  app.use("/api/admin/halls", adminHallRouter);
  app.use("/api/admin/host-applications", adminHostApplicationRouter);
  app.use("/api/admin/halls/:hallId/media", adminHallMediaRouter);
  app.use("/api/admin/halls/:hallId/pricing", adminHallPricingRouter);

  // Public API routes
  app.use("/api/public/halls", publicHallRouter);
  app.use("/api/public/host-applications", publicHostApplicationRouter);
  app.use("/api/public/halls/:hallId/media", publicHallMediaRouter);

  // In future:
  // app.use("/api/admin/media", adminMediaRouter);
  // app.use("/api/public/media", publicMediaRouter);
}
