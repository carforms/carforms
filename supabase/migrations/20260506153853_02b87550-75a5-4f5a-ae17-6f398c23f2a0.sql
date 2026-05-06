
-- Roles enum + table
create type public.app_role as enum ('admin','moderator','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  bio text,
  location text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'user',
  unique (user_id, role)
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  cover_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  community_id uuid references public.communities(id) on delete set null,
  image_url text,
  title text,
  body text,
  created_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- has_role security definer
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- handle_new_user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  i int := 0;
begin
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1),
    'user_' || substr(new.id::text, 1, 8)
  );
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  if length(base_username) < 3 then base_username := 'user_' || substr(new.id::text, 1, 8); end if;
  final_username := base_username;
  while exists(select 1 from public.profiles where username = final_username) loop
    i := i + 1; final_username := base_username || i::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', final_username),
    new.raw_user_meta_data->>'avatar_url'
  );

  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.follows enable row level security;

-- profiles
create policy "profiles readable by all" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- user_roles
create policy "users read own roles" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- communities
create policy "communities readable by all" on public.communities for select using (true);
create policy "auth users create communities" on public.communities for insert with check (auth.uid() = created_by);
create policy "creator updates community" on public.communities for update using (auth.uid() = created_by);
create policy "creator deletes community" on public.communities for delete using (auth.uid() = created_by);

-- community_members
create policy "members readable by all" on public.community_members for select using (true);
create policy "users join communities" on public.community_members for insert with check (auth.uid() = user_id);
create policy "users leave communities" on public.community_members for delete using (auth.uid() = user_id);

-- posts
create policy "posts readable by all" on public.posts for select using (true);
create policy "auth users create posts" on public.posts for insert with check (auth.uid() = author_id);
create policy "authors update posts" on public.posts for update using (auth.uid() = author_id);
create policy "authors delete posts" on public.posts for delete using (auth.uid() = author_id);

-- post_likes
create policy "likes readable by all" on public.post_likes for select using (true);
create policy "users like" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "users unlike" on public.post_likes for delete using (auth.uid() = user_id);

-- post_comments
create policy "comments readable by all" on public.post_comments for select using (true);
create policy "users comment" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "users edit own comment" on public.post_comments for update using (auth.uid() = user_id);
create policy "users delete own comment" on public.post_comments for delete using (auth.uid() = user_id);

-- follows
create policy "follows readable by all" on public.follows for select using (true);
create policy "users follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "users unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- Storage buckets
insert into storage.buckets (id, name, public) values
  ('avatars','avatars',true),
  ('posts','posts',true),
  ('communities','communities',true)
on conflict (id) do nothing;

create policy "Public read avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users upload own avatar" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users update own avatar" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own avatar" on storage.objects for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Public read posts media" on storage.objects for select using (bucket_id = 'posts');
create policy "Users upload own post media" on storage.objects for insert with check (bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own post media" on storage.objects for delete using (bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Public read communities media" on storage.objects for select using (bucket_id = 'communities');
create policy "Users upload community media" on storage.objects for insert with check (bucket_id = 'communities' and auth.role() = 'authenticated');

-- Indexes
create index idx_posts_created on public.posts(created_at desc);
create index idx_posts_author on public.posts(author_id);
create index idx_posts_community on public.posts(community_id);
create index idx_comments_post on public.post_comments(post_id);
create index idx_members_user on public.community_members(user_id);
