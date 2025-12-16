import dotenv from "dotenv";

dotenv.config();

type NodeEnv = "development" | "test" | "production";

const nodeEnv = (process.env.NODE_ENV as NodeEnv) || "development";

// Set a fallback for the database URL for local development (Supabase Docker)
// The user should set the actual production URL in the Heroku Config Vars.
const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export const env = {
  nodeEnv,
  isProd: nodeEnv === "production",
  isDev: nodeEnv === "development",

  // Application Port (Heroku provides PORT automatically)
  port: Number(process.env.PORT) || 4000,

  db: {
    // 💥 NEW: Use the standard DATABASE_URL environment variable
    // This will be set to the Supabase Cloud connection string in production.
    databaseUrl: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,

    // Logging setting
    logging: process.env.DB_LOGGING === "true",
    // NOTE: The following fields are now OBSOLETE and REMOVED
    // since TypeORM uses the 'databaseUrl' string.
    // host: process.env.DB_HOST,
    // port: Number(process.env.DB_PORT),
    // username: process.env.DB_USERNAME,
    // password: process.env.DB_PASSWORD,
    // name: process.env.DB_NAME,
  },

  // 🔑 NEW: Supabase API Keys (Used by the server for storage/auth)
  supabase: {
    // Project URL (used for initializing the client SDK)
    url: process.env.SUPABASE_URL || "http://127.0.0.1:54321",
    // Service Role Key (secret key used by the server/Gloire's API)
    serviceKey: process.env.SUPABASE_SERVICE_KEY || "",
    // Public Publishable Key (used by the frontend/Schad's app)
    anonKey: process.env.SUPABASE_ANON_KEY || "",
    // Storage bucket for media uploads
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "media",
  },
};
