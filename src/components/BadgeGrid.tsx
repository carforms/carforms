import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_LABEL, CATEGORY_ORDER, getBadgeIcon, type Badge } from "@/lib/badges";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

type Props = {
  userId: string;
  stats: { posts: number; followers: number; following: number; communities: number };
  variant?: "grid" | "sidebar";
};

type Row = Badge & { earned: boolean };

export function BadgeGrid({ userId, stats, variant = "grid" }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: badges }, { data: earned }] = await Promise.all([
        supabase.from("badges").select("*").order("sort_order", { ascending: true }),
        supabase.from("user_badges").select("badge_id").eq("user_id", userId),
      ]);
      const earnedIds = new Set((earned ?? []).map((r: any) => r.badge_id));
      setRows(((badges ?? []) as Badge[]).map((b) => ({ ...b, earned: earnedIds.has(b.id) })));
    })();
  }, [userId]);

  if (!rows) return null;

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    label: CATEGORY_LABEL[cat] ?? cat,
    items: rows.filter((r) => r.category === cat),
  })).filter((g) => g.items.length > 0);

  if (variant === "sidebar") {
    return (
      <aside className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="text-sm font-bold">Abzeichen</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Meilensteine der Szene.
        </p>
        <div className="mt-4 space-y-5">
          {grouped.map(({ cat, label, items }) => (
            <div key={cat}>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </h3>
              <ul className="space-y-1.5">
                {items.map((b) => (
                  <BadgeRow key={b.id} badge={b} stats={stats} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">Abzeichen</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Sammelbare Meilensteine — vom ersten Post bis zur Local Legend.
      </p>

      <div className="mt-5 space-y-6">
        {grouped.map(({ cat, label, items }) => (
          <div key={cat}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {items.map((b) => (
                <BadgeCell key={b.id} badge={b} stats={stats} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BadgeRow({ badge, stats }: { badge: Row; stats: Props["stats"] }) {
  const Icon = getBadgeIcon(badge.icon_name);
  const progress = getProgress(badge, stats);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent",
            !badge.earned && "opacity-60",
          )}
        >
          <span
            className={cn(
              "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              badge.earned ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            {!badge.earned && (
              <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
                <Lock className="h-2 w-2 text-muted-foreground" />
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">{badge.name}</span>
            {!badge.earned && progress && (
              <span className="mt-0.5 block text-[10px] text-muted-foreground">{progress.label}</span>
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="left" className="w-64">
        <div className="text-sm font-semibold">{badge.name}</div>
        <p className="mt-1 text-xs text-muted-foreground">{badge.description}</p>
      </PopoverContent>
    </Popover>
  );
}

function BadgeCell({ badge, stats }: { badge: Row; stats: Props["stats"] }) {
  const Icon = getBadgeIcon(badge.icon_name);
  const progress = getProgress(badge, stats);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-card p-3 transition-colors hover:bg-accent",
            !badge.earned && "opacity-60",
          )}
        >
          <div
            className={cn(
              "relative flex h-12 w-12 items-center justify-center rounded-full",
              badge.earned
                ? "bg-amber-500/15 text-amber-500"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-6 w-6" strokeWidth={2} />
            {!badge.earned && (
              <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
              </span>
            )}
          </div>
          <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight">
            {badge.name}
          </span>
          {!badge.earned && progress && (
            <div className="w-full">
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min(100, progress.pct)}%` }}
                />
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{progress.label}</div>
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              badge.earned ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">{badge.name}</div>
            <div className="text-xs text-muted-foreground">
              {badge.earned ? "Freigeschaltet" : "Noch gesperrt"}
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm">{badge.description}</p>
      </PopoverContent>
    </Popover>
  );
}

function getProgress(badge: Row, stats: Props["stats"]) {
  if (!badge.threshold_type || !badge.threshold_value) return null;
  const map: Record<string, number> = {
    posts: stats.posts,
    followers: stats.followers,
    following: stats.following,
    communities: stats.communities,
  };
  const current = map[badge.threshold_type];
  if (current === undefined) return null;
  const noun: Record<string, string> = {
    posts: "Beiträge",
    followers: "Follower",
    following: "Folge ich",
    communities: "Communities",
  };
  return {
    pct: (current / badge.threshold_value) * 100,
    label: `${current}/${badge.threshold_value} ${noun[badge.threshold_type] ?? ""}`,
  };
}
