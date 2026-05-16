import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, ArrowLeft, Trash2, ImagePlus, X } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { validateImageFile } from "@/lib/upload-validation";

export const Route = createFileRoute("/post/$postId")({
  component: PostDetailPage,
  loader: async ({ params }) => {
    const { data: post } = await supabase
      .from("posts")
      .select("id,title,body,image_url,created_at,author_id")
      .eq("id", params.postId)
      .maybeSingle();
    if (!post) return { post: null, authorUsername: null as string | null };
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", post.author_id)
      .maybeSingle();
    return { post, authorUsername: profile?.username ?? null };
  },
  head: ({ loaderData, params }) => {
    const post = loaderData?.post;
    if (!post) {
      return {
        meta: [
          { title: "Beitrag nicht gefunden | Carforms" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const SUFFIX = " | Carforms";
    const MAX = 60;
    const rawTitle = post.title?.trim() || `Beitrag von @${loaderData?.authorUsername ?? "carforms"}`;
    const titleBudget = MAX - SUFFIX.length;
    const title = rawTitle.length > titleBudget ? rawTitle.slice(0, titleBudget - 1).trimEnd() + "…" : rawTitle;
    const fullTitle = `${title}${SUFFIX}`;
    const description = (post.body?.trim() || post.title?.trim() || "Entdecke Builds, Stance, JDM und mehr auf Carforms.")
      .replace(/\s+/g, " ")
      .slice(0, 160);
    const url = `https://carforms.de/post/${params.postId}`;
    return {
      meta: [
        { title: fullTitle },
        { name: "description", content: description },
        { property: "og:title", content: fullTitle },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(post.image_url
          ? [
              { property: "og:image", content: post.image_url },
              { name: "twitter:image", content: post.image_url },
            ]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: fullTitle },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: title,
            description,
            image: post.image_url ? [post.image_url] : undefined,
            datePublished: post.created_at,
            dateModified: post.created_at,
            author: {
              "@type": "Person",
              name: loaderData?.authorUsername ?? "carforms",
              url: loaderData?.authorUsername
                ? `https://carforms.de/profile/${loaderData.authorUsername}`
                : undefined,
            },
            mainEntityOfPage: url,
          }),
        },
      ],
    };
  },
});

type PostDetail = {
  id: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  created_at: string;
  author_id: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null; verified: boolean } | null;
};

