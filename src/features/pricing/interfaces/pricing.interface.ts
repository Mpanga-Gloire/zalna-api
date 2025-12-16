///////////////////////////////////////
// HallProduct
///////////////////////////////////////

export interface HallProductDTO {
  id: string;
  hallId: string;
  name: string;
  category: string | null;
  description: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHallProductPayload {
  hallId: string;
  name: string;
  category?: string;
  description?: string;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface UpdateHallProductPayload {
  name?: string;
  category?: string | null;
  description?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
}

///////////////////////////////////////
// HallProductRate
///////////////////////////////////////

export interface HallProductRateDTO {
  id: string;
  hallProductId: string;
  label: string;
  currency: string;
  price: number; // mapped from numeric string
  billingUnit: string; // EVENT, HOUR, DAY
  minHours: number | null;
  maxHours: number | null;
  extraUnitPrice: number | null;
  dayOfWeekMask: string | null;
  seasonStart: string | null; // YYYY-MM-DD
  seasonEnd: string | null; // YYYY-MM-DD
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHallProductRatePayload {
  hallProductId: string;
  label: string;
  currency: string;
  price: number;
  billingUnit: string; // EVENT, HOUR, DAY
  minHours?: number;
  maxHours?: number;
  extraUnitPrice?: number;
  dayOfWeekMask?: string;
  seasonStart?: string; // YYYY-MM-DD
  seasonEnd?: string; // YYYY-MM-DD
  isDefault?: boolean;
}

export interface UpdateHallProductRatePayload {
  label?: string;
  currency?: string;
  price?: number;
  billingUnit?: string;
  minHours?: number | null;
  maxHours?: number | null;
  extraUnitPrice?: number | null;
  dayOfWeekMask?: string | null;
  seasonStart?: string | null;
  seasonEnd?: string | null;
  isDefault?: boolean;
}

///////////////////////////////////////
// HallAddon
///////////////////////////////////////

export interface HallAddonDTO {
  id: string;
  hallId: string;
  name: string;
  description: string | null;
  pricingModel: string; // FIXED_EVENT, PER_PERSON, PER_PACK
  currency: string;
  unitPrice: number;
  packSize: number | null;
  redevanceAmount: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHallAddonPayload {
  hallId: string;
  name: string;
  description?: string;
  pricingModel: string;
  currency: string;
  unitPrice: number;
  packSize?: number;
  redevanceAmount?: number;
  isActive?: boolean;
}

export interface UpdateHallAddonPayload {
  name?: string;
  description?: string | null;
  pricingModel?: string;
  currency?: string;
  unitPrice?: number;
  packSize?: number | null;
  redevanceAmount?: number | null;
  isActive?: boolean;
}

///////////////////////////////////////
// HallBlockedDate
///////////////////////////////////////

export interface HallBlockedDateDTO {
  id: string;
  hallId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  reason: string | null;
  createdByUserId: string | null;
  createdAt: Date;
}

export interface CreateHallBlockedDatePayload {
  hallId: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  reason?: string;
  createdByUserId?: string;
}
