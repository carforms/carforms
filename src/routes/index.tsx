import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: FeedPage,
});

type Post = {
  id: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  created_at: string;
  author_id: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
};

function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select(
        "id,title,body,image_url,created_at,author_id,profiles:profiles!posts_author_id_fkey(username,display_name,avatar_url),post_likes(user_id),post_comments(id)"
      )
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts((data as unknown as Post[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleLike = async (post: Post) => {
    if (!user) return;
    const liked = post.post_likes.some((l) => l.user_id === user.id);
    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }
    load();
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="sr-only">Feed</h1>

      {!user && (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Willkommen bei carforms</p>
            <p className="text-xs text-muted-foreground">Tritt Communities bei und teile deine Beiträge.</p>
          </div>
          <Button size="sm" className="rounded-full" asChild>
            <Link to="/signup">Kostenlos starten</Link>
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Lade Beiträge…</p>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <p className="text-sm text-muted-foreground">Noch keine Beiträge.</p>
          {user && (
            <Button asChild size="sm" className="mt-4 rounded-full">
              <Link to="/post/new">Ersten Beitrag erstellen</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-6">
          {posts.map((p) => {
            const liked = !!user && p.post_likes.some((l) => l.user_id === user.id);
            return (
              <li
                key={p.id}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors hover:border-border"
              >
                <div className="flex items-center gap-3 p-4">
                  <Link to="/profile/$username" params={{ username: p.profiles?.username ?? "" }}>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={p.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback>{p.profiles?.username?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to="/profile/$username"
                      params={{ username: p.profiles?.username ?? "" }}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      @{p.profiles?.username}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>

                {p.image_url && (
                  <Link to="/post/$postId" params={{ postId: p.id }} className="block">
                    <img
                      src={p.image_url}
                      alt={p.title ?? "Beitrag"}
                      className="aspect-square w-full object-cover transition-opacity hover:opacity-95"
                      loading="lazy"
                    />
                  </Link>
                )}

                <div className="space-y-3 p-4">
                  {p.title && (
                    <Link to="/post/$postId" params={{ postId: p.id }} className="block font-medium hover:underline">
                      {p.title}
                    </Link>
                  )}
                  {p.body && <p className="text-sm text-muted-foreground">{p.body}</p>}
                  <div className="flex items-center gap-4 pt-1">
                    <button
                      onClick={() => toggleLike(p)}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      disabled={!user}
                    >
                      <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                      {p.post_likes.length}
                    </button>
                    <Link
                      to="/post/$postId"
                      params={{ postId: p.id }}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {p.post_comments.length}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
