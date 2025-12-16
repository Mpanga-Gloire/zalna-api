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
 * HallAddon
 *
 * Extra services/options associated with a hall.
 * Examples:
 *  - Plates + cutlery + glasses @ 1.30$/person
 *  - Golden cake cart @ 15$/event (with 5$ redevance)
 *  - Heating packs: pack of 10 @ 50$
 *  - Cooling equipment @ 30$/event
 */
@Entity({ name: "hall_addons" })
export class HallAddon {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "hall_id", type: "uuid" })
  hallId!: string;

  @ManyToOne(() => Hall)
  hall!: Hall;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description: string | null = null;

  /**
   * Pricing model:
   *  - FIXED_EVENT (flat price per event)
   *  - PER_PERSON (price * number of guests)
   *  - PER_PACK   (price * number of packs; pack_size defines units/pack)
   */
  @Column({ name: "pricing_model", type: "varchar", length: 30 })
  pricingModel!: string;

  @Column({ type: "varchar", length: 10, default: "USD" })
  currency!: string;

  @Column({ name: "unit_price", type: "numeric", precision: 12, scale: 2 })
  unitPrice!: string;

  /**
   * Only used for PER_PACK model.
   */
  @Column({ name: "pack_size", type: "int", nullable: true })
  packSize: number | null = null;

  /**
   * Optional "redevance" amount the hall owes to the platform or owner
   * for this addon.
   */
  @Column({
    name: "redevance_amount",
    type: "numeric",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  redevanceAmount: string | null = null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean = true;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
