import { Request, Response, NextFunction } from "express";
import path from "path";
import { MediaService } from "../service/media.service";
import { MediaType } from "../model/media-type.enum";
import { ValidationError } from "../../../core/errors/AppError";
import { supabaseServerClient } from "../../../core/supabaseClient";
import { env } from "../../../config/env";

const ensuredBuckets = new Set<string>();

async function ensureBucketExists(bucket: string): Promise<void> {
  if (ensuredBuckets.has(bucket)) return;

  const { data, error } = await supabaseServerClient.storage.getBucket(bucket);

  if (data) {
    ensuredBuckets.add(bucket);
    return;
  }

  if (error && !/not found/i.test(error.message)) {
    throw new ValidationError(`Failed to check storage bucket: ${error.message}`);
  }

  const { error: createErr } = await supabaseServerClient.storage.createBucket(
    bucket,
    { public: true }
  );

  if (createErr) {
    throw new ValidationError(`Failed to create storage bucket: ${createErr.message}`);
  }

  ensuredBuckets.add(bucket);
}

const mediaService = new MediaService();

/**
 * MediaController
 *
 * Handles:
 * - Admin: upload media for a hall
 * - Public/Admin: list media for a hall
 */
export class MediaController {
  /**
   * Admin: upload a media file for a hall.
   *
   * Route (with multer middleware):
   *  POST /api/admin/halls/:hallId/media
   *
   * Form-data:
   *  - file: (binary) required
   *  - tagName?: string (e.g. "HERO", "GALLERY")
   *  - isPrimary?: boolean ("true" / "false")
   *  - sortOrder?: number
   *
   * This assumes the binary file has already been written to disk
   * by multer. We then:
   *  - build a public URL
   *  - create a Media record
   *  - optionally tag it
   */
  static async uploadHallMedia(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { hallId } = req.params;
      const filesFromReq =
        (req.files as Express.Multer.File[]) ||
        (req.file ? [req.file as Express.Multer.File] : []);

      if (!hallId) {
        throw new ValidationError("hallId is required in route params");
      }

      if (!filesFromReq.length) {
        throw new ValidationError("file is required");
      }

      const { tagName, isPrimary, sortOrder } = req.body ?? {};

      const bucket = env.supabase.bucket;
      await ensureBucketExists(bucket);

      const tagNameStr =
        typeof tagName === "string" && tagName.trim().length > 0
          ? tagName.trim()
          : null;
      const isPrimaryBool =
        typeof isPrimary === "string"
          ? isPrimary.toLowerCase() === "true"
          : false;

      const parsedSortOrder =
        sortOrder !== undefined && sortOrder !== null
          ? Number(sortOrder)
          : undefined;

      const processFile = async (
        file: Express.Multer.File,
        makePrimary: boolean
      ) => {
        const ext = path.extname(file.originalname);
        const base =
          path
            .basename(file.originalname, ext)
            .replace(/[^a-z0-9]+/gi, "-")
            .toLowerCase() || "file";
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const objectPath = `halls/${hallId}/${base}-${unique}${ext}`;

        const { error: uploadError } = await supabaseServerClient.storage
          .from(bucket)
          .upload(objectPath, file.buffer, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.mimetype,
          });

        if (uploadError) {
          throw new ValidationError(
            `Failed to upload media to storage: ${uploadError.message}`
          );
        }

        const {
          data: { publicUrl },
        } = supabaseServerClient.storage
          .from(bucket)
          .getPublicUrl(objectPath);

        const media = await mediaService.createMedia({
          hallId,
          storageProvider: "SUPABASE",
          fileUrl: publicUrl,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: String(file.size),
          mediaType: MediaType.IMAGE,
          sortOrder: parsedSortOrder,
        });

        let tag = null;
        if (tagNameStr) {
          tag = await mediaService.tagMediaByName({
            mediaId: media.id,
            tagName: tagNameStr,
            isPrimary: makePrimary,
          });
        }

        return { media, tag };
      };

      const results = await Promise.all(
        filesFromReq.map((f, idx) =>
          processFile(f, isPrimaryBool && idx === 0)
        )
      );

      res.status(201).json({
        media: results.map((r) => r.media),
        tags: results.map((r) => r.tag),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public/Admin: list media for a hall.
   *
   * GET /api/public/halls/:hallId/media
   * GET /api/admin/halls/:hallId/media
   *
   * Query:
   *  - tagName?: string (e.g. "HERO", "GALLERY")
   *  - mediaType?: IMAGE | VIDEO | DOCUMENT
   */
  static async listHallMedia(req: Request, res: Response, next: NextFunction) {
    try {
      const { hallId } = req.params;
      const { tagName, mediaType } = req.query;

      if (!hallId) {
        throw new ValidationError("hallId is required in route params");
      }

      let mediaTypeEnum: MediaType | undefined;
      if (typeof mediaType === "string") {
        if (!Object.values(MediaType).includes(mediaType as MediaType)) {
          throw new ValidationError("Invalid mediaType");
        }
        mediaTypeEnum = mediaType as MediaType;
      }

      const media = await mediaService.listMediaForHall({
        hallId,
        tagName: typeof tagName === "string" ? tagName : undefined,
        mediaType: mediaTypeEnum,
      });

      res.json(media);
    } catch (err) {
      next(err);
    }
  }
}
