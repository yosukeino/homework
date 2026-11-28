"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Delete,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { ClearSubmissionPayload, SubmitApiResponse } from "@/app/api/submit/route";
import {
  IRREGULAR_TARGET_STREAK,
  IRREGULAR_VERBS,
  type IrregularVerb,
} from "@/data/irregularVerbs";
import { playSoundEffect } from "@/lib/sound";
import { speakVerbTriplet, stopSpeech } from "@/lib/speech";
import { ClearRankInfo, ClearScreen, SubmitStatus } from "./ClearScreen";
import { IrregularVerbListModal } from "./IrregularVerbListModal";
import { MiniRankingCard } from "./MiniRankingCard";

type ScreenPhase = "start" | "play" | "clear";
type ActiveSlot = "past" | "pp";

interface LetterTile {
  uid: string;
  char: string;
}

interface TileCheckResult {
  isCorrect: boolean;
  pastOk: boolean;
  ppOk: boolean;
  userPast: string;
  userPp: string;
  lostStreak: number;
}

const STORAGE_BEST_KEY = "irregular_tiles_20streak_best";
const STORAGE_SOUND_KEY = "homework_sound_enabled";
const UNIT_NAME = "中2〜3英語・不規則動詞（スペル組み立て）";

const DECOY_POOL = ["a", "e", "i", "o", "u", "r", "n", "t", "d", "s", "g", "h", "k", "l", "w"];

