-- Скорбные Анналы — таблица лучших оскорблений
-- Запусти в Supabase SQL Editor

create table if not exists public.insult_records (
  id         uuid primary key default gen_random_uuid(),
  insult     text not null,
  score      integer not null check (score > 0),
  author_id  uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

alter table public.insult_records enable row level security;

-- Все могут читать (публичные анналы)
create policy "Insult records are public"
  on public.insult_records for select using (true);

-- Авторизованные вставляют только свои
create policy "Users insert own insult records"
  on public.insult_records for insert
  with check (auth.uid() = author_id);

-- Индекс для быстрой выборки по score + created_at
create index if not exists idx_insult_records_score_date
  on public.insult_records (score desc, created_at desc);

-- RPC: топ оскорблений за период (author_id не возвращается намеренно)
create or replace function public.top_insults(
  since timestamptz default '-infinity'::timestamptz,
  lim   int         default 100
) returns table(
  id         uuid,
  insult     text,
  score      integer,
  created_at timestamptz
) language sql security definer as $$
  select id, insult, score, created_at
  from public.insult_records
  where created_at >= since
  order by score desc, created_at desc
  limit lim;
$$;
