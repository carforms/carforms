import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type Task = { key: string; label: string; done: boolean; to: string };

export function OnboardingBanner() {
  const { user, profile, refreshProfile } = useAuth();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    if (profile.onboarding_dismissed_at || profile.onboarding_completed_at) {
      setDismissed(true);
      return;
    }
    (async () => {
      const [{ count: postCount }, { count: followCount }] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("author_id", user.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
      ]);
      const profileFull =
        !!profile.avatar_url &&
        !!profile.bio?.trim() &&
        !!profile.location?.trim() &&
        !!profile.car_make?.trim();

      const list: Task[] = [
        { key: "profile", label: "Profil ausfüllen (Bio, Standort, Auto)", done: profileFull, to: "/onboarding" },
        { key: "follow", label: "Mindestens einer Person folgen", done: (followCount ?? 0) >= 1, to: "/onboarding" },
        { key: "post", label: "Ersten Beitrag posten", done: (postCount ?? 0) >= 1, to: "/post/new" },
      ];
      setTasks(list);

      if (list.every((t) => t.done)) {
        await supabase
          .from("profiles")
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq("id", user.id);
        await refreshProfile();
      }
    })();
  }, [user, profile]);

  if (!user || !profile || dismissed || !tasks) return null;
  if (tasks.every((t) => t.done)) return null;

  const done = tasks.filter((t) => t.done).length;
  const pct = Math.round((done / tasks.length) * 100);

  const dismiss = async () => {
    setDismissed(true);
    await supabase
      .from("profiles")
      .update({ onboarding_dismissed_at: new Date().toISOString() })
      .eq("id", user.id);
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold sm:text-base">
            Boxenstopp: Profil zu {pct}% vollgetankt
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Schließ die letzten Schritte ab und komm auf die Strecke.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Banner schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-amber-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {tasks.map((t) => (
          <li key={t.key}>
            <Link
              to={t.to}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors hover:text-foreground",
                t.done ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {t.done ? (
                <CheckCircle2 className="h-4 w-4 text-amber-500" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              {t.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <Button asChild size="sm" className="rounded-full">
          <Link to="/onboarding">Weitermachen</Link>
        </Button>
      </div>
    </div>
  );
}
