// Refactored AppDataSource.ts for Supabase Integration

import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env"; // Assumed to handle environment variable loading
import { Hall } from "../features/halls/model/hall.entity";
import { HostApplication } from "../features/hostApplications/model/host-application.entity";
import { Media } from "../features/media/model/media.entity";
import { MediaTag } from "../features/media/model/media-tag.entity";
import { MediaTagType } from "../features/media/model/media-tag-type.entity";
import { HallProduct } from "../features/pricing/model/hall-product.entity";
import { HallProductRate } from "../features/pricing/model/hall-product-rate.entity";
import { HallAddon } from "../features/pricing/model/hall-addon.entity";
import { HallBlockedDate } from "../features/pricing/model/hall-blocked-date.entity";
import { User } from "../features/users/model/User";
import { HallUserRole } from "../features/halls/model/HallUserRole";



// --- MEANINGFUL COMMENTARY FOR THE TEAM (DO NOT DEPLOY) ---

/*
 * ARCHITECTURE NOTE: Database Connection Strategy
 * ----------------------------------------------
 * We are moving from fragmented connection parameters (host, port, user)
 * to a single connection 'url'. This is the industry standard for cloud environments
 * (Heroku, Supabase) where the full connection string is provided via the
 * DATABASE_URL environment variable.
 * * This strategy simplifies deployment and is required for services like PgBouncer
 * (which handles connection pooling) to function correctly in production.
 */

const dbUrl = process.env.DATABASE_URL || env.db.databaseUrl;

/* * SECURITY NOTE: Synchronize Flag
 * -----------------------------
 * We must NEVER run synchronize: true in a production environment (NODE_ENV=production)
 * as it can lead to accidental data loss when entity models are changed.
 * * TRUE is used only in local development for convenience.
 * In production, we rely strictly on TypeORM Migrations.
 */
const isProduction = process.env.NODE_ENV === "production";

export const AppDataSource = new DataSource({
  type: "postgres",

  // PRIMARY CONNECTION: This dynamically switches between the local Docker URL
  // and the Supabase Cloud URL based on the environment variable set.
  url: dbUrl,

  // NOTE: These specific fields (host, port, username, password) are ignored
  // because the 'url' property is defined above.
  // host: env.db.host,
  // ... and other individual properties

  synchronize: !isProduction, // Sets to false if NODE_ENV is 'production'
  logging: env.db.logging,

  // Ensure ALL entities are listed here for TypeORM to recognize the schema
  entities: [
    Hall,
    HostApplication,
    Media,
    MediaTag,
    MediaTagType,
    HallProduct,
    HallProductRate,
    HallAddon,
    HallBlockedDate,
    User,
    HallUserRole,


  ],

  // IMPORTANT: This path is where we will store all production database changes.
  migrations: ["dist/migrations/*.js"],
  subscribers: [],
});

export async function initDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log("✅ Database connection established");
  } catch (error) {
    // CRITICAL: Log the detailed error to assist with connection debugging
    // during deployment or initial setup.
    console.error("❌ Failed to connect to the database", error);
    throw error;
  }
}
