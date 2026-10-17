create table if not exists public.game_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null default 'main',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.game_saves enable row level security;

create policy "Players can read their own saves"
on public.game_saves for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Players can create their own saves"
on public.game_saves for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Players can update their own saves"
on public.game_saves for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Players can delete their own saves"
on public.game_saves for delete
to authenticated
using ((select auth.uid()) = user_id);

