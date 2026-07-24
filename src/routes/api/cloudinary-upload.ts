import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function sniffImageType(b: Uint8Array): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return "image/gif";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return "image/webp";
  return null;
}

export const Route = createFileRoute("/api/cloudinary-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Require authenticated Supabase user
          const authHeader = request.headers.get("authorization") ?? "";
          if (!authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }
          const token = authHeader.slice("Bearer ".length);
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!supabaseUrl || !supabaseKey) {
            return new Response(JSON.stringify({ error: "Auth not configured" }), { status: 500 });
          }
          const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: userData, error: userError } = await supabase.auth.getUser(token);
          if (userError || !userData?.user?.id) {
            console.error("cloudinary-upload auth failed:", userError?.message);
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }

          const form = await request.formData();
          const file = form.get("file");
          if (!(file instanceof File)) {
            return new Response(JSON.stringify({ error: "Missing file" }), { status: 400 });
          }
          if (!ALLOWED.includes(file.type)) {
            return new Response(JSON.stringify({ error: "Invalid file type" }), { status: 400 });
          }
          if (file.size > MAX_BYTES) {
            return new Response(JSON.stringify({ error: "File too large (max 5MB)" }), { status: 400 });
          }

          // Validate magic bytes — client-declared Content-Type is untrusted.
          const headerBuf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
          const sniffedType = sniffImageType(headerBuf);
          if (!sniffedType || !ALLOWED.includes(sniffedType)) {
            return new Response(JSON.stringify({ error: "Invalid file type" }), { status: 400 });
          }

          const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
          const apiKey = process.env.CLOUDINARY_API_KEY;
          const apiSecret = process.env.CLOUDINARY_API_SECRET;
          if (!cloudName || !apiKey || !apiSecret) {
            return new Response(JSON.stringify({ error: "Cloudinary not configured" }), { status: 500 });
          }

          const timestamp = Math.floor(Date.now() / 1000);
          // Signature: sha1 of "timestamp=<ts><api_secret>" (only timestamp param)
          const signature = createHash("sha1")
            .update(`timestamp=${timestamp}${apiSecret}`)
            .digest("hex");

          const upstream = new FormData();
          upstream.append("file", file);
          upstream.append("api_key", apiKey);
          upstream.append("timestamp", String(timestamp));
          upstream.append("signature", signature);

          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: "POST", body: upstream },
          );

          if (!res.ok) {
            const text = await res.text();
            console.error("Cloudinary upload failed:", text);
            return new Response(JSON.stringify({ error: "Upload failed" }), { status: 502 });
          }

          const data = (await res.json()) as { secure_url: string };
          return Response.json({ secure_url: data.secure_url });
        } catch (err) {
          console.error("cloudinary-upload error:", err);
          return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
        }
      },
    },
  },
});
