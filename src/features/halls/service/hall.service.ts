// src/features/halls/service/hall.service.ts

import { Repository } from "typeorm";
import { AppDataSource } from "../../../config/database";
import { Hall } from "../model/hall.entity";
import { HallStatus } from "../model/hall-status.enum";
import {
  CreateHallPayload,
  HallDTO,
  UpdateHallPayload,
} from "../interfaces/hall.interface";
import { ConflictError, NotFoundError } from "../../../core/errors/AppError";
import { HallUserRole } from "../model/HallUserRole";
import { User } from "../../users/model/User";

/**
 * HallService
 *
 * Encapsulates all business logic related to halls:
 * - creating and updating halls
 * - fetching single hall by id or slug
 * - listing halls with filters and pagination
 *
 * This service does NOT know about HTTP or Express.
 * Controllers will call this service.
 */
export class HallService {
  private readonly hallRepo: Repository<Hall>;
  private readonly hallUserRoleRepo: Repository<HallUserRole>;

  constructor() {
    this.hallRepo = AppDataSource.getRepository(Hall);
    this.hallUserRoleRepo = AppDataSource.getRepository(HallUserRole);
  }

  /**
   * Creates a new hall.
   * - Generates & normalizes slug on the server
   * - Ensures slug uniqueness (auto-appends -2, -3, ...)
   * - Applies sensible defaults
   * - If gerantId is provided, creates a HallUserRole with role = "OWNER"
   */
  async createHall(payload: CreateHallPayload): Promise<HallDTO> {
    // Determine base value for slug:
    // 1) explicit slug from payload
    // 2) hall name + city
    // 3) fallback random base
    const baseForSlugRaw = (payload.slug && payload.slug.trim()) ||
      [payload.name, payload.city].filter(Boolean).join(" ");

    const baseForSlug = baseForSlugRaw && baseForSlugRaw.trim().length > 0
      ? baseForSlugRaw
      : this.generateFallbackBaseSlug();

    const finalSlug = await this.generateUniqueSlug(baseForSlug);

    const hall = this.hallRepo.create({
      name: payload.name.trim(),
      slug: finalSlug,
      address: payload.address ?? null,
      city: payload.city ?? null,
      capacity: payload.capacity ?? null,
      description: payload.description ?? null,
      cancellationPolicy: payload.cancellationPolicy ?? null,
      isPremium: payload.isPremium ?? false,
      status: payload.status ?? HallStatus.DRAFT,
      gerantId: payload.gerantId ?? null,
    });

    const saved = await this.hallRepo.save(hall);

    // If an owner/gerant is provided, create a HallUserRole row
    if (payload.gerantId) {
      const ownerRole = this.hallUserRoleRepo.create({
        hall: saved,
        user: { id: payload.gerantId } as User,
        role: "OWNER",
      });

      await this.hallUserRoleRepo.save(ownerRole);
    }

    return this.toDTO(saved);
  }

  /**
   * Updates an existing hall by ID.
   * - Throws NotFoundError if hall does not exist
   * - If slug is changed explicitly, generates a new unique slug
   * - If gerantId changes, updates HallUserRole OWNER mapping
   */
  async updateHall(id: string, payload: UpdateHallPayload): Promise<HallDTO> {
    const hall = await this.hallRepo.findOne({ where: { id } });

    if (!hall) {
      throw new NotFoundError("Hall not found");
    }

    const previousGerantId = hall.gerantId;

    // Handle slug update only if explicitly provided and different
    if (
      payload.slug &&
      payload.slug.trim() &&
      payload.slug.trim().toLowerCase() !== hall.slug
    ) {
      const newSlug = await this.generateUniqueSlug(payload.slug, hall.id);
      hall.slug = newSlug;
    }

    if (payload.name !== undefined) hall.name = payload.name.trim();
    if (payload.address !== undefined) hall.address = payload.address ?? null;
    if (payload.city !== undefined) hall.city = payload.city ?? null;
    if (payload.capacity !== undefined) {
      hall.capacity = payload.capacity ?? null;
    }
    if (payload.description !== undefined) {
      hall.description = payload.description ?? null;
    }
    if (payload.cancellationPolicy !== undefined) {
      hall.cancellationPolicy = payload.cancellationPolicy ?? null;
    }
    if (payload.isPremium !== undefined) hall.isPremium = payload.isPremium;
    if (payload.status !== undefined) hall.status = payload.status;
    if (payload.gerantId !== undefined) hall.gerantId = payload.gerantId;

    const saved = await this.hallRepo.save(hall);

    // If gerant/owner changed, update HallUserRole
    if (
      payload.gerantId !== undefined &&
      payload.gerantId !== previousGerantId
    ) {
      // Remove previous OWNER roles for this hall
      await this.hallUserRoleRepo
        .createQueryBuilder()
        .delete()
        .from(HallUserRole)
        .where("hall_id = :hallId AND role = :role", {
          hallId: hall.id,
          role: "OWNER",
        })
        .execute();

      // If we have a new gerantId, create new OWNER role
      if (payload.gerantId) {
        const ownerRole = this.hallUserRoleRepo.create({
          hall: saved,
          user: { id: payload.gerantId } as User,
          role: "OWNER",
        });
        await this.hallUserRoleRepo.save(ownerRole);
      }
    }

    return this.toDTO(saved);
  }

