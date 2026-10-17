create table if not exists public.editor_projects (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.editor_projects enable row level security;

create policy "Creators can read their own project"
on public.editor_projects for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Creators can create their own project"
on public.editor_projects for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Creators can update their own project"
on public.editor_projects for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Creators can delete their own project"
on public.editor_projects for delete
to authenticated
using ((select auth.uid()) = user_id);

