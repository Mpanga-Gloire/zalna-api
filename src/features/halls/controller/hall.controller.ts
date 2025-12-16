// src/features/halls/controller/hall.controller.ts

import { NextFunction, Request, Response } from "express";
import { HallService } from "../service/hall.service";
import { HallQueryService } from "../service/hall-query.service";
import { HallStatus } from "../model/hall-status.enum";
import type {
  HallSearchFilters,
  HallSortBy,
} from "../interfaces/hall.interface";
import { ValidationError } from "../../../core/errors/AppError";
import { AuthenticatedRequest } from "../../../core/middleware/auth";

const hallService = new HallService();
const hallQueryService = new HallQueryService();

/**
 * HallController
 *
 * Express handlers for:
 * - Admin hall management (create, update, list, get by id)
 * - Host hall management (list/get/update own halls)
 * - Public hall discovery (list active halls, get by slug)
 */
export class HallController {
  // -------------------------
  // ADMIN HANDLERS
  // -------------------------

  static async createHall(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        slug,
        address,
        city,
        capacity,
        description,
        cancellationPolicy,
        isPremium,
        status,
        gerantId,
      } = req.body ?? {};

      if (!name) {
        throw new ValidationError("name is required");
      }

      // Optional: basic enum validation for status
      let hallStatus: HallStatus | undefined;
      if (status) {
        if (!Object.values(HallStatus).includes(status)) {
          throw new ValidationError("Invalid status value");
        }
        hallStatus = status;
      }

      const hall = await hallService.createHall({
        name,
        slug, // optional; server will generate if missing
        address,
        city,
        capacity: capacity !== undefined ? Number(capacity) : undefined,
        description,
        cancellationPolicy,
        isPremium,
        status: hallStatus,
        gerantId,
      });

