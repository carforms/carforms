# carforms — Plan

Eine dunkle, moderne Community-Plattform für Auto-Enthusiasten (inspiriert von den hochgeladenen Screenshots). Voll funktional mit Login, eigenen Profilen, Posts (Feed) und Communities.

## Design
- Dunkles Theme (fast schwarz `#0a0a0a`), runde Karten, weiche Glass/Hover-Effekte
- Sans-serif (Inter), Akzentfarbe dezentes Weiß/Hellgrau, später anpassbar
- Logo-Wortmarke „carforms" + CF-Monogramm

## Seitenstruktur (TanStack Routes)
- `/` — Feed (Posts-Stream wie Bild 3) + Top-Header mit Suche
- `/communities` — Community-Karten-Grid (Bild 2) inkl. „Beitreten"/„Mitglied"
- `/communities/$slug` — Community-Detailseite mit Posts
- `/profile/$username` — Profilseite (Bild 1) mit Stats, Bio, Beitragsraster
- `/profile/edit` — Profil bearbeiten
- `/post/new` — Neuen Beitrag erstellen (Bild + Titel)
- `/login`, `/signup`, `/reset-password` — Auth-Seiten
- `/_authenticated` Layout schützt persönliche Routen

## Features (Phase 1)
1. **Auth** (Lovable Cloud): E-Mail/Passwort + Google OAuth
2. **Profile**: Username, Bio, Standort, Avatar; Stats (Posts, Follower, Folgende, Gruppen)
3. **Posts**: Bild-Upload (Storage), Titel, Likes, Kommentare
4. **Communities**: erstellen, beitreten/verlassen, Mitgliederzahl
5. **Feed**: Posts der gefolgten User + beigetretener Communities
6. **Suche**: einfache Volltextsuche (Posts, User, Communities)

## Datenbank (Supabase / Lovable Cloud)
- `profiles` (id ↔ auth.users, username, display_name, bio, location, avatar_url)
- `posts` (id, author_id, community_id?, image_url, title, created_at)
- `post_likes` (post_id, user_id)
- `post_comments` (id, post_id, user_id, body, created_at)
- `communities` (id, slug, name, description, cover_url, created_by)
- `community_members` (community_id, user_id, role)
- `follows` (follower_id, following_id)
- `user_roles` + `has_role()` (für spätere Admin-Funktionen, RLS-sicher)
- Storage-Buckets: `avatars`, `posts`, `communities`
- RLS-Policies auf allen Tabellen; Trigger erstellt Profil bei Signup

## Technik
- TanStack Start + Tailwind + shadcn/ui (bereits vorhanden)
- `createServerFn` + `requireSupabaseAuth` für geschützte Reads/Writes
- Browser-Client für Auth-Listener und Realtime (Likes/Kommentare später)

## Hinweis zur Umsetzung
Phase 1 liefert die komplette UI aller drei Screens + Auth + DB-Schema + Kern-CRUD (Profil, Post erstellen, Community beitreten, Feed). Erweiterungen (Follow-System UI, Realtime, Notifications, Werkstätten/Services aus der Suchleiste) folgen in späteren Iterationen — bitte sag Bescheid, wenn du sie früher willst.

Mit „Approve" starte ich die Implementierung.