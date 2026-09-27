-- Theraply — table des données du dashboard.
-- À exécuter une fois dans Supabase : SQL Editor > New query > coller > Run.

create table if not exists public.dashboard_data (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Seuls les utilisateurs connectés (comptes créés dans Authentication > Users)
-- peuvent lire et modifier les données.
alter table public.dashboard_data enable row level security;

create policy "Lecture par les membres connectés" on public.dashboard_data
  for select to authenticated using (true);
create policy "Création par les membres connectés" on public.dashboard_data
  for insert to authenticated with check (true);
create policy "Modification par les membres connectés" on public.dashboard_data
  for update to authenticated using (true) with check (true);
create policy "Suppression par les membres connectés" on public.dashboard_data
  for delete to authenticated using (true);
