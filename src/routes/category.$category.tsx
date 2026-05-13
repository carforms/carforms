import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = {
  jdm: {
    slug: "jdm",
    name: "JDM",
    title: "JDM Cars Deutschland — Builds, Stance & Tuning | carforms",
    description:
      "Entdecke die deutsche JDM-Szene auf carforms. Aktuelle Builds, Stance-Setups und Tuning-Projekte rund um Skyline, Supra, Silvia, RX-7 und mehr.",
    h1: "JDM — Japanische Auto-Kultur",
    subtitle:
      "Die deutsche Community für JDM-Enthusiasten. Skyline, Supra, Silvia, RX-7 und alles dazwischen.",
  },
  stance: {
    slug: "stance",
    name: "Stance",
    title: "Stance Cars Deutschland — Static, Air & Camber | carforms",
    description:
      "Stance, Static, Airride und aggressive Fitments. Sieh dir die neuesten Stance-Builds aus der deutschen Szene auf carforms an.",
    h1: "Stance — Fitment ist alles",
    subtitle:
      "Static, Airride, Camber und perfektes Fitment. Die deutsche Stance-Community auf carforms.",
  },
  drift: {
    slug: "drift",
    name: "Drift",
    title: "Drift Cars Deutschland — Builds & Setups | carforms",
    description:
      "Drift-Builds, Missiles und Wettkampfautos aus Deutschland. Die deutsche Drift-Community teilt Setups, Bilder und Erfahrungen auf carforms.",
    h1: "Drift — Sideways Culture",
    subtitle:
      "Drift-Builds, Missiles und Wettkampfautos. Die deutsche Drift-Community auf carforms.",
  },
  track: {
    slug: "track",
    name: "Track",
    title: "Track Cars Deutschland — Trackday & Motorsport | carforms",
    description:
      "Trackday-Autos, Rennwagen und Motorsport-Builds. Sieh dir die neuesten Track-Projekte aus der deutschen Szene auf carforms an.",
    h1: "Track — Built for the Circuit",
    subtitle:
      "Trackday-Builds, Rennwagen und Motorsport. Die deutsche Track-Community auf carforms.",
  },
} as const;

type CategorySlug = keyof typeof CATEGORIES;

type Post = {
  id: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  created_at: string;
  author_id: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export const Route = createFileRoute("/category/$category")({
  loader: async ({ params }) => {
    const slug = params.category as CategorySlug;
    const meta = CATEGORIES[slug];
    if (!meta) throw notFound();

    const { data: posts } = await supabase
      .from("posts")
      .select("id,title,body,image_url,created_at,author_id")
      .eq("category", slug)
      .order("created_at", { ascending: false })
      .limit(10);

    const authorIds = Array.from(new Set((posts ?? []).map((p) => p.author_id)));
    let profilesById: Record<string, Post["profiles"]> = {};
    if (authorIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .in("id", authorIds);
      profilesById = Object.fromEntries(
        (profiles ?? []).map((p) => [p.id, { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url }]),
      );
    }

    const enriched: Post[] = (posts ?? []).map((p) => ({
      ...p,
      profiles: profilesById[p.author_id] ?? null,
    }));

    return { meta, posts: enriched };
  },
  head: ({ loaderData }) => {
    const meta = loaderData?.meta;
    if (!meta) return { meta: [] };
    return {
      meta: [
        { title: meta.title },
        { name: "description", content: meta.description },
        { property: "og:title", content: meta.title },
        { property: "og:description", content: meta.description },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: meta.title },
        { name: "twitter:description", content: meta.description },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Kategorie nicht gefunden</h1>
      <p className="mt-2 text-muted-foreground">Diese Kategorie existiert nicht.</p>
      <Link to="/" className="mt-6 inline-block text-primary underline">Zur Startseite</Link>
    </main>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { meta, posts } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Kategorie</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{meta.h1}</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">{meta.subtitle}</p>
      </header>

      <section aria-label={`Neueste ${meta.name}-Beiträge`}>
        <h2 className="mb-4 text-xl font-semibold">Neueste Beiträge</h2>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Noch keine Beiträge in der Kategorie {meta.name}. Sei die/der Erste!
            </p>
            <Link
              to="/post/new"
              className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Beitrag erstellen
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li
                key={p.id}
                className="group overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:border-border hover:shadow-md"
              >
                <Link to="/post/$postId" params={{ postId: p.id }} className="block">
                  {p.image_url ? (
                    <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
                      <img
                        src={p.image_url}
                        alt={p.title ?? `${meta.name} Beitrag von @${p.profiles?.username ?? "user"}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-secondary to-muted px-4 text-center text-sm text-muted-foreground">
                      {p.title ?? p.body?.slice(0, 80) ?? meta.name}
                    </div>
                  )}
                  <div className="space-y-1 p-4">
                    {p.title && <h3 className="line-clamp-1 font-semibold">{p.title}</h3>}
                    {p.body && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{p.body}</p>
                    )}
                    <p className="pt-1 text-xs text-muted-foreground">
                      @{p.profiles?.username ?? "user"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav className="mt-12 border-t border-border/60 pt-6" aria-label="Weitere Kategorien">
        <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Weitere Kategorien</p>
        <ul className="flex flex-wrap gap-2">
          {Object.values(CATEGORIES)
            .filter((c) => c.slug !== meta.slug)
            .map((c) => (
              <li key={c.slug}>
                <Link
                  to="/category/$category"
                  params={{ category: c.slug }}
                  className="inline-block rounded-full border border-border/60 bg-card px-4 py-1.5 text-sm hover:border-border hover:bg-secondary"
                >
                  {c.name}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </main>
  );
}
