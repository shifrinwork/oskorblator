-- ============================================================
-- ОСКОРБЛЯТОР — Achievements & Referral Schema
-- Выполни в Supabase SQL Editor
-- ============================================================

-- Новые поля в profiles
alter table public.profiles
  add column if not exists referral_code  text unique,
  add column if not exists streak_days    integer not null default 0,
  add column if not exists last_played_date date,
  add column if not exists max_insult_score integer not null default 0,
  add column if not exists pvp_wins       integer not null default 0,
  add column if not exists bot_wins       integer not null default 0,
  add column if not exists bot_games      integer not null default 0,
  add column if not exists active_frame   text not null default 'default';

-- Автогенерация реферального кода при создании профиля
create or replace function public.generate_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := lower(
      substring(md5(new.id::text || new.username || random()::text), 1, 10)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_referral_code on public.profiles;
create trigger trg_referral_code
  before insert on public.profiles
  for each row execute procedure public.generate_referral_code();

-- Обновляем существующие профили без кода
update public.profiles
set referral_code = lower(substring(md5(id::text || username || random()::text), 1, 10))
where referral_code is null;

-- Таблица достижений пользователей
create table if not exists public.user_achievements (
  user_id        uuid references public.profiles(id) on delete cascade,
  achievement_id text not null,
  current_tier   integer not null default 0,
  progress       integer not null default 0,
  unlocked_at    timestamptz,
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

create policy "Achievements viewable by everyone"
  on public.user_achievements for select using (true);

create policy "Users manage own achievements"
  on public.user_achievements for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Реферальная таблица
create table if not exists public.referrals (
  id           uuid primary key default gen_random_uuid(),
  referrer_id  uuid not null references public.profiles(id),
  referred_id  uuid not null references public.profiles(id) unique,
  created_at   timestamptz default now() not null
);

alter table public.referrals enable row level security;

create policy "Referrals visible to referrer"
  on public.referrals for select using (auth.uid() = referrer_id);

create policy "Anyone can insert referral"
  on public.referrals for insert with check (true);

-- RPC: посчитать рефералов
create or replace function public.get_referral_count(uid uuid)
returns integer language sql security definer as $$
  select count(*)::integer from public.referrals where referrer_id = uid;
$$;

-- RPC: найти профиль по реферальному коду
create or replace function public.get_profile_by_ref_code(code text)
returns uuid language sql security definer as $$
  select id from public.profiles where referral_code = code limit 1;
$$;

-- RPC: обновить streak
create or replace function public.update_streak(uid uuid)
returns void language plpgsql security definer as $$
declare
  last_date date;
  today date := current_date;
begin
  select last_played_date into last_date from public.profiles where id = uid;
  if last_date is null or last_date < today - interval '1 day' then
    -- пропустил день — сброс
    if last_date < today - interval '1 day' or last_date is null then
      update public.profiles set streak_days = 1, last_played_date = today where id = uid;
    end if;
  elsif last_date = today - interval '1 day' then
    -- продолжает streak
    update public.profiles set streak_days = streak_days + 1, last_played_date = today where id = uid;
  end if;
  -- если last_date = today — уже засчитано
end;
$$;
