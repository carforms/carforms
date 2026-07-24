import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Loader2, ArrowRight, ArrowLeft, UserPlus, UserCheck, Calendar, Users, Camera } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { validateImageFile } from "@/lib/upload-validation";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { INTEREST_TAGS } from "@/lib/badges";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Willkommen bei Carforms — Onboarding" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

const TOTAL_STEPS = 5;

function OnboardingPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const finish = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", user.id);
      await refreshProfile();
    }
    navigate({ to: "/" });
  };

  const next = () => (step >= TOTAL_STEPS ? finish() : setStep((s) => s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  if (loading || !user || !profile) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Schritt {step}/{TOTAL_STEPS}</span>
          <button
            type="button"
            onClick={finish}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Später erledigen
          </button>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {step === 1 && <StepProfile onNext={next} />}
      {step === 2 && <StepFollow onNext={next} onBack={back} />}
      {step === 3 && <StepEvents onNext={next} onBack={back} />}
      {step === 4 && <StepCommunities onNext={next} onBack={back} />}
      {step === 5 && <StepFirstPost onFinish={finish} onBack={back} />}
    </main>
  );
}

/* -------------------- Step 1: Profile -------------------- */

function StepProfile({ onNext }: { onNext: () => void }) {
  const { user, profile, refreshProfile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [carMake, setCarMake] = useState(profile?.car_make ?? "");
  const [carModel, setCarModel] = useState(profile?.car_model ?? "");
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    const err = validateImageFile(file);
    if (err) return toast.error(err);
    setUploading(true);
    const url = await uploadToCloudinary(file);
    setUploading(false);
    if (!url) return;
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    await refreshProfile();
  };

  const toggleInterest = (slug: string) =>
    setInterests((prev) => (prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ bio, location, car_make: carMake, car_model: carModel, interests })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(toUserMessage(error, "Speichern fehlgeschlagen."));
    await refreshProfile();
    onNext();
  };

  return (
    <StepShell
      title="Zeig dich der Werkstatt"
      subtitle="Ein paar Basics — dann kann die Community dich finden."
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback>
              <Camera className="h-6 w-6 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
        <label className={cn("cursor-pointer", uploading && "pointer-events-none opacity-50")}>
          <span className="inline-flex items-center rounded-full border border-border bg-secondary px-4 py-2 text-sm hover:bg-accent">
            {avatarUrl ? "Avatar ändern" : "Avatar hochladen"}
          </span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onAvatar} />
        </label>
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" rows={3} maxLength={200} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Was schraubst du, was fährst du?" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="loc">Standort (Stadt oder PLZ)</Label>
            <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="z.B. Berlin oder 10115" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="make">Marke</Label>
            <Input id="make" value={carMake} onChange={(e) => setCarMake(e.target.value)} placeholder="z.B. BMW" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Modell</Label>
          <Input id="model" value={carModel} onChange={(e) => setCarModel(e.target.value)} placeholder="z.B. E46 M3" />
        </div>

        <div className="space-y-2">
          <Label>Deine Szene</Label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_TAGS.map((t) => {
              const active = interests.includes(t.slug);
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => toggleInterest(t.slug)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-amber-500 bg-amber-500/15 text-amber-500"
                      : "border-border bg-secondary text-muted-foreground hover:bg-accent",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <StepActions primaryLabel={saving ? "Speichere…" : "Weiter"} onPrimary={save} onSkip={onNext} disabled={saving} />
    </StepShell>
  );
}

/* -------------------- Step 2: Follow suggestions -------------------- */

type Suggestion = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  interests: string[] | null;
};

