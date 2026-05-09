import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus, Users, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/communities")({
  component: CommunitiesPage,
});

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  member_count: number;
  is_member: boolean;
};

function CommunitiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Community[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    const { data: communities } = await supabase
      .from("communities")
      .select("id,slug,name,description,cover_url")
      .order("created_at", { ascending: false });
    if (!communities) {
      setItems([]);
      return;
    }
    const enriched = await Promise.all(
      communities.map(async (c) => {
        const [{ count }, membership] = await Promise.all([
          supabase
            .from("community_members")
            .select("*", { count: "exact", head: true })
            .eq("community_id", c.id),
          user
            ? supabase
                .from("community_members")
                .select("user_id")
                .eq("community_id", c.id)
                .eq("user_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        return {
          ...c,
          member_count: count ?? 0,
          is_member: !!membership.data,
        };
      })
    );
    setItems(enriched as Community[]);
  };
  useEffect(() => {
    load();
  }, [user?.id]);

  const toggleJoin = async (c: Community) => {
    if (!user) return navigate({ to: "/login" });
    const isMember = c.is_member;
    if (isMember) {
      const { error } = await supabase.from("community_members").delete().eq("community_id", c.id).eq("user_id", user.id);
      if (error) return toast.error(toUserMessage(error));
      toast.success("Community verlassen.");
    } else {
      const { error } = await supabase.from("community_members").insert({ community_id: c.id, user_id: user.id });
      if (error) return toast.error(toUserMessage(error));
      toast.success("Community beigetreten!");
    }
    load();
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (!slug) return toast.error("Name ungültig");
    const { data, error } = await supabase
      .from("communities")
      .insert({ name, description, slug, created_by: user.id })
      .select()
      .single();
    if (error) return toast.error(toUserMessage(error));
    await supabase.from("community_members").insert({ community_id: data.id, user_id: user.id, role: "owner" });
    toast.success("Community erstellt!");
    setOpen(false);
    setName("");
    setDescription("");
    load();
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communities</h1>
          <p className="mt-1 text-sm text-muted-foreground">Finde Communities für deine Passion</p>
        </div>
        {user && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full" size="sm">
                <Plus className="h-4 w-4" /> Community gründen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Community</DialogTitle>
              </DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cname">Name</Label>
                  <Input id="cname" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cdesc">Beschreibung</Label>
                  <Textarea id="cdesc" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <Button type="submit" className="w-full rounded-full">Erstellen</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mb-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 px-5 py-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-yellow-500">Community-Richtlinien</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Carforms Communities sind ein Ort für Leidenschaft, Respekt und Autokultur.
              Illegale Straßenrennen, illegale Geschäfte sowie Hass, Diskriminierung und
              Belästigung jeglicher Art sind hier absolut nicht toleriert.
              Wer gegen diese Regeln verstößt, wird sofort und dauerhaft gebannt.
            </p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <p className="text-sm text-muted-foreground">Noch keine Communities. Sei die/der Erste!</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const isMember = !!user && c.community_members.some((m) => m.user_id === user.id);
            return (
              <li key={c.id} className="group overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors hover:border-border">
                <Link to="/communities/$slug" params={{ slug: c.slug }} className="block">
                  <div className="aspect-[16/9] w-full overflow-hidden bg-secondary">
                    {c.cover_url ? (
                      <img src={c.cover_url} alt={c.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Users className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="space-y-3 p-5">
                  <div>
                    <Link to="/communities/$slug" params={{ slug: c.slug }} className="text-base font-semibold hover:underline">
                      {c.name}
                    </Link>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {c.community_members.length.toLocaleString("de-DE")} Mitglieder
                    </span>
                    <Button
                      size="sm"
                      variant={isMember ? "secondary" : "default"}
                      className="rounded-full"
                      onClick={() => toggleJoin(c)}
                    >
                      {isMember ? "Mitglied" : "Beitreten"}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
