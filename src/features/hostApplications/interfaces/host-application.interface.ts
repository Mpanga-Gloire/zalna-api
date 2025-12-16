import { HostApplicationStatus } from "../model/host-application-status.enum";

/**
 * DTO representing a Host Application as returned by services/controllers.
 */
export interface HostApplicationDTO {
  id: string;
  hallName: string;
  address: string | null;
  city: string | null;
  capacity: number | null;
  description: string | null;
  additionalDetails: string | null;

  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactWhatsapp: string | null;

  status: HostApplicationStatus;
  adminNotes: string | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  applicantUserId?: string;
}

/**
 * Payload used when a potential host submits the "Become a host" form.
 * This will be exposed via a public endpoint.
 */
export interface CreateHostApplicationPayload {
  hallName: string;
  address?: string;
  city?: string;
  capacity?: number;
  description?: string;
  additionalDetails?: string;

  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  applicantUserId?: string;
}

/**
 * Payload used on the admin side when updating the status of an
 * application and leaving internal notes.
 */
export interface UpdateHostApplicationStatusPayload {
  status: HostApplicationStatus;
  adminNotes?: string;
  reviewedByUserId?: string;
}
