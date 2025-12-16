// src/features/pricing/service/pricing.service.ts

import { Repository } from "typeorm";
import { AppDataSource } from "../../../config/database";

import { HallProduct } from "../model/hall-product.entity";
import { HallProductRate } from "../model/hall-product-rate.entity";
import { HallAddon } from "../model/hall-addon.entity";
import { HallBlockedDate } from "../model/hall-blocked-date.entity";

import {
  CreateHallProductPayload,
  CreateHallProductRatePayload,
  CreateHallAddonPayload,
  CreateHallBlockedDatePayload,
  HallProductDTO,
  HallProductRateDTO,
  HallAddonDTO,
  HallBlockedDateDTO,
  UpdateHallProductPayload,
  UpdateHallProductRatePayload,
  UpdateHallAddonPayload,
} from "../interfaces/pricing.interface";

import { NotFoundError } from "../../../core/errors/AppError";

/**
 * PricingService
 *
 * Manages:
 *  - Hall products (usage contexts of a hall)
 *  - Product rates (price options per product)
 *  - Addons (extra paid options)
 *  - Blocked dates (availability exceptions)
 *
 * This service is independent of Express and can be used
 * from controllers, jobs, or tests.
 */
export class PricingService {
  private readonly hallProductRepo: Repository<HallProduct>;
  private readonly hallProductRateRepo: Repository<HallProductRate>;
  private readonly hallAddonRepo: Repository<HallAddon>;
  private readonly hallBlockedDateRepo: Repository<HallBlockedDate>;

  constructor() {
    this.hallProductRepo = AppDataSource.getRepository(HallProduct);
    this.hallProductRateRepo = AppDataSource.getRepository(HallProductRate);
    this.hallAddonRepo = AppDataSource.getRepository(HallAddon);
    this.hallBlockedDateRepo = AppDataSource.getRepository(HallBlockedDate);
  }

  // =======================================
  // Helpers
  // =======================================

  /**
   * Safe conversion from numeric string (from Postgres) to number.
   * If value is null/undefined, returns null.
   */
  private numericToNumber(value: string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }

  // =======================================
  // HallProduct
  // =======================================

  async createHallProduct(
    payload: CreateHallProductPayload
  ): Promise<HallProductDTO> {
    const entity = this.hallProductRepo.create({
      hallId: payload.hallId,
      name: payload.name,
      category: payload.category ?? null,
      description: payload.description ?? null,
      isPrimary: payload.isPrimary ?? false,
      isActive: payload.isActive ?? true,
    });

    const saved = await this.hallProductRepo.save(entity);
    return this.toHallProductDTO(saved);
  }

  async updateHallProduct(
    id: string,
    payload: UpdateHallProductPayload
  ): Promise<HallProductDTO> {
    const entity = await this.hallProductRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError("Hall product not found");
    }

    if (payload.name !== undefined) entity.name = payload.name;
    if (payload.category !== undefined) entity.category = payload.category;
    if (payload.description !== undefined)
      entity.description = payload.description;
    if (payload.isPrimary !== undefined) entity.isPrimary = payload.isPrimary;
    if (payload.isActive !== undefined) entity.isActive = payload.isActive;

