import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { MediaType } from "./media-type.enum";
import { Hall } from "../../halls/model/hall.entity";

/**
 * Media
 *
 * Represents a single media file (image, video, document) associated
 * with a hall. The actual file lives in storage (local disk or cloud),
 * and this table stores metadata + URLs.
 */
@Entity({ name: "media" })
@Index(["hallId", "mediaType"])
export class Media {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "hall_id", type: "uuid" })
  hallId!: string;

  @ManyToOne(() => Hall)
  hall!: Hall;

  /**
   * Where the file is stored (LOCAL / S3 / CLOUDINARY, etc.).
   * This helps if you ever migrate or mix providers.
   */
  @Column({
    name: "storage_provider",
    type: "varchar",
    length: 50,
    default: "LOCAL",
  })
  storageProvider!: string;

  /**
   * Public or signed URL used by the frontend to load the media.
   */
  @Column({ name: "file_url", type: "varchar", length: 500 })
  fileUrl!: string;

  /**
   * Original filename as uploaded by the user. Helpful for debugging.
   */
  @Column({
    name: "original_filename",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  originalFilename: string | null = null;

  /**
   * MIME type of the file, e.g. "image/jpeg".
   */
  @Column({ name: "mime_type", type: "varchar", length: 100, nullable: true })
  mimeType: string | null = null;

  /**
   * Size of the file in bytes.
   */
  @Column({ name: "size_bytes", type: "bigint", nullable: true })
  sizeBytes: string | null = null; // bigints come as string from pg

  /**
   * Optional dimensions (for images).
   */
  @Column({ type: "int", nullable: true })
  width: number | null = null;

  @Column({ type: "int", nullable: true })
  height: number | null = null;

  @Column({
    name: "media_type",
    type: "varchar",
    length: 20,
    default: MediaType.IMAGE,
  })
  mediaType: MediaType = MediaType.IMAGE;

  /**
   * Optional sort ordering for galleries.
   */
  @Column({ name: "sort_order", type: "int", nullable: true })
  sortOrder: number | null = null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
