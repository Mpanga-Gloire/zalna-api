import "reflect-metadata";
import { AppDataSource } from "../src/config/database";
import { HostApplication } from "../src/features/hostApplications/model/host-application.entity";
import { HostApplicationStatus } from "../src/features/hostApplications/model/host-application-status.enum";

type Args = {
  hallName: string;
  contactName: string;
  contactEmail: string;
  applicantUserId?: string;
  address?: string;
  city?: string;
  capacity?: number;
  description?: string;
  additionalDetails?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Partial<Args> = {};

  for (const arg of args) {
    const [key, value] = arg.split("=");
    if (!key || value === undefined) continue;
    const cleanKey = key.replace(/^--/, "");
    switch (cleanKey) {
      case "hallName":
        out.hallName = value;
        break;
      case "contactName":
        out.contactName = value;
        break;
      case "contactEmail":
        out.contactEmail = value;
        break;
      case "applicantUserId":
        out.applicantUserId = value;
        break;
      case "address":
        out.address = value;
        break;
      case "city":
        out.city = value;
        break;
      case "capacity":
        out.capacity = Number(value);
        break;
      case "description":
        out.description = value;
        break;
      case "additionalDetails":
        out.additionalDetails = value;
        break;
      case "contactPhone":
        out.contactPhone = value;
        break;
      case "contactWhatsapp":
        out.contactWhatsapp = value;
        break;
    }
  }

  if (!out.hallName || !out.contactName || !out.contactEmail) {
    throw new Error(
      "Usage: npx ts-node scripts/create-host-application.ts --hallName=\"Hall Name\" --contactName=\"Jane Doe\" --contactEmail=user@example.com [--applicantUserId=uuid --city=Kinshasa --capacity=200 --address=... --description=... --additionalDetails=... --contactPhone=... --contactWhatsapp=...]",
    );
  }

  return out as Args;
}

async function main() {
  const args = parseArgs();

  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(HostApplication);

  const entity = repo.create({
    hallName: args.hallName.trim(),
    address: args.address ?? null,
    city: args.city ?? null,
    capacity:
      args.capacity !== undefined && Number.isFinite(args.capacity)
        ? args.capacity
        : null,
    description: args.description ?? null,
    additionalDetails: args.additionalDetails ?? null,
    contactName: args.contactName.trim(),
    contactEmail: args.contactEmail.trim().toLowerCase(),
    contactPhone: args.contactPhone ?? null,
    contactWhatsapp: args.contactWhatsapp ?? null,
    applicantUserId: args.applicantUserId ?? null,
    status: HostApplicationStatus.NEW,
    adminNotes: null,
    reviewedByUserId: null,
    reviewedAt: null,
  });

  const saved = await repo.save(entity);

  console.log("✅ Host application created");
  console.log({
    id: saved.id,
    hallName: saved.hallName,
    contactName: saved.contactName,
    contactEmail: saved.contactEmail,
    applicantUserId: saved.applicantUserId,
    status: saved.status,
  });

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error("❌ Failed to create host application:", err);
  AppDataSource.destroy().catch(() => undefined);
  process.exit(1);
});
