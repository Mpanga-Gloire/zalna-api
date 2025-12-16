import { Request, Response, NextFunction } from "express";
import { PricingService } from "../service/pricing.service";
import { ValidationError } from "../../../core/errors/AppError";

const pricingService = new PricingService();

/**
 * AdminPricingController
 *
 * Admin endpoints to manage:
 *  - Hall products
 *  - Product rates
 *  - Addons
 *  - Blocked dates
 *
 * All routes are nested under:
 *  /api/admin/halls/:hallId/pricing/...
 */
export class AdminPricingController {
  // =========================
  // Hall Products
  // =========================

  /**
   * POST /api/admin/halls/:hallId/pricing/products
   */
  static async createHallProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { hallId } = req.params;
      const { name, category, description, isPrimary, isActive } =
        req.body ?? {};

      if (!hallId) {
        throw new ValidationError("hallId is required in route params");
      }
      if (!name || typeof name !== "string") {
        throw new ValidationError("name is required");
      }

      const product = await pricingService.createHallProduct({
        hallId,
        name,
        category,
        description,
        isPrimary,
        isActive,
      });

      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/halls/:hallId/pricing/products
   */
  static async listHallProducts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { hallId } = req.params;
      const { isActive } = req.query;

      if (!hallId) {
        throw new ValidationError("hallId is required in route params");
      }

      const isActiveBool =
        typeof isActive === "string"
          ? isActive.toLowerCase() === "true"
          : undefined;

      const products = await pricingService.listHallProducts({
        hallId,
        isActive: isActiveBool,
      });

      res.json(products);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/halls/:hallId/pricing/products/:productId
   */
  static async getHallProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { hallId, productId } = req.params;

      if (!hallId || !productId) {
        throw new ValidationError("hallId and productId are required");
      }

      const product = await pricingService.getHallProductById(productId);

      // Safety: ensure product belongs to this hall
      if (product.hallId !== hallId) {
        throw new ValidationError("Product does not belong to this hall");
      }

      res.json(product);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/admin/halls/:hallId/pricing/products/:productId
   */
  static async updateHallProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { hallId, productId } = req.params;
      const { name, category, description, isPrimary, isActive } =
        req.body ?? {};

      if (!hallId || !productId) {
        throw new ValidationError("hallId and productId are required");
      }

      // Ensure belongs to hall
      const existing = await pricingService.getHallProductById(productId);
      if (existing.hallId !== hallId) {
        throw new ValidationError("Product does not belong to this hall");
      }

