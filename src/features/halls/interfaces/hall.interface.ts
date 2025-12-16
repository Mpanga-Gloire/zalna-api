import { HallStatus } from "../model/hall-status.enum";
import { MediaDTO } from "../../media/interfaces/media.interface";

/**
 * Shape of the Hall data used in our application/business logic.
 * This is intentionally decoupled from the ORM entity so we keep
 * our domain model flexible.
 */
export interface HallDTO {
  id: string;
  gerantId: string | null;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  capacity: number | null;
  description: string | null;
  cancellationPolicy: string | null;
  isPremium: boolean;
  status: HallStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payload used when creating a hall from the admin side.
 * We do not expose internal fields like id, createdAt, updatedAt here.
 */
export interface CreateHallPayload {
  name: string;
  slug?: string;
  address?: string;
  city?: string;
  capacity?: number;
  description?: string;
  cancellationPolicy?: string;
  isPremium?: boolean;
  status?: HallStatus; // optional; default DRAFT if not provided
  gerantId?: string; // optional for now
}

/**
 * Payload used when updating hall details.
 * All fields are optional because it's a partial update.
 */
export interface UpdateHallPayload {
  name?: string;
  slug?: string;
  address?: string;
  city?: string;
  capacity?: number;
  description?: string;
  cancellationPolicy?: string;
  isPremium?: boolean;
  status?: HallStatus;
  gerantId?: string | null;
}

/**
 * DTO used for the public hall LIST page.
 * This is optimized for UI cards, not for admin.
 */
export interface PublicHallCardDTO {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  capacity: number | null;
  isPremium: boolean;

  /**
   * URL of the hero image (tag HERO, primary=true) if available.
   */
  heroImageUrl: string | null;

  /**
   * Lowest available rate price across all active products & rates.
   * If no pricing is configured yet, these are null.
   */
  startingFromPrice: number | null;
  startingFromCurrency: string | null;
}

/**
 * DTO used for the public hall DETAIL page.
 * Contains full public info plus media gallery.
 */
export interface PublicHallDetailDTO {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  capacity: number | null;
  description: string | null;
  cancellationPolicy: string | null;
  isPremium: boolean;

  heroImageUrl: string | null;

  /**
   * Full gallery (all IMAGE media).
   */
  gallery: MediaDTO[];

  /**
   * Pricing structure exposed to the public:
   *  - products (wedding, civil, conference...)
   *  - each product has rates (1h, 2h, avec cocktail, etc.)
   */
  products: PublicHallProductDTO[];

  /**
   * Available addons for this hall (per event/person/pack).
   */
  addons: PublicHallAddonDTO[];
}

/**
 * Public-facing rate for a hall product.
 */
export interface PublicHallRateDTO {
  id: string;
  label: string;
  currency: string;
  price: number;
  billingUnit: string; // EVENT, HOUR, DAY
  minHours: number | null;
  maxHours: number | null;
  extraUnitPrice: number | null;
  dayOfWeekMask: string | null;
  seasonStart: string | null; // YYYY-MM-DD
  seasonEnd: string | null; // YYYY-MM-DD
  isDefault: boolean;
}

/**
 * Public-facing product (usage context) for a hall:
 *  - Wedding – indoor hall
 *  - Civil ceremony on the lawn
 *  - Conference – Formule CONFORT
 *  etc.
 */
export interface PublicHallProductDTO {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  isPrimary: boolean;
  rates: PublicHallRateDTO[];
}

/**
 * Public-facing addon (we do NOT expose redevance here).
 */
export interface PublicHallAddonDTO {
  id: string;
  name: string;
  description: string | null;
  pricingModel: string; // FIXED_EVENT, PER_PERSON, PER_PACK
  currency: string;
  unitPrice: number;
  packSize: number | null;
  isActive: boolean;
}

// =======================================
// Public hall search (Airbnb-style)
// =======================================

export type HallSortBy =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "capacity_desc"
  | "featured";

/**
 * Filters supported by the public hall search endpoint
 * (GET /api/public/halls).
 *
 * This is the contract between controller and service.
 */
export interface HallSearchFilters {
  // Free text (optional, secondary)
  q?: string;

  // Structured filters (primary)
  city?: string;
  eventType?: string; // WEDDING, CIVIL, MEETING, CONCERT, OTHER
  date?: string; // YYYY-MM-DD (for availability)

  // Capacity (guests)
  capacityMin?: number;
  capacityMax?: number;

  // Budget range on "starting from" price
  priceMin?: number;
  priceMax?: number;

  isPremium?: boolean;

  // Amenities / features, e.g. ["PARKING", "AC"]
  features?: string[];

  // Sorting
  sortBy?: HallSortBy;

  // Pagination (required with defaults applied by controller)
  page: number;
  limit: number;
}
