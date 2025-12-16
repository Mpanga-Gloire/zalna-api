import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type UserRole = "CLIENT" | "ADMIN" | "SUPER_ADMIN";

@Entity({ name: "users" })
export class User {
  /**
   * We use the SAME id as Supabase auth.users.id (uuid).
   * So we do NOT auto-generate it here – we set it manually
   * when we auto-provision from Supabase.
   */
  @PrimaryColumn("uuid")
  id!: string; // Using '!' because it's set manually and is NOT nullable

  @Index("idx_users_email", { unique: true })
  @Column("varchar", {
    name: "email",
    length: 255,
    nullable: true, // ✅ email is optional (for phone-only accounts)
  })
  email: string | null = null; // Initialized to fix error 2564

  @Column("text", {
    name: "password_hash",
    nullable: true, // null for Google / phone accounts
  })
  password_hash: string | null = null; // Initialized to fix error 2564

  @Column("varchar", {
    name: "first_name",
    length: 100,
    nullable: true,
  })
  first_name: string | null = null; // Initialized to fix error 2564

  @Column("varchar", {
    name: "last_name",
    length: 100,
    nullable: true,
  })
  last_name: string | null = null; // Initialized to fix error 2564

  @Index("idx_users_phone_number", { unique: true })
  @Column("varchar", {
    name: "phone_number",
    length: 50,
    nullable: true,
  })
  phone_number: string | null = null; // Initialized to fix error 2564

  @Column("varchar", {
    name: "role",
    length: 50,
    default: "CLIENT",
  })
  role: UserRole = "CLIENT"; // Initialized with the default value to fix error 2564

  @Column("boolean", {
    name: "is_active",
    default: true,
  })
  is_active: boolean = true; // Initialized with the default value to fix error 2564

  @Column("varchar", {
    name: "avatar_url",
    length: 500,
    nullable: true,
  })
  avatar_url: string | null = null; // Initialized to fix error 2564

  @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
  created_at!: Date; // Using '!' because TypeORM guarantees assignment on creation

  @UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
  updated_at!: Date; // Using '!' because TypeORM guarantees assignment on update
}
