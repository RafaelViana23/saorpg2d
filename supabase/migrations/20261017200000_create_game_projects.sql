create extension if not exists pgcrypto;

create table if not exists public.game_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Novo jogo',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_projects_user_updated_idx
  on public.game_projects (user_id, updated_at desc);

alter table public.game_projects enable row level security;

create policy "Creators can read their games"
on public.game_projects for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Creators can create games"
on public.game_projects for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Creators can update their games"
on public.game_projects for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Creators can delete their games"
on public.game_projects for delete to authenticated
using ((select auth.uid()) = user_id);

insert into public.game_projects (user_id, name, data, created_at, updated_at)
select
  user_id,
  coalesce(nullif(data->>'name', ''), 'Projeto Aincrad'),
  data,
  updated_at,
  updated_at
from public.editor_projects
where data ? 'maps';

