import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { validateImageFile } from "@/lib/upload-validation";

export const Route = createFileRoute("/forum/new")({
  component: NewQuestionPage,
  head: () => ({
    meta: [
      { title: "Neue Frage stellen – Carforms Forum" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Community = { id: string; slug: string; name: string };

function NewQuestionPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [communityId, setCommunityId] = useState<string>("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Only communities the user can post to (member or owner) — matches the
      // INSERT policy on forum_questions so the dropdown never offers a
      // community that would be rejected by RLS.
      const [{ data: memberRows }, { data: ownedRows }] = await Promise.all([
        supabase
          .from("community_members")
          .select("communities:community_id(id,slug,name)")
          .eq("user_id", user.id),
        supabase
          .from("communities")
          .select("id,slug,name")
          .eq("created_by", user.id),
      ]);
      const map = new Map<string, Community>();
      for (const row of (memberRows ?? []) as Array<{ communities: Community | null }>) {
        if (row.communities) map.set(row.communities.id, row.communities);
      }
      for (const c of (ownedRows ?? []) as Community[]) map.set(c.id, c);
      setCommunities(
        Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)),
      );
    })();
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (title.trim().length < 3) {
      toast.error("Titel muss mind. 3 Zeichen lang sein.");
      return;
    }
    if (body.trim().length < 1) {
      toast.error("Bitte beschreibe deine Frage.");
      return;
    }
    setBusy(true);
    let imageUrl: string | null = null;
    if (image) {
      const err = validateImageFile(image);
      if (err) {
        setBusy(false);
        toast.error(err);
        return;
      }
      const mimeExt = image.type.split("/")[1]?.toLowerCase() ?? "jpg";
      const ext = mimeExt === "jpeg" ? "jpg" : mimeExt;
      const path = `${user.id}/forum/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("post-images")
        .upload(path, image, { contentType: image.type });
      if (upErr) {
        setBusy(false);
        toast.error(toUserMessage(upErr));
        return;
      }
      imageUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length <= 30)
      .slice(0, 6);

    const { data: inserted, error } = await supabase
      .from("forum_questions")
      .insert({
        author_id: user.id,
        title: title.trim(),
        body: body.trim(),
        image_url: imageUrl,
        tags,
        community_id: communityId || null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !inserted) {
      const raw = (error?.message ?? "").toLowerCase();
      if (raw.includes("row-level security") || raw.includes("violates")) {
        toast.error(
          communityId
            ? "Du kannst nur in Communities posten, in denen du Mitglied bist."
            : "Aktion nicht erlaubt. Bitte melde dich neu an.",
        );
      } else {
        toast.error(toUserMessage(error));
      }
      return;
    }
    toast.success("Frage veröffentlicht");
    navigate({ to: "/forum/$questionId", params: { questionId: inserted.id } });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 rounded-full text-muted-foreground"
        onClick={() => navigate({ to: "/forum" })}
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Zurück zum Forum
      </Button>
      <h1 className="mb-2 text-2xl font-bold">Frage stellen</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Beschreibe dein Problem so konkret wie möglich. Die Community antwortet schneller, wenn die Frage präzise ist.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Titel</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="z.B. Welche Folie hält am besten bei extremen Temperaturen?"
            className="h-11 w-full rounded-xl border border-border/60 bg-card/60 px-4 text-sm outline-none focus:border-border"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Deine Frage</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            rows={6}
            placeholder="Mehr Kontext = bessere Antworten…"
            className="w-full rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm outline-none focus:border-border"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Community (optional)
            </label>
            <select
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className="h-11 w-full rounded-xl border border-border/60 bg-card/60 px-3 text-sm outline-none focus:border-border"
            >
              <option value="">Öffentlich (alle sehen es)</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {communities.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Du bist noch in keiner Community — deine Frage wird öffentlich gepostet.
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tags (Komma-getrennt)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Folierung, Sommer, Haltbarkeit"
              className="h-11 w-full rounded-xl border border-border/60 bg-card/60 px-4 text-sm outline-none focus:border-border"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Bild (optional)</label>
          {preview ? (
            <div className="relative inline-block">
              <img src={preview} alt="Vorschau" className="max-h-48 rounded-xl border border-border/60 object-cover" />
              <button
                type="button"
                onClick={() => {
                  if (preview) URL.revokeObjectURL(preview);
                  setImage(null);
                  setPreview(null);
                }}
                aria-label="Bild entfernen"
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background text-foreground shadow ring-1 ring-border hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex h-24 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-card/30 text-sm text-muted-foreground hover:border-border hover:text-foreground">
              <ImagePlus className="h-4 w-4" />
              Bild auswählen
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (preview) URL.revokeObjectURL(preview);
                  setImage(f);
                  setPreview(f ? URL.createObjectURL(f) : null);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link to="/forum">
            <Button type="button" variant="ghost" className="rounded-full">Abbrechen</Button>
          </Link>
          <Button type="submit" className="rounded-full" disabled={busy}>
            {busy ? "Wird veröffentlicht…" : "Frage veröffentlichen"}
          </Button>
        </div>
      </form>
    </main>
  );
}