function shuffleArray<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildTilesForWord(word: string, seedPrefix: string): LetterTile[] {
  const letters = word.toLowerCase().split("");
  const decoyCount = word.length <= 4 ? 3 : 2;
  const preferredDecoys = shuffleArray(DECOY_POOL);

  // 紛らわしい母音・子音（r/a/e/o/u/n/t等）をダミーとして2〜3枚混ぜる
  const chosenDecoys: string[] = [];
  for (const ch of preferredDecoys) {
    if (chosenDecoys.length >= decoyCount) break;
    // 全く同じ文字ばかり増えないように調整
    if (chosenDecoys.includes(ch)) continue;
    chosenDecoys.push(ch);
  }

  const allChars = shuffleArray([...letters, ...chosenDecoys]);
  return allChars.map((char, i) => ({
    uid: `${seedPrefix}-${i}-${char}`,
    char,
  }));
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

interface IrregularTilesAppProps {
  isGasConfigured: boolean;
}

export function IrregularTilesApp({ isGasConfigured }: IrregularTilesAppProps) {
  const targetStreak = IRREGULAR_TARGET_STREAK;

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

  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentVerb, setCurrentVerb] = useState<IrregularVerb | null>(null);
  const [pastTiles, setPastTiles] = useState<LetterTile[]>([]);
  const [ppTiles, setPpTiles] = useState<LetterTile[]>([]);
  const [pastPicked, setPastPicked] = useState<string[]>([]);
  const [ppPicked, setPpPicked] = useState<string[]>([]);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot>("past");
  const [answered, setAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<TileCheckResult | null>(null);
  const [speakingBeat, setSpeakingBeat] = useState<number | null>(null);

  const [streak, setStreak] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [missCount, setMissCount] = useState(0);

  // クリア・送信状態
  const [clearRecord, setClearRecord] = useState<ClearSubmissionPayload | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("sending");
  const [submitError, setSubmitError] = useState("");
  const [rankInfo, setRankInfo] = useState<ClearRankInfo | null>(null);
  const isSendingRef = useRef(false);

  useEffect(() => {
    try {
      const savedBest = parseInt(localStorage.getItem(STORAGE_BEST_KEY) || "0", 10);
      if (!Number.isNaN(savedBest)) setBestStreak(savedBest);
      const savedSound = localStorage.getItem(STORAGE_SOUND_KEY);
      if (savedSound === "0") setSoundEnabled(false);
    } catch {
      // ignore
    }
    return () => stopSpeech();
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

  const prepareQuestion = useCallback((verb: IrregularVerb, nextIndex: number) => {
    stopSpeech();
    setSpeakingBeat(null);
    setCurrentVerb(verb);
    setPastTiles(buildTilesForWord(verb.past, `p-${nextIndex}`));
    setPpTiles(buildTilesForWord(verb.pp, `pp-${nextIndex}`));
    setPastPicked([]);
    setPpPicked([]);
    setActiveSlot("past");
    setAnswered(false);
    setLastResult(null);
    setQuestionIndex(nextIndex);
  }, []);

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
      setRankInfo(null);
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
      const data = (await res.json()) as SubmitApiResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `送信エラー (HTTP ${res.status})`);
      }
      if (typeof data.rank === "number" && typeof data.totalPlayers === "number") {
        setRankInfo({ rank: data.rank, totalPlayers: data.totalPlayers });
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

  // タイルをタップして文字を詰める
  const handlePickTile = useCallback(
    (uid: string) => {
      if (answered || !currentVerb) return;

      if (activeSlot === "past") {
        if (pastPicked.includes(uid) || pastPicked.length >= currentVerb.past.length) return;
        const next = [...pastPicked, uid];
        setPastPicked(next);
        // 過去形が埋まったら自動で過去分詞スロットへ移動
        if (next.length >= currentVerb.past.length && ppPicked.length < currentVerb.pp.length) {
          setActiveSlot("pp");
        }
      } else {
        if (ppPicked.includes(uid) || ppPicked.length >= currentVerb.pp.length) return;
        setPpPicked((prev) => [...prev, uid]);
      }
    },
    [answered, currentVerb, activeSlot, pastPicked, ppPicked]
  );

  const handleBackspace = useCallback(() => {
    if (answered) return;
    if (activeSlot === "pp") {
      if (ppPicked.length > 0) {
        setPpPicked((prev) => prev.slice(0, -1));
      } else if (pastPicked.length > 0) {
        setActiveSlot("past");
        setPastPicked((prev) => prev.slice(0, -1));
      }
    } else if (pastPicked.length > 0) {
      setPastPicked((prev) => prev.slice(0, -1));
    }
  }, [answered, activeSlot, pastPicked.length, ppPicked.length]);

  const handleClearActiveSlot = useCallback(() => {
    if (answered) return;
    if (activeSlot === "past") setPastPicked([]);
    else setPpPicked([]);
  }, [answered, activeSlot]);

  const pastWord = currentVerb
    ? pastPicked.map((id) => pastTiles.find((t) => t.uid === id)?.char || "").join("")
    : "";
  const ppWord = currentVerb
    ? ppPicked.map((id) => ppTiles.find((t) => t.uid === id)?.char || "").join("")
    : "";

  const isReadyToCheck = Boolean(
    currentVerb &&
      pastPicked.length === currentVerb.past.length &&
      ppPicked.length === currentVerb.pp.length
  );

  // 判定実行
  const handleCheck = useCallback(() => {
    if (answered || !currentVerb || !isReadyToCheck) return;

    const pastOk = pastWord === currentVerb.past;
    const ppOk = ppWord === currentVerb.pp;
    const isCorrect = pastOk && ppOk;

    setAnswered(true);
    setTotalAnswered((prev) => prev + 1);

    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      updateBestStreak(nextStreak);
      setLastResult({
        isCorrect: true,
        pastOk,
        ppOk,
        userPast: pastWord,
        userPp: ppWord,
        lostStreak: 0,
      });

      if (nextStreak >= targetStreak) {
        playSoundEffect("clear", soundEnabled);
      } else if (nextStreak % 5 === 0 || nextStreak === targetStreak - 1) {
        playSoundEffect("combo", soundEnabled);
      } else {
        playSoundEffect("correct", soundEnabled);
      }

      // 正解直後に「原形 → 過去形 → 過去分詞」をリズミカルに英語読み上げ
      if (soundEnabled) {
        setTimeout(() => {
          speakVerbTriplet(currentVerb, setSpeakingBeat);
        }, 180);
      }
    } else {
      const lost = streak;
      setStreak(0);
      setMissCount((prev) => prev + 1);
      setLastResult({
        isCorrect: false,
        pastOk,
        ppOk,
        userPast: pastWord,
        userPp: ppWord,
        lostStreak: lost,
      });
      playSoundEffect("wrong", soundEnabled);

      // 不正解時も正しいリズムを耳で確認できるよう少し間を置いて再生
      if (soundEnabled) {
        setTimeout(() => {
          speakVerbTriplet(currentVerb, setSpeakingBeat);
        }, 420);
      }
    }
  }, [
    answered,
    currentVerb,
    isReadyToCheck,
    pastWord,
    ppWord,
    streak,
    targetStreak,
    soundEnabled,
    updateBestStreak,
  ]);

  const handleNext = useCallback(() => {
    if (!answered) return;
    stopSpeech();
    setSpeakingBeat(null);

    if (streak >= targetStreak) {
      const finishedAt = new Date();
      const elapsedSeconds = Math.max(
        1,
        Math.round((finishedAt.getTime() - startedAtRef.current) / 1000)
      );
      const record: ClearSubmissionPayload = {
        submissionId: generateSubmissionId(),
        unitSlug: "irregular-tiles",
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

  // PCキーボード入力も文字タイルに連動させる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalOpen || screen !== "play" || !currentVerb) return;

      if (answered) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        setActiveSlot((prev) => (prev === "past" ? "pp" : "past"));
        return;
      }

      if (e.key === "Enter") {
        if (isReadyToCheck) {
          e.preventDefault();
          handleCheck();
        }
        return;
      }

      if (/^[a-zA-Z]$/.test(e.key)) {
        const ch = e.key.toLowerCase();
        const tiles = activeSlot === "past" ? pastTiles : ppTiles;
        const picked = activeSlot === "past" ? pastPicked : ppPicked;
        const match = tiles.find((t) => t.char === ch && !picked.includes(t.uid));
        if (match) {
          e.preventDefault();
          handlePickTile(match.uid);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    modalOpen,
    screen,
    currentVerb,
    answered,
    activeSlot,
    pastTiles,
    ppTiles,
    pastPicked,
    ppPicked,
    isReadyToCheck,
    handlePickTile,
    handleBackspace,
    handleCheck,
    handleNext,
  ]);

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
    stopSpeech();
    setModalOpen(false);
    setScreen("start");
  };

  const activeTiles = activeSlot === "past" ? pastTiles : ppTiles;
  const activePicked = activeSlot === "past" ? pastPicked : ppPicked;

  const remaining = targetStreak - streak;
  const isReach = streak === targetStreak - 1;
  const isHot = streak >= Math.ceil(targetStreak * 0.5) && !isReach;

  return (
    <main className="app-shell">
      <AnimatePresence mode="wait">
        {screen === "start" && (
          <motion.section
            key="tiles-start"
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
                <span className="font-mono">TILE SPELL 50Q</span>
              </div>
              <button type="button" className="ghost-toggle" onClick={toggleSound}>
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span>音声 {soundEnabled ? "ON" : "OFF"}</span>
              </button>
            </div>

            <div className="sheet start-sheet">
              <div className="start-header">
                <div>
                  <div className="eyebrow font-en">IRREGULAR VERBS — TILE SPELLING</div>
                  <h1 className="start-title">不規則動詞 スペル組み立てチャレンジ</h1>
                  <p className="start-lead">
                    文字タイルをタップ（またはキーボード入力）して過去形・過去分詞を完成させます。回答後は英語音声で3変化のリズムを確認できます。
                  </p>
                </div>
                <div className="target-monogram">
                  <span className="target-monogram-num font-mono">{targetStreak}</span>
                  <span className="target-monogram-label">連続正解でクリア</span>
                </div>
              </div>

              <div className="start-body">
                <div className="rules-grid">
                  <div className="rule-cell">
                    <div className="rule-index font-mono">01 / SPELL</div>
                    <p className="rule-heading">文字タイルで過去形・過去分詞を作成</p>
                    <p className="rule-desc">
                      紛らわしいダミー文字も混ざっています。1文字ずつ正確なスペルを組み立てよう。
                    </p>
                  </div>
                  <div className="rule-cell">
                    <div className="rule-index font-mono">02 / AUDIO</div>
                    <p className="rule-heading">英語音声で3拍子リズム定着</p>
                    <p className="rule-desc">
                      判定するとネイティブ音声で「go — went — gone」と読み上げ、音と綴りを同時に覚えます。
                    </p>
                  </div>
                  <div className="rule-cell">
                    <div className="rule-index font-mono">03 / RESET</div>
                    <p className="rule-heading is-warn">1ミスで 0問目へリセット</p>
                    <p className="rule-desc">
                      {targetStreak}問連続で自動提出。間違えた直後だけ「50語音声リスト」で復習できます。
                    </p>
                  </div>
                </div>

                <form className="entry-form" onSubmit={handleStartSubmit} noValidate>
                  <div>
                    <div className="field-head">
                      <label htmlFor="tiles-name-input" className="field-label">
                        氏名
                      </label>
                      <span className="field-note">提出確認・ランキング表示に使います</span>
                    </div>
                    <div className="name-row">
                      <input
                        id="tiles-name-input"
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
                      <button type="submit" className="btn-ink">
                        <span>開始する</span>
                        <ArrowRight size={17} />
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
                    テストモードで動作中（Supabase / GAS の環境変数未設定）
                  </div>
                )}

                <MiniRankingCard unitSlug="irregular-tiles" />
              </div>
            </div>
          </motion.section>
        )}

        {screen === "play" && currentVerb && (
          <motion.section
            key="tiles-play"
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

            {/* メイン問題カード */}
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
                transition={{ duration: 0.2 }}
              >
                <div className="stage-head">
                  <span className={`stage-kicker${isReach ? " is-reach" : isHot ? " is-hot" : ""}`}>
                    {answered
                      ? lastResult?.isCorrect
                        ? `STEP ${String(streak).padStart(2, "0")} CLEARED`
                        : "STREAK RESET"
                      : `STEP ${String(streak + 1).padStart(2, "0")} / ${targetStreak}`}
                  </span>
                  <span className="stage-qnum font-mono">
                    Q.{String(answered ? totalAnswered : totalAnswered + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* 3変化ステージ（原形 → 過去形 → 過去分詞） */}
                <div className="verb-triplet-grid">
                  {/* 1. 原形（出題） */}
                  <div className={`verb-card verb-card-base${speakingBeat === 0 ? " is-beat" : ""}`}>
                    <span className="verb-card-label">1. 原形</span>
                    <span className="verb-card-word font-en">{currentVerb.base}</span>
                    <span className="verb-card-meaning">{currentVerb.meaning}</span>
                  </div>

                  {/* 2. 過去形スロット */}
                  <button
                    type="button"
                    disabled={answered}
                    onClick={() => setActiveSlot("past")}
                    className={`verb-card verb-card-slot${
                      !answered && activeSlot === "past" ? " is-active" : ""
                    }${
                      answered
                        ? lastResult?.pastOk
                          ? " is-ok"
                          : " is-ng"
                        : ""
                    }${speakingBeat === 1 ? " is-beat" : ""}`}
                  >
                    <span className="verb-card-label">
                      2. 過去形
                      {!answered && activeSlot === "past" && (
                        <span className="slot-editing-dot">入力中</span>
                      )}
                    </span>
                    <div className="letter-slots font-en">
                      {currentVerb.past.split("").map((_, i) => {
                        const ch = pastWord[i] || "";
                        return (
                          <span
                            key={i}
                            className={`letter-slot-box${ch ? " is-filled" : ""}`}
                          >
                            {ch}
                          </span>
                        );
                      })}
                    </div>
                    {answered && !lastResult?.pastOk && (
                      <span className="slot-correct-hint font-en">正：{currentVerb.past}</span>
                    )}
                  </button>

                  {/* 3. 過去分詞スロット */}
                  <button
                    type="button"
                    disabled={answered}
                    onClick={() => setActiveSlot("pp")}
                    className={`verb-card verb-card-slot${
                      !answered && activeSlot === "pp" ? " is-active" : ""
                    }${
                      answered
                        ? lastResult?.ppOk
                          ? " is-ok"
                          : " is-ng"
                        : ""
                    }${speakingBeat === 2 ? " is-beat" : ""}`}
                  >
                    <span className="verb-card-label">
                      3. 過去分詞
                      {!answered && activeSlot === "pp" && (
                        <span className="slot-editing-dot">入力中</span>
                      )}
                    </span>
                    <div className="letter-slots font-en">
                      {currentVerb.pp.split("").map((_, i) => {
                        const ch = ppWord[i] || "";
                        return (
                          <span
                            key={i}
                            className={`letter-slot-box${ch ? " is-filled" : ""}`}
                          >
                            {ch}
                          </span>
                        );
                      })}
                    </div>
                    {answered && !lastResult?.ppOk && (
                      <span className="slot-correct-hint font-en">正：{currentVerb.pp}</span>
                    )}
                  </button>
                </div>

                {/* 文字タイルバンク（未回答時のみ表示） */}
                {!answered && (
                  <div className="tile-bank-panel">
                    <div className="tile-bank-head">
                      <span className="tile-bank-label">
                        {activeSlot === "past"
                          ? "「過去形」の文字をタップして組み立てよう"
                          : "「過去分詞」の文字をタップして組み立てよう"}
                      </span>
                      <div className="tile-bank-controls">
                        <button
                          type="button"
                          className="ghost-toggle"
                          onClick={handleBackspace}
                          disabled={activePicked.length === 0 && activeSlot === "past"}
                        >
                          <Delete size={13} />
                          <span>1文字戻す</span>
                        </button>
                        <button
                          type="button"
                          className="ghost-toggle"
                          onClick={handleClearActiveSlot}
                          disabled={activePicked.length === 0}
                        >
                          <span>クリア</span>
                        </button>
                      </div>
                    </div>

                    <div className="letter-tiles-grid">
                      {activeTiles.map((tile) => {
                        const used = activePicked.includes(tile.uid);
                        return (
                          <motion.button
                            key={tile.uid}
                            type="button"
                            disabled={used}
                            whileTap={used ? undefined : { scale: 0.92 }}
                            className={`letter-tile font-en${used ? " is-used" : ""}`}
                            onClick={() => handlePickTile(tile.uid)}
                          >
                            {tile.char}
                          </motion.button>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: "16px" }}>
                      <button
                        type="button"
                        className="btn-brand"
                        disabled={!isReadyToCheck}
                        style={
                          isReadyToCheck
                            ? undefined
                            : { opacity: 0.45, boxShadow: "none", cursor: "not-allowed" }
                        }
                        onClick={handleCheck}
                      >
                        <Check size={17} strokeWidth={3} />
                        <span>
                          {isReadyToCheck
                            ? "このスペルで判定する"
                            : "過去形と過去分詞をどちらも埋めよう"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 回答後フィードバック */}
                <AnimatePresence>
                  {answered && lastResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div
                        className={`feedback-callout ${lastResult.isCorrect ? "is-ok" : "is-ng"}`}
                      >
                        <div className="feedback-head">
                          {lastResult.isCorrect ? (
                            <span className="judge-text is-ok">
                              <Check size={17} strokeWidth={3} />
                              <span>
                                {streak >= targetStreak
                                  ? `${targetStreak}問連続クリア達成！`
                                  : `正解（連続 ${streak} 問目）`}
                              </span>
                            </span>
                          ) : (
                            <>
                              <span className="judge-text is-ng">
                                <X size={17} strokeWidth={3} />
                                <span>不正解</span>
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
                            <span>3拍子で聴く</span>
                          </button>
                        </div>

                        {!lastResult.isCorrect && (
                          <p className="reset-note">
                            {lastResult.lostStreak > 0
                              ? `連続 ${lastResult.lostStreak} 問でストップ。記録は 0 にリセットされました。`
                              : "記録は 0 のままです。音とつづりを確認して再挑戦しよう！"}
                          </p>
                        )}

                        <p className="explanation-body">{currentVerb.tip}</p>
                      </div>

                      <div className="stage-actions">
                        {!lastResult.isCorrect && (
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
                          className={lastResult.isCorrect ? "btn-brand" : "btn-retry-solid"}
                          onClick={handleNext}
                        >
                          {lastResult.isCorrect ? (
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
                    PC操作：<span className="kbd-chip">A–Z</span> で入力 /{" "}
                    <span className="kbd-chip">Backspace</span> 戻る /{" "}
                    <span className="kbd-chip">Tab</span> スロット切替
                  </span>
                  <span>
                    <span className="kbd-chip">Enter</span> 判定・次へ
                  </span>
                </div>
              </motion.article>
            </AnimatePresence>
          </motion.section>
        )}

        {screen === "clear" && clearRecord && (
          <ClearScreen
            key="tiles-clear"
            record={clearRecord}
            submitStatus={submitStatus}
            submitError={submitError}
            rankInfo={rankInfo}
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
