/**
 * Lifecycle of a host application submitted from the "Become a host" form.
 *
 * - NEW: Just submitted, not yet seen by Zalna admin.
 * - UNDER_REVIEW: Admin has opened/started verifying this application.
 * - APPROVED: Application accepted; a Hall can be created from it.
 * - REJECTED: Application refused (e.g. incomplete, not eligible).
 */
export enum HostApplicationStatus {
  NEW = "NEW",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}
