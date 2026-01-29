-- ABOUTME: Database migration for AI-powered stock analysis feature.
-- ABOUTME: Creates stock_analyses table and adds AI settings to recommendation_settings.

-- Stock analyses table: stores AI-generated stock analyses
create table if not exists public.stock_analyses (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  recommendation text not null check (recommendation in ('buy', 'hold', 'sell')),
  analysis_en text not null,
  analysis_he text not null,
  news_sources jsonb not null default '[]',
  news_count int not null,
  model_version text not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for efficient lookup of latest analysis by symbol
create index if not exists idx_stock_analyses_symbol_generated
  on public.stock_analyses (symbol, generated_at desc);

-- Enable RLS
alter table public.stock_analyses enable row level security;

-- RLS Policies: public read, authenticated write
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'stock_analyses' and policyname = 'select_analyses_public'
  ) then
    create policy select_analyses_public
      on public.stock_analyses
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'stock_analyses' and policyname = 'insert_analyses_authenticated'
  ) then
    create policy insert_analyses_authenticated
      on public.stock_analyses
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

-- Add AI rate limiting columns to recommendation_settings
alter table public.recommendation_settings
  add column if not exists ai_rate_limit_enabled boolean default false,
  add column if not exists ai_rate_limit_seconds int default 3600;
