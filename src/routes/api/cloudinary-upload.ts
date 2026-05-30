import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";

const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export const Route = createFileRoute("/api/cloudinary-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
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
