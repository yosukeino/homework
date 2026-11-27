"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Mic,
  MicOff,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { ClearSubmissionPayload } from "@/app/api/submit/route";
import {
  IRREGULAR_TARGET_STREAK,
  IRREGULAR_VERBS,
  type IrregularVerb,
} from "@/data/irregularVerbs";
import { playSoundEffect } from "@/lib/sound";
import {
  judgeVerbSpeech,
  speakVerbTriplet,
  stopSpeech,
  type VoiceJudgeResult,
} from "@/lib/speech";
import { ClearScreen, SubmitStatus } from "./ClearScreen";
import { IrregularVerbListModal } from "./IrregularVerbListModal";

type ScreenPhase = "start" | "play" | "clear";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface VoiceAnswerOutcome {
  isCorrect: boolean;
  judge: VoiceJudgeResult;
  lostStreak: number;
}

const STORAGE_BEST_KEY = "irregular_voice_20streak_best";
const STORAGE_SOUND_KEY = "homework_sound_enabled";
const UNIT_NAME = "中2〜3英語・不規則動詞（音声リズム）";

function shuffleArray<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
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

interface IrregularVoiceAppProps {
  isGasConfigured: boolean;
}

export function IrregularVoiceApp({ isGasConfigured }: IrregularVoiceAppProps) {
  const targetStreak = IRREGULAR_TARGET_STREAK;

  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [screen, setScreen] = useState<ScreenPhase>("start");
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [studentName, setStudentName] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bestStreak, setBestStreak] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // プレイ状態
  const deckRef = useRef<IrregularVerb[]>([]);
  const lastVerbIdRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const latestAlternativesRef = useRef<string[]>([]);
  const handledResultRef = useRef<boolean>(false);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentVerb, setCurrentVerb] = useState<IrregularVerb | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [micNotice, setMicNotice] = useState("");
  const [answered, setAnswered] = useState(false);
  const [outcome, setOutcome] = useState<VoiceAnswerOutcome | null>(null);
  const [speakingBeat, setSpeakingBeat] = useState<number | null>(null);

  const [streak, setStreak] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [missCount, setMissCount] = useState(0);

  // クリア・送信状態
  const [clearRecord, setClearRecord] = useState<ClearSubmissionPayload | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("sending");
  const [submitError, setSubmitError] = useState("");
  const isSendingRef = useRef(false);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionCtor()));
    try {
      const savedBest = parseInt(localStorage.getItem(STORAGE_BEST_KEY) || "0", 10);
      if (!Number.isNaN(savedBest)) setBestStreak(savedBest);
      const savedSound = localStorage.getItem(STORAGE_SOUND_KEY);
      if (savedSound === "0") setSoundEnabled(false);
    } catch {
      // ignore
    }

    return () => {
      stopSpeech();
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  const updateBestStreak = useCallback((next: number) => {
    setBestStreak((prev) => {
      if (next <= prev) return prev;
      try {
        localStorage.setItem(STORAGE_BEST_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_SOUND_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      if (next) playSoundEffect("correct", true);
      else stopSpeech();
      return next;
    });
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const abortRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const drawNextVerb = useCallback((): IrregularVerb => {
    if (deckRef.current.length === 0) {
      const fresh = shuffleArray(IRREGULAR_VERBS);
      if (
        lastVerbIdRef.current !== null &&
        fresh.length > 1 &&
        fresh[0].id === lastVerbIdRef.current
      ) {
        const swapIdx = Math.floor(Math.random() * (fresh.length - 1)) + 1;
        [fresh[0], fresh[swapIdx]] = [fresh[swapIdx], fresh[0]];
      }
      deckRef.current = fresh;
    }
    const v = deckRef.current.shift()!;
    lastVerbIdRef.current = v.id;
    return v;
  }, []);

  const prepareQuestion = useCallback(
    (verb: IrregularVerb, nextIndex: number) => {
      abortRecognition();
      stopSpeech();
      setSpeakingBeat(null);
      setCurrentVerb(verb);
      setLiveTranscript("");
      setMicNotice("");
      setAnswered(false);
      setOutcome(null);
      setQuestionIndex(nextIndex);
      latestAlternativesRef.current = [];
      handledResultRef.current = false;
    },
    [abortRecognition]
  );

  const startChallenge = useCallback(
    (name: string) => {
      setStudentName(name);
      deckRef.current = [];
      lastVerbIdRef.current = null;
      startedAtRef.current = Date.now();
      setStreak(0);
      setTotalAnswered(0);
      setMissCount(0);
      setClearRecord(null);
      setSubmitError("");
      setModalOpen(false);

      const first = drawNextVerb();
      prepareQuestion(first, 1);
      setScreen("play");
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [drawNextVerb, prepareQuestion]
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
        err instanceof Error ? err.message : "送信に失敗しました。通信状況をご確認ください。"
      );
    } finally {
      isSendingRef.current = false;
    }
  }, []);

  // 音声認識結果を判定して状態を確定
  const evaluateTranscripts = useCallback(
    (alternatives: string[]) => {
      if (!currentVerb || answered || handledResultRef.current) return;

      const nonEmpty = alternatives.map((s) => s.trim()).filter(Boolean);
      if (nonEmpty.length === 0) {
        setMicNotice("声が聞き取れませんでした。もう一度マイクを押して話してください（記録はリセットされません）。");
        return;
      }

      // 1語しか拾えなかった場合（言い途中で途切れた等）はリセットせずに言い直しを促す
      const maxTokens = Math.max(
        ...nonEmpty.map((t) => t.split(/[\s,、。・\-/]+/).filter(Boolean).length)
      );
      if (maxTokens < 2) {
        setMicNotice(
          `「${nonEmpty[0]}」しか聞き取れませんでした。3つ続けて（例：${currentVerb.base}, …, …）話してください。`
        );
        return;
      }

      handledResultRef.current = true;
      const judge = judgeVerbSpeech(currentVerb, nonEmpty);

      setAnswered(true);
      setTotalAnswered((prev) => prev + 1);
      setMicNotice("");

      if (judge.matched) {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        updateBestStreak(nextStreak);
        setOutcome({ isCorrect: true, judge, lostStreak: 0 });

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
        setOutcome({ isCorrect: false, judge, lostStreak: lost });
        playSoundEffect("wrong", soundEnabled);

        // 不正解時は正しい3拍子リズムをお手本再生
        if (soundEnabled) {
          setTimeout(() => {
            speakVerbTriplet(currentVerb, setSpeakingBeat);
          }, 420);
        }
      }
    },
    [currentVerb, answered, streak, targetStreak, soundEnabled, updateBestStreak]
  );

  // マイク録音開始
  const startListening = useCallback(() => {
    if (answered || !currentVerb) return;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechSupported(false);
      return;
    }

    stopSpeech();
    abortRecognition();
    setMicNotice("");
    setLiveTranscript("");
    latestAlternativesRef.current = [];
    handledResultRef.current = false;

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 5;

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event) => {
      const alts: string[] = [];
      let interimDisplay = "";
      let hasFinal = false;

      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          hasFinal = true;
          for (let j = 0; j < res.length; j++) {
            const t = res[j]?.transcript?.trim();
            if (t) alts.push(t);
          }
        } else if (res[0]?.transcript) {
          interimDisplay += res[0].transcript + " ";
        }
      }

      if (alts.length > 0) {
        latestAlternativesRef.current = alts;
        setLiveTranscript(alts[0]);
      } else if (interimDisplay.trim()) {
        latestAlternativesRef.current = [interimDisplay.trim()];
        setLiveTranscript(interimDisplay.trim());
      }

      if (hasFinal && alts.length > 0) {
        setIsListening(false);
        evaluateTranscripts(alts);
      }
    };

    rec.onerror = (event) => {
      setIsListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicNotice("マイクの使用が許可されていません。ブラウザのアドレスバー付近からマイクを許可してください。");
      } else if (event.error === "no-speech") {
        setMicNotice("声が聞こえませんでした。マイクを押してから、はっきりと3語続けて話してください。");
      } else if (event.error !== "aborted") {
        setMicNotice(`音声認識エラー（${event.error}）。もう一度マイクを押してください。`);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      // finalが来ずに終了した場合も、途中結果が取れていれば判定に回す
      if (!handledResultRef.current && latestAlternativesRef.current.length > 0) {
        evaluateTranscripts(latestAlternativesRef.current);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setIsListening(false);
      setMicNotice("マイクの起動に失敗しました。少し待ってからもう一度押してください。");
    }
  }, [answered, currentVerb, abortRecognition, evaluateTranscripts]);

  const handleNext = useCallback(() => {
    if (!answered) return;
    stopSpeech();
    abortRecognition();
    setSpeakingBeat(null);

    if (streak >= targetStreak) {
      const finishedAt = new Date();
      const elapsedSeconds = Math.max(
        1,
        Math.round((finishedAt.getTime() - startedAtRef.current) / 1000)
      );
      const record: ClearSubmissionPayload = {
        submissionId: generateSubmissionId(),
        studentName,
        unitName: UNIT_NAME,
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
      const nextVerb = drawNextVerb();
      prepareQuestion(nextVerb, questionIndex + 1);
    }
  }, [
    answered,
    abortRecognition,
    streak,
    targetStreak,
    studentName,
    totalAnswered,
    missCount,
    submitClearRecord,
    drawNextVerb,
    prepareQuestion,
    questionIndex,
  ]);

  // キーボード操作（Spaceでマイク開始/停止、Enterで次へ）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalOpen || screen !== "play") return;

      if (answered) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        if (isListening) stopRecognition();
        else startListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, screen, answered, isListening, startListening, stopRecognition, handleNext]);

  const handleStartSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = nameInput.trim();
    if (!cleaned) {
      setNameError("提出確認のため、名前を入力してから開始してください。");
      return;
    }
    setNameError("");
    startChallenge(cleaned);
  };

  const handleRequestExit = () => {
    if (streak > 0) {
      const ok = window.confirm(
        `現在 ${streak} 問連続正解中です。スタート画面に戻ると記録がリセットされますが、よろしいですか？`
      );
      if (!ok) return;
    }
    abortRecognition();
    stopSpeech();
    setModalOpen(false);
    setScreen("start");
  };

  const remaining = targetStreak - streak;
  const isReach = streak === targetStreak - 1;
  const isHot = streak >= Math.ceil(targetStreak * 0.5) && !isReach;

  return (
    <main className="app-shell">
      <AnimatePresence mode="wait">
        {screen === "start" && (
          <motion.section
            key="voice-start"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div className="top-strip">
              <div className="top-strip-left">
                <Link href="/" className="ghost-toggle" style={{ textDecoration: "none" }}>
                  <ArrowLeft size={14} />
                  <span>単元一覧</span>
                </Link>
                <span className="unit-dot" aria-hidden="true" />
                <span>中2〜3英語</span>
                <span aria-hidden="true">/</span>
                <span className="font-mono">VOICE RHYTHM 50Q</span>
              </div>
              <button type="button" className="ghost-toggle" onClick={toggleSound}>
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span>効果音 {soundEnabled ? "ON" : "OFF"}</span>
              </button>
            </div>

            <div className="sheet start-sheet">
              <div className="start-header">
                <div>
                  <div className="eyebrow font-en">IRREGULAR VERBS — VOICE RHYTHM</div>
                  <h1 className="start-title">不規則動詞 音声リズムチャレンジ</h1>
                  <p className="start-lead">
                    表示された原形を見て、マイクに向かって「go, went, gone」と3拍子で声に出して答えます。耳と口でリズミカルに覚えよう！
                  </p>
                </div>
                <div className="target-monogram">
                  <span className="target-monogram-num font-mono">{targetStreak}</span>
                  <span className="target-monogram-label">連続正解でクリア</span>
                </div>
              </div>

              <div className="start-body">
                {!speechSupported && (
                  <div className="voice-unsupported-box">
                    <AlertCircle size={18} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 800 }}>
                        お使いのブラウザは音声認識に対応していません
                      </p>
                      <p style={{ margin: "4px 0 8px", fontSize: "12.5px" }}>
                        Google Chrome / Safari / Microsoft Edge で開くか、文字タイル版をお使いください。
                      </p>
                      <Link
                        href="/drills/irregular-tiles"
                        className="btn-paper-outline"
                        style={{ textDecoration: "none", display: "inline-flex" }}
                      >
                        文字タイル版（スペル組み立て）へ移動 &rarr;
                      </Link>
                    </div>
                  </div>
                )}

                <div className="rules-grid">
                  <div className="rule-cell">
                    <div className="rule-index font-mono">01 / SPEAK</div>
                    <p className="rule-heading">原形→過去形→過去分詞を声で回答</p>
                    <p className="rule-desc">
                      画面に go と出たら、マイクを押して「go, went, gone」と3語続けて発声します。
                    </p>
                  </div>
                  <div className="rule-cell">
                    <div className="rule-index font-mono">02 / SMART JUDGE</div>
                    <p className="rule-heading">発音補正＆無音セーフ設計</p>
                    <p className="rule-desc">
                      同音異義語（ate/eight 等）を自動補正。声が拾えなかった時はリセットされません。
                    </p>
                  </div>
                  <div className="rule-cell">
                    <div className="rule-index font-mono">03 / RESET</div>
                    <p className="rule-heading is-warn">1ミスで 0問目へリセット</p>
                    <p className="rule-desc">
                      {targetStreak}問連続で自動提出。間違えた直後はお手本音声と50語リストで復習できます。
                    </p>
                  </div>
                </div>

                <form className="entry-form" onSubmit={handleStartSubmit} noValidate>
                  <div>
                    <div className="field-head">
                      <label htmlFor="voice-name-input" className="field-label">
                        氏名
                      </label>
                      <span className="field-note">クリア時の提出確認に記録されます</span>
                    </div>
                    <div className="name-row">
                      <input
                        id="voice-name-input"
                        type="text"
                        className={`name-input${nameError ? " input-error" : ""}`}
                        maxLength={30}
                        placeholder="例：山田 太郎"
                        autoComplete="name"
                        autoFocus
                        value={nameInput}
                        onChange={(e) => {
                          setNameInput(e.target.value);
                          if (e.target.value.trim()) setNameError("");
                        }}
                      />
                      <button
                        type="submit"
                        className="btn-ink"
                        disabled={!speechSupported}
                        style={!speechSupported ? { opacity: 0.45 } : undefined}
                      >
                        <Mic size={16} />
                        <span>開始する</span>
                      </button>
                    </div>
                    <p className="error-msg" role="alert">
                      {nameError}
                    </p>
                  </div>
                </form>

                <div className="start-footer">
                  <button
                    type="button"
                    className="btn-paper-outline"
                    onClick={() => setModalOpen(true)}
                  >
                    <BookOpen size={15} />
                    <span>挑戦前に「不規則動詞 50語リスト（音声付き）」を確認</span>
                  </button>
                  <div className="record-stat">
                    <span>この端末の最高連続</span>
                    <strong className="font-mono">
                      {String(bestStreak).padStart(2, "0")} / {targetStreak}
                    </strong>
                  </div>
                </div>

                {!isGasConfigured && (
                  <div className="demo-notice">
                    テストモードで動作中（環境変数 GAS_WEB_APP_URL 未設定）
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {screen === "play" && currentVerb && (
          <motion.section
            key="voice-play"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            {/* HUD */}
            <header className="play-header">
              <div className="play-topbar">
                <div className="play-topbar-left">
                  <button type="button" className="ghost-toggle" onClick={handleRequestExit}>
                    <ArrowLeft size={14} />
                    <span>終了</span>
                  </button>
                  <span className="player-tag">{studentName}</span>
                </div>

                <div className="play-topbar-right">
                  <button type="button" className="ghost-toggle" onClick={toggleSound}>
                    {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    <span>{soundEnabled ? "音ON" : "音OFF"}</span>
                  </button>
                  <div
                    className={`streak-readout${
                      isReach ? " is-reach" : isHot ? " is-hot" : ""
                    }`}
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

              <div className="streak-track-wrap">
                <div
                  className="streak-track"
                  style={{ gridTemplateColumns: `repeat(${targetStreak}, 1fr)` }}
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
                            transition={{ duration: 0.2 }}
                            style={{ originX: 0 }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="streak-meta">
                  <span className={`streak-meta-status${isReach ? " is-reach" : ""}`}>
                    {remaining === 1
                      ? "FINAL — あと1問正解で宿題クリア"
                      : `残り ${remaining} 問連続正解でクリア`}
                  </span>
                  <span className="font-mono">
                    解答 {totalAnswered} / ミス {missCount}
                  </span>
                </div>
              </div>
            </header>

            {/* 音声問題カード */}
            <AnimatePresence mode="wait">
              <motion.article
                key={questionIndex}
                className={`sheet question-stage${
                  answered
                    ? outcome?.isCorrect
                      ? " state-correct"
                      : " state-wrong"
                    : ""
                }`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.2 }}
              >
                <div className="stage-head">
                  <span className={`stage-kicker${isReach ? " is-reach" : isHot ? " is-hot" : ""}`}>
                    {answered
                      ? outcome?.isCorrect
                        ? `STEP ${String(streak).padStart(2, "0")} CLEARED`
                        : "STREAK RESET"
                      : `VOICE STEP ${String(streak + 1).padStart(2, "0")} / ${targetStreak}`}
                  </span>
                  <span className="stage-qnum font-mono">
                    Q.{String(answered ? totalAnswered : totalAnswered + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* 3拍子カード（原形 → 過去形 → 過去分詞） */}
                <div className="verb-triplet-grid">
                  <div
                    className={`verb-card verb-card-base${
                      answered
                        ? outcome?.judge.slotMatches[0]
                          ? " is-ok"
                          : " is-ng"
                        : ""
                    }${speakingBeat === 0 ? " is-beat" : ""}`}
                  >
                    <span className="verb-card-label">1拍目・原形</span>
                    <span className="verb-card-word font-en">{currentVerb.base}</span>
                    <span className="verb-card-meaning">{currentVerb.meaning}</span>
                  </div>

                  <div
                    className={`verb-card verb-card-voice-slot${
                      answered
                        ? outcome?.judge.slotMatches[1]
                          ? " is-ok"
                          : " is-ng"
                        : isListening
                          ? " is-listening-slot"
                          : ""
                    }${speakingBeat === 1 ? " is-beat" : ""}`}
                  >
                    <span className="verb-card-label">2拍目・過去形</span>
                    <span className="verb-card-word font-en">
                      {answered ? currentVerb.past : "???"}
                    </span>
                    <span className="verb-card-meaning">
                      {answered
                        ? outcome?.judge.slotMatches[1]
                          ? "OK"
                          : "聞き取りNG"
                        : "声で答えよう"}
                    </span>
                  </div>

                  <div
                    className={`verb-card verb-card-voice-slot${
                      answered
                        ? outcome?.judge.slotMatches[2]
                          ? " is-ok"
                          : " is-ng"
                        : isListening
                          ? " is-listening-slot"
                          : ""
                    }${speakingBeat === 2 ? " is-beat" : ""}`}
                  >
                    <span className="verb-card-label">3拍目・過去分詞</span>
                    <span className="verb-card-word font-en">
                      {answered ? currentVerb.pp : "???"}
                    </span>
                    <span className="verb-card-meaning">
                      {answered
                        ? outcome?.judge.slotMatches[2]
                          ? "OK"
                          : "聞き取りNG"
                        : "声で答えよう"}
                    </span>
                  </div>
                </div>

                {/* マイク操作ステージ（未回答時） */}
                {!answered && (
                  <div className="voice-console">
                    <p className="voice-prompt-guide">
                      マイクを押して{" "}
                      <strong className="font-en">
                        「{currentVerb.base}, ◯◯, ◯◯」
                      </strong>{" "}
                      とリズミカルに3語続けて話そう
                    </p>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      className={`mic-trigger-btn${isListening ? " is-listening" : ""}`}
                      onClick={isListening ? stopRecognition : startListening}
                    >
                      {isListening ? (
                        <>
                          <Square size={22} fill="currentColor" />
                          <span>聞き取り中...（タップで確定）</span>
                        </>
                      ) : (
                        <>
                          <Mic size={24} />
                          <span>マイクを押して話す</span>
                        </>
                      )}
                    </motion.button>

                    {/* リアルタイム認識テキスト表示 */}
                    <div className="transcript-box" aria-live="polite">
                      <span className="transcript-label font-mono">HEARD</span>
                      <span className="transcript-value font-en">
                        {liveTranscript || (isListening ? "Listening..." : "—")}
                      </span>
                    </div>

                    {micNotice && (
                      <div className="mic-notice-banner" role="status">
                        <MicOff size={15} />
                        <span>{micNotice}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 回答後フィードバック */}
                <AnimatePresence>
                  {answered && outcome && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div
                        className={`feedback-callout ${outcome.isCorrect ? "is-ok" : "is-ng"}`}
                      >
                        <div className="feedback-head">
                          {outcome.isCorrect ? (
                            <span className="judge-text is-ok">
                              <Check size={17} strokeWidth={3} />
                              <span>
                                {streak >= targetStreak
                                  ? `${targetStreak}問連続クリア達成！`
                                  : `ナイス発音！（連続 ${streak} 問目）`}
                              </span>
                            </span>
                          ) : (
                            <>
                              <span className="judge-text is-ng">
                                <X size={17} strokeWidth={3} />
                                <span>惜しい！</span>
                              </span>
                              <span className="correct-answer-pill">
                                {currentVerb.base} - {currentVerb.past} - {currentVerb.pp}
                              </span>
                            </>
                          )}
                          <span className="case-tag tag-possessive">{currentVerb.groupLabel}</span>
                          <button
                            type="button"
                            className="ghost-toggle"
                            style={{ marginLeft: "auto" }}
                            onClick={() => speakVerbTriplet(currentVerb, setSpeakingBeat)}
                          >
                            <Volume2 size={14} />
                            <span>お手本を聴く</span>
                          </button>
                        </div>

                        <p className="heard-summary font-en">
                          聞き取った音声：<code>{outcome.judge.matchedTranscript}</code>
                        </p>

                        {!outcome.isCorrect && (
                          <p className="reset-note">
                            {outcome.lostStreak > 0
                              ? `連続 ${outcome.lostStreak} 問でストップ。記録は 0 にリセットされました。`
                              : "記録は 0 のままです。お手本音声を聴いてリズムを確認しよう！"}
                          </p>
                        )}

                        <p className="explanation-body">{currentVerb.tip}</p>
                      </div>

                      <div className="stage-actions">
                        {!outcome.isCorrect && (
                          <button
                            type="button"
                            className="btn-paper-outline"
                            onClick={() => setModalOpen(true)}
                          >
                            <BookOpen size={15} />
                            <span>不規則動詞 50語リスト（音声付き）で復習する</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className={outcome.isCorrect ? "btn-brand" : "btn-retry-solid"}
                          onClick={handleNext}
                        >
                          {outcome.isCorrect ? (
                            streak >= targetStreak ? (
                              <>
                                <span>クリア証明書を表示して提出する</span>
                                <ArrowRight size={17} />
                              </>
                            ) : (
                              <>
                                <span>次の動詞へ（{streak + 1} / {targetStreak}）</span>
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
                    キー操作：<span className="kbd-chip">Space</span> でマイク開始・停止
                  </span>
                  <span>
                    <span className="kbd-chip">Enter</span> で次へ
                  </span>
                </div>
              </motion.article>
            </AnimatePresence>
          </motion.section>
        )}

        {screen === "clear" && clearRecord && (
          <ClearScreen
            key="voice-clear"
            record={clearRecord}
            submitStatus={submitStatus}
            submitError={submitError}
            onRetrySubmit={() => void submitClearRecord(clearRecord)}
            onPlayAgain={() => startChallenge(studentName)}
            onReturnToStart={() => setScreen("start")}
          />
        )}
      </AnimatePresence>

      <IrregularVerbListModal
        open={modalOpen}
        highlightVerbId={screen === "play" && currentVerb ? currentVerb.id : null}
        onClose={() => setModalOpen(false)}
      />
    </main>
  );
}
