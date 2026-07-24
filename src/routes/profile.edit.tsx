import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { validateImageFile } from "@/lib/upload-validation";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { INTEREST_TAGS, getBadgeIcon, type Badge } from "@/lib/badges";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile/edit")({
  component: EditProfilePage,
});

function EditProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [pinnedBadgeId, setPinnedBadgeId] = useState<string | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      setCarMake(profile.car_make ?? "");
      setCarModel(profile.car_model ?? "");
      setInterests(profile.interests ?? []);
      setPinnedBadgeId(profile.pinned_badge_id ?? null);
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_badges")
        .select("badge_id, badges(*)")
        .eq("user_id", user.id);
      const list = ((data ?? []) as any[])
        .map((r) => r.badges as Badge)
        .filter(Boolean)
        .sort((a, b) => a.sort_order - b.sort_order);
      setEarnedBadges(list);
    })();
  }, [user]);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const err = validateImageFile(file);
    if (err) return toast.error(err);
    setUploading(true);
    const url = await uploadToCloudinary(file);
    if (!url) return setUploading(false);
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    if (error) {
      toast.error(toUserMessage(error, "Profil konnte nicht aktualisiert werden."));
      setUploading(false);
      return;
    }
    setAvatarUrl(url);
    await refreshProfile();
    toast.success("Profilbild aktualisiert!");
    setUploading(false);
  };

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await handleAvatarUpload(file);
  };

  const toggleInterest = (slug: string) =>
    setInterests((prev) => (prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        bio,
        location,
        car_make: carMake,
        car_model: carModel,
        interests,
        pinned_badge_id: pinnedBadgeId,
        avatar_url: avatarUrl,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(toUserMessage(error, "Profil konnte nicht gespeichert werden."));
    toast.success("Gespeichert");
    await refreshProfile();
    if (profile?.username) navigate({ to: "/profile/$username", params: { username: profile.username } });
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold">Profil bearbeiten</h1>
      <form onSubmit={save} className="mt-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback>{profile?.username?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
            </Avatar>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70 backdrop-blur-sm">
                <Loader2 className="h-5 w-5 animate-spin text-foreground" />
              </div>
            )}
          </div>
          <label className={`cursor-pointer ${uploading ? "pointer-events-none opacity-50" : ""}`}>
            <span className="inline-flex items-center justify-center rounded-full border border-border bg-secondary px-4 py-2 text-sm hover:bg-accent">
              {uploading ? "Lädt hoch…" : "Avatar ändern"}
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onAvatar} disabled={uploading} />
          </label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" value={profile?.username ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dn">Anzeigename</Label>
          <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="loc">Standort</Label>
          <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="make">Marke</Label>
            <Input id="make" value={carMake} onChange={(e) => setCarMake(e.target.value)} maxLength={40} placeholder="z.B. BMW" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Modell</Label>
            <Input id="model" value={carModel} onChange={(e) => setCarModel(e.target.value)} maxLength={60} placeholder="z.B. E46 M3" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Interessen</Label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_TAGS.map((t) => {
              const active = interests.includes(t.slug);
              return (
                <button
                  type="button"
                  key={t.slug}
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

        {/* Pin badge */}
        <div className="space-y-2">
          <Label>Abzeichen anpinnen</Label>
          <p className="text-xs text-muted-foreground">
            Wird als kleines Icon direkt neben deinem Namen angezeigt.
          </p>
          {earnedBadges.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              Noch keine Abzeichen freigeschaltet. Poste, folge, tritt Communities bei.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPinnedBadgeId(null)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  pinnedBadgeId === null
                    ? "border-amber-500 bg-amber-500/15 text-amber-500"
                    : "border-border bg-secondary text-muted-foreground hover:bg-accent",
                )}
              >
                Kein Pin
              </button>
              {earnedBadges.map((b) => {
                const Icon = getBadgeIcon(b.icon_name);
                const active = pinnedBadgeId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setPinnedBadgeId(b.id)}
                    title={b.description}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-amber-500 bg-amber-500/15 text-amber-500"
                        : "border-border bg-secondary text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {b.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full rounded-full" disabled={saving}>
          {saving ? "Speichere…" : "Speichern"}
        </Button>
      </form>
    </main>
  );
}
