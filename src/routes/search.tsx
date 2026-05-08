import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: (s.q as string) ?? "" }),
  component: SearchPage,
});

type SuggestionPost = { id: string; title: string | null; image_url: string | null };

function SearchPage() {
  const { q } = Route.useSearch();
  const [users, setUsers] = useState<{ username: string; display_name: string | null; avatar_url: string | null }[]>([]);
  const [communities, setCommunities] = useState<{ slug: string; name: string }[]>([]);
  const [posts, setPosts] = useState<SuggestionPost[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionPost[]>([]);

  useEffect(() => {
    if (!q) {
      supabase
        .from("posts")
        .select("id,title,image_url")
        .order("created_at", { ascending: false })
        .limit(6)
        .then(({ data }) => setSuggestions(data ?? []));
      return;
    }
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

  if (!q) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/40">
            <Search className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Wonach suchst du?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Finde Personen, Communities und Beiträge.
          </p>
        </div>

        {suggestions.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Neueste Beiträge</h2>
            <ul className="grid grid-cols-3 gap-2">
              {suggestions.map((p) => (
                <li key={p.id} className="aspect-square overflow-hidden rounded-xl bg-card">
                  <Link to="/post/$postId" params={{ postId: p.id }} className="block h-full w-full">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title ?? ""} className="h-full w-full object-cover transition-opacity hover:opacity-90" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card to-accent/20 p-3 text-center text-xs">
                        {p.title}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    );
  }

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
                <Link to="/post/$postId" params={{ postId: p.id }} className="block h-full w-full">
                  {p.image_url ? <img src={p.image_url} alt={p.title ?? ""} className="h-full w-full object-cover hover:opacity-90 transition-opacity" /> : <div className="p-3 text-xs">{p.title}</div>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
