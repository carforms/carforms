/**
 * Build/start sanity check: ensures CommunitiesRoute and CommunitiesSlugRoute
 * are properly registered in src/routeTree.gen.ts.
 *
 * Run with: bun scripts/check-routes.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routeTreePath = resolve(process.cwd(), "src/routeTree.gen.ts");
const src = readFileSync(routeTreePath, "utf8");

type Check = { name: string; pattern: RegExp };

const checks: Check[] = [
  {
    name: "CommunitiesRouteImport import",
    pattern: /import\s+\{\s*Route as CommunitiesRouteImport\s*\}\s+from\s+['"]\.\/routes\/communities['"]/,
  },
  {
    name: "CommunitiesSlugRouteImport import",
    pattern: /import\s+\{\s*Route as CommunitiesSlugRouteImport\s*\}\s+from\s+['"]\.\/routes\/communities_\.\$slug['"]/,
  },
  { name: "CommunitiesRoute declaration", pattern: /const\s+CommunitiesRoute\s*=\s*CommunitiesRouteImport\.update/ },
  { name: "CommunitiesSlugRoute declaration", pattern: /const\s+CommunitiesSlugRoute\s*=\s*CommunitiesSlugRouteImport\.update/ },
  { name: "/communities path registered", pattern: /path:\s*['"]\/communities['"]/ },
  { name: "/communities/$slug path registered", pattern: /path:\s*['"]\/communities\/\$slug['"]/ },
  { name: "CommunitiesRoute in root children", pattern: /CommunitiesRoute:\s*CommunitiesRoute/ },
  { name: "CommunitiesSlugRoute in root children", pattern: /CommunitiesSlugRoute:\s*CommunitiesSlugRoute/ },
];

const failed = checks.filter((c) => !c.pattern.test(src));

if (failed.length > 0) {
  console.error("❌ Route registration check failed:");
  for (const f of failed) console.error(`  - missing: ${f.name}`);
  console.error("\nFix: ensure src/routes/communities.tsx and src/routes/communities_.$slug.tsx exist; the dev server regenerates routeTree.gen.ts automatically.");
  process.exit(1);
}

console.log("✅ Communities routes are correctly registered in routeTree.gen.ts");
