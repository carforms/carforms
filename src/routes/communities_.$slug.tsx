import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, ImagePlus, Loader2, MessageCircle, Paperclip, Pencil, Send, Shield, Trash2, UserMinus, Users, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/communities_/$slug")({
  component: CommunityDetail,
});

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_by: string | null;
};

type Member = {
  user_id: string;
  role: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

type Post = {
  id: string;
  title: string | null;
  image_url: string | null;
  created_at: string;
  profiles: { username: string } | null;
};

type Message = {
  id: string;
  body: string | null;
  created_at: string;
  user_id: string;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  profiles: { username: string; avatar_url: string | null } | null;
};

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

function isImageType(mime: string | null): boolean {
  return !!mime && mime.startsWith("image/");
}

function formatBytes(bytes: number | null): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CommunityDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const isAdmin = !!user && !!community && community.created_by === user.id;
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  const loadMembers = async () => {
    if (!community) return;
    const { data } = await supabase
      .from("community_members")
      .select("user_id, role")
      .eq("community_id", community.id);
    if (!data) return;
    const enriched = await Promise.all(
      data.map(async (m) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", m.user_id)
          .maybeSingle();
        return { ...m, profiles: profile ?? null } as Member;
      })
    );
    setMembers(enriched);
  };

  const saveMeta = async () => {
    if (!community || !isAdmin) return;
    setSavingMeta(true);
    let cover_url = community.cover_url;
    if (editCoverFile) {
      const ext = editCoverFile.name.split(".").pop() || "jpg";
      const path = `${community.id}/cover-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("communities")
        .upload(path, editCoverFile, { contentType: editCoverFile.type, upsert: true });
      if (upErr) {
        setSavingMeta(false);
        return toast.error(toUserMessage(upErr));
      }
      const { data: pub } = supabase.storage.from("communities").getPublicUrl(path);
      cover_url = pub.publicUrl;
    }
    const { error } = await supabase
      .from("communities")
      .update({ name: editName.trim() || community.name, cover_url })
      .eq("id", community.id);
    setSavingMeta(false);
    if (error) return toast.error(toUserMessage(error));
    toast.success("Community aktualisiert");
    setEditOpen(false);
    setEditCoverFile(null);
    load();
  };

  const kickMember = async (memberUserId: string) => {
    if (!community || !isAdmin) return;
    if (memberUserId === user?.id) return toast.error("Du kannst dich nicht selbst kicken.");
    const { error } = await supabase
      .from("community_members")
      .delete()
      .eq("community_id", community.id)
      .eq("user_id", memberUserId);
    if (error) return toast.error(toUserMessage(error));
    toast.success("Mitglied entfernt.");
    loadMembers();
    load();
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase.from("community_messages").delete().eq("id", messageId);
    if (error) return toast.error(toUserMessage(error));
    toast.success("Nachricht gelöscht.");
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const load = async () => {
    const { data: c } = await supabase
      .from("communities")
      .select("id,slug,name,description,cover_url,created_by")
      .eq("slug", slug)
      .maybeSingle();
    if (!c) throw notFound();
    setCommunity(c as Community);

    const [{ data: p }, { count }, { data: m }] = await Promise.all([
      supabase
        .from("posts")
        .select("id,title,image_url,created_at,profiles:profiles!posts_author_id_fkey(username)")
        .eq("community_id", c.id)
        .order("created_at", { ascending: false }),
      supabase.from("community_members").select("*", { count: "exact", head: true }).eq("community_id", c.id),
      user
        ? supabase.from("community_members").select("user_id").eq("community_id", c.id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setPosts((p as unknown as Post[]) ?? []);
    setMemberCount(count ?? 0);
    setIsMember(!!m);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user?.id]);

  const toggleJoin = async () => {
    if (!user || !community) return;
    if (isMember) {
      const { error } = await supabase.from("community_members").delete().eq("community_id", community.id).eq("user_id", user.id);
      if (error) return toast.error(toUserMessage(error));
      toast.success("Community verlassen.");
    } else {
      const { error } = await supabase.from("community_members").insert({ community_id: community.id, user_id: user.id });
      if (error) return toast.error(toUserMessage(error));
      toast.success("Community beigetreten!");
    }
    load();
  };

  const loadMessages = async () => {
    if (!community) return;
    const { data } = await supabase
      .from("community_messages")
      .select("id,body,created_at,user_id,attachment_url,attachment_type,attachment_name,attachment_size")
      .eq("community_id", community.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (!data) return;

    const enriched = await Promise.all(
      data.map(async (msg) => {
        if (!msg.user_id) return { ...msg, user_id: "", profiles: null };
        const { data: profile } = await supabase
          .from("profiles")
          .select("username,avatar_url")
          .eq("id", msg.user_id)
          .maybeSingle();
        return { ...msg, user_id: msg.user_id, profiles: profile ?? null };
      })
    );
    setMessages(enriched as Message[]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  useEffect(() => {
    if (!chatOpen || !community) return;
    loadMessages();
    const channel = supabase
      .channel("community-chat-" + community.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_messages",
          filter: "community_id=eq." + community.id,
        },
        () => loadMessages()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, community?.id]);

  const pickFile = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("Datei darf maximal 10 MB groß sein.");
      return;
    }
    setPendingFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPendingPreview(url);
    } else {
      setPendingPreview(null);
    }
  };

  const clearPending = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async () => {
    if (!user || !community) return;
    const text = newMessage.trim();
    if (!text && !pendingFile) return;

    let attachment_url: string | null = null;
    let attachment_type: string | null = null;
    let attachment_name: string | null = null;
    let attachment_size: number | null = null;

    if (pendingFile) {
      setUploading(true);
      const ext = pendingFile.name.split(".").pop() || "bin";
      const path = `${user.id}/${community.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("chat-attachments")
        .upload(path, pendingFile, { contentType: pendingFile.type, upsert: false });
      if (upErr) {
        setUploading(false);
        return toast.error(toUserMessage(upErr));
      }
      const { data: pub } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      attachment_url = pub.publicUrl;
      attachment_type = pendingFile.type || "application/octet-stream";
      attachment_name = pendingFile.name;
      attachment_size = pendingFile.size;
      setUploading(false);
    }

    const { error } = await supabase.from("community_messages").insert({
      community_id: community.id,
      user_id: user.id,
      body: text || null,
      attachment_url,
      attachment_type,
      attachment_name,
      attachment_size,
    });
    if (error) return toast.error(toUserMessage(error));
    setNewMessage("");
    clearPending();
  };

  if (!community) return <main className="mx-auto max-w-4xl p-8 text-sm text-muted-foreground">Lade…</main>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="aspect-[3/1] w-full bg-secondary">
          {community.cover_url ? (
            <img src={community.cover_url} alt={community.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Users className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{community.name}</h1>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Shield className="h-3 w-3" /> Admin
                </span>
              )}
            </div>
            {community.description && <p className="mt-1 text-sm text-muted-foreground">{community.description}</p>}
            <p className="mt-2 text-xs text-muted-foreground">{memberCount.toLocaleString("de-DE")} Mitglieder</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Dialog open={membersOpen} onOpenChange={(o) => { setMembersOpen(o); if (o) loadMembers(); }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Users className="h-4 w-4" /> Mitglieder
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Mitglieder verwalten</DialogTitle></DialogHeader>
                    <ul className="max-h-80 space-y-2 overflow-y-auto">
                      {members.map((m) => (
                        <li key={m.user_id} className="flex items-center gap-3 rounded-lg border border-border/60 p-2">
                          <Avatar className="h-8 w-8">
                            {m.profiles?.avatar_url && <AvatarImage src={m.profiles.avatar_url} alt={m.profiles.username} />}
                            <AvatarFallback className="text-xs">{m.profiles?.username?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">@{m.profiles?.username ?? "user"}</p>
                            <p className="text-xs text-muted-foreground">{m.role}</p>
                          </div>
                          {m.user_id !== user?.id && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => kickMember(m.user_id)}>
                              <UserMinus className="h-4 w-4" /> Kicken
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </DialogContent>
                </Dialog>
                <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (o) { setEditName(community.name); setEditCoverFile(null); } }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Pencil className="h-4 w-4" /> Bearbeiten
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Community bearbeiten</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cname">Name</Label>
                        <Input id="cname" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={60} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ccover">Cover-Bild (Thumbnail)</Label>
                        <Input id="ccover" type="file" accept="image/*" onChange={(e) => setEditCoverFile(e.target.files?.[0] ?? null)} />
                      </div>
                      <Button onClick={saveMeta} disabled={savingMeta} className="w-full rounded-full">
                        {savingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            <Button onClick={toggleJoin} variant={isMember ? "secondary" : "default"} className="rounded-full">
              {isMember ? "Mitglied" : "Beitreten"}
            </Button>
          </div>
        </div>
      </div>

      {isMember && (
        <button
          type="button"
          onClick={() => setChatOpen(!chatOpen)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
        >
          <MessageCircle className="h-4 w-4" />
          {chatOpen ? "Chat schließen" : "Community Chat"}
          {!chatOpen && messages.length > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-[10px] font-bold text-foreground">
              {messages.length > 99 ? "99+" : messages.length}
            </span>
          )}
        </button>
      )}

      {isMember && chatOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm sm:hidden"
            onClick={() => setChatOpen(false)}
            aria-hidden="true"
          />
          <section className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border/60 bg-card shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold truncate">{community.name} — Chat</h2>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="ml-2 rounded-full p-1 hover:bg-accent"
                aria-label="Chat schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
              {messages.length === 0 && (
                <div className="m-auto flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                  <MessageCircle className="h-8 w-8 opacity-40" />
                  <p>Noch keine Nachrichten.<br />Starte die Konversation!</p>
                </div>
              )}
            {messages.map((msg) => {
              const isOwn = msg.user_id === user?.id;
              return (
                <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                  <Avatar className="h-8 w-8 shrink-0">
                    {msg.profiles?.avatar_url && <AvatarImage src={msg.profiles.avatar_url} alt={msg.profiles.username} />}
                    <AvatarFallback className="text-xs">
                      {msg.profiles?.username?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex max-w-[75%] flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                    {!isOwn && (
                      <span className="px-1 text-xs text-muted-foreground">@{msg.profiles?.username ?? "user"}</span>
                    )}
                    {msg.attachment_url && (
                      isImageType(msg.attachment_type) ? (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-2xl border border-border/60 bg-background"
                        >
                          <img
                            src={msg.attachment_url}
                            alt={msg.attachment_name ?? "Anhang"}
                            className="max-h-64 w-auto max-w-full object-cover"
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={msg.attachment_name ?? undefined}
                          className="flex max-w-[260px] items-center gap-2 rounded-2xl border border-border/60 bg-background px-3 py-2 text-xs hover:bg-secondary/60"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{msg.attachment_name ?? "Datei"}</p>
                            <p className="text-[10px] text-muted-foreground">{formatBytes(msg.attachment_size)}</p>
                          </div>
                        </a>
                      )
                    )}
                    {msg.body && (
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-secondary text-secondary-foreground rounded-tl-sm"
                        }`}
                      >
                        {msg.body}
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {(isOwn || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(msg.id)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Nachricht löschen"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {user ? (
            <div className="border-t border-border/60 p-3">
              {pendingFile && (
                <div className="mb-2 flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 p-2">
                  {pendingPreview ? (
                    <img src={pendingPreview} alt={pendingFile.name} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{pendingFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(pendingFile.size)}</p>
                  </div>
                  <Button
                    type="button"
                    onClick={clearPending}
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 rounded-full"
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.txt,.zip"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  size="icon"
                  variant="ghost"
                  className="rounded-full shrink-0"
                  disabled={uploading}
                  aria-label="Datei anhängen"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Nachricht schreiben..."
                  className="flex-1 rounded-full border border-border/60 bg-background px-4 py-2 text-sm outline-none focus:border-border"
                  disabled={uploading}
                />
                <Button
                  onClick={sendMessage}
                  size="icon"
                  className="rounded-full shrink-0"
                  disabled={uploading || (!newMessage.trim() && !pendingFile)}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 border-t border-border/60 p-4 text-center">
              <p className="text-sm text-muted-foreground">Melde dich an um zu chatten</p>
              <Button asChild size="sm" className="rounded-full">
                <Link to="/login">Anmelden</Link>
              </Button>
            </div>
          )}
          </section>
        </>
      )}

      <h2 className="mt-10 mb-4 text-lg font-semibold">Beiträge</h2>
      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Beiträge in dieser Community.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <Link to="/post/$postId" params={{ postId: p.id }} className="block hover:opacity-90 transition-opacity">
                {p.image_url && <img src={p.image_url} alt={p.title ?? ""} className="aspect-square w-full object-cover" />}
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{p.title ?? "Beitrag"}</p>
                  {p.profiles && (
                    <span className="text-xs text-muted-foreground">@{p.profiles.username}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
