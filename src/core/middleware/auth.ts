import type { NextFunction, Request, Response } from "express";
import { supabaseServerClient } from "../supabaseClient";
import { AppDataSource } from "../../config/database";
import { User, type UserRole } from "../../features/users/model/User";

export interface AuthenticatedUser {
  id: string; // Supabase user id (UUID)
  email?: string;
  phone?: string;
  role: UserRole;
}

export interface CurrentUserContext {
  auth: AuthenticatedUser;
  userEntity: User;
}

/**
 * Extend Express Request to carry authenticated user context.
 */
export interface AuthenticatedRequest extends Request {
  currentUser?: CurrentUserContext;
}

/**
 * Extracts the bearer token from the Authorization header.
 */
function getAccessTokenFromHeader(req: Request): string | null {
  const header = req.headers.authorization ||
    (req.headers as any).Authorization;
  if (!header || typeof header !== "string") return null;

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

/**
 * Middleware that:
 *  - Validates Supabase JWT
 *  - Loads (or auto-creates) the corresponding User entity from public.users
 *  - Attaches it to req.currentUser
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = getAccessTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Missing or invalid Authorization header",
      });
    }

    const { data, error } = await supabaseServerClient.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }

    const supabaseUser = data.user;
    const meta = (supabaseUser.user_metadata || {}) as any;
    const fullName: string | undefined = meta.full_name || meta.name ||
      meta.user_name;
    const avatarFromMeta: string | null = meta.avatar_url ||
      meta.picture ||
      null;

    const userRepo = AppDataSource.getRepository(User);

    // Normalize phone (avoid empty string which breaks unique constraints)
    const rawPhone = (supabaseUser.phone as string | null) ?? null;
    const phone = typeof rawPhone === "string" && rawPhone.trim().length > 0
      ? rawPhone.trim()
      : null;
    const email = supabaseUser.email ?? null;

    // 🔍 Try to find an existing user by:
    //  1) id
    //  2) email (if present)
    //  3) phone_number (if present)
    const whereClauses: any[] = [{ id: supabaseUser.id }];
    if (email) whereClauses.push({ email });
    if (phone) whereClauses.push({ phone_number: phone });

    let userEntity = await userRepo.findOne({
      where: whereClauses,
    });

    if (!userEntity) {
      // 🚀 Auto-provision a User row on first login (Google / phone / email)
      userEntity = userRepo.create({
        id: supabaseUser.id, // must match Supabase auth.users.id
        email, // nullable email (for phone-only accounts)
        first_name: fullName ?? null,
        last_name: null, // we can split later if needed
        phone_number: phone,
        role: "CLIENT", // default role
        is_active: true,
        avatar_url: avatarFromMeta,
        password_hash: null, // no local password for OAuth/phone
      });

      try {
        await userRepo.save(userEntity);
      } catch (e: any) {
        // 🛡 Handle race conditions / uniqueness (email or phone)
        if (e?.code === "23505") {
          // Re-fetch using the same logic
          userEntity = await userRepo.findOne({
            where: whereClauses,
          });

          if (!userEntity) {
            // If we STILL don't find it, rethrow so we see it in logs
            throw e;
          }
        } else {
          throw e;
        }
      }
    } else {
      // Keep local profile in sync with Supabase profile/meta on every request.
      let needsSave = false;

      if (email && userEntity.email !== email) {
        userEntity.email = email;
        needsSave = true;
      }

      if (phone && userEntity.phone_number !== phone) {
        userEntity.phone_number = phone;
        needsSave = true;
      }

      if (avatarFromMeta && userEntity.avatar_url !== avatarFromMeta) {
        userEntity.avatar_url = avatarFromMeta;
        needsSave = true;
      }

      if (fullName && !userEntity.first_name) {
        userEntity.first_name = fullName;
        needsSave = true;
      }

      if (needsSave) {
        await userRepo.save(userEntity);
      }
    }

    // Attach to request
    req.currentUser = {
      auth: {
        id: supabaseUser.id,
        email: email ?? undefined,
        phone: phone ?? undefined,
        role: userEntity.role,
      },
      userEntity,
    };

    return next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({
      error: "AUTH_ERROR",
      message: "Unexpected error while authenticating",
    });
  }
}

/**
 * Authorization middleware:
 *  - Requires an authenticated user
 *  - Checks that their role is in the allowed list
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.currentUser?.userEntity) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const role = req.currentUser.userEntity.role;

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "You do not have permission to perform this action",
      });
    }

    return next();
  };
}

export const requireAdmin = () => requireRole("ADMIN", "SUPER_ADMIN");
