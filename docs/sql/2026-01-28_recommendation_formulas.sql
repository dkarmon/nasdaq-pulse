-- Recommendation formulas + settings
-- Date: 2026-01-28

create extension if not exists "uuid-ossp";

-- Helper: check if current user is admin via profiles.role
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create table if not exists public.recommendation_formulas (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  expression text not null,
  status text not null check (status in ('draft', 'published', 'archived')) default 'draft',
  version integer not null default 1,
  notes jsonb,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recommendation_settings (
  id boolean primary key default true,
  active_formula_id uuid references public.recommendation_formulas(id),
  preview_formula_id uuid references public.recommendation_formulas(id),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- Auto bump version + updated_at on updates
create or replace function public.bump_formula_version()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if coalesce(new.expression, '') <> coalesce(old.expression, '') then
    new.version := coalesce(old.version, 1) + 1;
  else
    new.version := coalesce(old.version, 1);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bump_formula_version on public.recommendation_formulas;
create trigger trg_bump_formula_version
before update on public.recommendation_formulas
for each row
execute function public.bump_formula_version();

alter table public.recommendation_formulas enable row level security;
alter table public.recommendation_settings enable row level security;

-- Policies: published formulas are readable to authenticated users; mutations require admin
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'recommendation_formulas' and policyname = 'select_published_or_admin'
  ) then
    create policy select_published_or_admin
      on public.recommendation_formulas
      for select
      using (status = 'published' or public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'recommendation_formulas' and policyname = 'insert_admin_only'
  ) then
    create policy insert_admin_only
      on public.recommendation_formulas
      for insert
      with check (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'recommendation_formulas' and policyname = 'update_admin_only'
  ) then
    create policy update_admin_only
      on public.recommendation_formulas
      for update
      using (public.is_admin())
      with check (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'recommendation_formulas' and policyname = 'delete_admin_only'
  ) then
    create policy delete_admin_only
      on public.recommendation_formulas
      for delete
      using (public.is_admin());
  end if;
end $$;

-- Settings: read for authenticated, write for admin
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'recommendation_settings' and policyname = 'select_settings_auth'
  ) then
    create policy select_settings_auth
      on public.recommendation_settings
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'recommendation_settings' and policyname = 'update_settings_admin'
  ) then
    create policy update_settings_admin
      on public.recommendation_settings
      for update
      using (public.is_admin())
      with check (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'recommendation_settings' and policyname = 'insert_settings_admin'
  ) then
    create policy insert_settings_admin
      on public.recommendation_settings
      for insert
      with check (public.is_admin());
  end if;
end $$;

-- Seed current hardcoded formula as Acceleration v1 and set active
insert into public.recommendation_formulas (id, name, description, expression, status, version, notes)
values (
  '00000000-0000-0000-0000-000000000001',
  'Acceleration v1',
  'Weighted acceleration across 5D/1M/6M/12M with average growth multiplier',
  '(3*(g1m-g5d)/25 + 2*(g6m-g1m)/150 + (g12m-g6m)/182) * avg(g5d,g1m,g6m,g12m)',
  'published',
  1,
  jsonb_build_object('seeded', true)
)
on conflict (id) do nothing;

insert into public.recommendation_settings (id, active_formula_id, updated_at)
values (true, '00000000-0000-0000-0000-000000000001', now())
on conflict (id) do update set active_formula_id = excluded.active_formula_id, updated_at = now();
