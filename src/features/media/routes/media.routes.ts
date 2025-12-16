import { Router } from "express";
import multer from "multer";
import { MediaController } from "../controller/media.controller";
import { ValidationError } from "../../../core/errors/AppError";

// Only accept image files for now
const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new ValidationError("Only image files are allowed (image/*)"));
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Routers with mergeParams so :hallId from parent path is visible
export const adminHallMediaRouter = Router({ mergeParams: true });
export const publicHallMediaRouter = Router({ mergeParams: true });

// =======================
// Admin routes
// Base: /api/admin/halls/:hallId/media
// =======================

// Upload media for a hall
adminHallMediaRouter.post(
  "/",
  upload.array("file"),
  MediaController.uploadHallMedia
);

// List media for a hall (admin)
adminHallMediaRouter.get("/", MediaController.listHallMedia);

// =======================
// Public routes
// Base: /api/public/halls/:hallId/media
// =======================

// List media for a hall (public)
publicHallMediaRouter.get("/", MediaController.listHallMedia);
