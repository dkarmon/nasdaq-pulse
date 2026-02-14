-- ABOUTME: Adds per-exchange active formula IDs for recommendation settings.
-- ABOUTME: Backfills NASDAQ/TLV formula IDs from legacy active_formula_id.

alter table public.recommendation_settings
  add column if not exists active_formula_nasdaq_id uuid references public.recommendation_formulas(id),
  add column if not exists active_formula_tlv_id uuid references public.recommendation_formulas(id);

insert into public.recommendation_settings (
  id,
  active_formula_id,
  active_formula_nasdaq_id,
  active_formula_tlv_id,
  updated_at
)
values (
  true,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  now()
)
on conflict (id) do update
set
  active_formula_id = coalesce(
    public.recommendation_settings.active_formula_id,
    public.recommendation_settings.active_formula_nasdaq_id,
    excluded.active_formula_id
  ),
  active_formula_nasdaq_id = coalesce(
    public.recommendation_settings.active_formula_nasdaq_id,
    public.recommendation_settings.active_formula_id,
    excluded.active_formula_nasdaq_id
  ),
  active_formula_tlv_id = coalesce(
    public.recommendation_settings.active_formula_tlv_id,
    public.recommendation_settings.active_formula_id,
    excluded.active_formula_tlv_id
  ),
  updated_at = now();
