"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { ClearSubmissionPayload } from "@/app/api/submit/route";
import { CHOICE_LETTERS } from "@/data/pronouns";
import { playSoundEffect } from "@/lib/sound";
import type { DrillDefinition, DrillQuestion } from "@/types/drill";
import { ClearScreen, SubmitStatus } from "./ClearScreen";
import { HintTableModal } from "./HintTableModal";
import { LastAnswerResult, PlayScreen } from "./PlayScreen";
import { StartScreen } from "./StartScreen";

type ScreenPhase = "start" | "play" | "clear";

const STORAGE_SOUND_KEY = "homework_sound_enabled";

function shuffleArray<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatDateTimeJP(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatElapsed(sec: number): string {
  const s = Math.max(1, Math.round(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}分${rem}秒` : `${rem}秒`;
}

function generateSubmissionId(): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  return `CLR-${ts}-${rand}`;
}

interface DrillChallengeAppProps {
  drill: DrillDefinition;
  isGasConfigured: boolean;
}

export function DrillChallengeApp({ drill, isGasConfigured }: DrillChallengeAppProps) {
  const targetStreak = drill.targetStreak;

  const [screen, setScreen] = useState<ScreenPhase>("start");
  const [studentName, setStudentName] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bestStreak, setBestStreak] = useState(0);
  const [hintModalOpen, setHintModalOpen] = useState(false);

  // プレイ状態
  const deckRef = useRef<DrillQuestion[]>([]);
  const lastQuestionIdRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<DrillQuestion | null>(null);
  const [currentChoices, setCurrentChoices] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<LastAnswerResult | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [missCount, setMissCount] = useState(0);

  // クリア・送信状態
  const [clearRecord, setClearRecord] = useState<ClearSubmissionPayload | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("sending");
  const [submitError, setSubmitError] = useState("");
  const isSendingRef = useRef(false);

  useEffect(() => {
    try {
      const savedBest = parseInt(localStorage.getItem(drill.storageKey) || "0", 10);
      if (!Number.isNaN(savedBest)) setBestStreak(savedBest);
      const savedSound = localStorage.getItem(STORAGE_SOUND_KEY);
      if (savedSound === "0") setSoundEnabled(false);
    } catch {
      // ignore
    }
  }, [drill.storageKey]);

  const updateBestStreak = useCallback(
    (nextStreak: number) => {
      setBestStreak((prev) => {
        if (nextStreak <= prev) return prev;
        try {
          localStorage.setItem(drill.storageKey, String(nextStreak));
        } catch {
          // ignore
        }
        return nextStreak;
      });
    },
    [drill.storageKey]
  );

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_SOUND_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      if (next) {
        playSoundEffect("correct", true);
      }
      return next;
    });
  }, []);

  // デッキ式シャッフル出題（同じ問題がすぐ連続しない）
  const drawNextQuestion = useCallback((): DrillQuestion => {
    if (deckRef.current.length === 0) {
      const fresh = shuffleArray(drill.questions);
      if (
        lastQuestionIdRef.current !== null &&
        fresh.length > 1 &&
        fresh[0].id === lastQuestionIdRef.current
      ) {
        const swapIdx = Math.floor(Math.random() * (fresh.length - 1)) + 1;
        [fresh[0], fresh[swapIdx]] = [fresh[swapIdx], fresh[0]];
      }
      deckRef.current = fresh;
    }
    const q = deckRef.current.shift()!;
    lastQuestionIdRef.current = q.id;
    return q;
  }, [drill.questions]);

  const loadNextQuestion = useCallback(() => {
    const q = drawNextQuestion();
    setCurrentQuestion(q);
    setCurrentChoices(shuffleArray(q.choices));
    setAnswered(false);
    setLastResult(null);
    setQuestionIndex((prev) => prev + 1);
  }, [drawNextQuestion]);

  const startChallenge = useCallback(
    (name: string) => {
      setStudentName(name);
      deckRef.current = [];
      lastQuestionIdRef.current = null;
      startedAtRef.current = Date.now();
      setStreak(0);
      setTotalAnswered(0);
      setMissCount(0);
      setClearRecord(null);
      setSubmitError("");
      setHintModalOpen(false);

      const firstQ = drawNextQuestion();
      setCurrentQuestion(firstQ);
      setCurrentChoices(shuffleArray(firstQ.choices));
      setAnswered(false);
      setLastResult(null);
      setQuestionIndex(1);
      setScreen("play");
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [drawNextQuestion]
  );

  const submitClearRecord = useCallback(async (record: ClearSubmissionPayload) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setSubmitStatus("sending");
    setSubmitError("");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });

      const data = (await res.json()) as { ok?: boolean; demo?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `送信エラー (HTTP ${res.status})`);
      }

      setSubmitStatus(data.demo ? "demo" : "ok");
    } catch (err) {
      setSubmitStatus("error");
      setSubmitError(
        err instanceof Error
          ? `${err.message} — 通信状況を確認して再送信してください。`
          : "送信に失敗しました。"
      );
    } finally {
      isSendingRef.current = false;
    }
  }, []);

  const handleSelectChoice = useCallback(
    (choiceIdx: number) => {
      if (answered || !currentQuestion) return;
      const selectedWord = currentChoices[choiceIdx];
      if (selectedWord === undefined) return;

      const isCorrect = selectedWord === currentQuestion.answer;
      setAnswered(true);
      setTotalAnswered((prev) => prev + 1);

      if (isCorrect) {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        updateBestStreak(nextStreak);
        setLastResult({ isCorrect: true, selectedWord, lostStreak: 0 });

        if (nextStreak >= targetStreak) {
          playSoundEffect("clear", soundEnabled);
        } else if (nextStreak % 5 === 0 || nextStreak === targetStreak - 1) {
          playSoundEffect("combo", soundEnabled);
        } else {
          playSoundEffect("correct", soundEnabled);
        }
      } else {
        const lost = streak;
        setStreak(0);
        setMissCount((prev) => prev + 1);
        setLastResult({ isCorrect: false, selectedWord, lostStreak: lost });
        playSoundEffect("wrong", soundEnabled);
      }
    },
    [answered, currentQuestion, currentChoices, streak, targetStreak, soundEnabled, updateBestStreak]
  );

  const handleNext = useCallback(() => {
    if (!answered) return;
    if (streak >= targetStreak) {
      const finishedAt = new Date();
      const elapsedSeconds = Math.max(
        1,
        Math.round((finishedAt.getTime() - startedAtRef.current) / 1000)
      );
      const record: ClearSubmissionPayload = {
        submissionId: generateSubmissionId(),
        studentName,
        unitName: drill.unitName,
        targetStreak,
        totalAnswered,
        missCount,
        elapsedSeconds,
        elapsedText: formatElapsed(elapsedSeconds),
        clearedAtIso: finishedAt.toISOString(),
        clearedAtDisplay: formatDateTimeJP(finishedAt),
      };
      setClearRecord(record);
      setScreen("clear");
      window.scrollTo({ top: 0, behavior: "instant" });
      void submitClearRecord(record);
    } else {
      loadNextQuestion();
    }
  }, [
    answered,
    streak,
    targetStreak,
    studentName,
    drill.unitName,
    totalAnswered,
    missCount,
    submitClearRecord,
    loadNextQuestion,
  ]);

  const openHintIfAllowed = useCallback(() => {
    if (screen === "start") {
      setHintModalOpen(true);
      return;
    }
    if (screen === "play" && answered && lastResult && !lastResult.isCorrect) {
      setHintModalOpen(true);
    }
  }, [screen, answered, lastResult]);

  const handleRequestExit = useCallback(() => {
    if (streak > 0) {
      const ok = window.confirm(
        `現在 ${streak} 問連続正解中です。スタート画面に戻ると記録がリセットされますが、よろしいですか？`
      );
      if (!ok) return;
    }
    setHintModalOpen(false);
    setScreen("start");
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [streak]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hintModalOpen || screen !== "play") return;

      if (!answered) {
        const upper = e.key.toUpperCase();
        const letterIdx = CHOICE_LETTERS.indexOf(upper as (typeof CHOICE_LETTERS)[number]);
        if (letterIdx !== -1 && letterIdx < currentChoices.length) {
          e.preventDefault();
          handleSelectChoice(letterIdx);
          return;
        }
        if (e.key >= "1" && e.key <= "6") {
          const numIdx = parseInt(e.key, 10) - 1;
          if (numIdx < currentChoices.length) {
            e.preventDefault();
            handleSelectChoice(numIdx);
          }
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hintModalOpen, screen, answered, currentChoices.length, handleSelectChoice, handleNext]);

  return (
    <main className="app-shell">
      <AnimatePresence mode="wait">
        {screen === "start" && (
          <StartScreen
            key="start"
            drill={drill}
            bestStreak={bestStreak}
            soundEnabled={soundEnabled}
            isGasConfigured={isGasConfigured}
            onStart={startChallenge}
            onOpenHint={openHintIfAllowed}
            onToggleSound={toggleSound}
          />
        )}

        {screen === "play" && currentQuestion && (
          <PlayScreen
            key="play"
            studentName={studentName}
            targetStreak={targetStreak}
            reviewHintButtonLabel={drill.reviewHintButtonLabel}
            streak={streak}
            totalAnswered={totalAnswered}
            missCount={missCount}
            questionIndex={questionIndex}
            question={currentQuestion}
            choices={currentChoices}
            answered={answered}
            lastResult={lastResult}
            soundEnabled={soundEnabled}
            onSelectChoice={handleSelectChoice}
            onNext={handleNext}
            onOpenReviewHint={openHintIfAllowed}
            onToggleSound={toggleSound}
            onRequestExit={handleRequestExit}
          />
        )}

        {screen === "clear" && clearRecord && (
          <ClearScreen
            key="clear"
            record={clearRecord}
            submitStatus={submitStatus}
            submitError={submitError}
            onRetrySubmit={() => void submitClearRecord(clearRecord)}
            onPlayAgain={() => startChallenge(studentName)}
            onReturnToStart={() => {
              setScreen("start");
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
          />
        )}
      </AnimatePresence>

      <HintTableModal
        open={hintModalOpen}
        kind={drill.hintKind}
        onClose={() => setHintModalOpen(false)}
      />
    </main>
  );
}
