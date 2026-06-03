import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, RefreshCw, Trophy, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import heroBg from "@/assets/hero-jdm.jpeg";

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
  profiles: { username: string; display_name: string | null; avatar_url: string | null; verified: boolean } | null;
  post_likes: { user_id: string }[];
  post_comments: { id: string; body: string; user_id: string; profiles: { username: string; avatar_url: string | null } | null }[];
  comments_count: number;
};

type TrendingPost = {
  id: string;
  title: string | null;
  image_url: string | null;
  like_count: number;
};

let cachedPosts: Post[] = [];
let cachedTrending: TrendingPost[] = [];

// Reorder posts so the same author never appears in two adjacent slots.
// Greedy: at each step, pick the author with the most remaining posts that
// isn't the previously placed one. Falls back to original order if impossible.
function interleaveByAuthor(items: Post[]): Post[] {
  if (items.length < 2) return items;
  const buckets = new Map<string, Post[]>();
  for (const p of items) {
    const list = buckets.get(p.author_id) ?? [];
    list.push(p);
    buckets.set(p.author_id, list);
  }
  const result: Post[] = [];
  let prev: string | null = null;
  while (result.length < items.length) {
    let pickKey: string | null = null;
    let pickLen = -1;
    for (const [key, list] of buckets) {
      if (list.length === 0 || key === prev) continue;
      if (list.length > pickLen) {
        pickLen = list.length;
        pickKey = key;
      }
    }
    if (!pickKey) {
      // Only the previous author has posts left — accept adjacency.
      for (const [key, list] of buckets) {
        if (list.length > 0) {
          pickKey = key;
          break;
        }
      }
      if (!pickKey) break;
    }
    result.push(buckets.get(pickKey)!.shift()!);
    prev = pickKey;
  }
  return result;
}

