// src/features/hostApplications/model/host-application.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { HostApplicationStatus } from "./host-application-status.enum";

@Entity({ name: "host_applications" })
@Index(["status", "createdAt"])
export class HostApplication {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // ✅ NEW: which authenticated user submitted this application
  @Column({ name: "applicant_user_id", type: "uuid", nullable: true })
  applicantUserId: string | null = null;

  // =========================
  // Hall-related information
  // =========================

  @Column({ name: "hall_name", type: "varchar", length: 255 })
  hallName!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  address: string | null = null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string | null = null;

  @Column({ type: "int", nullable: true })
  capacity: number | null = null;

  @Column({ type: "text", nullable: true })
  description: string | null = null;

  @Column({ name: "additional_details", type: "text", nullable: true })
  additionalDetails: string | null = null;

  // =========================
  // Applicant contact details
  // =========================

  @Column({ name: "contact_name", type: "varchar", length: 150 })
  contactName!: string;

  @Column({ name: "contact_email", type: "varchar", length: 255 })
  contactEmail!: string;

  @Column({
    name: "contact_phone",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  contactPhone: string | null = null;

  @Column({
    name: "contact_whatsapp",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  contactWhatsapp: string | null = null;

  // =========================
  // Status & review metadata
  // =========================

  @Column({
    type: "varchar",
    length: 50,
    default: HostApplicationStatus.NEW,
  })
  status: HostApplicationStatus = HostApplicationStatus.NEW;

  @Column({ name: "admin_notes", type: "text", nullable: true })
  adminNotes: string | null = null;

  @Column({ name: "reviewed_by_user_id", type: "uuid", nullable: true })
  reviewedByUserId: string | null = null;

  @Column({ name: "reviewed_at", type: "timestamp", nullable: true })
  reviewedAt: Date | null = null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
