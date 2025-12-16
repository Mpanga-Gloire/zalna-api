/**
 * Represents the lifecycle of a hall on the platform.
 *
 * - DRAFT: Not visible publicly yet. Internal setup phase.
 * - ACTIVE: Visible on public hall list and can receive inquiries/bookings.
 * - ARCHIVED: No longer visible or bookable, but kept for history/reporting.
 */
export enum HallStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}
