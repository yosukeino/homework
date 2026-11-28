"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import type { RankingsApiResponse } from "@/app/api/rankings/route";
import type { RankingEntry } from "@/lib/supabase";
import { HOMEWORK_UNITS } from "@/lib/units";

interface RankingBoardProps {
  initialUnitSlug: string;
  highlightName?: string;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function normalizeName(name: string): string {
  return name.trim().replace(/[\s\u3000]+/g, " ").toLowerCase();
}

export function RankingBoard({ initialUnitSlug, highlightName = "" }: RankingBoardProps) {
  const validInitial = HOMEWORK_UNITS.some((u) => u.slug === initialUnitSlug)
    ? initialUnitSlug
    : HOMEWORK_UNITS[0].slug;

  const [selectedSlug, setSelectedSlug] = useState(validInitial);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalClears, setTotalClears] = useState(0);

  const selectedUnit =
    HOMEWORK_UNITS.find((u) => u.slug === selectedSlug) || HOMEWORK_UNITS[0];

  const fetchRankings = useCallback(async (slug: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/rankings?unit=${encodeURIComponent(slug)}&limit=50`, {
        cache: "no-store",
      });
      const data = (await res.json()) as RankingsApiResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `取得エラー (HTTP ${res.status})`);
      }
      setConfigured(data.configured);
      setRankings(data.rankings);
      setTotalPlayers(data.totalPlayers);
      setTotalClears(data.totalClears);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ランキングを読み込めませんでした。");
      setRankings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRankings(selectedSlug);
  }, [selectedSlug, fetchRankings]);

  const highlightKey = highlightName ? normalizeName(highlightName) : "";

  return (
    <main className="app-shell">
      <div className="top-strip">
        <div className="top-strip-left">
          <Link href="/" className="ghost-toggle" style={{ textDecoration: "none" }}>
            <ArrowLeft size={14} />
            <span>単元一覧</span>
          </Link>
          <span className="unit-dot" aria-hidden="true" />
          <span>リアルタイム・ランキング</span>
        </div>

        <button
          type="button"
          className="ghost-toggle"
          onClick={() => void fetchRankings(selectedSlug)}
          disabled={loading}
        >
          <RefreshCw size={13} className={loading ? "spin" : undefined} />
          <span>更新</span>
        </button>
      </div>

      <section className="sheet ranking-sheet">
        <header className="ranking-header">
          <div>
            <div className="eyebrow font-en">LEADERBOARD</div>
            <h1 className="portal-title">20問連続クリア ランキング</h1>
            <p className="portal-lead">
              順位基準：<strong>ノーミス優先 → 最速タイム順</strong>（同じ名前は自己ベスト1件のみ掲載）
            </p>
          </div>
        </header>

        {/* 単元切替タブ */}
        <div className="ranking-tabs-bar" role="tablist" aria-label="単元を選択">
          {HOMEWORK_UNITS.map((unit) => {
            const active = unit.slug === selectedSlug;
            return (
              <button
                key={unit.slug}
                type="button"
                role="tab"
                aria-selected={active}
                className={`ranking-unit-tab${active ? " is-active" : ""}`}
                onClick={() => setSelectedSlug(unit.slug)}
              >
                <span className="ranking-tab-grade">{unit.grade}</span>
                <span>{unit.shortTitle}</span>
              </button>
            );
          })}
        </div>

        {/* 単元サマリーバー */}
        <div className="ranking-summary-strip">
          <div className="ranking-stats-group">
            <span className="ranking-stat-item">
              <Users size={14} />
              <span>クリア人数</span>
              <strong className="font-mono">{totalPlayers}人</strong>
            </span>
            <span className="ranking-stat-item">
              <Trophy size={14} />
              <span>累計クリア</span>
              <strong className="font-mono">{totalClears}回</strong>
            </span>
          </div>

          <Link
            href={selectedUnit.href}
            className="btn-ink"
            style={{ textDecoration: "none", padding: "8px 15px", fontSize: "13px" }}
          >
            <span>この単元に挑戦する</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* ランキング本体 */}
        <div className="ranking-body">
          {loading ? (
            <div className="ranking-empty">
              <Loader2 size={22} className="spin" />
              <span>ランキングを読み込んでいます...</span>
            </div>
          ) : !configured ? (
            <div className="ranking-empty">
              <Award size={26} color="var(--ochre)" />
              <p className="ranking-empty-title">Supabase がまだ接続されていません</p>
              <p className="ranking-empty-desc">
                Vercel の環境変数に <code>SUPABASE_URL</code> と{" "}
                <code>SUPABASE_SERVICE_ROLE_KEY</code> を設定し、<code>supabase/schema.sql</code>{" "}
                を実行するとリアルタイムランキングが有効になります。
              </p>
            </div>
          ) : error ? (
            <div className="ranking-empty">
              <p className="ranking-empty-title" style={{ color: "var(--ng)" }}>
                読み込みエラー
              </p>
              <p className="ranking-empty-desc">{error}</p>
            </div>
          ) : rankings.length === 0 ? (
            <div className="ranking-empty">
              <Trophy size={26} color="var(--brand)" />
              <p className="ranking-empty-title">まだクリア記録がありません</p>
              <p className="ranking-empty-desc">
                20問連続正解を達成して、この単元の初代1位を目指そう！
              </p>
            </div>
          ) : (
            <div className="ranking-list">
              {rankings.map((entry, idx) => {
                const isHighlighted =
                  Boolean(highlightKey) && normalizeName(entry.studentName) === highlightKey;
                const medalClass =
                  entry.rank === 1
                    ? " rank-1"
                    : entry.rank === 2
                      ? " rank-2"
                      : entry.rank === 3
                        ? " rank-3"
                        : "";

                return (
                  <motion.div
                    key={`${entry.submissionId}-${idx}`}
                    className={`ranking-row${medalClass}${isHighlighted ? " is-mine" : ""}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(idx * 0.025, 0.35) }}
                  >
                    <div className={`rank-badge font-mono${medalClass}`}>
                      {entry.rank}
                    </div>

                    <div className="ranking-player-info">
                      <div className="ranking-player-name-row">
                        <span className="ranking-player-name">{entry.studentName}</span>
                        {isHighlighted && <span className="mine-chip">あなた</span>}
                        {entry.clearCount > 1 && (
                          <span className="clear-count-chip font-mono">
                            {entry.clearCount}回達成
                          </span>
                        )}
                      </div>
                      <div className="ranking-player-meta font-mono">
                        <span>{formatShortDate(entry.clearedAt)}</span>
                        <span>/ 総解答 {entry.totalAnswered}問</span>
                      </div>
                    </div>

                    <div className="ranking-metrics">
                      {entry.missCount === 0 ? (
                        <span className="nomiss-badge">
                          <ShieldCheck size={12} />
                          <span>NO MISS</span>
                        </span>
                      ) : (
                        <span className="miss-badge font-mono">
                          ミス {entry.missCount}回
                        </span>
                      )}
                      <span className="time-metric font-mono">
                        <Clock size={13} />
                        <span>{entry.elapsedText}</span>
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
