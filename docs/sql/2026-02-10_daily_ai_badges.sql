-- ABOUTME: Daily AI badge runs for top-25 formula-recommended stocks (per exchange).
-- ABOUTME: Stores the per-day membership ("badge set") and points to the underlying stock_analyses rows.

create table if not exists public.daily_ai_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  exchange text not null check (exchange in ('nasdaq', 'tlv')),
  formula_id uuid null,
  formula_version int null,
  trigger text not null check (trigger in ('cron', 'formula_change', 'manual')),
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  status text not null check (status in ('running', 'ok', 'partial', 'failed')) default 'running',
  error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_daily_ai_runs_exchange_date
  on public.daily_ai_runs (exchange, run_date);

create table if not exists public.daily_ai_badges (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.daily_ai_runs(id) on delete cascade,
  symbol text not null,
  recommendation text not null check (recommendation in ('buy', 'hold', 'sell')),
  analysis_id uuid not null references public.stock_analyses(id) on delete restrict,
  generated_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_daily_ai_badges_run_symbol
  on public.daily_ai_badges (run_id, symbol);

create index if not exists idx_daily_ai_badges_symbol
  on public.daily_ai_badges (symbol);

alter table public.daily_ai_runs enable row level security;
alter table public.daily_ai_badges enable row level security;

-- RLS Policies: public read. Writes are expected to use service role.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'daily_ai_runs' and policyname = 'select_daily_ai_runs_public'
  ) then
    create policy select_daily_ai_runs_public
      on public.daily_ai_runs
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'daily_ai_badges' and policyname = 'select_daily_ai_badges_public'
  ) then
    create policy select_daily_ai_badges_public
      on public.daily_ai_badges
      for select
      using (true);
  end if;
end $$;

