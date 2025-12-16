// src/features/hostApplications/service/host-application.service.ts

import { Repository } from "typeorm";
import { AppDataSource } from "../../../config/database";
import { HostApplication } from "../model/host-application.entity";
import { HostApplicationStatus } from "../model/host-application-status.enum";
import {
  CreateHostApplicationPayload,
  HostApplicationDTO,
  UpdateHostApplicationStatusPayload,
} from "../interfaces/host-application.interface";
import { NotFoundError } from "../../../core/errors/AppError";
import { HallService } from "../../halls/service/hall.service";
import { HallStatus } from "../../halls/model/hall-status.enum";

/**
 * HostApplicationService
 *
 * Encapsulates all business logic for the "Become a host" flow:
 * - Creating a new host application (public)
 * - Listing applications for review (admin)
 * - Fetching a single application (admin)
 * - Updating application status (admin)
 *   - When status becomes APPROVED, automatically creates a Hall
 *     and attaches the owner (gerantId = applicantUserId).
 */
export class HostApplicationService {
  private readonly repo: Repository<HostApplication>;
  private readonly hallService: HallService;

  constructor() {
    this.repo = AppDataSource.getRepository(HostApplication);
    this.hallService = new HallService();
  }

  /**
   * Public: create a new host application from the "Become a host" form.
   * All new applications start with status = NEW.
   */
  async createHostApplication(
    payload: CreateHostApplicationPayload,
  ): Promise<HostApplicationDTO> {
    const entity = this.repo.create({
      hallName: payload.hallName.trim(),
      address: payload.address ?? null,
      city: payload.city ?? null,
      capacity: payload.capacity ?? null,
      description: payload.description ?? null,
      additionalDetails: payload.additionalDetails ?? null,
      contactName: payload.contactName.trim(),
      contactEmail: payload.contactEmail.trim().toLowerCase(),
      contactPhone: payload.contactPhone ?? null,
      contactWhatsapp: payload.contactWhatsapp ?? null,

      // Link to authenticated user (future owner)
      applicantUserId: payload.applicantUserId ?? null,

      status: HostApplicationStatus.NEW,
      adminNotes: null,
      reviewedByUserId: null,
      reviewedAt: null,
    });

    const saved = await this.repo.save(entity);
    return this.toDTO(saved);
  }

  /**
   * Admin: list host applications with filters and pagination.
   */
  async listHostApplications(options: {
    status?: HostApplicationStatus;
    city?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: HostApplicationDTO[];
    page: number;
    limit: number;
    total: number;
  }> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 && options.limit <= 100
      ? options.limit
      : 20;

    const qb = this.repo.createQueryBuilder("app");

    if (options.status) {
      qb.andWhere("app.status = :status", { status: options.status });
    }

    if (options.city) {
      qb.andWhere("LOWER(app.city) = LOWER(:city)", { city: options.city });
    }

    if (options.search) {
      const search = `%${options.search.toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(app.hallName) LIKE :search OR LOWER(app.contactName) LIKE :search OR LOWER(app.contactEmail) LIKE :search)",
        { search },
      );
    }

    qb.orderBy("app.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((r) => this.toDTO(r)),
      page,
      limit,
      total,
    };
  }

  /**
   * Admin: fetch a single host application by its ID.
   * Throws NotFoundError if not found.
   */
  async getHostApplicationById(id: string): Promise<HostApplicationDTO> {
    const entity = await this.repo.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundError("Host application not found");
    }

    return this.toDTO(entity);
  }

  /**
   * Admin: update the status and internal notes of a host application.
   *
   * - When status is set to APPROVED and it wasn't APPROVED before,
   *   we automatically create a Hall and attach the owner.
   * - reviewedByUserId is set from the authenticated admin (controller).
   */
  async updateHostApplicationStatus(
    id: string,
    payload: UpdateHostApplicationStatusPayload,
  ): Promise<HostApplicationDTO> {
    const entity = await this.repo.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundError("Host application not found");
    }

    const previousStatus = entity.status;

    entity.status = payload.status;
    entity.adminNotes = payload.adminNotes ?? entity.adminNotes;
    entity.reviewedByUserId = payload.reviewedByUserId ??
      entity.reviewedByUserId;

    // If status moves to a "final" state and reviewedAt is not set, set timestamp
    const isFinalStatus = payload.status === HostApplicationStatus.APPROVED ||
      payload.status === HostApplicationStatus.REJECTED;

    if (isFinalStatus && !entity.reviewedAt) {
      entity.reviewedAt = new Date();
    }

    const saved = await this.repo.save(entity);

    // If we just transitioned to APPROVED, auto-create Hall and attach owner
    const justApproved = previousStatus !== HostApplicationStatus.APPROVED &&
      payload.status === HostApplicationStatus.APPROVED;

    if (justApproved && entity.applicantUserId) {
      await this.hallService.createHall({
        // Slug is NOT provided here -> HallService generates it
        name: entity.hallName,
        address: entity.address ?? undefined,
        city: entity.city ?? undefined,
        capacity: entity.capacity ?? undefined,
        description: entity.description ?? undefined,
        cancellationPolicy: undefined, // admin/host can refine later
        isPremium: false,
        status: HallStatus.DRAFT, // start as DRAFT
        gerantId: entity.applicantUserId, // owner = applicant
      });
    }

    return this.toDTO(saved);
  }

  // ============================
  // Internal mapper
  // ============================

  private toDTO(entity: HostApplication): HostApplicationDTO {
    return {
      id: entity.id,
      hallName: entity.hallName,
      address: entity.address,
      city: entity.city,
      capacity: entity.capacity,
      description: entity.description,
      additionalDetails: entity.additionalDetails,
      contactName: entity.contactName,
      contactEmail: entity.contactEmail,
      contactPhone: entity.contactPhone,
      contactWhatsapp: entity.contactWhatsapp,
      status: entity.status,
      adminNotes: entity.adminNotes,
      reviewedByUserId: entity.reviewedByUserId,
      reviewedAt: entity.reviewedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      applicantUserId: entity.applicantUserId ?? undefined,
    };
  }
}
