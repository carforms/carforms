create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  actor_id uuid,
  type text not null,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "users read own notifications"
on public.notifications for select
using (auth.uid() = user_id);

create policy "users update own notifications"
on public.notifications for update
using (auth.uid() = user_id);

create policy "users delete own notifications"
on public.notifications for delete
using (auth.uid() = user_id);

-- Trigger: insert notification on new follow
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follower_id <> new.following_id then
    insert into public.notifications (user_id, actor_id, type)
    values (new.following_id, new.follower_id, 'follow');
  end if;
  return new;
end;
$$;

create trigger follows_notify
after insert on public.follows
for each row execute function public.notify_on_follow();

-- Realtime
alter publication supabase_realtime add table public.notifications;
