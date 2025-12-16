import { MediaType } from "../model/media-type.enum";

/**
 * DTO returned to callers when fetching media.
 */
export interface MediaDTO {
  id: string;
  hallId: string;
  storageProvider: string;
  fileUrl: string;
  originalFilename: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
  width: number | null;
  height: number | null;
  mediaType: MediaType;
  sortOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payload when creating media metadata AFTER upload.
 * (The actual binary upload handling will be wired in the controller
 * using multipart/form-data).
 */
export interface CreateMediaPayload {
  hallId: string;
  storageProvider: string;
  fileUrl: string;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: string;
  width?: number;
  height?: number;
  mediaType?: MediaType;
  sortOrder?: number;
}

/**
 * Links media to a tag type.
 */
export interface MediaTagDTO {
  id: string;
  mediaId: string;
  tagTypeId: string;
  tagName: string;
  isPrimary: boolean;
  createdAt: Date;
}