function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>(cachedPosts);
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>(cachedTrending);
  const [loading, setLoading] = useState(cachedPosts.length === 0);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data: postsData, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !postsData) {
      setLoading(false);
      return;
    }
    const enriched = await Promise.all(
      postsData.map(async (post) => {
        const [{ data: profile }, { data: likes }, { data: comments }, { count: commentsCount }] = await Promise.all([
          supabase.from("profiles").select("username,display_name,avatar_url,verified").eq("id", post.author_id).single(),
          supabase.from("post_likes").select("user_id").eq("post_id", post.id),
          supabase
            .from("post_comments")
            .select("id, body, user_id")
            .eq("post_id", post.id)
            .order("created_at", { ascending: true })
            .limit(3),
          supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("post_id", post.id),
        ]);
        const userIds = Array.from(new Set((comments ?? []).map((c) => c.user_id)));
        const { data: commentProfiles } = userIds.length
          ? await supabase.from("profiles").select("id,username,avatar_url").in("id", userIds)
          : { data: [] as { id: string; username: string; avatar_url: string | null }[] };
        const profileMap = new Map((commentProfiles ?? []).map((p) => [p.id, p]));
        const commentsWithProfiles = (comments ?? []).map((c) => ({
          ...c,
          profiles: profileMap.get(c.user_id)
            ? { username: profileMap.get(c.user_id)!.username, avatar_url: profileMap.get(c.user_id)!.avatar_url }
            : null,
        }));
        return {
          ...post,
          profiles: profile ?? null,
          post_likes: likes ?? [],
          post_comments: commentsWithProfiles,
          comments_count: commentsCount ?? commentsWithProfiles.length,
        };
      })
    );
    const enrichedPosts = enriched as unknown as Post[];
    cachedPosts = enrichedPosts;
    setPosts(enrichedPosts);
    setLoading(false);
  };

  const loadTrending = async () => {
    setTrendingLoading(true);
    setTrendingError(null);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, image_url, created_at, post_likes(user_id)")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!data) return;
      const sorted = data
        .map((p) => ({
          id: p.id,
          title: p.title,
          image_url: p.image_url,
          like_count: (p.post_likes as { user_id: string }[] | null)?.length ?? 0,
        }))
        .sort((a, b) => b.like_count - a.like_count)
        .slice(0, 10);
      cachedTrending = sorted;
      setTrendingPosts(sorted);
    } catch (err) {
      console.error("[trending] load error:", err);
      setTrendingError("Trending konnte nicht geladen werden");
    } finally {
      setTrendingLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadTrending();

    let subscribed = false;
    const channel = supabase
      .channel("feed-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, () => load())
      .subscribe((status) => {
        console.log("[feed] realtime status:", status);
        if (status === "SUBSCRIBED") subscribed = true;
      });

    const fallbackTimer = setTimeout(() => {
      if (!subscribed) {
        console.warn("[feed] realtime not subscribed after 3s, falling back to load()");
        load();
      }
    }, 3000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(fallbackTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setTimeout(() => setRefreshing(false), 500);
  };

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
      <div className="mb-4 flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          aria-label="Feed aktualisieren"
          className="rounded-full"
        >
          <RefreshCw className={refreshing ? "animate-spin" : ""} />
        </Button>
      </div>

      {!user && (
        <>
          <section className="relative mb-0 overflow-hidden rounded-3xl border border-border/60 bg-card" style={{ height: "90vh", minHeight: 600 }}>
            {/* Hero background image — focused on the GT-R (right side) */}
            <img
              src={heroBg}
              alt="JDM Nissan Skyline GT-R bei einem nächtlichen Car-Meet"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: "70% center" }}
              loading="eager"
            />
            {/* Left-to-right dark gradient: 70% dark on left, image bleeds through on right */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

            {/* Content */}
            <div className="relative z-10 mx-auto flex h-full max-w-3xl flex-col items-start justify-center gap-6 px-6 text-left sm:px-10">
              {/* Badge */}
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-widest text-white/70 uppercase backdrop-blur-sm">
                Die Community für Autokultur
              </span>

              {/* Headline */}
              <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
                Design & Ästhetik,<br />die bewegen.
              </h1>

              {/* Trust elements */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70 sm:text-sm">
                <span>4.200+ Builds geteilt</span>
                <span className="text-white/30">·</span>
                <span>JDM · Stance · Drift · Classic</span>
                <span className="text-white/30">·</span>
                <span>Kostenlos & ohne Algorithmus</span>
              </div>

              {/* Subline */}
              <p className="max-w-md text-base text-white/60 leading-relaxed">
                Teile deine Builds, diskutiere Designs und werde Teil der Szene.
              </p>

              {/* CTAs */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="rounded-full px-8 font-semibold" asChild>
                  <Link to="/signup">Kostenlos registrieren</Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full border-white/20 bg-white/5 px-8 text-white/80 backdrop-blur-sm hover:bg-white/10 hover:text-white" asChild>
                  <Link to="/login">Anmelden</Link>
                </Button>
              </div>

              {/* Category cards */}
              <div className="mt-4 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { name: "JDM", subtitle: "Kultur aus Japan", fallback: "https://images.unsplash.com/photo-1547744822-0a1d3a4d9c1c?auto=format&fit=crop&w=800&q=80" },
                  { name: "Stance", subtitle: "Tief & breit", fallback: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=800&q=80" },
                  { name: "Drift", subtitle: "Sideways & Track", fallback: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80" },
                ].map((cat, idx) => {
                  const heroImages = posts.map((p) => p.image_url).filter((u): u is string => !!u);
                  const img = heroImages[idx] ?? cat.fallback;
                  return (
                    <Link
                      key={cat.name}
                      to="/communities"
                      className="group relative block min-h-[200px] overflow-hidden rounded-2xl border border-white/10 transition-all duration-300 hover:scale-[1.03] hover:border-white/30 hover:shadow-2xl"
                    >
                      <img
                        src={img}
                        alt={cat.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
                      <div className="relative z-10 flex h-full min-h-[200px] flex-col justify-end p-4 text-left">
                        <p className="text-xl font-bold leading-tight text-white">{cat.name}</p>
                        <p className="text-sm text-white/70">{cat.subtitle}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Tagline divider */}
          <div className="my-10 border-y border-border/40 bg-black/40 py-5 text-center">
            <p className="text-sm italic tracking-wide text-muted-foreground sm:text-base">
              Für alle, die Autos nicht nur fahren — sondern verstehen.
            </p>
          </div>

          {/* Was die Community teilt */}
          {posts.length > 0 && (
            <section className="mb-12">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Was die Community teilt</h2>
                  <p className="text-sm text-muted-foreground">Aktuelle Builds & Beiträge aus der Szene</p>
                </div>
                <Link
                  to="/communities"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Mehr sehen →
                </Link>
              </div>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {posts.slice(0, 3).map((p) => {
                  const username = p.profiles?.username ?? "";
                  const caption = p.title ?? p.body ?? "";
                  return (
                    <li key={p.id}>
                      <Link
                        to="/post/$postId"
                        params={{ postId: p.id }}
                        className="group block overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:border-border hover:shadow-md"
                      >
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.title ?? `Beitrag von @${username}`}
                            className="aspect-square w-full object-cover transition-opacity group-hover:opacity-95"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-card to-accent/20 px-4 text-center text-sm text-muted-foreground">
                            {caption || "Beitrag"}
                          </div>
                        )}
                        <div className="space-y-1 p-3">
                          <p className="truncate text-xs font-medium">@{username}</p>
                          {caption && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">{caption}</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}


      {/* Car of the Week - always visible */}
      <div className="mb-8 flex items-center justify-between rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-3">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="text-sm font-semibold text-yellow-500">Car of the Week</p>
            <p className="text-xs text-muted-foreground">Stimme jetzt ab — welcher Build verdient die Krone?</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="rounded-full border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10" asChild>
          <Link to="/communities">Zur Abstimmung</Link>
        </Button>
      </div>

      {(trendingLoading || trendingPosts.length > 0 || trendingError) && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            <p className="text-sm font-semibold">Trending diese Woche</p>
          </div>
          {trendingLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="shrink-0 w-[140px] rounded-xl overflow-hidden border border-border/60 bg-card"
                >
                  <Skeleton className="w-full h-[100px] rounded-none" />
                  <div className="p-2 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : trendingError ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{trendingError}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={loadTrending}
                className="h-6 text-xs px-2"
              >
                Erneut versuchen
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {trendingPosts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate({ to: "/post/$postId", params: { postId: p.id } })}
                  className="shrink-0 w-[140px] rounded-xl overflow-hidden border border-border/60 bg-card hover:border-border transition-all text-left"
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title ?? "Trending Post"} className="w-full h-[100px] object-cover" />
                  ) : (
                    <div className="w-full h-[100px] bg-accent/50 flex items-center justify-center p-2 text-center">
                      <p className="text-xs font-medium line-clamp-3">{p.title}</p>
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{p.title ?? "Post"}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                      <span className="text-xs text-muted-foreground">{p.like_count}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex flex-col h-full overflow-hidden rounded-2xl border border-border/60 bg-card">
              <div className="flex items-center gap-3 p-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
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
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {interleaveByAuthor(posts).map((p) => {
            const liked = !!user && p.post_likes.some((l) => l.user_id === user.id);
            const username = p.profiles?.username ?? "";
            return (
              <li
                key={p.id}
                className="group flex flex-col h-full overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:border-border hover:shadow-md"
              >
                {/* Author row — not part of the post link */}
                <div className="flex items-center gap-3 p-4">
                  <Link to="/profile/$username" params={{ username }} className="shrink-0">
                    <Avatar className="h-9 w-9 transition-transform hover:scale-105">
                      <AvatarImage src={p.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback>{username[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to="/profile/$username"
                      params={{ username }}
                      className="flex items-center gap-1 truncate text-sm font-medium hover:underline"
                    >
                      <span className="truncate">@{username}</span>
                      {p.profiles?.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>

                {/* Clickable post body */}
                <Link
                  to="/post/$postId"
                  params={{ postId: p.id }}
                  aria-label={p.title ?? "Beitrag öffnen"}
                  className="block cursor-pointer flex-1"
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.title ?? `Beitrag von @${username}`}
                      className="aspect-[4/3] w-full object-cover transition-opacity group-hover:opacity-95"
                      loading="lazy"
                    />
                  ) : (p.title || p.body) ? (
                    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 bg-gradient-to-br from-card to-accent/20 px-6 py-8 text-center">
                      {p.title && (
                        <p className="text-xl font-semibold leading-snug group-hover:underline">{p.title}</p>
                      )}
                      {p.body && (
                        <p className="text-sm text-muted-foreground line-clamp-3">{p.body}</p>
                      )}
                    </div>
                  ) : null}

                  {(p.image_url && (p.title || p.body)) && (
                    <div className="space-y-2 px-4 pt-4">
                      {p.title && <p className="font-medium group-hover:underline">{p.title}</p>}
                      {p.body && <p className="text-sm text-muted-foreground line-clamp-3">{p.body}</p>}
                    </div>
                  )}
                </Link>

                {/* Like and comment row — outside the post link */}
                <div className="flex items-center gap-1 px-4 pb-4 pt-3">
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
                    className="flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {p.comments_count}
                  </Link>
                </div>

                {p.post_comments.length > 0 && (
                  <div className="space-y-1.5 px-4 pb-4">
                    {p.post_comments.map((c) => (
                      <div key={c.id} className="flex gap-2 text-sm">
                        <Link
                          to="/profile/$username"
                          params={{ username: c.profiles?.username ?? "" }}
                          className="shrink-0 font-medium hover:underline"
                        >
                          @{c.profiles?.username ?? "user"}
                        </Link>
                        <span className="line-clamp-1 text-muted-foreground">{c.body}</span>
                      </div>
                    ))}
                    {p.comments_count > p.post_comments.length && (
                      <Link
                        to="/post/$postId"
                        params={{ postId: p.id }}
                        className="block text-xs text-muted-foreground hover:text-foreground"
                      >
                        Alle {p.comments_count} Kommentare ansehen
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
