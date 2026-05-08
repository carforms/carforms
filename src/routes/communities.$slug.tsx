import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/communities/$slug")({
  component: CommunityDetail,
});

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
};

type Post = {
  id: string;
  title: string | null;
  image_url: string | null;
  created_at: string;
  profiles: { username: string } | null;
};

function CommunityDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);

  const load = async () => {
    const { data: c } = await supabase
      .from("communities")
      .select("id,slug,name,description,cover_url")
      .eq("slug", slug)
      .maybeSingle();
    if (!c) throw notFound();
    setCommunity(c as Community);

    const [{ data: p }, { count }, { data: m }] = await Promise.all([
      supabase
        .from("posts")
        .select("id,title,image_url,created_at,profiles:profiles!posts_author_id_fkey(username)")
        .eq("community_id", c.id)
        .order("created_at", { ascending: false }),
      supabase.from("community_members").select("*", { count: "exact", head: true }).eq("community_id", c.id),
      user
        ? supabase.from("community_members").select("user_id").eq("community_id", c.id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setPosts((p as unknown as Post[]) ?? []);
    setMemberCount(count ?? 0);
    setIsMember(!!m);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user?.id]);

  const toggleJoin = async () => {
    if (!user || !community) return;
    if (isMember) {
      const { error } = await supabase.from("community_members").delete().eq("community_id", community.id).eq("user_id", user.id);
      if (error) return toast.error(toUserMessage(error));
      toast.success("Community verlassen.");
    } else {
      const { error } = await supabase.from("community_members").insert({ community_id: community.id, user_id: user.id });
      if (error) return toast.error(toUserMessage(error));
      toast.success("Community beigetreten!");
    }
    load();
  };

  if (!community) return <main className="mx-auto max-w-4xl p-8 text-sm text-muted-foreground">Lade…</main>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="aspect-[3/1] w-full bg-secondary">
          {community.cover_url ? (
            <img src={community.cover_url} alt={community.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Users className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{community.name}</h1>
            {community.description && <p className="mt-1 text-sm text-muted-foreground">{community.description}</p>}
            <p className="mt-2 text-xs text-muted-foreground">{memberCount.toLocaleString("de-DE")} Mitglieder</p>
          </div>
          <Button onClick={toggleJoin} variant={isMember ? "secondary" : "default"} className="rounded-full">
            {isMember ? "Mitglied" : "Beitreten"}
          </Button>
        </div>
      </div>

      <h2 className="mt-10 mb-4 text-lg font-semibold">Beiträge</h2>
      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Beiträge in dieser Community.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <Link to="/post/$postId" params={{ postId: p.id }} className="block hover:opacity-90 transition-opacity">
                {p.image_url && <img src={p.image_url} alt={p.title ?? ""} className="aspect-square w-full object-cover" />}
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{p.title ?? "Beitrag"}</p>
                  {p.profiles && (
                    <span className="text-xs text-muted-foreground">@{p.profiles.username}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
