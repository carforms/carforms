import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { validateImageFile } from "@/lib/upload-validation";

export const Route = createFileRoute("/post/new")({
  component: NewPostPage,
});

function NewPostPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [community, setCommunity] = useState<string>("none");
  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user && !authLoading) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("community_members")
      .select("communities(id,name)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const list = (data ?? [])
          .map((r: { communities: { id: string; name: string } | null }) => r.communities)
          .filter((c): c is { id: string; name: string } => !!c);
        setCommunities(list);
      });
  }, [user]);

  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      e.target.value = "";
      return toast.error("Du musst angemeldet sein, um Bilder hochzuladen.");
    }
    const validationError = validateImageFile(file);
    if (validationError) {
      e.target.value = "";
      return toast.error(validationError);
    }
    const mimeExt = file.type.split("/")[1]?.toLowerCase() ?? "jpg";
    const fileExt = mimeExt === "jpeg" ? "jpg" : mimeExt;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(filePath, file, { upsert: true, contentType: file.type || `image/${fileExt}` });
      if (uploadError) {
        console.error("UPLOAD ERROR (post-images):", JSON.stringify(uploadError));
        const msg = uploadError.message?.toLowerCase() ?? "";
        if (msg.includes("row-level security") || msg.includes("unauthorized") || msg.includes("permission")) {
          toast.error("Keine Berechtigung zum Hochladen. Bitte erneut anmelden und nochmal versuchen.");
        } else if (msg.includes("bucket") && msg.includes("not found")) {
          toast.error("Speicher-Bucket „post-images“ existiert nicht. Bitte Admin kontaktieren.");
        } else if (msg.includes("payload") || msg.includes("size") || msg.includes("too large")) {
          toast.error("Datei ist zu groß für den Upload.");
        } else if (msg.includes("mime") || msg.includes("content type")) {
          toast.error("Dateityp wird vom Speicher abgelehnt.");
        } else if (msg.includes("network") || msg.includes("fetch")) {
          toast.error("Netzwerkfehler beim Upload. Bitte Verbindung prüfen.");
        } else {
          toast.error("Bild konnte nicht hochgeladen werden: " + uploadError.message);
        }
        setUploading(false);
        setPreview(null);
        return;
      }
      const { data } = supabase.storage.from("post-images").getPublicUrl(filePath);
      if (!data?.publicUrl) {
        toast.error("Öffentliche URL konnte nicht erzeugt werden.");
        setUploading(false);
        return;
      }
      setImageUrl(data.publicUrl);
    } catch (err) {
      console.error("Unexpected upload error:", err);
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("Unerwarteter Fehler beim Upload: " + message);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      title: title || null,
      body: body || null,
      image_url: imageUrl,
      community_id: community === "none" ? null : community,
    });
    setSaving(false);
    if (error) return toast.error("Beitrag konnte nicht erstellt werden: " + error.message);
    toast.success("Beitrag veröffentlicht");
    navigate({ to: "/", replace: false });
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold">Neuer Beitrag</h1>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
          {preview ? (
            <img src={preview} alt="Vorschau" className="h-full w-full object-cover" />
          ) : (
            <>
              <ImagePlus className="h-8 w-8" />
              <span className="mt-2 text-sm">Bild hinzufügen</span>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={onImage} />
        </label>

        <div className="space-y-2">
          <Label htmlFor="title">Titel</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="z.B. Perfekter Sonntagmorgen" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Text (optional)</Label>
          <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} rows={3} />
        </div>
        <div className="space-y-2">
          <Label>Community (optional)</Label>
          <Select value={community} onValueChange={setCommunity}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Keine</SelectItem>
              {communities.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full rounded-full" disabled={saving || uploading}>
          {uploading ? "Bild wird hochgeladen..." : saving ? "Veröffentliche…" : "Veröffentlichen"}
        </Button>
      </form>
    </main>
  );
}
