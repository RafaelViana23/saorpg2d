drop policy if exists "Players can update saves for their games"
on public.project_game_saves;

create policy "Players can update saves for their games"
on public.project_game_saves for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.game_projects
    where id = project_id and game_projects.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.game_projects
    where id = project_id and game_projects.user_id = (select auth.uid())
  )
);
