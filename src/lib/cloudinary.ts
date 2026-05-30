import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export async function uploadToCloudinary(file: File): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    toast.error("Bitte melde dich an, um Bilder hochzuladen.");
    return null;
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/cloudinary-upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
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
