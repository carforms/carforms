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

export const Route = createFileRoute("/profile/edit")({
  component: EditProfilePage,
});

function EditProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
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
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    const uploaded = await uploadToCloudinary(file);
    if (!uploaded) {
      setUploading(false);
      return;
    }
    const publicUrl = uploaded;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      toast.error(toUserMessage(updateError, "Profil konnte nicht aktualisiert werden."));
      setUploading(false);
      return;
    }

    setAvatarUrl(publicUrl);
    await refreshProfile();
    toast.success("Profilbild aktualisiert!");
    setUploading(false);
  };

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await handleAvatarUpload(file);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, bio, location, avatar_url: avatarUrl })
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
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onAvatar}
              disabled={uploading}
            />
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
        <Button type="submit" className="w-full rounded-full" disabled={saving}>
          {saving ? "Speichere…" : "Speichern"}
        </Button>
      </form>
    </main>
  );
}
