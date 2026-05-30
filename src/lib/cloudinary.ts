import { toast } from "sonner";

export async function uploadToCloudinary(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/cloudinary-upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    toast.error("Bild konnte nicht hochgeladen werden.");
    return null;
  }

  const data = (await res.json()) as { secure_url?: string; error?: string };
  if (!data.secure_url) {
    toast.error(data.error ?? "Bild konnte nicht hochgeladen werden.");
    return null;
  }
  return data.secure_url;
}
