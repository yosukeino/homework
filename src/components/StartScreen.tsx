"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, Volume2, VolumeX } from "lucide-react";
import type { DrillDefinition } from "@/types/drill";
import { MiniRankingCard } from "./MiniRankingCard";

interface StartScreenProps {
  drill: DrillDefinition;
  bestStreak: number;
  soundEnabled: boolean;
  isGasConfigured: boolean;
  onStart: (studentName: string) => void;
  onOpenHint: () => void;
  onToggleSound: () => void;
}

export function StartScreen({
  drill,
  bestStreak,
  soundEnabled,
  isGasConfigured,
  onStart,
  onOpenHint,
  onToggleSound,
}: StartScreenProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = name.trim();
    if (!cleaned) {
      setError("提出確認のため、名前を入力してから開始してください。");
      return;
    }
    setError("");
    onStart(cleaned);
  };

  return (
    <motion.section
      key={`screen-start-${drill.slug}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* 上部ミニマルストリップ */}
      <div className="top-strip">
        <div className="top-strip-left">
          <Link href="/" className="ghost-toggle" style={{ textDecoration: "none" }}>
            <ArrowLeft size={14} />
            <span>単元一覧</span>
          </Link>
          <span className="unit-dot" aria-hidden="true" />
          <span>{drill.grade}</span>
          <span aria-hidden="true">/</span>
          <span className="font-mono">POOL {drill.questions.length}Q</span>
        </div>

        <button type="button" className="ghost-toggle" onClick={onToggleSound}>
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span>効果音 {soundEnabled ? "ON" : "OFF"}</span>
        </button>
      </div>

      {/* メインカバーシート */}
      <div className="sheet start-sheet">
        <div className="start-header">
          <div>
            <div className="eyebrow font-en">{drill.eyebrow}</div>
            <h1 className="start-title">{drill.title}</h1>
            <p className="start-lead">{drill.lead}</p>
          </div>

          <motion.div
            className="target-monogram"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08, duration: 0.28 }}
          >
            <span className="target-monogram-num font-mono">{drill.targetStreak}</span>
            <span className="target-monogram-label">連続正解でクリア</span>
          </motion.div>
        </div>

        <div className="start-body">
          {/* 3列ルールグリッド */}
          <div className="rules-grid">
            <div className="rule-cell">
              <div className="rule-index font-mono">01 / FORMAT</div>
              <p className="rule-heading">全{drill.questions.length}問からランダム6択</p>
              <p className="rule-desc">
                1問ごとに画面が切り替わります。文法ルールと瞬発力の両方を鍛えよう。
              </p>
            </div>

            <div className="rule-cell">
              <div className="rule-index font-mono">02 / CLEAR</div>
              <p className="rule-heading">{drill.targetStreak}問連続で自動提出</p>
              <p className="rule-desc">
                達成した瞬間にクリア記録が先生へ届き、今日の宿題は完了です。
              </p>
            </div>

            <div className="rule-cell">
              <div className="rule-index font-mono">03 / RESET</div>
              <p className="rule-heading is-warn">1ミスで 0問目へリセット</p>
              <p className="rule-desc">
                解答中はヒントなし。間違えた直後だけ「ルール表」で復習できます。
              </p>
            </div>
          </div>

          {/* 氏名入力＋開始 */}
          <form className="entry-form" onSubmit={handleSubmit} noValidate>
            <div>
              <div className="field-head">
                <label htmlFor="student-name-input" className="field-label">
                  氏名
                </label>
                <span className="field-note">提出確認・ランキング表示に使います</span>
              </div>

              <div className="name-row">
                <input
                  id="student-name-input"
                  type="text"
                  className={`name-input${error ? " input-error" : ""}`}
                  maxLength={30}
                  placeholder="例：山田 太郎"
                  autoComplete="name"
                  autoFocus
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setError("");
                  }}
                />

                <button type="submit" className="btn-ink">
                  <span>開始する</span>
                  <ArrowRight size={17} />
                </button>
              </div>

              <p className="error-msg" role="alert">
                {error}
              </p>
            </div>
          </form>

          {/* 下部フッター（ヒントリンク＆端末内ベスト） */}
          <div className="start-footer">
            <button type="button" className="btn-paper-outline" onClick={onOpenHint}>
              <BookOpen size={15} />
              <span>{drill.hintButtonLabel}</span>
            </button>

            <div className="record-stat">
              <span>この端末の最高連続</span>
              <strong className="font-mono">
                {String(bestStreak).padStart(2, "0")} / {drill.targetStreak}
              </strong>
            </div>
          </div>

          {!isGasConfigured && (
            <div className="demo-notice">
              テストモードで動作中（Supabase / GAS の環境変数未設定）
            </div>
          )}

          <MiniRankingCard unitSlug={drill.slug} />
        </div>
      </div>
    </motion.section>
  );
}
