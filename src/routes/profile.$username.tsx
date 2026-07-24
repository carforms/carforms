import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, Settings, Share2, UserPlus, UserCheck, X, Loader2, Car, Heart, MessageCircle } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { BadgePin } from "@/components/BadgePin";
import { BadgeGrid } from "@/components/BadgeGrid";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/profile/$username")({
  loader: async ({ params }) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id,username,display_name,bio,location,avatar_url")
      .eq("username", params.username)
      .maybeSingle();
    return { profile };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.profile;
    const url = `https://carforms.de/profile/${params.username}`;
    if (!p) {
      return {
        meta: [
          { title: `@${params.username} nicht gefunden | Carforms` },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const name = p.display_name || p.username;
    const title = `${name} (@${p.username}) | Carforms`;
    const description = (p.bio?.trim() || `${name} auf Carforms — Beiträge, Builds und Auto-Kultur aus der deutschen Szene.`)
      .replace(/\s+/g, " ")
      .slice(0, 160);
    return {
      meta: [
        { title: title.length > 60 ? title.slice(0, 59) + "…" : title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        ...(p.avatar_url
          ? [
              { property: "og:image", content: p.avatar_url },
              { name: "twitter:image", content: p.avatar_url },
            ]
          : []),
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            url,
            mainEntity: {
              "@type": "Person",
              name,
              alternateName: p.username,
              description: p.bio || undefined,
              image: p.avatar_url || undefined,
              address: p.location ? { "@type": "PostalAddress", addressLocality: p.location } : undefined,
            },
          }),
        },
      ],
    };
  },
  component: ProfilePage,
});

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  verified: boolean;
  car_make: string | null;
  car_model: string | null;
  pinned_badge: { id: string; name: string; icon_name: string; image_url: string | null } | null;
};