      const updated = await pricingService.updateHallProduct(productId, {
        name,
        category,
        description,
        isPrimary,
        isActive,
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  // =========================
  // Hall Product Rates
  // =========================

  /**
   * POST /api/admin/halls/:hallId/pricing/products/:productId/rates
   */
  static async createHallProductRate(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { hallId, productId } = req.params;
      const {
        label,
        currency,
        price,
        billingUnit,
        minHours,
        maxHours,
        extraUnitPrice,
        dayOfWeekMask,
        seasonStart,
        seasonEnd,
        isDefault,
      } = req.body ?? {};

      if (!hallId || !productId) {
        throw new ValidationError("hallId and productId are required");
      }

      if (!label || !currency || price === undefined || !billingUnit) {
        throw new ValidationError(
          "label, currency, price and billingUnit are required"
        );
      }

      // Ensure product belongs to hall
      const product = await pricingService.getHallProductById(productId);
      if (product.hallId !== hallId) {
        throw new ValidationError("Product does not belong to this hall");
      }

      const numPrice = Number(price);
      if (Number.isNaN(numPrice)) {
        throw new ValidationError("price must be a number");
      }

      const numMinHours =
        minHours !== undefined && minHours !== null
          ? Number(minHours)
          : undefined;
      const numMaxHours =
        maxHours !== undefined && maxHours !== null
          ? Number(maxHours)
          : undefined;
      const numExtraUnitPrice =
        extraUnitPrice !== undefined && extraUnitPrice !== null
          ? Number(extraUnitPrice)
          : undefined;

      const rate = await pricingService.createHallProductRate({
        hallProductId: productId,
        label,
        currency,
        price: numPrice,
        billingUnit,
        minHours: numMinHours,
        maxHours: numMaxHours,
        extraUnitPrice: numExtraUnitPrice,
        dayOfWeekMask,
        seasonStart,
        seasonEnd,
        isDefault,
      });

      res.status(201).json(rate);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/halls/:hallId/pricing/products/:productId/rates
   */
  static async listHallProductRates(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { hallId, productId } = req.params;

      if (!hallId || !productId) {
        throw new ValidationError("hallId and productId are required");
      }

      // Ensure product belongs to hall
      const product = await pricingService.getHallProductById(productId);
      if (product.hallId !== hallId) {
        throw new ValidationError("Product does not belong to this hall");
      }

      const rates = await pricingService.listHallProductRates(productId);
      res.json(rates);
    } catch (err) {
      next(err);
    }
  }

  // =========================
  // Hall Addons
  // =========================

  /**
   * POST /api/admin/halls/:hallId/pricing/addons
   */
  static async createHallAddon(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { hallId } = req.params;
      const {
        name,
        description,
        pricingModel,
        currency,
        unitPrice,
        packSize,
        redevanceAmount,
        isActive,
      } = req.body ?? {};

      if (!hallId) {
        throw new ValidationError("hallId is required in route params");
      }

      if (!name || !pricingModel || !currency || unitPrice === undefined) {
        throw new ValidationError(
          "name, pricingModel, currency and unitPrice are required"
        );
      }

      const numUnitPrice = Number(unitPrice);
      if (Number.isNaN(numUnitPrice)) {
        throw new ValidationError("unitPrice must be a number");
      }

      const numPackSize =
        packSize !== undefined && packSize !== null
          ? Number(packSize)
          : undefined;
      const numRedevance =
        redevanceAmount !== undefined && redevanceAmount !== null
          ? Number(redevanceAmount)
          : undefined;

      const addon = await pricingService.createHallAddon({
        hallId,
        name,
        description,
        pricingModel,
        currency,
        unitPrice: numUnitPrice,
        packSize: numPackSize,
        redevanceAmount: numRedevance,
        isActive,
      });

      res.status(201).json(addon);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/halls/:hallId/pricing/addons
   */
  static async listHallAddons(req: Request, res: Response, next: NextFunction) {
    try {
      const { hallId } = req.params;
      const { isActive } = req.query;

      if (!hallId) {
        throw new ValidationError("hallId is required in route params");
      }

      const isActiveBool =
        typeof isActive === "string"
          ? isActive.toLowerCase() === "true"
          : undefined;

      const addons = await pricingService.listHallAddons({
        hallId,
        isActive: isActiveBool,
      });

      res.json(addons);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/halls/:hallId/pricing/addons/:addonId
   */
  static async getHallAddon(req: Request, res: Response, next: NextFunction) {
    try {
      const { hallId, addonId } = req.params;

      if (!hallId || !addonId) {
        throw new ValidationError("hallId and addonId are required");
      }

      const addon = await pricingService.getHallAddonById(addonId);
      if (addon.hallId !== hallId) {
        throw new ValidationError("Addon does not belong to this hall");
      }

      res.json(addon);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/admin/halls/:hallId/pricing/addons/:addonId
   */
  static async updateHallAddon(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { hallId, addonId } = req.params;
      const {
        name,
        description,
        pricingModel,
        currency,
        unitPrice,
        packSize,
        redevanceAmount,
        isActive,
      } = req.body ?? {};

      if (!hallId || !addonId) {
        throw new ValidationError("hallId and addonId are required");
      }

      const existing = await pricingService.getHallAddonById(addonId);
      if (existing.hallId !== hallId) {
        throw new ValidationError("Addon does not belong to this hall");
      }

      const numUnitPrice =
        unitPrice !== undefined && unitPrice !== null
          ? Number(unitPrice)
          : undefined;
      if (unitPrice !== undefined && Number.isNaN(numUnitPrice)) {
        throw new ValidationError("unitPrice must be a number");
      }

      const numPackSize =
        packSize !== undefined && packSize !== null
          ? Number(packSize)
          : undefined;

      const numRedevance =
        redevanceAmount !== undefined && redevanceAmount !== null
          ? Number(redevanceAmount)
          : undefined;

      const addon = await pricingService.updateHallAddon(addonId, {
        name,
        description,
        pricingModel,
        currency,
        unitPrice: numUnitPrice,
        packSize: numPackSize,
        redevanceAmount: numRedevance,
        isActive,
      });

      res.json(addon);
    } catch (err) {
      next(err);
    }
  }

  // =========================
  // Hall Blocked Dates
  // =========================

  /**
   * POST /api/admin/halls/:hallId/pricing/blocked-dates
   */
  static async createHallBlockedDate(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { hallId } = req.params;
      const { startDate, endDate, reason, createdByUserId } = req.body ?? {};

      if (!hallId) {
        throw new ValidationError("hallId is required in route params");
      }
      if (!startDate) {
        throw new ValidationError("startDate is required");
      }

      const block = await pricingService.createHallBlockedDate({
        hallId,
        startDate,
        endDate,
        reason,
        createdByUserId,
      });

      res.status(201).json(block);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/halls/:hallId/pricing/blocked-dates
   *
   * Query:
   *  - fromDate?: YYYY-MM-DD
   *  - toDate?: YYYY-MM-DD
   */
  static async listHallBlockedDates(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { hallId } = req.params;
      const { fromDate, toDate } = req.query;

      if (!hallId) {
        throw new ValidationError("hallId is required in route params");
      }

      const blocks = await pricingService.listHallBlockedDates({
        hallId,
        fromDate:
          typeof fromDate === "string" && fromDate.trim()
            ? fromDate
            : undefined,
        toDate:
          typeof toDate === "string" && toDate.trim() ? toDate : undefined,
      });

      res.json(blocks);
    } catch (err) {
      next(err);
    }
  }
}
