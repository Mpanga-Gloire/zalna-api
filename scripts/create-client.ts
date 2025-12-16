import "reflect-metadata";
import { AppDataSource } from "../src/config/database";
import { User } from "../src/features/users/model/User";
import { supabaseServerClient } from "../src/core/supabaseClient";

type Args = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Partial<Args> = {};

  for (let i = 0; i < args.length; i++) {
    const [key, value] = args[i].split("=");
    if (!key || value === undefined) continue;
    const cleanKey = key.replace(/^--/, "");
    if (cleanKey === "email") out.email = value;
    if (cleanKey === "password") out.password = value;
    if (cleanKey === "firstName") out.firstName = value;
    if (cleanKey === "lastName") out.lastName = value;
    if (cleanKey === "phone") out.phone = value;
    if (cleanKey === "avatarUrl") out.avatarUrl = value;
  }

  if (!out.email || !out.password) {
    throw new Error(
      "Usage: npx ts-node scripts/create-client.ts --email=foo@bar.com --password=Secret123 [--firstName=Foo --lastName=Bar --phone=+243... --avatarUrl=https://...]",
    );
  }

  return out as Args;
}

async function main() {
  const args = parseArgs();

  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);

  // Create or fetch Supabase auth user
  const { data: created, error: createErr } =
    await supabaseServerClient.auth.admin.createUser({
      email: args.email,
      password: args.password,
      email_confirm: true,
      user_metadata: {
        full_name: [args.firstName, args.lastName].filter(Boolean).join(" ") || undefined,
        avatar_url: args.avatarUrl,
        picture: args.avatarUrl,
      },
    });

  let supabaseUser = created?.user ?? null;

  if (createErr) {
    // Likely already exists: fetch by email
    const { data: listData, error: listErr } =
      await supabaseServerClient.auth.admin.listUsers({ page: 1, perPage: 100, email: args.email });

    if (listErr || !listData?.users?.length) {
      throw createErr;
    }

    supabaseUser = listData.users.find((u) => u.email === args.email) ?? listData.users[0];
  }

  if (!supabaseUser) {
    throw new Error("Failed to obtain Supabase user");
  }

  // Upsert local user row
  const whereClauses: any[] = [{ id: supabaseUser.id }];
  if (supabaseUser.email) whereClauses.push({ email: supabaseUser.email });
  if (args.phone) whereClauses.push({ phone_number: args.phone });

  let userEntity = await userRepo.findOne({ where: whereClauses });

  if (!userEntity) {
    userEntity = userRepo.create({
      id: supabaseUser.id,
      email: supabaseUser.email ?? null,
      first_name: args.firstName ?? null,
      last_name: args.lastName ?? null,
      phone_number: args.phone ?? null,
      role: "CLIENT",
      is_active: true,
      avatar_url: args.avatarUrl ?? null,
      password_hash: null,
    });
  } else {
    userEntity.email = supabaseUser.email ?? userEntity.email;
    if (args.firstName !== undefined) userEntity.first_name = args.firstName;
    if (args.lastName !== undefined) userEntity.last_name = args.lastName;
    if (args.phone !== undefined) userEntity.phone_number = args.phone;
    if (args.avatarUrl !== undefined) userEntity.avatar_url = args.avatarUrl;
    userEntity.role = "CLIENT";
    userEntity.is_active = true;
  }

  await userRepo.save(userEntity);

  console.log("✅ Client user ready");
  console.log({
    id: userEntity.id,
    email: userEntity.email,
    first_name: userEntity.first_name,
    last_name: userEntity.last_name,
    phone_number: userEntity.phone_number,
    avatar_url: userEntity.avatar_url,
    role: userEntity.role,
  });

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error("❌ Failed to create client user:", err);
  AppDataSource.destroy().catch(() => undefined);
  process.exit(1);
});
