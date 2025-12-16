import { Repository } from "typeorm";
import { AppDataSource } from "../../../config/database";
import { Media } from "../model/media.entity";
import { MediaTag } from "../model/media-tag.entity";
import { MediaTagType } from "../model/media-tag-type.entity";
import { MediaType } from "../model/media-type.enum";
import {
  CreateMediaPayload,
  MediaDTO,
  MediaTagDTO,
} from "../interfaces/media.interface";
import { NotFoundError } from "../../../core/errors/AppError";

/**
 * MediaService
 *
 * Handles media metadata and tagging logic:
 * - creating media records (after file upload)
 * - managing media tags (e.g. HERO, GALLERY, etc.)
 * - listing media for a hall
 * - fetching primary/hero image for a hall
 *
 * NOTE: This service does NOT handle the binary upload itself.
 * That will be done in controllers using multipart/form-data.
 */
export class MediaService {
  private readonly mediaRepo: Repository<Media>;
  private readonly tagRepo: Repository<MediaTag>;
  private readonly tagTypeRepo: Repository<MediaTagType>;

  constructor() {
    this.mediaRepo = AppDataSource.getRepository(Media);
    this.tagRepo = AppDataSource.getRepository(MediaTag);
    this.tagTypeRepo = AppDataSource.getRepository(MediaTagType);
  }

  /**
   * Creates a new media record for a given hall.
   * The actual file should already be stored (local disk or cloud).
   *
   * This method only persists metadata + URL.
   */
  async createMedia(payload: CreateMediaPayload): Promise<MediaDTO> {
    const entity = this.mediaRepo.create({
      hallId: payload.hallId,
      storageProvider: payload.storageProvider,
      fileUrl: payload.fileUrl,
      originalFilename: payload.originalFilename ?? null,
      mimeType: payload.mimeType ?? null,
      sizeBytes: payload.sizeBytes ?? null,
      width: payload.width ?? null,
      height: payload.height ?? null,
      mediaType: payload.mediaType ?? MediaType.IMAGE,
      sortOrder: payload.sortOrder ?? null,
    });

    const saved = await this.mediaRepo.save(entity);
    return this.toMediaDTO(saved);
  }

  /**
   * Assigns a tag to a media by tag name.
   *
   * - If the tag type doesn't exist yet, it is created automatically
   *   (e.g. "HERO", "GALLERY", "EXTERIOR", etc.).
   * - If isPrimary = true, any existing primary tag of the same type
   *   for the same hall will be unset.
   */
  async tagMediaByName(options: {
    mediaId: string;
    tagName: string;
    isPrimary?: boolean;
  }): Promise<MediaTagDTO> {
    const { mediaId, tagName } = options;
    const isPrimary = options.isPrimary ?? false;

    const media = await this.mediaRepo.findOne({ where: { id: mediaId } });
    if (!media) {
      throw new NotFoundError("Media not found");
    }

    const tagType = await this.findOrCreateTagTypeByName(tagName);

    if (isPrimary) {
      // Ensure only one primary tag of this type per hall.
      await this.unsetExistingPrimaryForHallAndTagType(
        media.hallId,
        tagType.id
      );
    }

    const mediaTag = this.tagRepo.create({
      mediaId: media.id,
      tagTypeId: tagType.id,
      isPrimary,
    });

    const saved = await this.tagRepo.save(mediaTag);

    return this.toMediaTagDTO(saved, tagType.name);
  }