type Post = { id: string; image_url: string | null; title: string | null; created_at: string; likes_count: number; comments_count: number };
type FollowUser = { id: string; username: string; display_name: string | null; avatar_url: string | null };
type SortKey = "new" | "old" | "top";

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0, groups: 0, mutuals: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showMutuals, setShowMutuals] = useState(false);
  const [followers, setFollowers] = useState<FollowUser[] | null>(null);
  const [followingList, setFollowingList] = useState<FollowUser[] | null>(null);
  const [mutuals, setMutuals] = useState<FollowUser[] | null>(null);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [mutualsLoading, setMutualsLoading] = useState(false);
  const [sort, setSort] = useState<SortKey>("new");

  // Reset lists when profile changes
  useEffect(() => {
    setShowFollowers(false);
    setShowFollowing(false);
    setShowMutuals(false);
    setFollowers(null);
    setFollowingList(null);
    setMutuals(null);
  }, [username]);

  useEffect(() => {
    if (!showFollowers || !profile || followers) return;
    setFollowersLoading(true);
    (async () => {
      const { data: rows } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", profile.id);
      const ids = (rows ?? []).map((r) => r.follower_id);
      if (ids.length === 0) {
        setFollowers([]);
        setFollowersLoading(false);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .in("id", ids);
      setFollowers((profs as FollowUser[]) ?? []);
      setFollowersLoading(false);
    })();
  }, [showFollowers, profile?.id]);

  useEffect(() => {
    if (!showFollowing || !profile || followingList) return;
    setFollowingLoading(true);
    (async () => {
      const { data: rows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", profile.id);
      const ids = (rows ?? []).map((r) => r.following_id);
      if (ids.length === 0) {
        setFollowingList([]);
        setFollowingLoading(false);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .in("id", ids);
      setFollowingList((profs as FollowUser[]) ?? []);
      setFollowingLoading(false);
    })();
  }, [showFollowing, profile?.id]);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("id,username,display_name,bio,location,avatar_url,verified,car_make,car_model,pinned_badge:badges!profiles_pinned_badge_id_fkey(id,name,icon_name,image_url)")
        .eq("username", username)
        .maybeSingle();
      if (!p) {
        setProfile(null);
        return;
      }
      setProfile(p as unknown as Profile);

      const [{ data: pp }, { count: postCount }, { count: followersCount }, { count: followingCount }, { count: groups }] =
        await Promise.all([
          supabase
            .from("posts")
            .select("id,image_url,title,created_at,likes:post_likes(count),comments:post_comments(count)")
            .eq("author_id", p.id)
            .order("created_at", { ascending: false }),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("author_id", p.id),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", p.id),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", p.id),
          supabase.from("community_members").select("*", { count: "exact", head: true }).eq("user_id", p.id),
        ]);
      const normalizedPosts: Post[] = ((pp as unknown as Array<{
        id: string;
        image_url: string | null;
        title: string | null;
        created_at: string;
        likes: { count: number }[] | null;
        comments: { count: number }[] | null;
      }>) ?? []).map((r) => ({
        id: r.id,
        image_url: r.image_url,
        title: r.title,
        created_at: r.created_at,
        likes_count: r.likes?.[0]?.count ?? 0,
        comments_count: r.comments?.[0]?.count ?? 0,
      }));
      setPosts(normalizedPosts);

      // Mutuals: users the viewer follows who also follow this profile
      let mutualsCount = 0;
      if (user && user.id !== p.id) {
        const [{ data: myFollowing }, { data: theirFollowers }] = await Promise.all([
          supabase.from("follows").select("following_id").eq("follower_id", user.id),
          supabase.from("follows").select("follower_id").eq("following_id", p.id),
        ]);
        const mine = new Set((myFollowing ?? []).map((r) => r.following_id));
        mutualsCount = (theirFollowers ?? []).filter((r) => mine.has(r.follower_id)).length;
      }

      setStats({
        posts: postCount ?? 0,
        followers: followersCount ?? 0,
        following: followingCount ?? 0,
        groups: groups ?? 0,
        mutuals: mutualsCount,
      });
    })();
  }, [username, user?.id]);

  // Load mutuals list on demand
  useEffect(() => {
    if (!showMutuals || !profile || !user || mutuals) return;
    setMutualsLoading(true);
    (async () => {
      const [{ data: myFollowing }, { data: theirFollowers }] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
        supabase.from("follows").select("follower_id").eq("following_id", profile.id),
      ]);
      const mine = new Set((myFollowing ?? []).map((r) => r.following_id));
      const ids = (theirFollowers ?? []).map((r) => r.follower_id).filter((id) => mine.has(id));
      if (ids.length === 0) {
        setMutuals([]);
        setMutualsLoading(false);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .in("id", ids);
      setMutuals((profs as FollowUser[]) ?? []);
      setMutualsLoading(false);
    })();
  }, [showMutuals, profile?.id, user?.id]);

  const refreshFollowState = async (profileId: string, userId: string) => {
    const { data, error } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", userId)
      .eq("following_id", profileId)
      .maybeSingle();
    if (error) console.error("[follows] check failed", error);
    setIsFollowing(!!data);
  };

  useEffect(() => {
    setIsFollowing(false);
  }, [username]);

  useEffect(() => {
    if (!profile || !user) return;
    if (user.id === profile.id) {
      setIsFollowing(false);
      return;
    }
    refreshFollowState(profile.id, user.id);
  }, [profile?.id, user?.id]);

  async function toggleFollow() {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!profile || followBusy) return;
    if (user.id === profile.id) return;

    setFollowBusy(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setStats((s) => ({
      ...s,
      followers: Math.max(0, s.followers + (wasFollowing ? -1 : 1)),
    }));

    const { error } = wasFollowing
      ? await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)
      : await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: profile.id });

    if (error) {
      console.error("[follows] toggle failed", error);
      toast.error(toUserMessage(error, wasFollowing ? "Entfolgen fehlgeschlagen." : "Folgen fehlgeschlagen."));
      setIsFollowing(wasFollowing);
      setStats((s) => ({
        ...s,
        followers: Math.max(0, s.followers + (wasFollowing ? 1 : -1)),
      }));
    } else {
      await refreshFollowState(profile.id, user.id);
      await refreshMutuals(profile.id, user.id);
    }
    setFollowBusy(false);
  }

  async function refreshMutuals(profileId: string, viewerId: string) {
    if (viewerId === profileId) return;
    const [{ data: myFollowing }, { data: theirFollowers }] = await Promise.all([
      supabase.from("follows").select("following_id").eq("follower_id", viewerId),
      supabase.from("follows").select("follower_id").eq("following_id", profileId),
    ]);
    const mine = new Set((myFollowing ?? []).map((r) => r.following_id));
    const sharedIds = (theirFollowers ?? []).map((r) => r.follower_id).filter((id) => mine.has(id));
    setStats((s) => ({ ...s, mutuals: sharedIds.length }));
    if (sharedIds.length === 0) {
      setMutuals([]);
      return;
    }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url")
      .in("id", sharedIds);
    setMutuals((profs as FollowUser[]) ?? []);
  }


  if (!profile) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">Profil nicht gefunden.</p>
      </main>
    );
  }

  const isMe = user?.id === profile.id;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar className="h-28 w-28 sm:h-32 sm:w-32">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl">{profile.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="flex items-center gap-1.5 text-2xl font-bold">
                  {profile.display_name || profile.username}
                  {profile.verified && <VerifiedBadge className="h-5 w-5" />}
                  {profile.pinned_badge && (
                    <BadgePin
                      iconName={profile.pinned_badge.icon_name}
                      name={profile.pinned_badge.name}
                      imageUrl={profile.pinned_badge.image_url}
                      className="h-5 w-5"
                    />
                  )}
                </h1>
                {isMe ? (
                  <>
                    <Button size="sm" variant="secondary" className="rounded-full" onClick={() => navigate({ to: "/profile/edit" })}>
                      Profil bearbeiten
                    </Button>
                    <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full" aria-label="Profil-Einstellungen öffnen" onClick={() => navigate({ to: "/profile/edit" })}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant={isFollowing ? "secondary" : "default"}
                    className="rounded-full"
                    disabled={followBusy}
                    onClick={toggleFollow}
                  >
                    {isFollowing ? (
                      <><UserCheck className="mr-1.5 h-4 w-4" /> Folge ich</>
                    ) : (
                      <><UserPlus className="mr-1.5 h-4 w-4" /> Folgen</>
                    )}
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 rounded-full"
                  aria-label="Profil-Link teilen"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link kopiert");
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
                <Stat n={stats.posts} label="Posts" />
                <Stat
                  n={stats.followers}
                  label="Followers"
                  onClick={() => {
                    setShowFollowers((v) => !v);
                    setShowFollowing(false);
                    setShowMutuals(false);
                  }}
                  active={showFollowers}
                />
                <Stat
                  n={stats.following}
                  label="Folgende"
                  onClick={() => {
                    setShowFollowing((v) => !v);
                    setShowFollowers(false);
                    setShowMutuals(false);
                  }}
                  active={showFollowing}
                />
                {!isMe && user && (
                  <Stat
                    n={stats.mutuals}
                    label="Mutuals"
                    onClick={() => {
                      setShowMutuals((v) => !v);
                      setShowFollowers(false);
                      setShowFollowing(false);
                    }}
                    active={showMutuals}
                  />
                )}
                <Stat n={stats.groups} label="Gruppen" />
              </div>

              {showFollowers && (
                <FollowList
                  title="Followers"
                  users={followers}
                  loading={followersLoading}
                  onClose={() => setShowFollowers(false)}
                />
              )}
              {showFollowing && (
                <FollowList
                  title="Folgt"
                  users={followingList}
                  loading={followingLoading}
                  onClose={() => setShowFollowing(false)}
                />
              )}
              {showMutuals && (
                <FollowList
                  title="Gemeinsame Mutuals"
                  users={mutuals}
                  loading={mutualsLoading}
                  onClose={() => setShowMutuals(false)}
                />
              )}

              {profile.bio && <p className="mt-4 text-sm">{profile.bio}</p>}
              {(profile.car_make || profile.car_model) && (
                <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <Car className="h-3.5 w-3.5" /> {[profile.car_make, profile.car_model].filter(Boolean).join(" ")}
                </p>
              )}
              {profile.location && (
                <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {profile.location}
                </p>
              )}
            </div>
          </div>

          <div className="mt-10 border-b border-border">
            <div className="-mb-px flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-6">
                <span className="border-b-2 border-foreground px-1 pb-3 text-sm font-medium">Beiträge</span>
              </div>
              {posts.length > 0 && (
                <div className="flex gap-1 pb-2 text-xs">
                  {([
                    { k: "new", label: "Neueste" },
                    { k: "top", label: "Beliebteste" },
                    { k: "old", label: "Älteste" },
                  ] as { k: SortKey; label: string }[]).map((o) => (
                    <button
                      key={o.k}
                      type="button"
                      onClick={() => setSort(o.k)}
                      className={`rounded-full px-3 py-1 transition-colors ${
                        sort === o.k
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              Noch keine Beiträge.
              {isMe && (
                <div className="mt-4">
                  <Button asChild className="rounded-full" size="sm">
                    <Link to="/post/new">Ersten Beitrag erstellen</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-3 gap-1 sm:gap-2">
              {[...posts]
                .sort((a, b) => {
                  if (sort === "top") return b.likes_count - a.likes_count;
                  if (sort === "old")
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                })
                .map((p) => (
                  <li key={p.id} className="group relative aspect-square overflow-hidden rounded-md bg-card">
                    <Link to="/post/$postId" params={{ postId: p.id }} className="block h-full w-full">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.title ?? `Beitrag von @${profile.username}`}
                          className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                          {p.title ?? "Post"}
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-4 bg-black/40 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4 fill-current" /> {p.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4 fill-current" /> {p.comments_count}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <BadgeGrid
            userId={profile.id}
            stats={{ posts: stats.posts, followers: stats.followers, following: stats.following, communities: stats.groups }}
            variant="sidebar"
          />
        </div>
      </div>
    </main>
  );
}

function Stat({
  n,
  label,
  onClick,
  active,
}: {
  n: number;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const content = (
    <>
      <div className="text-xl font-bold">{n.toLocaleString("de-DE")}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`-mx-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-accent ${
          active ? "bg-accent" : ""
        }`}
      >
        {content}
      </button>
    );
  }
  return <div>{content}</div>;
}

function FollowList({
  title,
  users,
  loading,
  onClose,
}: {
  title: string;
  users: FollowUser[] | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 rounded-full"
          onClick={onClose}
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {loading || !users ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Niemand hier.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {users.map((u) => (
            <li key={u.id}>
              <Link
                to="/profile/$username"
                params={{ username: u.username }}
                className="flex items-center gap-3 py-2 transition-colors hover:bg-accent/50 -mx-2 px-2 rounded-md"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {u.display_name || u.username}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">@{u.username}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

