import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { HallProduct } from "./hall-product.entity";

/**
 * HallProductRate
 *
 * A price option/variant for a HallProduct.
 * Examples:
 *  - "Sans cocktail – 380$"
 *  - "Avec cocktail – 750$"
 *  - "1 heure – 120$"
 *  - "8 heures – 650$"
 */
@Entity({ name: "hall_product_rates" })
@Index(["hallProductId", "isDefault"])
@Index(["hallProductId", "dayOfWeekMask"])
@Index(["hallProductId", "seasonStart", "seasonEnd"])
export class HallProductRate {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "hall_product_id", type: "uuid" })
  hallProductId!: string;

  @ManyToOne(() => HallProduct)
  hallProduct!: HallProduct;

  /**
   * Human-friendly label.
   * Examples:
   *  - "Sans cocktail"
   *  - "Avec cocktail"
   *  - "1 heure"
   *  - "Journée complète"
   */
  @Column({ type: "varchar", length: 150 })
  label!: string;

  @Column({ type: "varchar", length: 10, default: "USD" })
  currency!: string;

  /**
   * Flat price for this rate in the chosen billing unit.
   * Stored as NUMERIC; returned as number via DTO.
   */
  @Column({ type: "numeric", precision: 12, scale: 2 })
  price!: string;

  /**
   * Billing unit for this rate:
   *  - EVENT
   *  - HOUR
   *  - DAY
   */
  @Column({ name: "billing_unit", type: "varchar", length: 20 })
  billingUnit!: string;

  /**
   * Optional min/max hours for hourly tiers.
   * Example:
   *  - 1h: minHours=1, maxHours=1
   *  - 2h: minHours=2, maxHours=2
   *  - 8h journée: minHours=8, maxHours=8
   */
  @Column({ name: "min_hours", type: "int", nullable: true })
  minHours: number | null = null;

  @Column({ name: "max_hours", type: "int", nullable: true })
  maxHours: number | null = null;

  /**
   * Optional extra price per hour or per unit after this rate.
   * Example:
   *  - after 8h: +60$/hour
   */
  @Column({
    name: "extra_unit_price",
    type: "numeric",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  extraUnitPrice: string | null = null;

  /**
   * Comma-separated list of days for which this rate applies.
   * Example: "Mon,Tue,Wed" or "Fri,Sat,Sun".
   */
  @Column({
    name: "day_of_week_mask",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  dayOfWeekMask: string | null = null;

  /**
   * Optional seasonal period for this rate (inclusive).
   * Used for "high season" etc.
   */
  @Column({ name: "season_start", type: "date", nullable: true })
  seasonStart: string | null = null;

  @Column({ name: "season_end", type: "date", nullable: true })
  seasonEnd: string | null = null;

  @Column({ name: "is_default", type: "boolean", default: false })
  isDefault: boolean = false;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
