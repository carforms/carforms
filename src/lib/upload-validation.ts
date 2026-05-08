export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Nur JPG, PNG, GIF oder WebP sind erlaubt.";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Bild darf maximal 5 MB groß sein.";
  }
  return null;
}
