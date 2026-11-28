"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, ShieldCheck, Trophy } from "lucide-react";
import type { RankingsApiResponse } from "@/app/api/rankings/route";
import type { RankingEntry } from "@/lib/supabase";

interface MiniRankingCardProps {
  unitSlug: string;
}

export function MiniRankingCard({ unitSlug }: MiniRankingCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    let active = true;
    fetch(`/api/rankings?unit=${encodeURIComponent(unitSlug)}&limit=5`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data: RankingsApiResponse) => {
        if (!active) return;
        setConfigured(Boolean(data.configured));
        setRankings(data.rankings || []);
        setTotalPlayers(data.totalPlayers || 0);
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [unitSlug]);

  if (!loaded || !configured) return null;

  return (
    <div className="mini-ranking-box">
      <div className="mini-ranking-head">
        <div className="mini-ranking-title">
          <Trophy size={14} color="var(--ochre)" />
          <span>この単元のランキング TOP 5</span>
          {totalPlayers > 0 && (
            <span className="mini-ranking-count font-mono">（{totalPlayers}人クリア）</span>
          )}
        </div>
        <Link
          href={`/rankings?unit=${encodeURIComponent(unitSlug)}`}
          className="mini-ranking-link"
        >
          <span>全順位</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {rankings.length === 0 ? (
        <p className="mini-ranking-empty">
          まだクリア者がいません。ノーミス最速で初代1位を狙おう！
        </p>
      ) : (
        <div className="mini-ranking-list">
          {rankings.map((entry, idx) => (
            <div key={`${entry.submissionId}-${idx}`} className="mini-ranking-row">
              <span
                className={`mini-rank-num font-mono${
                  entry.rank <= 3 ? ` rank-${entry.rank}` : ""
                }`}
              >
                {entry.rank}
              </span>
              <span className="mini-rank-name">{entry.studentName}</span>
              <span className="mini-rank-right">
                {entry.missCount === 0 ? (
                  <span className="nomiss-badge nomiss-sm">
                    <ShieldCheck size={11} />
                    <span>0ミス</span>
                  </span>
                ) : (
                  <span className="miss-badge miss-sm font-mono">
                    {entry.missCount}ミス
                  </span>
                )}
                <span className="mini-rank-time font-mono">
                  <Clock size={11} />
                  <span>{entry.elapsedText}</span>
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