type Comment = {
  id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null; verified: boolean } | null;
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
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data: postData, error } = await supabase
      .from("posts")
      .select("id,title,body,image_url,created_at,author_id")
      .eq("id", postId)
      .single();
    if (error || !postData) {
      setPost(null);
      setLoading(false);
      return;
    }
    const [{ data: profile }, { data: likes }, { data: comments }] = await Promise.all([
      supabase.from("profiles").select("username,display_name,avatar_url,verified").eq("id", postData.author_id).single(),
      supabase.from("post_likes").select("user_id").eq("post_id", postData.id),
      supabase
        .from("post_comments")
        .select("id,body,image_url,created_at,user_id")
        .eq("post_id", postData.id)
        .order("created_at", { ascending: true }),
    ]);
    const commentProfiles = await Promise.all(
      (comments ?? []).map((c) =>
        supabase
          .from("profiles")
          .select("username,display_name,avatar_url,verified")
          .eq("id", c.user_id)
          .single()
          .then(({ data }) => data ?? null),
      ),
    );
    setPost({ ...postData, profiles: profile ?? null } as unknown as PostDetail);
    setLikes((likes as { user_id: string }[]) ?? []);
    setComments(
      ((comments ?? []).map((c, i) => ({ ...c, profiles: commentProfiles[i] })) as unknown as Comment[]),
    );
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
    if (!comment.trim() && !commentImage) return;
    setBusy(true);
    let imageUrl: string | null = null;
    if (commentImage) {
      const validationError = validateImageFile(commentImage);
      if (validationError) {
        setBusy(false);
        toast.error(validationError);
        return;
      }
      const mimeExt = commentImage.type.split("/")[1]?.toLowerCase() ?? "jpg";
      const ext = mimeExt === "jpeg" ? "jpg" : mimeExt;
      const path = `${user.id}/comments/${postId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("post-images")
        .upload(path, commentImage, { contentType: commentImage.type });
      if (upErr) {
        setBusy(false);
        toast.error(toUserMessage(upErr));
        return;
      }
      imageUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: user.id, body: comment.trim(), image_url: imageUrl });
    setBusy(false);
    if (error) {
      toast.error(toUserMessage(error));
    } else {
      setComment("");
      if (commentImagePreview) URL.revokeObjectURL(commentImagePreview);
      setCommentImage(null);
      setCommentImagePreview(null);
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
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 h-8 w-20 animate-pulse rounded-full bg-primary/10" />
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <div className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-primary/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-primary/10" />
              <div className="h-2.5 w-16 animate-pulse rounded bg-primary/10" />
            </div>
          </div>
          <div className="aspect-square w-full animate-pulse bg-primary/10" />
        </div>
      </main>
    );
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
              <p className="flex items-center gap-1 text-sm font-medium hover:underline">
                @{post.profiles?.username}
                {post.profiles?.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(post.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
          </Link>
          {isAuthor && (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={deletePost} aria-label="Beitrag löschen">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {post.image_url && (
          <img src={post.image_url} alt={post.title ?? `Beitrag von @${post.profiles?.username ?? "carforms"}`} className="aspect-square w-full object-cover" />
        )}

        <div className="space-y-3 p-4">
          {post.title && <h1 className="text-lg font-semibold">{post.title}</h1>}
          {post.body && <p className="whitespace-pre-line text-sm text-muted-foreground">{post.body}</p>}
          <div className="flex items-center gap-4 pt-1">
            <button
              type="button"
              onClick={toggleLike}
              aria-pressed={liked}
              aria-label={liked ? "Like entfernen" : "Liken"}
              className="flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95"
            >
              <Heart className={`h-4 w-4 transition-transform ${liked ? "scale-110 fill-red-500 text-red-500" : ""}`} />
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
          <form onSubmit={submitComment} className="space-y-2">
            <div className="flex gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Kommentar schreiben…"
                maxLength={500}
                className="h-10 flex-1 rounded-full border border-border/60 bg-card/60 px-4 text-sm outline-none focus:border-border"
              />
              <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border/60 bg-card/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Bild zum Kommentar hinzufügen">
                <span className="sr-only">Bild zum Kommentar hinzufügen</span>
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  aria-label="Bilddatei für Kommentar auswählen"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (commentImagePreview) URL.revokeObjectURL(commentImagePreview);
                    setCommentImage(file);
                    setCommentImagePreview(file ? URL.createObjectURL(file) : null);
                    e.target.value = "";
                  }}
                />
              </label>
              <Button type="submit" size="sm" className="rounded-full" disabled={busy || (!comment.trim() && !commentImage)}>
                Senden
              </Button>
            </div>
            {commentImagePreview && (
              <div className="relative inline-block">
                <img src={commentImagePreview} alt="Vorschau" className="h-20 w-20 rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(commentImagePreview);
                    setCommentImage(null);
                    setCommentImagePreview(null);
                  }}
                  aria-label="Bild entfernen"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background text-foreground shadow ring-1 ring-border hover:bg-accent"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </form>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card p-5 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Melde dich an um zu kommentieren</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" className="rounded-full" asChild>
                <Link to="/login">Anmelden</Link>
              </Button>
              <Button size="sm" className="rounded-full" asChild>
                <Link to="/signup">Registrieren</Link>
              </Button>
            </div>
          </div>
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
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to="/profile/$username"
                      params={{ username: c.profiles?.username ?? "" }}
                      className="flex items-center gap-1 text-xs font-semibold hover:underline"
                    >
                      <span>@{c.profiles?.username}</span>
                      {c.profiles?.verified && <VerifiedBadge className="h-3 w-3" />}
                    </Link>
                    {user?.id === c.user_id && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("Kommentar wirklich löschen?")) return;
                          const { error } = await supabase.from("post_comments").delete().eq("id", c.id);
                          if (error) {
                            toast.error(toUserMessage(error));
                          } else {
                            toast.success("Kommentar gelöscht");
                            load();
                          }
                        }}
                        aria-label="Kommentar löschen"
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 whitespace-pre-line text-sm">{c.body}</p>
                  {c.image_url && (
                    <img
                      src={c.image_url}
                      alt="Kommentar-Bild"
                      onClick={() => setLightboxUrl(c.image_url)}
                      className="mt-2 max-w-[240px] cursor-pointer rounded-xl object-cover"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            aria-label="Schließen"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/10 text-white hover:bg-background/20"
          >
            <X className="h-5 w-5" />
          </button>
          <img src={lightboxUrl} alt="Kommentar-Bild" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </main>
  );
}
