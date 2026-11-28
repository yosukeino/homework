import { NextRequest, NextResponse } from "next/server";
import {
  buildBestRankings,
  getSupabaseAdmin,
  normalizeStudentKey,
  type HomeworkClearRow,
} from "@/lib/supabase";

export interface ClearSubmissionPayload {
  submissionId: string;
  unitSlug: string;
  studentName: string;
  unitName: string;
  targetStreak: number;
  totalAnswered: number;
  missCount: number;
  elapsedSeconds: number;
  elapsedText: string;
  clearedAtIso: string;
  clearedAtDisplay: string;
}

export interface SubmitApiResponse {
  ok: boolean;
  demo?: boolean;
  savedToSupabase?: boolean;
  savedToGas?: boolean;
  rank?: number | null;
  totalPlayers?: number | null;
  error?: string;
}

/**
 * 生徒が20問連続正解を達成した際に呼ばれるサーバーAPIルート。
 * 1. Supabase（SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY）へ安全に記録し、現在の順位を算出
 * 2. GAS_WEB_APP_URL も設定されていれば Googleスプレッドシートへも並行送信（移行期サポート）
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ClearSubmissionPayload>;
    const studentName = String(body.studentName || "").trim();

    if (!studentName) {
      return NextResponse.json<SubmitApiResponse>(
        { ok: false, error: "氏名が入力されていません。" },
        { status: 400 }
      );
    }

    const submissionId = String(body.submissionId || "").trim() || `CLR-${Date.now()}`;
    const unitSlug = String(body.unitSlug || "pronouns").trim().slice(0, 50);
    const unitName = String(body.unitName || "中学英語・人称代名詞").trim().slice(0, 80);
    const targetStreak = Math.max(1, Number(body.targetStreak) || 20);
    const totalAnswered = Math.max(targetStreak, Number(body.totalAnswered) || targetStreak);
    const missCount = Math.max(0, Number(body.missCount) || 0);
    const elapsedSeconds = Math.max(1, Number(body.elapsedSeconds) || 1);
    const elapsedText = String(body.elapsedText || `${elapsedSeconds}秒`).slice(0, 30);
    const clearedAtIso = String(body.clearedAtIso || new Date().toISOString());
    const clearedAtDisplay = String(body.clearedAtDisplay || "");

    const supabase = getSupabaseAdmin();
    const gasUrl = (process.env.GAS_WEB_APP_URL || "").trim();

    if (!supabase && !gasUrl) {
      return NextResponse.json<SubmitApiResponse>({
        ok: true,
        demo: true,
        savedToSupabase: false,
        savedToGas: false,
      });
    }

    let savedToSupabase = false;
    let savedToGas = false;
    let rank: number | null = null;
    let totalPlayers: number | null = null;
    const errors: string[] = [];

    // 1. Supabase への保存 & 最新順位計算
    if (supabase) {
      const row: HomeworkClearRow = {
        submission_id: submissionId,
        unit_slug: unitSlug,
        unit_name: unitName,
        student_name: studentName.slice(0, 40),
        target_streak: targetStreak,
        total_answered: totalAnswered,
        miss_count: missCount,
        elapsed_seconds: elapsedSeconds,
        elapsed_text: elapsedText,
        cleared_at: clearedAtIso,
      };

      const { error: upsertError } = await supabase
        .from("homework_clears")
        .upsert(row, { onConflict: "submission_id", ignoreDuplicates: true });

      if (upsertError) {
        errors.push(`Supabase保存エラー: ${upsertError.message}`);
      } else {
        savedToSupabase = true;

        // 該当単元の最新ランキングから本人の順位を取得
        const { data: unitRows, error: rankError } = await supabase
          .from("homework_clears")
          .select(
            "submission_id, unit_slug, unit_name, student_name, target_streak, total_answered, miss_count, elapsed_seconds, elapsed_text, cleared_at"
          )
          .eq("unit_slug", unitSlug)
          .order("miss_count", { ascending: true })
          .order("elapsed_seconds", { ascending: true })
          .limit(2000);

        if (!rankError && unitRows) {
          const rankings = buildBestRankings(unitRows as HomeworkClearRow[]);
          totalPlayers = rankings.length;
          const myKey = normalizeStudentKey(studentName);
          const myEntry = rankings.find((r) => normalizeStudentKey(r.studentName) === myKey);
          if (myEntry) {
            rank = myEntry.rank;
          }
        }
      }
    }

    // 2. Google Apps Script（設定されている場合のみ並行送信）
    if (gasUrl) {
      try {
        const response = await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            submissionId,
            unitSlug,
            studentName: studentName.slice(0, 40),
            unitName,
            targetStreak,
            totalAnswered,
            missCount,
            elapsedSeconds,
            elapsedText,
            clearedAtIso,
            clearedAtDisplay,
          }),
          redirect: "follow",
          cache: "no-store",
        });

        if (response.ok) {
          const result = (await response.json()) as { ok?: boolean; error?: string };
          if (result?.ok === true) {
            savedToGas = true;
          } else {
            errors.push(result?.error || "GAS保存エラー");
          }
        } else {
          errors.push(`GAS送信エラー (HTTP ${response.status})`);
        }
      } catch (gasErr) {
        errors.push(gasErr instanceof Error ? gasErr.message : "GAS通信エラー");
      }
    }

    // どちらか一方でも成功していれば生徒の提出は完了扱い
    if (savedToSupabase || savedToGas) {
      return NextResponse.json<SubmitApiResponse>({
        ok: true,
        demo: false,
        savedToSupabase,
        savedToGas,
        rank,
        totalPlayers,
      });
    }

    return NextResponse.json<SubmitApiResponse>(
      { ok: false, error: errors.join(" / ") || "保存に失敗しました。" },
      { status: 502 }
    );
  } catch (err) {
    return NextResponse.json<SubmitApiResponse>(
      {
        ok: false,
        error: err instanceof Error ? err.message : "送信中に予期しないエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const supabaseReady = Boolean(getSupabaseAdmin());
  const gasReady = Boolean((process.env.GAS_WEB_APP_URL || "").trim());
  return NextResponse.json({
    ok: true,
    configured: supabaseReady || gasReady,
    supabaseReady,
    gasReady,
  });
}
