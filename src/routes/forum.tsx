import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { MessageCircleQuestion, Search, Plus, ThumbsUp, MessageSquare, CheckCircle2, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/forum")({
  component: ForumPage,
  head: () => ({
    meta: [
      { title: "Forum – Carforms Community" },
      { name: "description", content: "Stell Fragen zu Tuning, Werkstätten, Teilen und Builds – die Carforms Community antwortet." },
      { property: "og:title", content: "Forum – Carforms Community" },
      { property: "og:description", content: "Stell Fragen zu Tuning, Werkstätten, Teilen und Builds – die Carforms Community antwortet." },
    ],
    links: [{ rel: "canonical", href: "https://carforms.de/forum" }],
  }),
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
  answers: Answer[];
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

function ForumPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const { data: qs, error } = await supabase
      .from("forum_questions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error || !qs) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    const authorIds = Array.from(new Set(qs.map((q) => q.author_id)));
    const communityIds = Array.from(new Set(qs.map((q) => q.community_id).filter(Boolean) as string[]));
    const questionIds = qs.map((q) => q.id);

    const [{ data: profiles }, { data: communities }, { data: qLikes }, { data: answers }] = await Promise.all([
      supabase.from("profiles").select("id,username,display_name,avatar_url,verified").in("id", authorIds),
      communityIds.length
        ? supabase.from("communities").select("id,slug,name").in("id", communityIds)
        : Promise.resolve({ data: [] as Community[] }),
      supabase.from("forum_question_likes").select("question_id,user_id").in("question_id", questionIds),
      supabase
        .from("forum_answers")
        .select("*")
        .in("question_id", questionIds)
        .order("is_best", { ascending: false })
        .order("created_at", { ascending: true }),
    ]);

    const answerIds = (answers ?? []).map((a) => a.id);
    const answerAuthorIds = Array.from(new Set((answers ?? []).map((a) => a.author_id)));
    const [{ data: aProfiles }, { data: aLikes }] = await Promise.all([
      answerAuthorIds.length
        ? supabase.from("profiles").select("id,username,display_name,avatar_url,verified").in("id", answerAuthorIds)
        : Promise.resolve({ data: [] as Profile[] }),
      answerIds.length
        ? supabase.from("forum_answer_likes").select("answer_id,user_id").in("answer_id", answerIds)
        : Promise.resolve({ data: [] as { answer_id: string; user_id: string }[] }),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
    const aProfileMap = new Map((aProfiles ?? []).map((p) => [p.id, p as Profile]));
    const communityMap = new Map((communities ?? []).map((c) => [c.id, c as Community]));
    const qLikesByQ = new Map<string, { user_id: string }[]>();
    (qLikes ?? []).forEach((l) => {
      const arr = qLikesByQ.get(l.question_id) ?? [];
      arr.push({ user_id: l.user_id });
      qLikesByQ.set(l.question_id, arr);
    });
    const aLikesByA = new Map<string, number>();
    (aLikes ?? []).forEach((l) => aLikesByA.set(l.answer_id, (aLikesByA.get(l.answer_id) ?? 0) + 1));

    const answersByQ = new Map<string, Answer[]>();
    (answers ?? []).forEach((a) => {
      const arr = answersByQ.get(a.question_id) ?? [];
      arr.push({
        id: a.id,
        body: a.body,
        image_url: a.image_url,
        is_best: a.is_best,
        created_at: a.created_at,
        author_id: a.author_id,
        profiles: aProfileMap.get(a.author_id) ?? null,
        like_count: aLikesByA.get(a.id) ?? 0,
      });
      answersByQ.set(a.question_id, arr);
    });

    const enriched: Question[] = qs.map((q) => {
      const likes = qLikesByQ.get(q.id) ?? [];
      return {
        ...q,
        profiles: profileMap.get(q.author_id) ?? null,
        community: q.community_id ? communityMap.get(q.community_id) ?? null : null,
        like_count: likes.length,
        liked_by_me: !!user && likes.some((l) => l.user_id === user.id),
        answers: answersByQ.get(q.id) ?? [],
      };
    });

    setQuestions(enriched);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function toggleQuestionLike(question: Question) {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (question.liked_by_me) {
      setQuestions((prev) =>
        prev.map((q) => (q.id === question.id ? { ...q, liked_by_me: false, like_count: q.like_count - 1 } : q)),
      );
      const { error } = await supabase
        .from("forum_question_likes")
        .delete()
        .eq("question_id", question.id)
        .eq("user_id", user.id);
      if (error) {
        toast.error(toUserMessage(error));
        load();
      }
    } else {
      setQuestions((prev) =>
        prev.map((q) => (q.id === question.id ? { ...q, liked_by_me: true, like_count: q.like_count + 1 } : q)),
      );
      const { error } = await supabase
        .from("forum_question_likes")
        .insert({ question_id: question.id, user_id: user.id });
      if (error && error.code !== "23505") {
        toast.error(toUserMessage(error));
        load();
      }
    }
  }

  const filtered = q.trim()
    ? questions.filter((qq) => {
        const s = q.toLowerCase();
        return (
          qq.title.toLowerCase().includes(s) ||
          qq.body.toLowerCase().includes(s) ||
          qq.tags.some((t) => t.toLowerCase().includes(s)) ||
          qq.profiles?.username.toLowerCase().includes(s)
        );
      })
    : questions;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forum</h1>
          <p className="mt-1 text-sm text-muted-foreground">Stell Fragen — die Community antwortet.</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {questions.length} {questions.length === 1 ? "Frage" : "Fragen"}
        </p>
      </header>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Fragen, Tags, Communities oder User suchen…"
          className="h-12 w-full rounded-2xl border border-border/60 bg-card/40 pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-border"
        />
      </div>

      <button
        type="button"
        onClick={() => navigate({ to: user ? "/forum/new" : "/login" })}
        className="mb-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/20 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-card/40 hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Frage stellen
      </button>

      {loading ? (
        <ul className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <Skeleton className="mb-3 h-4 w-40" />
              <Skeleton className="mb-2 h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card/30 p-12 text-center">
          <MessageCircleQuestion className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {q.trim() ? "Keine passenden Fragen gefunden." : "Noch keine Fragen. Stell die erste!"}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((question) => (
            <li key={question.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
              <article className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <Link
                    to="/profile/$username"
                    params={{ username: question.profiles?.username ?? "" }}
                    className="flex items-center gap-2 font-medium text-foreground hover:underline"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={question.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">
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
                </div>

                <h2 className="mb-2 text-lg font-semibold leading-snug">{question.title}</h2>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{question.body}</p>

                {question.image_url && (
                  <img
                    src={question.image_url}
                    alt={question.title}
                    className="mt-3 max-h-64 w-auto rounded-xl border border-border/60 object-cover"
                  />
                )}

                {question.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {question.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleQuestionLike(question)}
                    aria-pressed={question.liked_by_me}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors hover:bg-accent hover:text-foreground ${
                      question.liked_by_me ? "border-primary/60 text-foreground" : "border-border/60"
                    }`}
                  >
                    <ThumbsUp className={`h-3.5 w-3.5 ${question.liked_by_me ? "fill-current" : ""}`} />
                    Hilfreich · {question.like_count}
                  </button>
                  <Link
                    to="/forum/$questionId"
                    params={{ questionId: question.id }}
                    className="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {question.answers.length} {question.answers.length === 1 ? "Antwort" : "Antworten"}
                  </Link>
                  {question.solved && (
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 px-3 py-1.5 text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Gelöst
                    </span>
                  )}
                </div>
              </article>

              {question.answers.length > 0 && (
                <div className="space-y-3 border-l-2 border-border/60 bg-background/30 px-5 py-4">
                  {question.answers.slice(0, 3).map((a) => (
                    <div key={a.id}>
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Link
                          to="/profile/$username"
                          params={{ username: a.profiles?.username ?? "" }}
                          className="flex items-center gap-1 font-medium text-foreground hover:underline"
                        >
                          @{a.profiles?.username}
                          {a.profiles?.verified && <VerifiedBadge className="h-3 w-3" />}
                        </Link>
                        <span>{timeAgo(a.created_at)}</span>
                        {a.is_best && (
                          <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 px-2 py-0.5 text-emerald-500">
                            <CheckCircle2 className="h-3 w-3" />
                            Beste Antwort
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-line text-sm">{a.body}</p>
                      {a.image_url && (
                        <img
                          src={a.image_url}
                          alt="Antwort"
                          className="mt-2 max-h-40 w-auto rounded-lg border border-border/60 object-cover"
                        />
                      )}
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> Hilfreich · {a.like_count}
                        </span>
                      </div>
                    </div>
                  ))}
                  {question.answers.length > 3 && (
                    <Link
                      to="/forum/$questionId"
                      params={{ questionId: question.id }}
                      className="inline-block text-xs font-medium text-primary hover:underline"
                    >
                      Alle {question.answers.length} Antworten anzeigen →
                    </Link>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
