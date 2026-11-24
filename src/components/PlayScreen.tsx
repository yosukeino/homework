"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Flame,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
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

function getCaseTagClass(caseType: PronounCaseType): string {
  switch (caseType) {
    case "主格":
      return "tag-subject";
    case "所有格":
      return "tag-possessive";
    case "目的格":
      return "tag-object";
    case "所有代名詞":
      return "tag-poss-pronoun";
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
  const isHot = streak >= Math.ceil(targetStreak * 0.5) && !isReach;
  const nextStreakNum = streak + 1;

  let progressMsg = `${targetStreak}問連続正解でクリア`;
  if (streak > 0) {
    if (remaining === 0) {
      progressMsg = `${targetStreak}問連続正解を達成`;
    } else if (remaining === 1) {
      progressMsg = "FINAL — あと1問正解で宿題クリア";
    } else if (remaining <= 5) {
      progressMsg = `ゴール目前・残り ${remaining} 問`;
    } else if (isHot) {
      progressMsg = `後半戦・残り ${remaining} 問`;
    } else {
      progressMsg = `残り ${remaining} 問連続正解でクリア`;
    }
  }

  let milestoneMessage = "";
  if (answered && lastResult?.isCorrect) {
    if (streak === 5) milestoneMessage = "5問連続突破 — いいリズムです";
    else if (streak === 10) milestoneMessage = "10問連続達成 — ちょうど折り返し";
    else if (streak === 15) milestoneMessage = "15問連続 — ゴールまであと5問";
    else if (streak === targetStreak - 1) milestoneMessage = "リーチ — 次の1問に正解すれば宿題クリア";
  }

  return (
    <motion.section
      key="screen-play"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
    >
      {/* 上部ミニマルヘッダー＋精密20マストラック */}
      <header className="play-header">
        <div className="play-topbar">
          <div className="play-topbar-left">
            <button
              type="button"
              className="ghost-toggle"
              onClick={onRequestExit}
              title="トップへ戻る"
            >
              <ArrowLeft size={14} />
              <span>終了</span>
            </button>
            <span className="player-tag">{studentName}</span>
          </div>

          <div className="play-topbar-right">
            <button
              type="button"
              className="ghost-toggle"
              onClick={onToggleSound}
              aria-label="効果音切替"
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>{soundEnabled ? "音ON" : "音OFF"}</span>
            </button>

            <div
              className={`streak-readout${
                isReach ? " is-reach" : isHot ? " is-hot" : ""
              }`}
              aria-live="polite"
            >
              <span className="streak-readout-label font-mono">STREAK</span>
              <span style={{ display: "inline-flex", overflow: "hidden", height: "22px" }}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={streak}
                    className="streak-readout-num font-mono"
                    initial={{ y: streak === 0 ? -18 : 18, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: streak === 0 ? 18 : -18, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  >
                    {String(streak).padStart(2, "0")}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="streak-readout-total font-mono">/ {targetStreak}</span>
            </div>
          </div>
        </div>

        {/* 5問区切りの精密20マストラック */}
        <div className="streak-track-wrap">
          <div
            className="streak-track"
            style={{ gridTemplateColumns: `repeat(${targetStreak}, 1fr)` }}
            aria-label="連続正解ゲージ"
          >
            {Array.from({ length: targetStreak }).map((_, idx) => {
              const filled = idx < streak;
              const isCurrent = idx === streak && !answered;
              const isGroupEnd = (idx + 1) % 5 === 0 && idx + 1 < targetStreak;
              const fillTier =
                streak >= Math.ceil(targetStreak * 0.75)
                  ? " tier-high"
                  : streak >= Math.ceil(targetStreak * 0.5)
                    ? " tier-mid"
                    : "";

              return (
                <div
                  key={idx}
                  className={`streak-cell${isCurrent ? " is-current" : ""}${
                    isGroupEnd ? " group-gap" : ""
                  }`}
                >
                  {filled && (
                    <motion.div
                      className={`streak-cell-fill${fillTier}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      style={{ originX: 0 }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="streak-meta">
            <span className={`streak-meta-status${isReach ? " is-reach" : ""}`}>
              {progressMsg}
            </span>
            <span className="font-mono">
              解答 {totalAnswered} / ミス {missCount}
            </span>
          </div>
        </div>
      </header>

      {/* 1問1画面ステージ */}
      <AnimatePresence mode="wait">
        <motion.article
          key={questionIndex}
          className={`sheet question-stage${
            answered
              ? lastResult?.isCorrect
                ? " state-correct"
                : " state-wrong"
              : ""
          }`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="stage-head">
            <span
              className={`stage-kicker${
                !answered && nextStreakNum === targetStreak
                  ? " is-reach"
                  : !answered && nextStreakNum >= Math.ceil(targetStreak * 0.75)
                    ? " is-hot"
                    : ""
              }`}
            >
              {answered
                ? lastResult?.isCorrect
                  ? `STEP ${String(streak).padStart(2, "0")} CLEARED`
                  : "STREAK RESET"
                : nextStreakNum === targetStreak
                  ? `FINAL QUESTION (${nextStreakNum} / ${targetStreak})`
                  : `STEP ${String(nextStreakNum).padStart(2, "0")} / ${targetStreak}`}
            </span>

            <span className="stage-qnum font-mono">
              Q.{String(answered ? totalAnswered : totalAnswered + 1).padStart(2, "0")}
            </span>
          </div>

          <AnimatePresence>
            {milestoneMessage && (
              <motion.div
                className="milestone-strip"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Flame size={15} />
                <span>{milestoneMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 英文・日本語訳 */}
          <div className="prompt-area">
            <div className="en-sentence">
              {question.before && <span>{question.before}</span>}
              <motion.span
                key={answered ? "revealed" : "blank"}
                className={`blank-slot${
                  answered
                    ? lastResult?.isCorrect
                      ? " is-correct"
                      : " is-wrong"
                    : ""
                }`}
                initial={answered ? { y: -4, opacity: 0.4 } : false}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.18 }}
              >
                {answered ? question.answer : "\u00A0"}
              </motion.span>
              {question.after && <span>{question.after}</span>}
            </div>
            <p className="ja-translation">{question.ja}</p>
          </div>

          {/* 6択キートップボタン */}
          <div className="choices-grid" role="group" aria-label="選択肢">
            {choices.map((word, idx) => {
              let btnClass = "choice-key";
              let animateProps: { x?: number[]; scale?: number[] } = {};

              if (answered && lastResult) {
                const isPicked = lastResult.selectedWord === word;
                const isAnswer = word === question.answer;
                if (isPicked && lastResult.isCorrect) {
                  btnClass += " state-correct-picked";
                  animateProps = { scale: [1, 1.03, 1] };
                } else if (isPicked && !lastResult.isCorrect) {
                  btnClass += " state-wrong-picked";
                  animateProps = { x: [0, -5, 5, -3, 3, 0] };
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
                  animate={animateProps}
                  transition={{ duration: 0.28 }}
                  onClick={() => onSelectChoice(idx)}
                >
                  <span className="keycap">{CHOICE_LETTERS[idx]}</span>
                  <span>{word}</span>
                </motion.button>
              );
            })}
          </div>

          {/* 回答後フィードバック＆次へ */}
          <AnimatePresence>
            {answered && lastResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className={`feedback-callout ${lastResult.isCorrect ? "is-ok" : "is-ng"}`}
                  aria-live="polite"
                >
                  <div className="feedback-head">
                    {lastResult.isCorrect ? (
                      <span className="judge-text is-ok">
                        <Check size={17} strokeWidth={3} />
                        <span>
                          {streak >= targetStreak
                            ? `${targetStreak}問連続正解を達成！`
                            : `正解（連続 ${streak} 問目）`}
                        </span>
                      </span>
                    ) : (
                      <>
                        <span className="judge-text is-ng">
                          <X size={17} strokeWidth={3} />
                          <span>不正解</span>
                        </span>
                        <span className="correct-answer-pill">{question.answer}</span>
                      </>
                    )}

                    <span className={`case-tag ${getCaseTagClass(question.caseType)}`}>
                      {question.caseType}
                    </span>
                  </div>

                  {!lastResult.isCorrect && (
                    <p className="reset-note">
                      {lastResult.lostStreak > 0
                        ? `連続 ${lastResult.lostStreak} 問でストップ。記録は 0 にリセットされました。`
                        : "記録は 0 のままです。解説と変化表を確認してから再挑戦しましょう。"}
                    </p>
                  )}

                  <p className="explanation-body">{question.explanation}</p>
                </div>

                <div ref={actionsRef} className="stage-actions">
                  {/* 間違えた直後のみ「変化表」を開放 */}
                  {!lastResult.isCorrect && (
                    <button
                      type="button"
                      className="btn-paper-outline"
                      onClick={onOpenReviewHint}
                    >
                      <BookOpen size={15} />
                      <span>人称代名詞の変化表で復習する</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={lastResult.isCorrect ? "btn-brand" : "btn-retry-solid"}
                    onClick={onNext}
                  >
                    {lastResult.isCorrect ? (
                      streak >= targetStreak ? (
                        <>
                          <span>クリア証明書を表示して提出する</span>
                          <ArrowRight size={17} />
                        </>
                      ) : (
                        <>
                          <span>次の問題へ（{streak + 1} / {targetStreak}）</span>
                          <ArrowRight size={17} />
                        </>
                      )
                    ) : (
                      <>
                        <RotateCcw size={16} />
                        <span>1問目から再挑戦する</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="kbd-footer">
            <span>
              キー操作：<span className="kbd-chip">A</span>–<span className="kbd-chip">F</span>
              または <span className="kbd-chip">1</span>–<span className="kbd-chip">6</span> で選択
            </span>
            <span>
              <span className="kbd-chip">Enter</span> で次へ
            </span>
          </div>
        </motion.article>
      </AnimatePresence>
    </motion.section>
  );
}
