// src/core/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

if (!env.supabase.url) {
  throw new Error("SUPABASE_URL is not configured");
}

if (!env.supabase.serviceKey) {
  throw new Error("SUPABASE_SERVICE_KEY is not configured");
}

/**
 * Supabase client for server-side use only.
 * Uses the SERVICE KEY → admin-level access.
 * Never expose this key to the frontend.
 */
export const supabaseServerClient = createClient(
  env.supabase.url,
  env.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
