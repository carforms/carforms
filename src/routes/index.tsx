import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, RefreshCw, Trophy, TrendingUp, MessagesSquare, Calendar, Users, Search, MapPin, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import heroBg from "@/assets/hero-jdm.jpeg";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { FeedbackSection } from "@/components/FeedbackSection";



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

type ForumPreview = { id: string; title: string; author: string; answers: number };
type CommunityPreview = { slug: string; name: string; description: string | null; members: number };

// Small curated preview of upcoming events (mirrors /events).
const EVENT_PREVIEW = [
  {
    id: "e1",
    title: "JDMania Car Event Mendig",
    date: "18.07.2026",
    location: "Flugplatz Mendig, Rheinland-Pfalz",
    category: "JDM / Car Meet",
  },
  {
    id: "e2",
    title: "Syndikat Asphaltfieber",
    date: "02.–05.07.2026",
    location: "Flugplatz Obermehler, Thüringen",
    category: "BMW Meet",
  },
  {
    id: "e3",
    title: "Oldtimertreffen Olympiastadion",
    date: "26.07.2026",
    location: "Olympischer Platz 3, Berlin",
    category: "Oldtimer",
  },
];

// Round-robin reorder so the same author is spread across the feed
// instead of being clustered. Each "pass" takes at most one post per author
// (in original recency order), then repeats. Result: dominant authors appear
// every Nth slot, never two in a row as long as ≥2 authors have posts left.
function interleaveByAuthor(items: Post[]): Post[] {
  if (items.length < 2) return items;
  const buckets = new Map<string, Post[]>();
  const order: string[] = [];
  for (const p of items) {
    if (!buckets.has(p.author_id)) {
      buckets.set(p.author_id, []);
      order.push(p.author_id);
    }
    buckets.get(p.author_id)!.push(p);
  }
  const result: Post[] = [];
  while (result.length < items.length) {
    let placed = 0;
    for (const key of order) {
      const list = buckets.get(key)!;
      if (list.length === 0) continue;
      // Avoid adjacency if there's still another author with posts.
      if (result.length > 0 && result[result.length - 1].author_id === key) {
        const othersHavePosts = order.some(
          (k) => k !== key && (buckets.get(k)?.length ?? 0) > 0,
        );
        if (othersHavePosts) continue;
      }
      result.push(list.shift()!);
      placed++;
    }
    if (placed === 0) break;
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
  const [forumPreview, setForumPreview] = useState<ForumPreview[]>([]);
  const [communitiesPreview, setCommunitiesPreview] = useState<CommunityPreview[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const enrichPosts = async (rows: any[]): Promise<Post[]> => {
    const enriched = await Promise.all(
      rows.map(async (post) => {
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
        const userIds = Array.from(new Set((comments ?? []).map((c: any) => c.user_id)));
        const { data: commentProfiles } = userIds.length
          ? await supabase.from("profiles").select("id,username,avatar_url").in("id", userIds)
          : { data: [] as { id: string; username: string; avatar_url: string | null }[] };
        const profileMap = new Map((commentProfiles ?? []).map((p) => [p.id, p]));
        const commentsWithProfiles = (comments ?? []).map((c: any) => ({
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
    return enriched as unknown as Post[];
  };

  const PAGE_SIZE = 30;

  const loadMore = async () => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);
    const oldest = posts[posts.length - 1].created_at;
    const { data: rows, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .lt("created_at", oldest)
      .limit(PAGE_SIZE);
    if (error || !rows) {
      setLoadingMore(false);
      return;
    }
    if (rows.length === 0) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }
    const enriched = await enrichPosts(rows);
    setPosts((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const merged = [...prev, ...enriched.filter((p) => !seen.has(p.id))];
      cachedPosts = merged;
      return merged;
    });
    if (rows.length < PAGE_SIZE) setHasMore(false);
    setLoadingMore(false);
  };

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

  const loadPreviews = async () => {
    try {
      const { data: qs } = await supabase
        .from("forum_questions")
        .select("id,title,author_id")
        .order("created_at", { ascending: false })
        .limit(3);
      if (qs && qs.length) {
        const authorIds = Array.from(new Set(qs.map((q) => q.author_id)));
        const questionIds = qs.map((q) => q.id);
        const [{ data: profs }, { data: ans }] = await Promise.all([
          supabase.from("profiles").select("id,username,display_name").in("id", authorIds),
          supabase.from("forum_answers").select("question_id").in("question_id", questionIds),
        ]);
        const pMap = new Map((profs ?? []).map((p) => [p.id, p]));
        const aCount = new Map<string, number>();
        (ans ?? []).forEach((a) => aCount.set(a.question_id, (aCount.get(a.question_id) ?? 0) + 1));
        setForumPreview(
          qs.map((q) => ({
            id: q.id,
            title: q.title,
            author: pMap.get(q.author_id)?.display_name ?? pMap.get(q.author_id)?.username ?? "Anonym",
            answers: aCount.get(q.id) ?? 0,
          })),
        );
      }
    } catch (e) {
      console.warn("[preview] forum error", e);
    }
    try {
      const { data: cs } = await supabase
        .from("communities")
        .select("slug,name,description")
        .order("created_at", { ascending: false })
        .limit(3);
      if (cs && cs.length) {
        const ids = cs.map((c) => c.slug);
        // Try to grab member counts (best effort)
        const { data: members } = await supabase
          .from("community_members")
          .select("community_id, communities!inner(slug)")
          .in("communities.slug", ids);
        const mCount = new Map<string, number>();
        (members ?? []).forEach((m: { communities?: { slug?: string } | null }) => {
          const s = m.communities?.slug;
          if (s) mCount.set(s, (mCount.get(s) ?? 0) + 1);
        });
        setCommunitiesPreview(
          cs.map((c) => ({
            slug: c.slug,
            name: c.name,
            description: c.description,
            members: mCount.get(c.slug) ?? 0,
          })),
        );
      }
    } catch (e) {
      console.warn("[preview] communities error", e);
    }
  };


  useEffect(() => {
    load();
    loadTrending();
    loadPreviews();



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
    <main className="mx-auto max-w-7xl px-4 py-8">

      {user && <OnboardingBanner />}
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




          <section className="relative mb-0 overflow-hidden rounded-3xl border border-border/60 bg-card" style={{ height: "58vh", minHeight: 420, maxHeight: 560 }}>
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
              <h1 className="max-w-2xl text-3xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
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

            </div>
          </section>

          <div className="mb-10" />

          {/* Was die Community teilt */}
          {posts.length > 0 && (
            <section className="mb-12">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Was die Community teilt</h2>
                  <p className="text-sm text-muted-foreground">Aktuelle Builds & Beiträge aus der Szene</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("feed-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    loadMore();
                  }}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Mehr sehen →
                </button>
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
                        <div className="space-y-1 px-3 pb-4 pt-4">
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

      {/* Events preview — kleine Einblicke */}
      <section className="mb-8">
        <div className="mb-3 flex items-end justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-yellow-500" />
            <h2 className="text-base font-semibold tracking-tight text-yellow-500">Kommende Events</h2>
          </div>
          <Link to="/events" className="flex items-center gap-1 text-xs text-yellow-500/70 transition-colors hover:text-yellow-400">
            Alle Events <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {EVENT_PREVIEW.map((e) => (
            <li key={e.id}>
              <Link
                to="/events"
                className="group flex h-full flex-col gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 transition-all hover:border-yellow-500/50 hover:bg-yellow-500/10"
              >
                <span className="w-fit rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-yellow-500">
                  {e.category}
                </span>
                <p className="text-sm font-semibold leading-tight line-clamp-2 text-yellow-50">{e.title}</p>
                <div className="mt-auto space-y-1 text-xs text-yellow-100/60">
                  <p className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-yellow-500/70" />{e.date}</p>
                  <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-yellow-500/70" /><span className="truncate">{e.location}</span></p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Forum + Communities preview */}
      <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Forum preview */}
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <div className="mb-3 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4 text-yellow-500" />
              <h2 className="text-base font-semibold tracking-tight text-yellow-500">Forum</h2>
            </div>
            <Link to="/forum" className="flex items-center gap-1 text-xs text-yellow-500/70 transition-colors hover:text-yellow-400">
              Öffnen <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {forumPreview.length === 0 ? (
            <p className="text-xs text-yellow-100/60">Noch keine Fragen — sei der Erste.</p>
          ) : (
            <ul className="space-y-2">
              {forumPreview.map((q) => (
                <li key={q.id}>
                  <Link
                    to="/forum/$questionId"
                    params={{ questionId: q.id }}
                    className="group block rounded-xl border border-yellow-500/20 bg-yellow-500/[0.03] px-3 py-2 transition-colors hover:border-yellow-500/50 hover:bg-yellow-500/10"
                  >
                    <p className="line-clamp-1 text-sm font-medium text-yellow-50">{q.title}</p>
                    <p className="mt-0.5 text-xs text-yellow-100/60">
                      {q.author} · {q.answers} Antwort{q.answers === 1 ? "" : "en"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Communities preview */}
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <div className="mb-3 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-yellow-500" />
              <h2 className="text-base font-semibold tracking-tight text-yellow-500">Communities</h2>
            </div>
            <Link to="/communities" className="flex items-center gap-1 text-xs text-yellow-500/70 transition-colors hover:text-yellow-400">
              Alle sehen <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {communitiesPreview.length === 0 ? (
            <p className="text-xs text-yellow-100/60">Noch keine Communities — starte eine.</p>
          ) : (
            <ul className="space-y-2">
              {communitiesPreview.map((c) => (
                <li key={c.slug}>
                  <Link
                    to="/communities/$slug"
                    params={{ slug: c.slug }}
                    className="group block rounded-xl border border-yellow-500/20 bg-yellow-500/[0.03] px-3 py-2 transition-colors hover:border-yellow-500/50 hover:bg-yellow-500/10"
                  >
                    <p className="line-clamp-1 text-sm font-medium text-yellow-50">{c.name}</p>
                    {c.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-yellow-100/60">{c.description}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-yellow-100/50">{c.members} Mitglied{c.members === 1 ? "" : "er"}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>



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
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5 [column-fill:_balance]">
          {[240, 320, 280, 360, 220, 300, 260, 340].map((h, i) => (
            <div key={i} className="mb-4 break-inside-avoid">
              <Skeleton className="w-full rounded-2xl" style={{ height: h }} />
            </div>
          ))}
        </div>
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
        <div id="feed-grid" className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5 [column-fill:_balance]">
          {interleaveByAuthor(posts).map((p) => {
            const liked = !!user && p.post_likes.some((l) => l.user_id === user.id);
            const username = p.profiles?.username ?? "";
            const caption = p.title ?? p.body ?? "";
            return (
              <div key={p.id} className="mb-4 break-inside-avoid">
                <div className="group relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5 transition-all hover:shadow-lg">
                  {p.image_url ? (
                    <Link
                      to="/post/$postId"
                      params={{ postId: p.id }}
                      aria-label={p.title ?? "Beitrag öffnen"}
                      className="block overflow-hidden"
                    >
                      <img
                        src={p.image_url}
                        alt={p.title ?? `Beitrag von @${username}`}
                        className="block w-full h-auto object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </Link>
                  ) : (
                    <Link
                      to="/post/$postId"
                      params={{ postId: p.id }}
                      className="flex min-h-[160px] flex-col items-center justify-center gap-2 bg-gradient-to-br from-card to-accent/20 px-5 py-8 text-center"
                    >
                      {p.title && <p className="text-base font-semibold leading-snug">{p.title}</p>}
                      {p.body && <p className="text-xs text-muted-foreground line-clamp-3">{p.body}</p>}
                    </Link>
                  )}

                  <div className="px-3 pt-2.5 pb-3">
                    {caption && (
                      <Link
                        to="/post/$postId"
                        params={{ postId: p.id }}
                        className="block text-[13px] leading-snug text-foreground/90 line-clamp-2 hover:text-foreground"
                      >
                        {caption}
                      </Link>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Link
                        to="/profile/$username"
                        params={{ username }}
                        className="flex min-w-0 items-center gap-1.5"
                      >
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarImage src={p.profiles?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">{username[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-[11px] text-muted-foreground hover:text-foreground">@{username}</span>
                        {p.profiles?.verified && <VerifiedBadge className="h-3 w-3 shrink-0" />}
                      </Link>
                      <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                        <button
                          type="button"
                          onClick={(e) => toggleLike(p, e)}
                          aria-pressed={liked}
                          aria-label={liked ? "Like entfernen" : "Liken"}
                          className="flex items-center gap-1 transition-colors hover:text-foreground active:scale-95"
                        >
                          <Heart className={`h-3.5 w-3.5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                          {p.post_likes.length}
                        </button>
                        <Link
                          to="/post/$postId"
                          params={{ postId: p.id }}
                          className="flex items-center gap-1 transition-colors hover:text-foreground"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {p.comments_count}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && posts.length > 0 && hasMore && (
        <div className="mt-8 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="rounded-full"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Lädt…" : "Mehr sehen"}
          </Button>
        </div>
      )}
      {!loading && posts.length > 0 && !hasMore && (
        <p className="mt-8 text-center text-xs text-muted-foreground">Du hast das Ende erreicht.</p>
      )}
      <FeedbackSection />
    </main>
  );
}

