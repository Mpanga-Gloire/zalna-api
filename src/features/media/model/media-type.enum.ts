/**
 * Type of media stored in the Media table.
 *
 * IMAGE  - standard images (jpg, png, webp, etc.)
 * VIDEO  - video files or video references (if we add them later)
 * DOCUMENT - PDFs, contracts scans, etc. (future extension)
 */
export enum MediaType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT",
}
