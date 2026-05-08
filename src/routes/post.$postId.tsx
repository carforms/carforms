import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/post/$postId")({
  component: PostDetailPage,
});

type PostDetail = {
  id: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  created_at: string;
  author_id: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

function PostDetailPage() {
  const { postId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<{ user_id: string }[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data: p } = await supabase
      .from("posts")
      .select(
        "id,title,body,image_url,created_at,author_id,profiles:profiles!posts_author_id_fkey(username,display_name,avatar_url)",
      )
      .eq("id", postId)
      .maybeSingle();
    setPost((p as unknown as PostDetail) ?? null);

    const [{ data: l }, { data: c }] = await Promise.all([
      supabase.from("post_likes").select("user_id").eq("post_id", postId),
      supabase
        .from("post_comments")
        .select(
          "id,body,created_at,user_id,profiles:profiles!post_comments_user_id_fkey(username,display_name,avatar_url)",
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true }),
    ]);
    setLikes((l as { user_id: string }[]) ?? []);
    setComments((c as unknown as Comment[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [postId]);

  const liked = !!user && likes.some((l) => l.user_id === user.id);

  async function toggleLike() {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (liked) {
      setLikes((prev) => prev.filter((l) => l.user_id !== user.id));
      const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      if (error) {
        toast.error(toUserMessage(error));
        load();
      }
    } else {
      setLikes((prev) => [...prev, { user_id: user.id }]);
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      if (error) {
        toast.error(toUserMessage(error));
        load();
      }
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!comment.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: user.id, body: comment.trim() });
    setBusy(false);
    if (error) {
      toast.error(toUserMessage(error));
    } else {
      setComment("");
      load();
    }
  }

  async function deletePost() {
    if (!post || !user || user.id !== post.author_id) return;
    if (!confirm("Beitrag wirklich löschen?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      toast.error(toUserMessage(error));
    } else {
      toast.success("Beitrag gelöscht");
      navigate({ to: "/" });
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-2xl px-4 py-8 text-sm text-muted-foreground">Lade…</main>;
  }
  if (!post) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">Beitrag nicht gefunden.</p>
        <Button variant="secondary" size="sm" className="mt-4 rounded-full" asChild>
          <Link to="/">Zurück zum Feed</Link>
        </Button>
      </main>
    );
  }

  const isAuthor = user?.id === post.author_id;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 rounded-full text-muted-foreground"
        onClick={() => navigate({ to: "/" })}
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
      </Button>

      <article className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="flex items-center justify-between p-4">
          <Link
            to="/profile/$username"
            params={{ username: post.profiles?.username ?? "" }}
            className="flex items-center gap-3"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.profiles?.avatar_url ?? undefined} />
              <AvatarFallback>{post.profiles?.username?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium hover:underline">@{post.profiles?.username}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(post.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
          </Link>
          {isAuthor && (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={deletePost}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {post.image_url && (
          <img src={post.image_url} alt={post.title ?? "Beitrag"} className="aspect-square w-full object-cover" />
        )}

        <div className="space-y-3 p-4">
          {post.title && <h1 className="text-lg font-semibold">{post.title}</h1>}
          {post.body && <p className="whitespace-pre-line text-sm text-muted-foreground">{post.body}</p>}
          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={toggleLike}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
              {likes.length}
            </button>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              {comments.length}
            </span>
          </div>
        </div>
      </article>

      <section className="mt-6 space-y-4">
        <h2 className="text-sm font-semibold">Kommentare</h2>
        {user ? (
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Kommentar schreiben…"
              maxLength={500}
              className="h-10 flex-1 rounded-full border border-border/60 bg-card/60 px-4 text-sm outline-none focus:border-border"
            />
            <Button type="submit" size="sm" className="rounded-full" disabled={busy || !comment.trim()}>
              Senden
            </Button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">
            <Link to="/login" className="underline">Melde dich an</Link>, um zu kommentieren.
          </p>
        )}

        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Noch keine Kommentare.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Link to="/profile/$username" params={{ username: c.profiles?.username ?? "" }}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback>{c.profiles?.username?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1 rounded-2xl bg-accent/40 px-3 py-2">
                  <Link
                    to="/profile/$username"
                    params={{ username: c.profiles?.username ?? "" }}
                    className="text-xs font-semibold hover:underline"
                  >
                    @{c.profiles?.username}
                  </Link>
                  <p className="mt-0.5 whitespace-pre-line text-sm">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
