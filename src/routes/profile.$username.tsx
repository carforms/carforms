import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, Settings, Share2, UserPlus, UserCheck, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/profile/$username")({
  component: ProfilePage,
});

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
};

type Post = { id: string; image_url: string | null; title: string | null };
type FollowUser = { id: string; username: string; display_name: string | null; avatar_url: string | null };

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0, groups: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followers, setFollowers] = useState<FollowUser[] | null>(null);
  const [followingList, setFollowingList] = useState<FollowUser[] | null>(null);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);

  // Reset lists when profile changes
  useEffect(() => {
    setShowFollowers(false);
    setShowFollowing(false);
    setFollowers(null);
    setFollowingList(null);
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
        .select("id,username,display_name,bio,location,avatar_url")
        .eq("username", username)
        .maybeSingle();
      if (!p) {
        setProfile(null);
        return;
      }
      setProfile(p as Profile);

      const [{ data: pp }, { count: postCount }, { count: followers }, { count: following }, { count: groups }] =
        await Promise.all([
          supabase.from("posts").select("id,image_url,title").eq("author_id", p.id).order("created_at", { ascending: false }),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("author_id", p.id),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", p.id),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", p.id),
          supabase.from("community_members").select("*", { count: "exact", head: true }).eq("user_id", p.id),
        ]);
      setPosts((pp as Post[]) ?? []);
      setStats({
        posts: postCount ?? 0,
        followers: followers ?? 0,
        following: following ?? 0,
        groups: groups ?? 0,
      });
    })();
  }, [username]);

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
    }
    setFollowBusy(false);
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
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <Avatar className="h-28 w-28 sm:h-32 sm:w-32">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-2xl">{profile.username[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            {isMe ? (
              <>
                <Button size="sm" variant="secondary" className="rounded-full" onClick={() => navigate({ to: "/profile/edit" })}>
                  Profil bearbeiten
                </Button>
                <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full" onClick={() => navigate({ to: "/profile/edit" })}>
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
              }}
              active={showFollowers}
            />
            <Stat
              n={stats.following}
              label="Folgende"
              onClick={() => {
                setShowFollowing((v) => !v);
                setShowFollowers(false);
              }}
              active={showFollowing}
            />
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

          {profile.bio && <p className="mt-4 text-sm">{profile.bio}</p>}
          {profile.location && (
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {profile.location}
            </p>
          )}
        </div>
      </div>

      <div className="mt-10 border-b border-border">
        <div className="-mb-px flex gap-8">
          <button className="border-b-2 border-foreground px-2 pb-3 text-sm font-medium">Beiträge</button>
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
          {posts.map((p) => (
            <li key={p.id} className="aspect-square overflow-hidden rounded-md bg-card">
              <Link to="/post/$postId" params={{ postId: p.id }} className="block h-full w-full">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title ?? ""} className="h-full w-full object-cover transition-opacity hover:opacity-90" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                    {p.title ?? "Post"}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
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

