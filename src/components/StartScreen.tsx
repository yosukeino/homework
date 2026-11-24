"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Flame, Sparkles, Trophy, Volume2, VolumeX } from "lucide-react";

interface StartScreenProps {
  targetStreak: number;
  totalPoolCount: number;
  bestStreak: number;
  soundEnabled: boolean;
  isGasConfigured: boolean;
  onStart: (studentName: string) => void;
  onOpenHint: () => void;
  onToggleSound: () => void;
}

export function StartScreen({
  targetStreak,
  totalPoolCount,
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
      setError("名前を入力してからスタートしてください。");
      return;
    }
    setError("");
    onStart(cleaned);
  };

  return (
    <motion.section
      key="screen-start"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="card">
        <div className="start-hero">
          <motion.div
            className="hero-badge"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.06, type: "spring", stiffness: 320, damping: 22 }}
          >
            <Sparkles size={14} />
            <span>中学英語 オンライン宿題</span>
          </motion.div>

          <h1 className="start-title">
            人称代名詞
            <br />
            <span className="highlight">{targetStreak}問連続正解</span>チャレンジ
          </h1>
          <p className="start-subtitle">
            全{totalPoolCount}問からランダム出題！1問ずつクリアして宿題を終わらせよう
          </p>
        </div>

        <div className="rules-box">
          <p className="rules-title">
            <Flame size={15} color="#ea580c" />
            <span>ルール</span>
          </p>
          <ul className="rules-list">
            <li>
              <span className="rule-num">1</span>
              <span>毎回ランダムに出る問題に、6つの選択肢から答えよう。</span>
            </li>
            <li>
              <span className="rule-num">2</span>
              <span>
                <strong>{targetStreak}問連続で正解</strong>すると宿題クリア！自動で先生に提出されます。
              </span>
            </li>
            <li>
              <span className="rule-num">3</span>
              <span>
                1問でも間違えると <strong className="rule-danger">0問目からやり直し</strong>{" "}
                になります。（間違えた時だけ「変化表」で復習できます）
              </span>
            </li>
          </ul>
        </div>

        <form className="name-form" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="student-name-input" className="field-label">
              あなたの名前を入力してください<small>（提出確認に使います）</small>
            </label>
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
            <p className="error-msg" role="alert">
              {error}
            </p>
          </div>

          <motion.button
            type="submit"
            className="btn-primary-lg"
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>チャレンジ開始！</span>
            <ArrowRight size={19} />
          </motion.button>

          <motion.button
            type="button"
            className="btn-hint-outline"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            onClick={onOpenHint}
          >
            <BookOpen size={16} />
            <span>挑戦前に「人称代名詞の変化表」を確認する</span>
          </motion.button>
        </form>

        <div className="start-footer-meta">
          <span className="best-streak-pill">
            <Trophy size={14} color="#d97706" />
            <span>
              この端末の最高連続記録：{bestStreak} / {targetStreak}問
            </span>
          </span>
          <button type="button" className="btn-icon-ghost" onClick={onToggleSound}>
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>効果音：{soundEnabled ? "ON" : "OFF"}</span>
          </button>
        </div>

        {!isGasConfigured && (
          <div className="demo-notice">
            ※現在テストモードで動作中です（環境変数 GAS_WEB_APP_URL 未設定）。このまま全機能を体験できます。
          </div>
        )}
      </div>
    </motion.section>
  );
}
