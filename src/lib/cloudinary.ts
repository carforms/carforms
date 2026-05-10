import { toast } from "sonner";

const CLOUD_NAME = "carforms";
const UPLOAD_PRESET = "carforms_unsigned";

export async function uploadToCloudinary(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("cloud_name", CLOUD_NAME);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!res.ok) {
    toast.error("Bild konnte nicht hochgeladen werden.");
    return null;
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
