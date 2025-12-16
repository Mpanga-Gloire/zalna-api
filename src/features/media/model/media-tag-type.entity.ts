import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * MediaTagType
 *
 * Master list of possible tags for media.
 * Examples:
 *  - HERO (main landing image)
 *  - GALLERY
 *  - EXTERIOR
 *  - INTERIOR
 *  - CONTRACT_SCAN
 *
 * Using a table ensures consistent tags across all halls.
 */
@Entity({ name: "media_tag_types" })
export class MediaTagType {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  name!: string;

  @Column({ type: "text", nullable: true })
  description: string | null = null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
