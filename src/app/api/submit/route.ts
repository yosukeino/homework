import { NextRequest, NextResponse } from "next/server";

export interface ClearSubmissionPayload {
  submissionId: string;
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

/**
 * 生徒が20問連続正解を達成した際に呼ばれるサーバーAPIルート。
 * Vercelの環境変数 GAS_WEB_APP_URL に設定された Google Apps Script へ安全に転送します。
 * （クライアント側へ GAS URL を露出させず、CORS問題も発生しません）
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ClearSubmissionPayload>;
    const studentName = String(body.studentName || "").trim();

    if (!studentName) {
      return NextResponse.json(
        { ok: false, error: "氏名が入力されていません。" },
        { status: 400 }
      );
    }

    const gasUrl = (process.env.GAS_WEB_APP_URL || "").trim();

    // GAS URL 未設定時はデモモードとして正常応答を返す
    if (!gasUrl) {
      return NextResponse.json({
        ok: true,
        demo: true,
        message: "GAS_WEB_APP_URL 未設定のためテストモードで完了しました。",
      });
    }

    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        submissionId: String(body.submissionId || ""),
        studentName: studentName.slice(0, 40),
        unitName: String(body.unitName || "中学英語・人称代名詞").slice(0, 60),
        targetStreak: Number(body.targetStreak) || 20,
        totalAnswered: Number(body.totalAnswered) || 20,
        missCount: Number(body.missCount) || 0,
        elapsedSeconds: Number(body.elapsedSeconds) || 0,
        elapsedText: String(body.elapsedText || "").slice(0, 30),
        clearedAtIso: String(body.clearedAtIso || new Date().toISOString()),
        clearedAtDisplay: String(body.clearedAtDisplay || ""),
      }),
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `GAS送信エラー (HTTP ${response.status})` },
        { status: 502 }
      );
    }

    const result = (await response.json()) as { ok?: boolean; error?: string; duplicate?: boolean };
    if (!result || result.ok !== true) {
      return NextResponse.json(
        { ok: false, error: result?.error || "スプレッドシート側でエラーが発生しました。" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      demo: false,
      duplicate: Boolean(result.duplicate),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "送信中に予期しないエラーが発生しました。" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const configured = Boolean((process.env.GAS_WEB_APP_URL || "").trim());
  return NextResponse.json({ ok: true, configured });
}
