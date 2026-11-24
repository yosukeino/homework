"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flame,
  RotateCcw,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import { CHOICE_LETTERS, PronounCaseType, PronounQuestion } from "@/data/pronouns";

export interface LastAnswerResult {
  isCorrect: boolean;
  selectedWord: string;
  lostStreak: number;
}

interface PlayScreenProps {
  studentName: string;
  targetStreak: number;
  streak: number;
  totalAnswered: number;
  missCount: number;
  questionIndex: number;
  question: PronounQuestion;
  choices: string[];
  answered: boolean;
  lastResult: LastAnswerResult | null;
  soundEnabled: boolean;
  onSelectChoice: (index: number) => void;
  onNext: () => void;
  onOpenReviewHint: () => void;
  onToggleSound: () => void;
  onRequestExit: () => void;
}

function getCaseBadgeClass(caseType: PronounCaseType): string {
  switch (caseType) {
    case "主格":
      return "badge-subject";
    case "所有格":
      return "badge-possessive";
    case "目的格":
      return "badge-object";
    case "所有代名詞":
      return "badge-poss-pronoun";
  }
}

export function PlayScreen({
  studentName,
  targetStreak,
  streak,
  totalAnswered,
  missCount,
  questionIndex,
  question,
  choices,
  answered,
  lastResult,
  soundEnabled,
  onSelectChoice,
  onNext,
  onOpenReviewHint,
  onToggleSound,
  onRequestExit,
}: PlayScreenProps) {
  const actionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (answered && actionsRef.current) {
      const timer = setTimeout(() => {
        actionsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 90);
      return () => clearTimeout(timer);
    }
  }, [answered]);

  const remaining = targetStreak - streak;
  const isReach = streak === targetStreak - 1;
  const isHot = streak >= Math.ceil(targetStreak * 0.5);
  const nextStreakNum = streak + 1;

  let progressMsg = `${targetStreak}問連続正解を目指そう！`;
  if (streak > 0) {
    if (remaining === 0) {
      progressMsg = `${targetStreak}問連続正解達成！`;
    } else if (remaining === 1) {
      progressMsg = "リーチ！あと1問正解で宿題クリア！";
    } else if (remaining <= 5) {
      progressMsg = `ゴール目前！あと${remaining}問！`;
    } else if (isHot) {
      progressMsg = `絶好調！折り返し突破（あと${remaining}問）`;
    } else {
      progressMsg = `いいペース！あと${remaining}問連続正解でクリア`;
    }
  }

  let milestoneMessage = "";
  if (answered && lastResult?.isCorrect) {
    if (streak === 5) milestoneMessage = "5問連続突破！この調子でどんどんいこう！";
    else if (streak === 10) milestoneMessage = "10問連続達成！折り返し地点クリア！";
    else if (streak === 15) milestoneMessage = "15問連続！ゴールまであと5問！";
    else if (streak === targetStreak - 1) milestoneMessage = "リーチ！！次の1問に正解すれば宿題クリア！";
  }

  return (
    <motion.section
      key="screen-play"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.24 }}
    >
      {/* 上部HUD */}
      <header className="hud-bar">
        <div className="hud-top">
          <div className="hud-left">
            <button
              type="button"
              className="btn-icon-ghost"
              onClick={onRequestExit}
              title="トップへ戻る"
            >
              <ArrowLeft size={14} />
              <span>戻る</span>
            </button>
            <span className="player-chip">{studentName}</span>
          </div>

          <div className="hud-right">
            <button
              type="button"
              className="btn-icon-ghost"
              onClick={onToggleSound}
              aria-label="効果音切替"
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>{soundEnabled ? "音ON" : "音OFF"}</span>
            </button>

            <motion.div
              key={streak}
              className={`streak-counter${isReach ? " reach" : isHot ? " hot" : ""}`}
              initial={{ scale: 0.88 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 460, damping: 20 }}
              aria-live="polite"
            >
              {(isHot || isReach) && <Flame size={15} />}
              <span>連続</span>
              <span className="streak-num">{streak}</span>
              <span>/ {targetStreak}</span>
            </motion.div>
          </div>
        </div>

        {/* 20マス連続ゲージ */}
        <div
          className="streak-segments"
          style={{ gridTemplateColumns: `repeat(${targetStreak}, 1fr)` }}
          aria-label="連続正解ゲージ"
        >
          {Array.from({ length: targetStreak }).map((_, idx) => {
            const filled = idx < streak;
            const isCurrentTarget = idx === streak && !answered;
            const fillTier =
              streak >= Math.ceil(targetStreak * 0.75)
                ? " tier-high"
                : streak >= Math.ceil(targetStreak * 0.5)
                  ? " tier-mid"
                  : "";

            return (
              <div
                key={idx}
                className={`streak-seg${isCurrentTarget ? " current-target" : ""}`}
              >
                {filled && (
                  <motion.div
                    className={`streak-seg-fill${fillTier}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ type: "spring", stiffness: 360, damping: 24 }}
                    style={{ originX: 0 }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="hud-sub">
          <span>{progressMsg}</span>
          <span>
            総解答：{totalAnswered}問 / ミス：{missCount}回
          </span>
        </div>
      </header>

      {/* 1問1画面の問題ステージ（問題が変わるたびにスライド遷移） */}
      <AnimatePresence mode="wait">
        <motion.article
          key={questionIndex}
          className={`question-stage${
            answered
              ? lastResult?.isCorrect
                ? " state-correct"
                : " state-wrong"
              : ""
          }`}
          initial={{ opacity: 0, x: 26, scale: 0.99 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -24, scale: 0.99 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div className="question-meta-row">
            <span
              className={`challenge-pill${
                !answered && nextStreakNum === targetStreak
                  ? " pill-reach"
                  : !answered && nextStreakNum >= Math.ceil(targetStreak * 0.75)
                    ? " pill-hot"
                    : ""
              }`}
            >
              {answered
                ? lastResult?.isCorrect
                  ? `連続 ${streak} 問目クリア！`
                  : "連続記録リセット"
                : nextStreakNum === targetStreak
                  ? `最終問題！連続 ${nextStreakNum} 問目に挑戦`
                  : `連続 ${nextStreakNum} 問目に挑戦中`}
            </span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink-muted)" }}>
              通算 第 {answered ? totalAnswered : totalAnswered + 1} 問
            </span>
          </div>

          <AnimatePresence>
            {milestoneMessage && (
              <motion.div
                className="milestone-toast"
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
              >
                <Flame size={16} />
                <span>{milestoneMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 英文・日本語訳 */}
          <div className="question-prompt-box">
            <div className="en-sentence">
              {question.before && <span>{question.before}</span>}
              <span className="blank-paren">(</span>
              <motion.span
                key={answered ? "revealed" : "blank"}
                className={`inline-blank${
                  answered
                    ? lastResult?.isCorrect
                      ? " blank-correct"
                      : " blank-revealed"
                    : ""
                }`}
                initial={answered ? { scale: 0.85 } : false}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 20 }}
              >
                {answered ? question.answer : "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
              </motion.span>
              <span className="blank-paren">)</span>
              {question.after && <span>{question.after}</span>}
            </div>
            <p className="ja-translation">{question.ja}</p>
          </div>

          {/* 6択グリッド */}
          <div className="choices-grid" role="group" aria-label="選択肢">
            {choices.map((word, idx) => {
              let btnClass = "choice-btn";
              let animateProps: { x?: number[]; scale?: number[] } = {};

              if (answered && lastResult) {
                const isPicked = lastResult.selectedWord === word;
                const isAnswer = word === question.answer;
                if (isPicked && lastResult.isCorrect) {
                  btnClass += " state-correct-picked";
                  animateProps = { scale: [1, 1.05, 1] };
                } else if (isPicked && !lastResult.isCorrect) {
                  btnClass += " state-wrong-picked";
                  animateProps = { x: [0, -6, 6, -4, 4, 0] };
                } else if (isAnswer && !lastResult.isCorrect) {
                  btnClass += " state-correct-hint";
                } else {
                  btnClass += " locked-neutral";
                }
              }

              return (
                <motion.button
                  key={`${questionIndex}-${idx}-${word}`}
                  type="button"
                  className={btnClass}
                  disabled={answered}
                  whileHover={answered ? undefined : { y: -2 }}
                  whileTap={answered ? undefined : { scale: 0.96 }}
                  animate={animateProps}
                  transition={{ duration: 0.3 }}
                  onClick={() => onSelectChoice(idx)}
                >
                  <span className="choice-letter">{CHOICE_LETTERS[idx]}</span>
                  <span>{word}</span>
                </motion.button>
              );
            })}
          </div>

          {/* 回答後フィードバック & アクション */}
          <AnimatePresence>
            {answered && lastResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <div
                  className={`feedback-box ${
                    lastResult.isCorrect ? "fb-correct" : "fb-wrong"
                  }`}
                  aria-live="polite"
                >
                  <div className="feedback-header">
                    {lastResult.isCorrect ? (
                      <span className="judge-label ok">
                        <CheckCircle2 size={18} />
                        <span>
                          {streak >= targetStreak
                            ? `正解！${targetStreak}問連続達成！！`
                            : `正解！（連続 ${streak} 問目）`}
                        </span>
                      </span>
                    ) : (
                      <>
                        <span className="judge-label ng">
                          <XCircle size={18} />
                          <span>不正解</span>
                        </span>
                        <span className="answer-chip">正解：{question.answer}</span>
                      </>
                    )}
                    <span className={`case-badge ${getCaseBadgeClass(question.caseType)}`}>
                      {question.caseType}
                    </span>
                  </div>

                  {!lastResult.isCorrect && (
                    <p className="reset-notice">
                      {lastResult.lostStreak > 0
                        ? `おしい！連続 ${lastResult.lostStreak} 問まで到達しましたが、0問目にリセットされました。解説を確認して再挑戦しよう！`
                        : "連続記録は 0 問のままです。解説と変化表を確認して再挑戦しよう！"}
                    </p>
                  )}

                  <p className="explanation-text">{question.explanation}</p>
                </div>

                <div ref={actionsRef} className="post-answer-actions">
                  {/* 間違えた時だけ「変化表で復習する」を表示 */}
                  {!lastResult.isCorrect && (
                    <motion.button
                      type="button"
                      className="btn-hint-outline"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={onOpenReviewHint}
                    >
                      <BookOpen size={16} />
                      <span>人称代名詞の変化表で復習する</span>
                    </motion.button>
                  )}

                  <motion.button
                    type="button"
                    className={lastResult.isCorrect ? "btn-next-ok" : "btn-next-retry"}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onNext}
                  >
                    {lastResult.isCorrect ? (
                      streak >= targetStreak ? (
                        <>
                          <span>クリア結果を見る＆先生に提出する</span>
                          <ArrowRight size={18} />
                        </>
                      ) : (
                        <>
                          <span>次の問題へ（連続 {streak + 1} 問目へ）</span>
                          <ArrowRight size={18} />
                        </>
                      )
                    ) : (
                      <>
                        <RotateCcw size={17} />
                        <span>気持ちを切り替えて 1問目から再挑戦</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="kbd-hint">
            キーボード操作：A〜F（または1〜6）で解答 ／ Enterキーで次の問題へ
          </p>
        </motion.article>
      </AnimatePresence>
    </motion.section>
  );
}
