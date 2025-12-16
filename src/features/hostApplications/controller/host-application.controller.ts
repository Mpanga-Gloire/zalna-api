// src/features/hostApplications/controller/host-application.controller.ts

import { NextFunction, Request, Response } from "express";
import { HostApplicationService } from "../service/host-application.service";
import { HostApplicationStatus } from "../model/host-application-status.enum";
import { ValidationError } from "../../../core/errors/AppError";
import { AuthenticatedRequest } from "../../../core/middleware/auth";

const hostAppService = new HostApplicationService();

/**
 * HostApplicationController
 *
 * Handles:
 * - Public "Become a host" submission
 * - Admin listing, viewing and updating status of host applications
 */
export class HostApplicationController {
  /**
   * Public: "Become a host" form submission.
   *
   * POST /api/public/host-applications
   *
   * Body:
   * {
   *   hallName: string;
   *   address?: string;
   *   city?: string;
   *   capacity?: number;
   *   description?: string;
   *   additionalDetails?: string;
   *
   *   contactName: string;
   *   contactEmail: string;
   *   contactPhone?: string;
   *   contactWhatsapp?: string;
   * }
   */
  static async createHostApplication(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const {
        hallName,
        address,
        city,
        capacity,
        description,
        additionalDetails,
        contactName,
        contactEmail,
        contactPhone,
        contactWhatsapp,
      } = req.body ?? {};

      if (!hallName || !contactName || !contactEmail) {
        throw new ValidationError(
          "hallName, contactName and contactEmail are required",
        );
      }

      if (typeof contactEmail !== "string" || !contactEmail.includes("@")) {
        throw new ValidationError("Invalid contactEmail");
      }

      const capacityNum = capacity !== undefined && capacity !== null
        ? Number(capacity)
        : undefined;

      if (capacityNum !== undefined && Number.isNaN(capacityNum)) {
        throw new ValidationError("capacity must be a number");
      }

      const applicantUserId = req.currentUser?.userEntity.id ?? undefined;

      const app = await hostAppService.createHostApplication({
        hallName,
        address,
        city,
        capacity: capacityNum,
        description,
        additionalDetails,
        contactName,
        contactEmail,
        contactPhone,
        contactWhatsapp,
        applicantUserId, // ✅ link to logged-in user
      });

      res.status(201).json(app);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: list host applications with filters.
   *
   * GET /api/admin/host-applications
   *
   * Query:
   *  - status?: NEW | UNDER_REVIEW | APPROVED | REJECTED
   *  - city?: string
   *  - search?: string (hallName/contactName/contactEmail)
   *  - page?: number
   *  - limit?: number
   */
  static async listHostApplications(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { status, city, search, page, limit } = req.query;

      let hostStatus: HostApplicationStatus | undefined;
      if (status && typeof status === "string") {
        if (!Object.values(HostApplicationStatus).includes(status as any)) {
          throw new ValidationError("Invalid status value");
        }
        hostStatus = status as HostApplicationStatus;
      }

      const pageNum = typeof page === "string"
        ? parseInt(page, 10) || 1
        : undefined;
      const limitNum = typeof limit === "string"
        ? parseInt(limit, 10) || 20
        : undefined;

      const result = await hostAppService.listHostApplications({
        status: hostStatus,
        city: typeof city === "string" ? city : undefined,
        search: typeof search === "string" ? search : undefined,
        page: pageNum,
        limit: limitNum,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: get a single host application by ID.
   *
   * GET /api/admin/host-applications/:id
   */
  static async getHostApplicationById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      if (!id || typeof id !== "string") {
        throw new ValidationError(
          "id parameter is required and must be a string",
        );
      }
      const app = await hostAppService.getHostApplicationById(id);
      res.json(app);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: update host application status + internal notes.
   *
   * PATCH /api/admin/host-applications/:id/status
   *
   * Body:
   * {
   *   status: "NEW" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
   *   adminNotes?: string;
   *   reviewedByUserId?: string; // once you have real admin users
   * }
   */
  static async updateHostApplicationStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body ?? {};

      if (!id) {
        throw new ValidationError("ID parameter is required");
      }

      if (!status) {
        throw new ValidationError("status is required");
      }

      if (!Object.values(HostApplicationStatus).includes(status)) {
        throw new ValidationError("Invalid status value");
      }

      const reviewerId = req.currentUser?.userEntity.id;

      const updated = await hostAppService.updateHostApplicationStatus(id, {
        status,
        adminNotes,
        reviewedByUserId: reviewerId, // ✅ always reviewer = logged-in admin
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
}
