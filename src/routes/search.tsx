import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: (s.q as string) ?? "" }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const [users, setUsers] = useState<{ username: string; display_name: string | null; avatar_url: string | null }[]>([]);
  const [communities, setCommunities] = useState<{ slug: string; name: string }[]>([]);
  const [posts, setPosts] = useState<{ id: string; title: string | null; image_url: string | null }[]>([]);

  useEffect(() => {
    if (!q) return;
    const like = `%${q}%`;
    Promise.all([
      supabase.from("profiles").select("username,display_name,avatar_url").or(`username.ilike.${like},display_name.ilike.${like}`).limit(10),
      supabase.from("communities").select("slug,name").or(`name.ilike.${like},description.ilike.${like}`).limit(10),
      supabase.from("posts").select("id,title,image_url").ilike("title", like).limit(12),
    ]).then(([u, c, p]) => {
      setUsers(u.data ?? []);
      setCommunities(c.data ?? []);
      setPosts(p.data ?? []);
    });
  }, [q]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Suche „{q}"</h1>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Personen</h2>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Treffer.</p>
        ) : (
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.username}>
                <Link to="/profile/$username" params={{ username: u.username }} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 hover:border-border">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.avatar_url ?? undefined} />
                    <AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{u.display_name || u.username}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Communities</h2>
        {communities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Treffer.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {communities.map((c) => (
              <li key={c.slug}>
                <Link to="/communities/$slug" params={{ slug: c.slug }} className="block rounded-xl border border-border/60 bg-card p-3 hover:border-border">
                  <p className="text-sm font-medium">{c.name}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Beiträge</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Treffer.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {posts.map((p) => (
              <li key={p.id} className="aspect-square overflow-hidden rounded-xl bg-card">
                {p.image_url ? <img src={p.image_url} alt={p.title ?? ""} className="h-full w-full object-cover" /> : <div className="p-3 text-xs">{p.title}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
