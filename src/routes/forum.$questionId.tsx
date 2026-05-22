import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ArrowLeft, ThumbsUp, CheckCircle2, Clock, Users, ImagePlus, X, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { validateImageFile } from "@/lib/upload-validation";

export const Route = createFileRoute("/forum/$questionId")({
  component: QuestionDetailPage,
  loader: async ({ params }) => {
    const { data: question } = await supabase
      .from("forum_questions")
      .select("id,title,body,author_id")
      .eq("id", params.questionId)
      .maybeSingle();
    return { question };
  },
  head: ({ loaderData }) => {
    const q = loaderData?.question;
    if (!q) return { meta: [{ title: "Frage nicht gefunden – Carforms" }, { name: "robots", content: "noindex" }] };
    const title = q.title.length > 50 ? q.title.slice(0, 49) + "…" : q.title;
    const desc = q.body.replace(/\s+/g, " ").slice(0, 160);
    return {
      meta: [
        { title: `${title} – Carforms Forum` },
        { name: "description", content: desc },
        { property: "og:title", content: `${title} – Carforms Forum` },
        { property: "og:description", content: desc },
      ],
    };
  },
});

type Profile = { id: string; username: string; display_name: string | null; avatar_url: string | null; verified: boolean };
type Community = { id: string; slug: string; name: string };
type Answer = {
  id: string;
  body: string;
  image_url: string | null;
  is_best: boolean;
  created_at: string;
  author_id: string;
  profiles: Profile | null;
  like_count: number;
  liked_by_me: boolean;
};
type Question = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  tags: string[];
  solved: boolean;
  created_at: string;
  author_id: string;
  community_id: string | null;
  profiles: Profile | null;
  community: Community | null;
  like_count: number;
  liked_by_me: boolean;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} ${h === 1 ? "Stunde" : "Stunden"}`;
  const d = Math.floor(h / 24);
  if (d < 7) return `vor ${d} ${d === 1 ? "Tag" : "Tagen"}`;
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

function QuestionDetailPage() {
  const { questionId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyPreview, setReplyPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: q, error } = await supabase
      .from("forum_questions")
      .select("*")
      .eq("id", questionId)
      .maybeSingle();
    if (error || !q) {
      setQuestion(null);
      setLoading(false);
      return;
    }
    const [{ data: profile }, { data: community }, { data: qLikes }, { data: ans }] = await Promise.all([
      supabase.from("profiles").select("id,username,display_name,avatar_url,verified").eq("id", q.author_id).single(),
      q.community_id
        ? supabase.from("communities").select("id,slug,name").eq("id", q.community_id).single()
        : Promise.resolve({ data: null as Community | null }),
      supabase.from("forum_question_likes").select("user_id").eq("question_id", q.id),
      supabase
        .from("forum_answers")
        .select("*")
        .eq("question_id", q.id)
        .order("is_best", { ascending: false })
        .order("created_at", { ascending: true }),
    ]);
    const ansAuthorIds = Array.from(new Set((ans ?? []).map((a) => a.author_id)));
    const ansIds = (ans ?? []).map((a) => a.id);
    const [{ data: ansProfiles }, { data: ansLikes }] = await Promise.all([
      ansAuthorIds.length
        ? supabase.from("profiles").select("id,username,display_name,avatar_url,verified").in("id", ansAuthorIds)
        : Promise.resolve({ data: [] as Profile[] }),
      ansIds.length
        ? supabase.from("forum_answer_likes").select("answer_id,user_id").in("answer_id", ansIds)
        : Promise.resolve({ data: [] as { answer_id: string; user_id: string }[] }),
    ]);
    const profileMap = new Map((ansProfiles ?? []).map((p) => [p.id, p as Profile]));
    const likeCounts = new Map<string, number>();
    const likedByMe = new Set<string>();
    (ansLikes ?? []).forEach((l) => {
      likeCounts.set(l.answer_id, (likeCounts.get(l.answer_id) ?? 0) + 1);
      if (user && l.user_id === user.id) likedByMe.add(l.answer_id);
    });
    const likes = (qLikes as { user_id: string }[]) ?? [];
    setQuestion({
      ...(q as Omit<Question, "profiles" | "community" | "like_count" | "liked_by_me">),
      profiles: (profile as Profile) ?? null,
      community: (community as Community | null) ?? null,
      like_count: likes.length,
      liked_by_me: !!user && likes.some((l) => l.user_id === user.id),
    });
    setAnswers(
      (ans ?? []).map((a) => ({
        id: a.id,
        body: a.body,
        image_url: a.image_url,
        is_best: a.is_best,
        created_at: a.created_at,
        author_id: a.author_id,
        profiles: profileMap.get(a.author_id) ?? null,
        like_count: likeCounts.get(a.id) ?? 0,
        liked_by_me: likedByMe.has(a.id),
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, user?.id]);

  async function toggleQuestionLike() {
    if (!user || !question) {
      navigate({ to: "/login" });
      return;
    }
    if (question.liked_by_me) {
      setQuestion({ ...question, liked_by_me: false, like_count: question.like_count - 1 });
      const { error } = await supabase
        .from("forum_question_likes")
        .delete()
        .eq("question_id", question.id)
        .eq("user_id", user.id);
      if (error) toast.error(toUserMessage(error));
    } else {
      setQuestion({ ...question, liked_by_me: true, like_count: question.like_count + 1 });
      const { error } = await supabase
        .from("forum_question_likes")
        .insert({ question_id: question.id, user_id: user.id });
      if (error && error.code !== "23505") toast.error(toUserMessage(error));
    }
  }

  async function toggleAnswerLike(a: Answer) {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setAnswers((prev) =>
      prev.map((x) =>
        x.id === a.id
          ? { ...x, liked_by_me: !x.liked_by_me, like_count: x.like_count + (x.liked_by_me ? -1 : 1) }
          : x,
      ),
    );
    if (a.liked_by_me) {
      const { error } = await supabase
        .from("forum_answer_likes")
        .delete()
        .eq("answer_id", a.id)
        .eq("user_id", user.id);
      if (error) toast.error(toUserMessage(error));
    } else {
      const { error } = await supabase.from("forum_answer_likes").insert({ answer_id: a.id, user_id: user.id });
      if (error && error.code !== "23505") toast.error(toUserMessage(error));
    }
  }

  async function submitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!reply.trim() && !replyImage) return;
    setBusy(true);
    let imageUrl: string | null = null;
    if (replyImage) {
      const err = validateImageFile(replyImage);
      if (err) {
        setBusy(false);
        toast.error(err);
        return;
      }
      const mimeExt = replyImage.type.split("/")[1]?.toLowerCase() ?? "jpg";
      const ext = mimeExt === "jpeg" ? "jpg" : mimeExt;
      const path = `${user.id}/forum/answers/${questionId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("post-images")
        .upload(path, replyImage, { contentType: replyImage.type });
      if (upErr) {
        setBusy(false);
        toast.error(toUserMessage(upErr));
        return;
      }
      imageUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase
      .from("forum_answers")
      .insert({ question_id: questionId, author_id: user.id, body: reply.trim(), image_url: imageUrl });
    setBusy(false);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    setReply("");
    if (replyPreview) URL.revokeObjectURL(replyPreview);
    setReplyImage(null);
    setReplyPreview(null);
    load();
  }

  async function markBest(a: Answer) {
    if (!user || !question || user.id !== question.author_id) return;
    // unset previous best, set new
    const updates = answers
      .filter((x) => x.is_best && x.id !== a.id)
      .map((x) => supabase.from("forum_answers").update({ is_best: false }).eq("id", x.id));
    await Promise.all(updates);
    const { error } = await supabase
      .from("forum_answers")
      .update({ is_best: !a.is_best })
      .eq("id", a.id);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    await supabase
      .from("forum_questions")
      .update({ solved: !a.is_best })
      .eq("id", question.id);
    load();
  }

  async function deleteAnswer(a: Answer) {
    if (!user || user.id !== a.author_id) return;
    if (!confirm("Antwort wirklich löschen?")) return;
    const { error } = await supabase.from("forum_answers").delete().eq("id", a.id);
    if (error) toast.error(toUserMessage(error));
    else load();
  }

  async function deleteQuestion() {
    if (!question || !user || user.id !== question.author_id) return;
    if (!confirm("Frage wirklich löschen?")) return;
    const { error } = await supabase.from("forum_questions").delete().eq("id", question.id);
    if (error) toast.error(toUserMessage(error));
    else navigate({ to: "/forum" });
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="mb-3 h-6 w-3/4" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-5/6" />
      </main>
    );
  }
  if (!question) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">Frage nicht gefunden.</p>
        <Button variant="secondary" size="sm" className="mt-4 rounded-full" asChild>
          <Link to="/forum">Zurück zum Forum</Link>
        </Button>
      </main>
    );
  }

  const isAuthor = user?.id === question.author_id;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 rounded-full text-muted-foreground"
        onClick={() => navigate({ to: "/forum" })}
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Forum
      </Button>

      <article className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Link
            to="/profile/$username"
            params={{ username: question.profiles?.username ?? "" }}
            className="flex items-center gap-2 font-medium text-foreground hover:underline"
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={question.profiles?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">
                {question.profiles?.username?.[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <span className="flex items-center gap-1">
              @{question.profiles?.username}
              {question.profiles?.verified && <VerifiedBadge className="h-3 w-3" />}
            </span>
          </Link>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(question.created_at)}
          </span>
          {question.community && (
            <Link
              to="/communities/$slug"
              params={{ slug: question.community.slug }}
              className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 hover:bg-accent hover:text-foreground"
            >
              <Users className="h-3 w-3" />
              {question.community.name}
            </Link>
          )}
          {isAuthor && (
            <button
              type="button"
              onClick={deleteQuestion}
              className="ml-auto flex items-center gap-1 text-muted-foreground hover:text-destructive"
              aria-label="Frage löschen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <h1 className="mb-3 text-2xl font-bold leading-snug">{question.title}</h1>
        <p className="whitespace-pre-line text-sm text-muted-foreground">{question.body}</p>

        {question.image_url && (
          <img
            src={question.image_url}
            alt={question.title}
            onClick={() => setLightbox(question.image_url)}
            className="mt-4 max-h-96 w-auto cursor-pointer rounded-xl border border-border/60 object-cover"
          />
        )}

        {question.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {question.tags.map((t) => (
              <span key={t} className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={toggleQuestionLike}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors hover:bg-accent hover:text-foreground ${
              question.liked_by_me ? "border-primary/60 text-foreground" : "border-border/60"
            }`}
          >
            <ThumbsUp className={`h-3.5 w-3.5 ${question.liked_by_me ? "fill-current" : ""}`} />
            Hilfreich · {question.like_count}
          </button>
          {question.solved && (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 px-3 py-1.5 text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Gelöst
            </span>
          )}
        </div>
      </article>

      <section className="mt-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {answers.length} {answers.length === 1 ? "Antwort" : "Antworten"}
        </h2>

        {answers.map((a) => (
          <div
            key={a.id}
            className={`rounded-2xl border bg-card/30 p-4 ${a.is_best ? "border-emerald-500/40" : "border-border/60"}`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Link
                to="/profile/$username"
                params={{ username: a.profiles?.username ?? "" }}
                className="flex items-center gap-2 font-medium text-foreground hover:underline"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={a.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {a.profiles?.username?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="flex items-center gap-1">
                  @{a.profiles?.username}
                  {a.profiles?.verified && <VerifiedBadge className="h-3 w-3" />}
                </span>
              </Link>
              <span>{timeAgo(a.created_at)}</span>
              {a.is_best && (
                <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 px-2 py-0.5 text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" />
                  Beste Antwort
                </span>
              )}
              {user?.id === a.author_id && (
                <button
                  type="button"
                  onClick={() => deleteAnswer(a)}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                  aria-label="Antwort löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="whitespace-pre-line text-sm">{a.body}</p>
            {a.image_url && (
              <img
                src={a.image_url}
                alt="Antwort"
                onClick={() => setLightbox(a.image_url)}
                className="mt-3 max-h-64 w-auto cursor-pointer rounded-xl border border-border/60 object-cover"
              />
            )}
            <div className="mt-3 flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => toggleAnswerLike(a)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors hover:bg-accent hover:text-foreground ${
                  a.liked_by_me ? "border-primary/60 text-foreground" : "border-border/60 text-muted-foreground"
                }`}
              >
                <ThumbsUp className={`h-3 w-3 ${a.liked_by_me ? "fill-current" : ""}`} />
                Hilfreich · {a.like_count}
              </button>
              {isAuthor && (
                <button
                  type="button"
                  onClick={() => markBest(a)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors hover:bg-accent hover:text-foreground ${
                    a.is_best ? "border-emerald-500/40 text-emerald-500" : "border-border/60 text-muted-foreground"
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {a.is_best ? "Beste entfernen" : "Als beste markieren"}
                </button>
              )}
            </div>
          </div>
        ))}

        {user ? (
          <form
            onSubmit={submitAnswer}
            className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-4"
          >
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder="Deine Antwort…"
              className="w-full resize-none rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm outline-none focus:border-border"
            />
            {replyPreview && (
              <div className="relative inline-block">
                <img src={replyPreview} alt="Vorschau" className="max-h-32 rounded-lg border border-border/60 object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    if (replyPreview) URL.revokeObjectURL(replyPreview);
                    setReplyImage(null);
                    setReplyPreview(null);
                  }}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background shadow ring-1 ring-border"
                  aria-label="Bild entfernen"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                <ImagePlus className="h-3.5 w-3.5" />
                Bild
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (replyPreview) URL.revokeObjectURL(replyPreview);
                    setReplyImage(f);
                    setReplyPreview(f ? URL.createObjectURL(f) : null);
                    e.target.value = "";
                  }}
                />
              </label>
              <Button
                type="submit"
                size="sm"
                className="rounded-full"
                disabled={busy || (!reply.trim() && !replyImage)}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" /> Antworten
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 text-center">
            <p className="mb-3 text-sm text-muted-foreground">Melde dich an, um zu antworten.</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" className="rounded-full" asChild>
                <Link to="/login">Anmelden</Link>
              </Button>
              <Button size="sm" className="rounded-full" asChild>
                <Link to="/signup">Registrieren</Link>
              </Button>
            </div>
          </div>
        )}
      </section>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <img src={lightbox} alt="Bild" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </main>
  );
}
