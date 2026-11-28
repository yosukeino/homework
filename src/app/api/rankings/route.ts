import { NextRequest, NextResponse } from "next/server";
import {
  buildBestRankings,
  getSupabaseAdmin,
  type HomeworkClearRow,
  type RankingEntry,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

export interface RankingsApiResponse {
  ok: boolean;
  configured: boolean;
  unitSlug: string;
  rankings: RankingEntry[];
  totalPlayers: number;
  totalClears: number;
  error?: string;
}

/**
 * 単元ごとのリアルタイムランキングを取得するAPI
 * GET /api/rankings?unit=pronouns&limit=50
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const unitSlug = (searchParams.get("unit") || "pronouns").trim();
  const limitParam = parseInt(searchParams.get("limit") || "50", 10);
  const limit = Number.isNaN(limitParam) ? 50 : Math.min(Math.max(limitParam, 1), 100);

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json<RankingsApiResponse>(
      {
        ok: true,
        configured: false,
        unitSlug,
        rankings: [],
        totalPlayers: 0,
        totalClears: 0,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const { data, error } = await supabase
      .from("homework_clears")
      .select(
        "submission_id, unit_slug, unit_name, student_name, target_streak, total_answered, miss_count, elapsed_seconds, elapsed_text, cleared_at"
      )
      .eq("unit_slug", unitSlug)
      .order("miss_count", { ascending: true })
      .order("elapsed_seconds", { ascending: true })
      .order("cleared_at", { ascending: true })
      .limit(2000);

    if (error) {
      return NextResponse.json<RankingsApiResponse>(
        {
          ok: false,
          configured: true,
          unitSlug,
          rankings: [],
          totalPlayers: 0,
          totalClears: 0,
          error: error.message,
        },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const rows = (data || []) as HomeworkClearRow[];
    const allRankings = buildBestRankings(rows);

    return NextResponse.json<RankingsApiResponse>(
      {
        ok: true,
        configured: true,
        unitSlug,
        rankings: allRankings.slice(0, limit),
        totalPlayers: allRankings.length,
        totalClears: rows.length,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json<RankingsApiResponse>(
      {
        ok: false,
        configured: true,
        unitSlug,
        rankings: [],
        totalPlayers: 0,
        totalClears: 0,
        error: err instanceof Error ? err.message : "ランキングの取得に失敗しました。",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