  /**
   * Fetches a hall by its ID.
   * - Throws NotFoundError if not found
   */
  async getHallById(id: string): Promise<HallDTO> {
    const hall = await this.hallRepo.findOne({ where: { id } });

    if (!hall) {
      throw new NotFoundError("Hall not found");
    }

    return this.toDTO(hall);
  }

  /**
   * Fetches a hall by its slug (used for public URLs).
   * - Throws NotFoundError if not found
   */
  async getHallBySlug(slug: string): Promise<HallDTO> {
    const normalizedSlug = this.slugify(slug);

    const hall = await this.hallRepo.findOne({
      where: { slug: normalizedSlug },
    });

    if (!hall) {
      throw new NotFoundError("Hall not found");
    }

    return this.toDTO(hall);
  }

  /**
   * Lists halls with optional filters and simple pagination.
   *
   * This will be used both on:
   * - admin side (see all halls, any status)
   * - host side (only halls owned by current user)
   * - public side (only ACTIVE, via other service)
   */
  async listHalls(options: {
    status?: HallStatus;
    city?: string;
    isPremium?: boolean;
    gerantId?: string; // 👈 NEW: filter by owner
    page?: number;
    limit?: number;
  }): Promise<{
    data: HallDTO[];
    page: number;
    limit: number;
    total: number;
  }> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 && options.limit <= 100
      ? options.limit
      : 20;

    const qb = this.hallRepo.createQueryBuilder("hall");

    if (options.status) {
      qb.andWhere("hall.status = :status", { status: options.status });
    }

    if (options.city) {
      qb.andWhere("LOWER(hall.city) = LOWER(:city)", { city: options.city });
    }

    if (options.isPremium !== undefined) {
      qb.andWhere("hall.isPremium = :isPremium", {
        isPremium: options.isPremium,
      });
    }

    if (options.gerantId) {
      qb.andWhere("hall.gerantId = :gerantId", {
        gerantId: options.gerantId,
      });
    }

    qb.orderBy("hall.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [halls, total] = await qb.getManyAndCount();

    return {
      data: halls.map((h) => this.toDTO(h)),
      page,
      limit,
      total,
    };
  }

  // =========================================
  // Internal helpers
  // =========================================

  /**
   * Generates a slug-friendly string from any input.
   */
  private slugify(input: string): string {
    return input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]+/g, "-") // non alphanum -> dash
      .replace(/^-+|-+$/g, ""); // trim dashes
  }

  /**
   * Fallback base slug when name/city are missing.
   */
  private generateFallbackBaseSlug(): string {
    return `hall-${Date.now().toString(36)}`;
  }

  /**
   * Generates a unique slug given a base string.
   *
   * - slugifies the base
   * - if already taken, tries base-2, base-3, ...
   * - excludeId: ignore this hall when checking (for updates)
   */
  private async generateUniqueSlug(
    base: string,
    excludeId?: string,
  ): Promise<string> {
    let baseSlug = this.slugify(base);

    if (!baseSlug) {
      baseSlug = this.generateFallbackBaseSlug();
    }

    let candidate = baseSlug;
    let counter = 1;

    // First, try the baseSlug as is; if conflict, append -2, -3, etc.
    while (true) {
      const qb = this.hallRepo
        .createQueryBuilder("hall")
        .where("hall.slug = :slug", { slug: candidate });

      if (excludeId) {
        qb.andWhere("hall.id != :excludeId", { excludeId });
      }

      const existing = await qb.getOne();

      if (!existing) {
        return candidate;
      }

      counter += 1;
      candidate = `${baseSlug}-${counter}`;
    }
  }

  /**
   * Maps a Hall entity to a HallDTO.
   * Keeps the rest of the codebase decoupled from TypeORM internals.
   */
  private toDTO(entity: Hall): HallDTO {
    return {
      id: entity.id,
      gerantId: entity.gerantId,
      name: entity.name,
      slug: entity.slug,
      address: entity.address,
      city: entity.city,
      capacity: entity.capacity,
      description: entity.description,
      cancellationPolicy: entity.cancellationPolicy,
      isPremium: entity.isPremium,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