      res.status(201).json(hall);
    } catch (err) {
      next(err);
    }
  }

  static async updateHall(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id || typeof id !== "string") {
        throw new ValidationError("Hall id is required and must be a string");
      }

      const {
        name,
        slug,
        address,
        city,
        capacity,
        description,
        cancellationPolicy,
        isPremium,
        status,
        gerantId,
      } = req.body ?? {};

      let hallStatus: HallStatus | undefined;
      if (status) {
        if (!Object.values(HallStatus).includes(status)) {
          throw new ValidationError("Invalid status value");
        }
        hallStatus = status;
      }

      const hall = await hallService.updateHall(id, {
        name,
        slug,
        address,
        city,
        capacity: capacity !== undefined ? Number(capacity) : undefined,
        description,
        cancellationPolicy,
        isPremium,
        status: hallStatus,
        gerantId,
      });

      res.json(hall);
    } catch (err) {
      next(err);
    }
  }

  static async getHallById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id || typeof id !== "string") {
        throw new ValidationError("Hall id is required and must be a string");
      }
      const hall = await hallService.getHallById(id);
      res.json(hall);
    } catch (err) {
      next(err);
    }
  }

  static async listAdminHalls(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { status, city, isPremium, page, limit } = req.query;

      let hallStatus: HallStatus | undefined;
      if (status && typeof status === "string") {
        if (!Object.values(HallStatus).includes(status as HallStatus)) {
          throw new ValidationError("Invalid status value");
        }
        hallStatus = status as HallStatus;
      }

      const isPremiumBool = typeof isPremium === "string"
        ? isPremium.toLowerCase() === "true"
        : undefined;

      const pageNum = typeof page === "string"
        ? parseInt(page, 10) || 1
        : undefined;
      const limitNum = typeof limit === "string"
        ? parseInt(limit, 10) || 20
        : undefined;

      const result = await hallService.listHalls({
        status: hallStatus,
        city: typeof city === "string" ? city : undefined,
        isPremium: isPremiumBool,
        page: pageNum,
        limit: limitNum,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // -------------------------
  // HOST HANDLERS (MY HALLS)
  // -------------------------

  /**
   * Host: list halls owned by current user.
   *
   * GET /api/host/halls
   *
   * Optional query:
   *  - status?: HallStatus
   *  - city?: string
   *  - isPremium?: boolean
   *  - page?: number
   *  - limit?: number
   */
  static async listHostHalls(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.currentUser?.userEntity) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const ownerId = req.currentUser.userEntity.id;

      const { status, city, isPremium, page, limit } = req.query;

      let hallStatus: HallStatus | undefined;
      if (status && typeof status === "string") {
        if (!Object.values(HallStatus).includes(status as HallStatus)) {
          throw new ValidationError("Invalid status value");
        }
        hallStatus = status as HallStatus;
      }

      const isPremiumBool = typeof isPremium === "string"
        ? isPremium.toLowerCase() === "true"
        : undefined;

      const pageNum = typeof page === "string"
        ? parseInt(page, 10) || 1
        : undefined;
      const limitNum = typeof limit === "string"
        ? parseInt(limit, 10) || 20
        : undefined;

      const result = await hallService.listHalls({
        status: hallStatus,
        city: typeof city === "string" ? city : undefined,
        isPremium: isPremiumBool,
        gerantId: ownerId, // 👈 only my halls
        page: pageNum,
        limit: limitNum,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Host: get a single hall owned by current user.
   *
   * GET /api/host/halls/:id
   */
  static async getHostHallById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.currentUser?.userEntity) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const ownerId = req.currentUser.userEntity.id;
      const { id } = req.params;

      if (!id || typeof id !== "string") {
        throw new ValidationError("Hall id is required and must be a string");
      }

      const hall = await hallService.getHallById(id);

      if (hall.gerantId !== ownerId) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "You do not have access to this hall",
        });
      }

      res.json(hall);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Host: update a hall owned by current user.
   *
   * PATCH /api/host/halls/:id
   *
   * NOTE:
   *  - Host cannot change gerantId via this endpoint.
   */
  static async updateHostHall(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.currentUser?.userEntity) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const ownerId = req.currentUser.userEntity.id;
      const { id } = req.params;

      if (!id || typeof id !== "string") {
        throw new ValidationError("Hall id is required and must be a string");
      }

      const existing = await hallService.getHallById(id);

      if (existing.gerantId !== ownerId) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "You do not have access to this hall",
        });
      }

      const {
        name,
        slug,
        address,
        city,
        capacity,
        description,
        cancellationPolicy,
        isPremium,
        status,
        // ❌ gerantId is intentionally ignored for host updates
      } = req.body ?? {};

      let hallStatus: HallStatus | undefined;
      if (status) {
        if (!Object.values(HallStatus).includes(status)) {
          throw new ValidationError("Invalid status value");
        }
        hallStatus = status;
      }

      const updated = await hallService.updateHall(id, {
        name,
        slug,
        address,
        city,
        capacity: capacity !== undefined ? Number(capacity) : undefined,
        description,
        cancellationPolicy,
        isPremium,
        status: hallStatus,
        // gerantId: undefined  👈 host cannot change owner
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  // -------------------------
  // PUBLIC HANDLERS
  // -------------------------

  static async listPublicHalls(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const {
        q,
        city,
        eventType,
        date,
        capacityMin,
        capacityMax,
        priceMin,
        priceMax,
        isPremium,
        features,
        sortBy,
        page,
        limit,
      } = req.query;

      const pageNum = typeof page === "string" && page.trim()
        ? Math.max(parseInt(page, 10) || 1, 1)
        : 1;

      const rawLimit = typeof limit === "string" && limit.trim()
        ? parseInt(limit, 10) || 20
        : 20;

      const limitNum = Math.min(Math.max(rawLimit, 1), 50);

      const isPremiumBool = typeof isPremium === "string"
        ? isPremium.toLowerCase() === "true"
        : undefined;

      const parseNumber = (value: unknown): number | undefined => {
        if (typeof value !== "string" || !value.trim()) return undefined;
        const n = Number(value);
        return Number.isNaN(n) ? undefined : n;
      };

      const capacityMinNum = parseNumber(capacityMin);
      const capacityMaxNum = parseNumber(capacityMax);
      const priceMinNum = parseNumber(priceMin);
      const priceMaxNum = parseNumber(priceMax);

      let featuresList: string[] | undefined;
      if (typeof features === "string" && features.trim()) {
        featuresList = features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean);
      }

      const allowedSortBy: HallSortBy[] = [
        "relevance",
        "price_asc",
        "price_desc",
        "capacity_desc",
        "featured",
      ];
      const sortByValue = typeof sortBy === "string" &&
          allowedSortBy.includes(sortBy as HallSortBy)
        ? (sortBy as HallSortBy)
        : undefined;

      const filters: HallSearchFilters = {
        q: typeof q === "string" && q.trim() ? q.trim() : undefined,
        city: typeof city === "string" && city.trim() ? city.trim() : undefined,
        eventType: typeof eventType === "string" && eventType.trim()
          ? eventType.trim()
          : undefined,
        date: typeof date === "string" && date.trim() ? date.trim() : undefined,
        capacityMin: capacityMinNum,
        capacityMax: capacityMaxNum,
        priceMin: priceMinNum,
        priceMax: priceMaxNum,
        isPremium: isPremiumBool,
        features: featuresList,
        sortBy: sortByValue,
        page: pageNum,
        limit: limitNum,
      };

      const result = await hallQueryService.getPublicHallList(filters);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getPublicHallBySlug(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { slug } = req.params;

      if (!slug || typeof slug !== "string") {
        throw new ValidationError("Hall slug is required and must be a string");
      }
      const hall = await hallQueryService.getPublicHallDetail(slug);
      res.json(hall);
    } catch (err) {
      next(err);
    }
  }
}