  /**
   * Lists media for a given hall, optionally filtered by:
   * - tagName (e.g. "HERO", "GALLERY")
   * - mediaType (IMAGE, VIDEO, DOCUMENT)
   */
  async listMediaForHall(options: {
    hallId: string;
    tagName?: string;
    mediaType?: MediaType;
  }): Promise<MediaDTO[]> {
    const qb = this.mediaRepo
      .createQueryBuilder("m")
      .where("m.hallId = :hallId", { hallId: options.hallId });

    if (options.mediaType) {
      qb.andWhere("m.mediaType = :mediaType", {
        mediaType: options.mediaType,
      });
    }

    if (options.tagName) {
      qb.innerJoin(MediaTag, "mt", "mt.mediaId = m.id")
        .innerJoin(MediaTagType, "mtt", "mtt.id = mt.tagTypeId")
        .andWhere("LOWER(mtt.name) = LOWER(:tagName)", {
          tagName: options.tagName,
        });
    }

    qb.orderBy("m.sortOrder", "ASC").addOrderBy("m.createdAt", "DESC");

    const media = await qb.getMany();
    return media.map((m) => this.toMediaDTO(m));
  }

  /**
   * Fetches the primary (hero) media for a hall, for a given tagName.
   *
   * Example:
   *  getPrimaryMediaForHall({ hallId, tagName: "HERO" })
   *
   * Returns null if no primary media found.
   */
  async getPrimaryMediaForHall(options: {
    hallId: string;
    tagName: string;
  }): Promise<MediaDTO | null> {
    const qb = this.mediaRepo
      .createQueryBuilder("m")
      .innerJoin(MediaTag, "mt", "mt.mediaId = m.id")
      .innerJoin(MediaTagType, "mtt", "mtt.id = mt.tagTypeId")
      .where("m.hallId = :hallId", { hallId: options.hallId })
      .andWhere("LOWER(mtt.name) = LOWER(:tagName)", {
        tagName: options.tagName,
      })
      .andWhere("mt.isPrimary = true")
      .orderBy("m.createdAt", "DESC")
      .limit(1);

    const media = await qb.getOne();

    if (!media) return null;

    return this.toMediaDTO(media);
  }

  // ======================================
  // Internal helpers
  // ======================================

  /**
   * Finds an existing MediaTagType by name (case-insensitive),
   * or creates a new one if it does not exist.
   */
  private async findOrCreateTagTypeByName(name: string): Promise<MediaTagType> {
    const normalized = name.trim();

    let tagType = await this.tagTypeRepo
      .createQueryBuilder("t")
      .where("LOWER(t.name) = LOWER(:name)", { name: normalized })
      .getOne();

    if (!tagType) {
      tagType = this.tagTypeRepo.create({
        name: normalized,
        description: null,
      });
      tagType = await this.tagTypeRepo.save(tagType);
    }

    return tagType;
  }

  /**
   * Unsets any existing primary tag of a given type for a hall.
   * This ensures we only ever have one primary HERO per hall, etc.
   */
  private async unsetExistingPrimaryForHallAndTagType(
    hallId: string,
    tagTypeId: string
  ): Promise<void> {
    const qb = this.tagRepo
      .createQueryBuilder("mt")
      .innerJoin(Media, "m", "m.id = mt.mediaId")
      .where("m.hallId = :hallId", { hallId })
      .andWhere("mt.tagTypeId = :tagTypeId", { tagTypeId })
      .andWhere("mt.isPrimary = true");

    const existingPrimaryTags = await qb.getMany();
    if (!existingPrimaryTags.length) return;

    for (const tag of existingPrimaryTags) {
      tag.isPrimary = false;
    }

    await this.tagRepo.save(existingPrimaryTags);
  }

  private toMediaDTO(entity: Media): MediaDTO {
    return {
      id: entity.id,
      hallId: entity.hallId,
      storageProvider: entity.storageProvider,
      fileUrl: entity.fileUrl,
      originalFilename: entity.originalFilename,
      mimeType: entity.mimeType,
      sizeBytes: entity.sizeBytes,
      width: entity.width,
      height: entity.height,
      mediaType: entity.mediaType,
      sortOrder: entity.sortOrder,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toMediaTagDTO(mediaTag: MediaTag, tagName: string): MediaTagDTO {
    return {
      id: mediaTag.id,
      mediaId: mediaTag.mediaId,
      tagTypeId: mediaTag.tagTypeId,
      tagName,
      isPrimary: mediaTag.isPrimary,
      createdAt: mediaTag.createdAt,
    };
  }
}
