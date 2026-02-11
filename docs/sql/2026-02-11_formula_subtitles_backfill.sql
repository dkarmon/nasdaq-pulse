-- ABOUTME: Backfills formula subtitles from legacy name suffixes.
-- ABOUTME: Extracts trailing numeric/slash patterns into description and trims title.

with extracted as (
  select
    id,
    trim(
      regexp_replace(
        name,
        '\s+((?:\d+(?:\.\d+)?)(?:\s*/\s*(?:\d+(?:\.\d+)?))+)\s*$',
        ''
      )
    ) as next_name,
    trim(
      regexp_replace(
        (regexp_match(
          name,
          '\s+((?:\d+(?:\.\d+)?)(?:\s*/\s*(?:\d+(?:\.\d+)?))+)\s*$'
        ))[1],
        '\s*/\s*',
        '/',
        'g'
      )
    ) as next_description
  from public.recommendation_formulas
  where coalesce(trim(description), '') = ''
    and name ~ '\s+((?:\d+(?:\.\d+)?)(?:\s*/\s*(?:\d+(?:\.\d+)?))+)\s*$'
)
update public.recommendation_formulas as rf
set
  name = extracted.next_name,
  description = extracted.next_description
from extracted
where rf.id = extracted.id
  and extracted.next_name <> ''
  and extracted.next_description <> '';
