import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://carforms.de";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/communities", changefreq: "daily", priority: "0.8" },
          { path: "/category/jdm", changefreq: "weekly", priority: "0.7" },
          { path: "/category/stance", changefreq: "weekly", priority: "0.7" },
          { path: "/category/drift", changefreq: "weekly", priority: "0.7" },
          { path: "/category/track", changefreq: "weekly", priority: "0.7" },
        ];

        const [{ data: posts }, { data: communities }, { data: profiles }] = await Promise.all([
          supabase.from("posts").select("id, created_at").order("created_at", { ascending: false }).limit(5000),
          supabase.from("communities").select("slug, created_at").order("created_at", { ascending: false }).limit(1000),
          supabase.from("profiles").select("username, created_at").order("created_at", { ascending: false }).limit(5000),
        ]);

        entries.push({ path: "/search", changefreq: "weekly", priority: "0.4" });

        for (const p of profiles ?? []) {
          if (!p.username) continue;
          entries.push({
            path: `/profile/${p.username}`,
            lastmod: p.created_at ? new Date(p.created_at).toISOString() : undefined,
            changefreq: "weekly",
            priority: "0.5",
          });
        }

        for (const p of posts ?? []) {
          entries.push({
            path: `/post/${p.id}`,
            lastmod: new Date(p.created_at).toISOString(),
            changefreq: "weekly",
            priority: "0.6",
          });
        }
        for (const c of communities ?? []) {
          entries.push({
            path: `/communities/${c.slug}`,
            lastmod: new Date(c.created_at).toISOString(),
            changefreq: "weekly",
            priority: "0.7",
          });
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
