-- ShotGrade — `shotgrade` Postgres 스키마 (동일 Supabase 프로젝트 내 다른 앱과 분리)
-- 실행 전: Dashboard → Settings → API → Exposed schemas 에 `shotgrade` 추가

create extension if not exists "pgcrypto";

create schema if not exists shotgrade;

grant usage on schema shotgrade to postgres, anon, authenticated, service_role;

create table if not exists shotgrade.shots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  image_url text not null,
  grade char(1) not null,
  score integer check (score >= 0 and score <= 100),
  analysis jsonb not null,
  feedback text check (feedback in ('up', 'down')),
  created_at timestamptz default now()
);

create index if not exists idx_shots_user_created on shotgrade.shots (user_id, created_at desc);

alter table shotgrade.shots enable row level security;

drop policy if exists "Users can view own shots" on shotgrade.shots;
drop policy if exists "Users can insert own shots" on shotgrade.shots;
drop policy if exists "Users can update own shots" on shotgrade.shots;

create policy "Users can view own shots"
  on shotgrade.shots for select
  using (auth.uid() = user_id);

create policy "Users can insert own shots"
  on shotgrade.shots for insert
  with check (auth.uid() = user_id);

create policy "Users can update own shots"
  on shotgrade.shots for update
  using (auth.uid() = user_id);

grant select, insert, update, delete on table shotgrade.shots to authenticated;
grant all on table shotgrade.shots to service_role;

alter default privileges in schema shotgrade grant select, insert, update, delete on tables to authenticated;

-- Feedback correction (added 2026-05-05) ─ collect labeled training data
alter table shotgrade.shots
  add column if not exists user_correction jsonb default null;

alter table shotgrade.shots
  add column if not exists prompt_version text default 'v1';

create index if not exists idx_shots_prompt_version
  on shotgrade.shots (prompt_version);

-- Storage: 프로젝트 전역 버킷 `shot-images` (스키마와 무관) — Dashboard 에서 생성·정책 설정

-- 이전에 public.shots 을 썼다면 데이터 이관 후 (선택):
-- drop table if exists public.shots cascade;
