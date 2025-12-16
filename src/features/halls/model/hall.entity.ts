import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { HallStatus } from "./hall-status.enum";

// Later: import User and HallUserRole when those entities are created
// import { User } from "../../users/model/user.entity";
// import { HallUserRole } from "./hall-user-role.entity";

/**
 * Hall
 *
 * Core business entity representing a wedding/event hall listed on Zalna.
 * This is the backbone of the product: most features (media, pricing,
 * availability, inquiries, bookings) attach to this table.
 */
@Entity({ name: "halls" })
@Index(["city", "status"]) // common query pattern: active halls by city
export class Hall {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /**
   * Main contact / owner (gérant) of the hall.
   * We keep this nullable for now because we haven't implemented the
   * User feature yet. Once users exist, this should reference User.id.
   */
  @Column({ name: "gerant_id", type: "uuid", nullable: true })
  gerantId: string | null = null;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  /**
   * Slug used for SEO-friendly URLs, e.g. "natacha-hall-lubumbashi".
   * Must be unique to avoid routing conflicts.
   */
  @Index({ unique: true })
  @Column({ type: "varchar", length: 255 })
  slug!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  address: string | null = null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string | null = null;

  /**
   * Approximate capacity of the hall (number of guests).
   */
  @Column({ type: "int", nullable: true })
  capacity: number | null = null;

  @Column({ type: "text", nullable: true })
  description: string | null = null;

  /**
   * Human-readable cancellation policy text.
   * Later we might normalize this into structured rules.
   */
  @Column({ name: "cancellation_policy", type: "text", nullable: true })
  cancellationPolicy: string | null = null;

  /**
   * Whether this hall currently has a premium subscription/tier.
   * The detailed logic will sit in HallSubscription, but this flag
   * is useful for quick filtering and public display.
   */
  @Column({ name: "is_premium", type: "boolean", default: false })
  isPremium: boolean = false;

  /**
   * Lifecycle state of the hall (DRAFT, ACTIVE, ARCHIVED).
   */
  @Column({
    type: "varchar",
    length: 20,
    default: HallStatus.DRAFT,
  })
  status: HallStatus = HallStatus.DRAFT;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // ===============================
  // Relations (to be wired later)
  // ===============================

  // Example: later when User entity exists
  // @ManyToOne(() => User, (user) => user.halls)
  // gerant?: User;

  // Example: later when HallUserRole entity exists
  // @OneToMany(() => HallUserRole, (hur) => hur.hall)
  // userRoles?: HallUserRole[];
}
