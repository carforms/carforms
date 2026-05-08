import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Users, Plus, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import logoUrl from "@/assets/logo-carforms.jpg";
import { NotificationBell } from "@/components/NotificationBell";

export function Header() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      navigate({ to: "/search", search: { q: q.trim() } });
      setMobileSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/" aria-label="carforms — Startseite" className="flex h-10 shrink-0 items-center">
          <img
            src={logoUrl}
            alt="carforms"
            className="h-10 w-auto rounded-md bg-white object-contain p-1"
          />
        </Link>

        <form
          className="relative ml-2 hidden flex-1 md:block"
          onSubmit={submitSearch}
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche, Services, Werkstätten…"
            className="h-10 w-full rounded-full border border-border/60 bg-card/60 pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-border"
          />
        </form>

        <nav className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Suche öffnen"
            onClick={() => setMobileSearchOpen((v) => !v)}
            className="flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          >
            <Search className="h-5 w-5" />
          </button>

          <Link
            to="/communities"
            className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Community</span>
          </Link>

          {user ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="hidden rounded-full sm:inline-flex"
                onClick={() => navigate({ to: "/post/new" })}
              >
                <Plus className="h-4 w-4" />
                Beitrag
              </Button>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-transparent transition-all hover:ring-border">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback>{profile?.username?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link to="/profile/$username" params={{ username: profile?.username ?? "" }}>
                      <UserIcon className="mr-2 h-4 w-4" /> Mein Profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile/edit">Profil bearbeiten</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="sm:hidden">
                    <Link to="/post/new">Neuer Beitrag</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      navigate({ to: "/" });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Abmelden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button size="sm" className="rounded-full" onClick={() => navigate({ to: "/login" })}>
              Anmelden
            </Button>
          )}
        </nav>
      </div>

      {mobileSearchOpen && (
        <div className="border-t border-border/60 bg-background/95 px-4 py-3 md:hidden">
          <form className="relative" onSubmit={submitSearch}>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Suche, Services, Werkstätten…"
              className="h-10 w-full rounded-full border border-border/60 bg-card/60 pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-border"
            />
          </form>
        </div>
      )}
    </header>
  );
}
