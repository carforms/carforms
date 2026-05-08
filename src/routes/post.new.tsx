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
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/post/new")({
  component: NewPostPage,
});

function NewPostPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [community, setCommunity] = useState<string>("none");
  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

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
    if (!file || !user) return;
    setPreview(URL.createObjectURL(file));
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("posts").upload(path, file);
    if (error) return toast.error(toUserMessage(error, "Bild konnte nicht hochgeladen werden."));
    const { data } = supabase.storage.from("posts").getPublicUrl(path);
    setImageUrl(data.publicUrl);
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
    if (error) return toast.error(toUserMessage(error, "Beitrag konnte nicht erstellt werden."));
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
        <Button type="submit" className="w-full rounded-full" disabled={saving}>
          {saving ? "Veröffentliche…" : "Veröffentlichen"}
        </Button>
      </form>
    </main>
  );
}
