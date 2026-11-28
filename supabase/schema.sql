-- ============================================================================
-- 中学英語 オンライン宿題（20問連続チャレンジ）Supabase テーブル定義
-- Supabase ダッシュボードの「SQL Editor」に貼り付けて Run を1回押すだけで完了します。
-- ============================================================================

create table if not exists public.homework_clears (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null unique,
  unit_slug text not null,
  unit_name text not null,
  student_name text not null,
  target_streak integer not null default 20,
  total_answered integer not null,
  miss_count integer not null default 0,
  elapsed_seconds integer not null,
  elapsed_text text not null,
  cleared_at timestamptz not null default now()
);

-- 単元ごとのランキング取得（ノーミス優先 → 最速タイム順）を高速化するインデックス
create index if not exists idx_homework_clears_ranking
  on public.homework_clears (unit_slug, miss_count asc, elapsed_seconds asc, cleared_at asc);

create index if not exists idx_homework_clears_unit_student
  on public.homework_clears (unit_slug, student_name);

-- セキュリティ: RLSを有効化し、ブラウザからの直接書き込み・改ざんを禁止
-- （Next.js のサーバー側 API Route のみが Service Role Key で安全に読み書きします）
alter table public.homework_clears enable row level security;
