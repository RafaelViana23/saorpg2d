create table if not exists public.project_game_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.game_projects(id) on delete cascade,
  slot text not null default 'main',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id, slot)
);

alter table public.project_game_saves enable row level security;

create policy "Players can read saves for their games"
on public.project_game_saves for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Players can create saves for their games"
on public.project_game_saves for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.game_projects
    where id = project_id and game_projects.user_id = (select auth.uid())
  )
);

create policy "Players can update saves for their games"
on public.project_game_saves for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Players can delete saves for their games"
on public.project_game_saves for delete to authenticated
using ((select auth.uid()) = user_id);

insert into public.project_game_saves (user_id, project_id, slot, data, updated_at)
select saves.user_id, projects.id, saves.slot, saves.data, saves.updated_at
from public.game_saves saves
cross join lateral (
  select id from public.game_projects
  where game_projects.user_id = saves.user_id
  order by updated_at asc
  limit 1
) projects
on conflict do nothing;

