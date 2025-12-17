import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { env } from "../config/env";
import { registerRoutes } from "../routes";
import { AppError } from "./errors/AppError";

export function createApp(): Application {
  const app = express();

  // Core middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const allowedOrigins = env.cors.allowedOrigins;
  const allowAllOrigins = allowedOrigins.includes("*");

  app.use(
    cors({
      origin: allowAllOrigins
        ? true
        : (origin, callback) => {
            // Allow non-browser clients (curl/Postman/server-to-server) with no Origin header.
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(null, false);
          },
      credentials: !allowAllOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 204,
    }),
  );
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(morgan(env.isDev ? "dev" : "combined"));

  // Static file serving for uploaded media (local development)
  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  app.use("/uploads", express.static(uploadsRoot));

  // Health check route
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      env: env.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });

  // Register main routes (placeholder)
  registerRoutes(app);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: "Not Found" });
  });

  // Basic error handler

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, req: Request, res: Response, next: Function) => {
    console.error("Unhandled error:", err);

    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        message: err.message,
      });
    }

    // Fallback for unexpected errors
    return res.status(500).json({
      message: "Internal Server Error",
    });
  });

  return app;
}
