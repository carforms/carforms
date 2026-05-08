import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
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

    const channel = supabase
      .channel("feed-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleLike = async (post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    const liked = post.post_likes.some((l) => l.user_id === user.id);
    // Optimistic
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              post_likes: liked
                ? p.post_likes.filter((l) => l.user_id !== user.id)
                : [...p.post_likes, { user_id: user.id }],
            }
          : p,
      ),
    );
    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }
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
        <ul className="space-y-6">
          {[0, 1, 2].map((i) => (
            <li key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
              <div className="flex items-center gap-3 p-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </li>
          ))}
        </ul>
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
            const username = p.profiles?.username ?? "";
            return (
              <li
                key={p.id}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:border-border hover:shadow-md"
              >
                {/* Stretched link covering the whole card */}
                <Link
                  to="/post/$postId"
                  params={{ postId: p.id }}
                  aria-label={p.title ?? "Beitrag öffnen"}
                  className="absolute inset-0 z-10"
                />

                <div className="relative z-20 flex items-center gap-3 p-4">
                  <Link
                    to="/profile/$username"
                    params={{ username }}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  >
                    <Avatar className="h-9 w-9 transition-transform hover:scale-105">
                      <AvatarImage src={p.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback>{username[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to="/profile/$username"
                      params={{ username }}
                      onClick={(e) => e.stopPropagation()}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      @{username}
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
                  <img
                    src={p.image_url}
                    alt={p.title ?? "Beitrag"}
                    className="aspect-square w-full object-cover transition-opacity group-hover:opacity-95"
                    loading="lazy"
                  />
                )}

                <div className="space-y-3 p-4">
                  {p.title && (
                    <p className="font-medium group-hover:underline">{p.title}</p>
                  )}
                  {p.body && <p className="text-sm text-muted-foreground line-clamp-3">{p.body}</p>}
                  <div className="relative z-20 flex items-center gap-1 pt-1">
                    <button
                      type="button"
                      onClick={(e) => toggleLike(p, e)}
                      aria-pressed={liked}
                      aria-label={liked ? "Like entfernen" : "Liken"}
                      className="flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95"
                    >
                      <Heart className={`h-4 w-4 transition-transform ${liked ? "scale-110 fill-red-500 text-red-500" : ""}`} />
                      {p.post_likes.length}
                    </button>
                    <Link
                      to="/post/$postId"
                      params={{ postId: p.id }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
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
