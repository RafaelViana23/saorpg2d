alter table public.game_projects
  add column if not exists status text not null default 'development';

alter table public.game_projects
  drop constraint if exists game_projects_status_check;

alter table public.game_projects
  add constraint game_projects_status_check
  check (status in ('draft', 'development', 'ready'));