    const saved = await this.hallProductRepo.save(entity);
    return this.toHallProductDTO(saved);
  }

  async getHallProductById(id: string): Promise<HallProductDTO> {
    const entity = await this.hallProductRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError("Hall product not found");
    }
    return this.toHallProductDTO(entity);
  }

  /**
   * List products for a hall.
   *  - hallId: required
   *  - isActive?: filter by active flag
   */
  async listHallProducts(options: {
    hallId: string;
    isActive?: boolean;
  }): Promise<HallProductDTO[]> {
    const qb = this.hallProductRepo
      .createQueryBuilder("p")
      .where("p.hallId = :hallId", { hallId: options.hallId });

    if (options.isActive !== undefined) {
      qb.andWhere("p.isActive = :isActive", { isActive: options.isActive });
    }

    qb.orderBy("p.isPrimary", "DESC").addOrderBy("p.createdAt", "ASC");

    const rows = await qb.getMany();
    return rows.map((row) => this.toHallProductDTO(row));
  }

  /**
   * Used later by public/admin hall detail to get products to display.
   */
  async getActiveProductsForHall(hallId: string): Promise<HallProductDTO[]> {
    return this.listHallProducts({ hallId, isActive: true });
  }

  // =======================================
  // HallProductRate
  // =======================================

  async createHallProductRate(
    payload: CreateHallProductRatePayload
  ): Promise<HallProductRateDTO> {
    const entity = this.hallProductRateRepo.create({
      hallProductId: payload.hallProductId,
      label: payload.label,
      currency: payload.currency,
      price: payload.price.toString(),
      billingUnit: payload.billingUnit,
      minHours: payload.minHours ?? null,
      maxHours: payload.maxHours ?? null,
      extraUnitPrice:
        payload.extraUnitPrice !== undefined
          ? payload.extraUnitPrice.toString()
          : null,
      dayOfWeekMask: payload.dayOfWeekMask ?? null,
      seasonStart: payload.seasonStart ?? null,
      seasonEnd: payload.seasonEnd ?? null,
      isDefault: payload.isDefault ?? false,
    });

    const saved = await this.hallProductRateRepo.save(entity);
    return this.toHallProductRateDTO(saved);
  }

  async updateHallProductRate(
    id: string,
    payload: UpdateHallProductRatePayload
  ): Promise<HallProductRateDTO> {
    const entity = await this.hallProductRateRepo.findOne({
      where: { id },
    });
    if (!entity) {
      throw new NotFoundError("Hall product rate not found");
    }

    if (payload.label !== undefined) entity.label = payload.label;
    if (payload.currency !== undefined) entity.currency = payload.currency;
    if (payload.price !== undefined) {
      entity.price = payload.price.toString();
    }
    if (payload.billingUnit !== undefined) {
      entity.billingUnit = payload.billingUnit;
    }
    if (payload.minHours !== undefined) entity.minHours = payload.minHours;
    if (payload.maxHours !== undefined) entity.maxHours = payload.maxHours;
    if (payload.extraUnitPrice !== undefined) {
      entity.extraUnitPrice =
        payload.extraUnitPrice === null
          ? null
          : payload.extraUnitPrice.toString();
    }
    if (payload.dayOfWeekMask !== undefined) {
      entity.dayOfWeekMask = payload.dayOfWeekMask;
    }
    if (payload.seasonStart !== undefined) {
      entity.seasonStart = payload.seasonStart;
    }
    if (payload.seasonEnd !== undefined) {
      entity.seasonEnd = payload.seasonEnd;
    }
    if (payload.isDefault !== undefined) {
      entity.isDefault = payload.isDefault;
    }

    const saved = await this.hallProductRateRepo.save(entity);
    return this.toHallProductRateDTO(saved);
  }

  async getHallProductRateById(id: string): Promise<HallProductRateDTO> {
    const entity = await this.hallProductRateRepo.findOne({
      where: { id },
    });
    if (!entity) {
      throw new NotFoundError("Hall product rate not found");
    }
    return this.toHallProductRateDTO(entity);
  }

  /**
   * List all rates for a product.
   */
  async listHallProductRates(
    hallProductId: string
  ): Promise<HallProductRateDTO[]> {
    const rows = await this.hallProductRateRepo.find({
      where: { hallProductId },
      order: { createdAt: "ASC" },
    });
    return rows.map((row) => this.toHallProductRateDTO(row));
  }

  // =======================================
  // HallAddon
  // =======================================

  async createHallAddon(
    payload: CreateHallAddonPayload
  ): Promise<HallAddonDTO> {
    const entity = this.hallAddonRepo.create({
      hallId: payload.hallId,
      name: payload.name,
      description: payload.description ?? null,
      pricingModel: payload.pricingModel,
      currency: payload.currency,
      unitPrice: payload.unitPrice.toString(),
      packSize: payload.packSize ?? null,
      redevanceAmount:
        payload.redevanceAmount !== undefined
          ? payload.redevanceAmount.toString()
          : null,
      isActive: payload.isActive ?? true,
    });

    const saved = await this.hallAddonRepo.save(entity);
    return this.toHallAddonDTO(saved);
  }

  async updateHallAddon(
    id: string,
    payload: UpdateHallAddonPayload
  ): Promise<HallAddonDTO> {
    const entity = await this.hallAddonRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError("Hall addon not found");
    }

    if (payload.name !== undefined) entity.name = payload.name;
    if (payload.description !== undefined)
      entity.description = payload.description;
    if (payload.pricingModel !== undefined) {
      entity.pricingModel = payload.pricingModel;
    }
    if (payload.currency !== undefined) {
      entity.currency = payload.currency;
    }
    if (payload.unitPrice !== undefined) {
      entity.unitPrice = payload.unitPrice.toString();
    }
    if (payload.packSize !== undefined) {
      entity.packSize = payload.packSize;
    }
    if (payload.redevanceAmount !== undefined) {
      entity.redevanceAmount =
        payload.redevanceAmount === null
          ? null
          : payload.redevanceAmount.toString();
    }
    if (payload.isActive !== undefined) {
      entity.isActive = payload.isActive;
    }

    const saved = await this.hallAddonRepo.save(entity);
    return this.toHallAddonDTO(saved);
  }

  async getHallAddonById(id: string): Promise<HallAddonDTO> {
    const entity = await this.hallAddonRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError("Hall addon not found");
    }
    return this.toHallAddonDTO(entity);
  }

  /**
   * List addons for a hall.
   *  - hallId: required
   *  - isActive?: filter
   */
  async listHallAddons(options: {
    hallId: string;
    isActive?: boolean;
  }): Promise<HallAddonDTO[]> {
    const qb = this.hallAddonRepo
      .createQueryBuilder("a")
      .where("a.hallId = :hallId", { hallId: options.hallId });

    if (options.isActive !== undefined) {
      qb.andWhere("a.isActive = :isActive", { isActive: options.isActive });
    }

    qb.orderBy("a.createdAt", "ASC");

    const rows = await qb.getMany();
    return rows.map((row) => this.toHallAddonDTO(row));
  }

  // =======================================
  // HallBlockedDate
  // =======================================

  async createHallBlockedDate(
    payload: CreateHallBlockedDatePayload
  ): Promise<HallBlockedDateDTO> {
    const entity = this.hallBlockedDateRepo.create({
      hallId: payload.hallId,
      startDate: payload.startDate,
      endDate: payload.endDate ?? null,
      reason: payload.reason ?? null,
      createdByUserId: payload.createdByUserId ?? null,
    });

    const saved = await this.hallBlockedDateRepo.save(entity);
    return this.toHallBlockedDateDTO(saved);
  }

  /**
   * List blocked dates for a hall, optionally within a range.
   */
  async listHallBlockedDates(options: {
    hallId: string;
    fromDate?: string; // YYYY-MM-DD
    toDate?: string; // YYYY-MM-DD
  }): Promise<HallBlockedDateDTO[]> {
    const qb = this.hallBlockedDateRepo
      .createQueryBuilder("b")
      .where("b.hallId = :hallId", { hallId: options.hallId });

    if (options.fromDate) {
      qb.andWhere("b.startDate >= :fromDate", { fromDate: options.fromDate });
    }

    if (options.toDate) {
      qb.andWhere("b.startDate <= :toDate", { toDate: options.toDate });
    }

    qb.orderBy("b.startDate", "ASC");

    const rows = await qb.getMany();
    return rows.map((row) => this.toHallBlockedDateDTO(row));
  }

  // =======================================
  // DTO mappers
  // =======================================

  private toHallProductDTO(entity: HallProduct): HallProductDTO {
    return {
      id: entity.id,
      hallId: entity.hallId,
      name: entity.name,
      category: entity.category,
      description: entity.description,
      isPrimary: entity.isPrimary,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toHallProductRateDTO(entity: HallProductRate): HallProductRateDTO {
    return {
      id: entity.id,
      hallProductId: entity.hallProductId,
      label: entity.label,
      currency: entity.currency,
      price: Number(entity.price),
      billingUnit: entity.billingUnit,
      minHours: entity.minHours,
      maxHours: entity.maxHours,
      extraUnitPrice: this.numericToNumber(entity.extraUnitPrice),
      dayOfWeekMask: entity.dayOfWeekMask,
      seasonStart: entity.seasonStart,
      seasonEnd: entity.seasonEnd,
      isDefault: entity.isDefault,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toHallAddonDTO(entity: HallAddon): HallAddonDTO {
    return {
      id: entity.id,
      hallId: entity.hallId,
      name: entity.name,
      description: entity.description,
      pricingModel: entity.pricingModel,
      currency: entity.currency,
      unitPrice: Number(entity.unitPrice),
      packSize: entity.packSize,
      redevanceAmount: this.numericToNumber(entity.redevanceAmount),
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toHallBlockedDateDTO(entity: HallBlockedDate): HallBlockedDateDTO {
    return {
      id: entity.id,
      hallId: entity.hallId,
      startDate: entity.startDate,
      endDate: entity.endDate,
      reason: entity.reason,
      createdByUserId: entity.createdByUserId,
      createdAt: entity.createdAt,
    };
  }
}
