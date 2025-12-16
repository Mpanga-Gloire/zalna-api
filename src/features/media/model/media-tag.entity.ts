import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Media } from "./media.entity";
import { MediaTagType } from "./media-tag-type.entity";

/**
 * MediaTag
 *
 * Links a Media record to a MediaTagType, optionally marking it as primary.
 * Example:
 *  media_id → "HERO", isPrimary = true (only one hero image per hall/tag logically)
 */
@Entity({ name: "media_tags" })
@Unique("uq_media_tag", ["mediaId", "tagTypeId"])
export class MediaTag {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "media_id", type: "uuid" })
  mediaId!: string;

  @ManyToOne(() => Media)
  media!: Media;

  @Column({ name: "tag_type_id", type: "uuid" })
  tagTypeId!: string;

  @ManyToOne(() => MediaTagType)
  tagType!: MediaTagType;

  @Column({ name: "is_primary", type: "boolean", default: false })
  isPrimary: boolean = false;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
