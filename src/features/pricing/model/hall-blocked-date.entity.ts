import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Hall } from "../../halls/model/hall.entity";

/**
 * HallBlockedDate
 *
 * Represents a date (or range) where the hall is not available
 * for new bookings. Can be used for:
 *  - maintenance
 *  - internal events
 *  - manual blocks
 *
 * Later, bookings will also effectively block dates.
 */
@Entity({ name: "hall_blocked_dates" })
@Index(["hallId", "startDate", "endDate"])
export class HallBlockedDate {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "hall_id", type: "uuid" })
  hallId!: string;

  @ManyToOne(() => Hall)
  hall!: Hall;

  @Column({ name: "start_date", type: "date" })
  startDate!: string;

  @Column({ name: "end_date", type: "date", nullable: true })
  endDate: string | null = null;

  @Column({ type: "text", nullable: true })
  reason: string | null = null;

  @Column({ name: "created_by_user_id", type: "uuid", nullable: true })
  createdByUserId: string | null = null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
