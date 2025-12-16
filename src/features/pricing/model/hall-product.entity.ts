import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Hall } from "../../halls/model/hall.entity";

/**
 * HallProduct
 *
 * Represents a "product" or usage mode of the hall.
 * Examples:
 *  - "Wedding – Indoor hall"
 *  - "Mariage civil sur pelouse"
 *  - "Conference – Formule CONFORT"
 *  - "Concert / Spectacle"
 */
@Entity({ name: "hall_products" })
export class HallProduct {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "hall_id", type: "uuid" })
  hallId!: string;

  @ManyToOne(() => Hall)
  hall!: Hall;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  /**
   * Optional category, e.g.:
   *  - WEDDING
   *  - CIVIL
   *  - MEETING
   *  - CONCERT
   *  - OTHER
   */
  @Column({ type: "varchar", length: 50, nullable: true })
  category: string | null = null;

  @Column({ type: "text", nullable: true })
  description: string | null = null;

  /**
   * Marks the main product to show on the hall detail page.
   */
  @Column({ name: "is_primary", type: "boolean", default: false })
  isPrimary: boolean = false;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean = true;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
