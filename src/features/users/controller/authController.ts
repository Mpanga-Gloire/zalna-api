// src/features/users/controller/authController.ts
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../../core/middleware/auth";
import { supabaseServerClient } from "../../../core/supabaseClient";
import { AppDataSource } from "../../../config/database";
import { User } from "../model/User";

/**
 * GET /api/auth/me
 * Returns the current authenticated user's profile & basic auth info.
 */
export async function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.currentUser) {
    return res.status(500).json({
      error: "AUTH_LOGIC_ERROR",
      message: "Missing currentUser context after requireAuth",
    });
  }

  const { auth, userEntity } = req.currentUser;

  if (!userEntity) {
    return res.status(500).json({
      error: "AUTH_LOGIC_ERROR",
      message: "Missing userEntity in currentUser context",
    });
  }

  return res.json({
    auth: {
      id: auth.id,
      email: auth.email,
    },
    user: {
      id: userEntity.id,
      email: userEntity.email,
      first_name: userEntity.first_name,
      last_name: userEntity.last_name,
      phone_number: userEntity.phone_number,
      avatar_url: userEntity.avatar_url,
      role: userEntity.role,
      is_active: userEntity.is_active,
      created_at: userEntity.created_at,
      updated_at: userEntity.updated_at,
    },
  });
}

/**
 * POST /api/auth/login/email
 * Authenticates a user via Supabase email/password and ensures the local user
 * row exists (and stores avatar if provided).
 */
export async function emailPasswordLogin(req: Request, res: Response) {
  const { email, password, avatarUrl } = req.body || {};

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return res.status(400).json({
      error: "INVALID_PAYLOAD",
      message: "email and password are required",
    });
  }

  const { data, error } = await supabaseServerClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.session || !data.user) {
    return res.status(401).json({
      error: "AUTH_FAILED",
      message: error?.message || "Invalid email or password",
    });
  }

  const supabaseUser = data.user;
  const userRepo = AppDataSource.getRepository(User);

  const phone = (supabaseUser.phone as string | null) ?? null;
  const meta = (supabaseUser.user_metadata || {}) as Record<string, any>;
  const fullName: string | undefined = meta.full_name || meta.name || meta.user_name;
  const resolvedAvatar: string | null =
    typeof avatarUrl === "string" && avatarUrl.trim().length > 0
      ? avatarUrl.trim()
      : meta.avatar_url || meta.picture || null;

  const whereClauses: any[] = [{ id: supabaseUser.id }];
  if (supabaseUser.email) whereClauses.push({ email: supabaseUser.email });
  if (phone) whereClauses.push({ phone_number: phone });

  let userEntity = await userRepo.findOne({ where: whereClauses });

  if (!userEntity) {
    userEntity = userRepo.create({
      id: supabaseUser.id,
      email: supabaseUser.email ?? null,
      first_name: fullName ?? null,
      last_name: null,
      phone_number: phone,
      role: "CLIENT",
      is_active: true,
      avatar_url: resolvedAvatar,
      password_hash: null,
    });

    try {
      await userRepo.save(userEntity);
    } catch (e: any) {
      if (e?.code === "23505") {
        userEntity = await userRepo.findOne({ where: whereClauses });
      } else {
        throw e;
      }
    }
  } else {
    let needsSave = false;
    if (resolvedAvatar && userEntity.avatar_url !== resolvedAvatar) {
      userEntity.avatar_url = resolvedAvatar;
      needsSave = true;
    }
    if (supabaseUser.email && userEntity.email !== supabaseUser.email) {
      userEntity.email = supabaseUser.email;
      needsSave = true;
    }
    if (phone && userEntity.phone_number !== phone) {
      userEntity.phone_number = phone;
      needsSave = true;
    }
    if (needsSave) {
      await userRepo.save(userEntity);
    }
  }

  if (!userEntity) {
    return res.status(500).json({
      error: "AUTH_LOGIC_ERROR",
      message: "User entity could not be loaded or created",
    });
  }

  return res.json({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
      token_type: data.session.token_type,
    },
    user: {
      id: userEntity.id,
      email: userEntity.email,
      phone_number: userEntity.phone_number,
      first_name: userEntity.first_name,
      last_name: userEntity.last_name,
      role: userEntity.role,
      avatar_url: userEntity.avatar_url,
      is_active: userEntity.is_active,
      created_at: userEntity.created_at,
      updated_at: userEntity.updated_at,
    },
  });
}
