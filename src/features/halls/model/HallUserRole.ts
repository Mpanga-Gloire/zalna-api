// src/features/halls/model/HallUserRole.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Hall } from "./hall.entity";
import { User } from "../../users/model/User";

export type HallUserRoleType = "OWNER" | "MANAGER" | "RECEPTIONIST" | "ACCOUNTANT";

/**
 * HallUserRole:
 * - Links a User to a Hall with a specific role.
 *
 * Business meaning:
 * - OWNER       → vendor / hall owner
 * - MANAGER     → gérant
 * - RECEPTIONIST / ACCOUNTANT → future internal staff roles
 */

@Entity({ name: "HallUserRole" }) // or "hall_user_role" if you use snake_case
export class HallUserRole {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Hall, { nullable: false })
  @JoinColumn({ name: "hall_id" })
  hall!: Hall;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "varchar", length: 50 })
  role!: HallUserRoleType;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;
}