function StepFollow({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { user, profile } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const interests = profile?.interests ?? [];
      // Prefer profiles sharing interests, fall back to newest others
      let q = supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,bio,interests")
        .neq("id", user.id)
        .limit(12);
      if (interests.length > 0) {
        q = q.overlaps("interests", interests);
      }
      const { data } = await q;
      let list = (data ?? []) as Suggestion[];
      if (list.length < 6) {
        const { data: more } = await supabase
          .from("profiles")
          .select("id,username,display_name,avatar_url,bio,interests")
          .neq("id", user.id)
          .order("created_at", { ascending: false })
          .limit(12);
        const seen = new Set(list.map((x) => x.id));
        for (const p of (more ?? []) as Suggestion[]) if (!seen.has(p.id)) list.push(p);
      }
      setSuggestions(list.slice(0, 10));
    })();
  }, [user, profile?.interests]);

  const toggleFollow = async (id: string) => {
    if (!user || busy) return;
    setBusy(id);
    const wasFollowing = following.has(id);
    const nextSet = new Set(following);
    if (wasFollowing) {
      nextSet.delete(id);
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id);
    } else {
      nextSet.add(id);
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
      if (error) toast.error(toUserMessage(error, "Folgen fehlgeschlagen."));
    }
    setFollowing(nextSet);
    setBusy(null);
  };

  return (
    <StepShell
      title="Leute für dein Feed"
      subtitle="Folge ein paar Fahrern — passend zu deiner Szene."
    >
      {!suggestions ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : suggestions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aktuell keine Vorschläge.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {suggestions.map((s) => {
            const isFollowing = following.has(s.id);
            return (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <Link to="/profile/$username" params={{ username: s.username }}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={s.avatar_url ?? undefined} />
                    <AvatarFallback>{s.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to="/profile/$username" params={{ username: s.username }} className="block truncate text-sm font-semibold hover:underline">
                    {s.display_name || s.username}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.bio || `@${s.username}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isFollowing ? "secondary" : "default"}
                  className="rounded-full"
                  disabled={busy === s.id}
                  onClick={() => toggleFollow(s.id)}
                >
                  {isFollowing ? (<><UserCheck className="mr-1 h-4 w-4" />Folge ich</>) : (<><UserPlus className="mr-1 h-4 w-4" />Folgen</>)}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <StepActions primaryLabel="Weiter" onPrimary={onNext} onSkip={onNext} onBack={onBack} />
    </StepShell>
  );
}

/* -------------------- Step 3: Events -------------------- */

function StepEvents({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  // Events are seeded statically in /events. Auto-skip if we can't find any relevant.
  const { profile } = useAuth();
  const hasLocation = !!profile?.location?.trim();

  useEffect(() => {
    if (!hasLocation) {
      // Auto-skip silently
      onNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasLocation) return null;

  return (
    <StepShell
      title="Events in deiner Ecke"
      subtitle="Track Days, Meets und Werkstatt-Workshops — direkt aus der Szene."
    >
      <Link
        to="/events"
        className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:bg-accent"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
          <Calendar className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Alle Events entdecken</div>
          <p className="text-xs text-muted-foreground">
            Karte mit anstehenden Meets, Track Days und Klassik-Treffen in Deutschland.
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </Link>
      <StepActions primaryLabel="Weiter" onPrimary={onNext} onSkip={onNext} onBack={onBack} />
    </StepShell>
  );
}

/* -------------------- Step 4: Communities -------------------- */

type Community = { id: string; slug: string; name: string; description: string | null };

const INTEREST_TO_COMMUNITY: Record<string, string[]> = {
  jdm: ["jdm", "drift"],
  drift: ["drift"],
  stance: ["stance"],
  track: ["track"],
  euro: ["stance", "track"],
  oldtimer: ["oldtimer"],
  youngtimer: ["oldtimer"],
  offroad: ["offroad"],
};

function StepCommunities({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { user, profile } = useAuth();
  const [communities, setCommunities] = useState<Community[] | null>(null);
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const interests = profile?.interests ?? [];
      const targetSlugs = new Set<string>();
      for (const t of interests) for (const s of INTEREST_TO_COMMUNITY[t] ?? []) targetSlugs.add(s);

      let list: Community[] = [];
      if (targetSlugs.size > 0) {
        const { data } = await supabase
          .from("communities")
          .select("id,slug,name,description")
          .in("slug", Array.from(targetSlugs))
          .limit(6);
        list = (data ?? []) as Community[];
      }
      if (list.length < 3) {
        const { data } = await supabase
          .from("communities")
          .select("id,slug,name,description")
          .order("created_at", { ascending: false })
          .limit(6);
        const seen = new Set(list.map((c) => c.id));
        for (const c of (data ?? []) as Community[]) if (!seen.has(c.id)) list.push(c);
      }
      setCommunities(list.slice(0, 3));
    })();
  }, [profile?.interests]);

  const join = async (id: string) => {
    if (!user || busy) return;
    setBusy(id);
    const { error } = await supabase.from("community_members").insert({ community_id: id, user_id: user.id, role: "member" });
    if (error && error.code !== "23505") toast.error(toUserMessage(error, "Beitritt fehlgeschlagen."));
    setJoined((prev) => new Set(prev).add(id));
    setBusy(null);
  };

  return (
    <StepShell title="Deine Crew finden" subtitle="2-3 passende Communities — direkt beitreten.">
      {!communities ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : communities.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aktuell keine passenden Communities.</p>
      ) : (
        <div className="space-y-3">
          {communities.map((c) => {
            const isJoined = joined.has(c.id);
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{c.name}</div>
                  {c.description && <p className="line-clamp-1 text-xs text-muted-foreground">{c.description}</p>}
                </div>
                <Button
                  size="sm"
                  variant={isJoined ? "secondary" : "default"}
                  className="rounded-full"
                  disabled={busy === c.id || isJoined}
                  onClick={() => join(c.id)}
                >
                  {isJoined ? "Beigetreten" : "Beitreten"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <StepActions primaryLabel="Weiter" onPrimary={onNext} onSkip={onNext} onBack={onBack} />
    </StepShell>
  );
}

/* -------------------- Step 5: First post -------------------- */

function StepFirstPost({ onFinish, onBack }: { onFinish: () => void; onBack: () => void }) {
  return (
    <StepShell
      title="Zeig der Community dein Auto"
      subtitle="Ein Foto, ein paar Worte — und du bist offiziell auf der Strecke."
    >
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-6 text-center">
        <UIBadge className="mb-3 rounded-full bg-amber-500 text-black hover:bg-amber-500">🏁 Erstausfahrt</UIBadge>
        <h3 className="text-xl font-bold">Dein erster Beitrag = dein erstes Abzeichen</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Poste dein Auto, dein Setup oder deinen letzten Trackday. Die Boxencrew wartet.
        </p>
        <Button asChild size="lg" className="mt-6 rounded-full">
          <Link to="/post/new">Beitrag erstellen</Link>
        </Button>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="rounded-full">
          <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
        </Button>
        <Button variant="secondary" onClick={onFinish} className="rounded-full">
          Fertig — später posten
        </Button>
      </div>
    </StepShell>
  );
}

/* -------------------- Shared -------------------- */

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function StepActions({
  primaryLabel,
  onPrimary,
  onSkip,
  onBack,
  disabled,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  onSkip: () => void;
  onBack?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-2">
      <div>
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="rounded-full">
            <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onSkip} className="rounded-full text-muted-foreground">
          Überspringen
        </Button>
        <Button onClick={onPrimary} disabled={disabled} className="rounded-full">
          {primaryLabel} <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
