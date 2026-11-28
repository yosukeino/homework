import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface HomeworkClearRow {
  id?: string;
  submission_id: string;
  unit_slug: string;
  unit_name: string;
  student_name: string;
  target_streak: number;
  total_answered: number;
  miss_count: number;
  elapsed_seconds: number;
  elapsed_text: string;
  cleared_at: string;
}

export interface RankingEntry {
  rank: number;
  studentName: string;
  missCount: number;
  elapsedSeconds: number;
  elapsedText: string;
  totalAnswered: number;
  clearCount: number;
  clearedAt: string;
  submissionId: string;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL || "").trim() &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = (process.env.SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function isAnyStorageConfigured(): boolean {
  return isSupabaseConfigured() || Boolean((process.env.GAS_WEB_APP_URL || "").trim());
}

/**
 * 同一人物判定用の名前正規化（前後空白除去・全角/半角スペース統一）
 */
export function normalizeStudentKey(name: string): string {
  return name
    .trim()
    .replace(/[\s\u3000]+/g, " ")
    .toLowerCase();
}

/**
 * クリア履歴の行配列から、同名ごと自己ベスト1件のランキングを算出する
 * 順位基準：ノーミス優先（miss_count昇順）→ 最速タイム順（elapsed_seconds昇順）→ 達成日時順
 */
export function buildBestRankings(rows: HomeworkClearRow[]): RankingEntry[] {
  const bestByStudent = new Map<
    string,
    { best: HomeworkClearRow; count: number }
  >();

  for (const row of rows) {
    const key = normalizeStudentKey(row.student_name);
    if (!key) continue;

    const existing = bestByStudent.get(key);
    if (!existing) {
      bestByStudent.set(key, { best: row, count: 1 });
      continue;
    }

    existing.count += 1;
    if (isBetterRecord(row, existing.best)) {
      existing.best = row;
    }
  }

  const sorted = Array.from(bestByStudent.values()).sort((a, b) =>
    compareRecords(a.best, b.best)
  );

  let currentRank = 0;
  let prevMiss = -1;
  let prevElapsed = -1;

  return sorted.map((item, idx) => {
    const { best, count } = item;
    if (best.miss_count !== prevMiss || best.elapsed_seconds !== prevElapsed) {
      currentRank = idx + 1;
      prevMiss = best.miss_count;
      prevElapsed = best.elapsed_seconds;
    }
    return {
      rank: currentRank,
      studentName: best.student_name,
      missCount: best.miss_count,
      elapsedSeconds: best.elapsed_seconds,
      elapsedText: best.elapsed_text,
      totalAnswered: best.total_answered,
      clearCount: count,
      clearedAt: best.cleared_at,
      submissionId: best.submission_id,
    };
  });
}

function compareRecords(a: HomeworkClearRow, b: HomeworkClearRow): number {
  if (a.miss_count !== b.miss_count) return a.miss_count - b.miss_count;
  if (a.elapsed_seconds !== b.elapsed_seconds) return a.elapsed_seconds - b.elapsed_seconds;
  return new Date(a.cleared_at).getTime() - new Date(b.cleared_at).getTime();
}

function isBetterRecord(candidate: HomeworkClearRow, current: HomeworkClearRow): boolean {
  return compareRecords(candidate, current) < 0;
}
