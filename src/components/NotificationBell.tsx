import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

type Actor = { id: string; username: string; display_name: string | null; avatar_url: string | null };

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [actors, setActors] = useState<Record<string, Actor>>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    let active = true;

    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!active) return;
      const list = (data ?? []) as Notification[];
      setItems(list);
      await loadActors(list);
    })();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev].slice(0, 20));
          await loadActors([n]);
          if (n.type === "follow") {
            const actor = n.actor_id ? await fetchActor(n.actor_id) : null;
            toast.success(
              actor ? `${actor.display_name || actor.username} folgt dir jetzt` : "Du hast einen neuen Follower",
            );
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function fetchActor(id: string): Promise<Actor | null> {
    const { data } = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    setActors((m) => ({ ...m, [data.id]: data as Actor }));
    return data as Actor;
  }

  async function loadActors(list: Notification[]) {
    const ids = Array.from(new Set(list.map((n) => n.actor_id).filter(Boolean) as string[]));
    if (!ids.length) return;
    const missing = ids.filter((id) => !actors[id]);
    if (!missing.length) return;
    const { data } = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url")
      .in("id", missing);
    if (data) {
      setActors((m) => {
        const next = { ...m };
        for (const a of data as Actor[]) next[a.id] = a;
        return next;
      });
    }
  }

  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    if (!user || unread === 0) return;
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
  }

  if (!user) return null;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) markAllRead();
      }}
    >
      <DropdownMenuTrigger className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground outline-none">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2 text-sm font-semibold">Benachrichtigungen</div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Keine Benachrichtigungen.</p>
          ) : (
            <ul>
              {items.map((n) => {
                const actor = n.actor_id ? actors[n.actor_id] : null;
                return (
                  <li key={n.id} className={n.read_at ? "" : "bg-accent/40"}>
                    <Link
                      to={actor ? "/profile/$username" : "/"}
                      params={actor ? { username: actor.username } : undefined as never}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={actor?.avatar_url ?? undefined} />
                        <AvatarFallback>{(actor?.username?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          <span className="font-semibold">{actor?.display_name || actor?.username || "Jemand"}</span>{" "}
                          {n.type === "follow" ? "folgt dir jetzt." : "hat etwas getan."}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatTime(n.created_at)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return `vor ${d} Tag${d === 1 ? "" : "en"}`;
}
