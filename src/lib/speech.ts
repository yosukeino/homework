import type { IrregularVerb } from "@/data/irregularVerbs";

/**
 * ブラウザ内蔵の英語読み上げ（Web Speech API: speechSynthesis）
 * 外部API不要・無料で不規則動詞の3変化をリズミカルに再生します。
 */
function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  return (
    voices.find((v) => v.lang === "en-US" && /Samantha|Google US English|Alex|Aaron/i.test(v.name)) ||
    voices.find((v) => v.lang === "en-US") ||
    voices.find((v) => v.lang.startsWith("en")) ||
    null
  );
}

export function stopSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * 3拍子で「原形 → 過去形 → 過去分詞」を読み上げ、現在の拍(0, 1, 2)をコールバック通知します。
 */
export function speakVerbTriplet(
  verb: Pick<IrregularVerb, "base" | "past" | "pp">,
  onBeat?: (beatIndex: number | null) => void
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onBeat?.(null);
    return;
  }

  window.speechSynthesis.cancel();
  const voice = pickEnglishVoice();

  // "read" の過去形・過去分詞は音声合成に /red/ と読ませるため "red" を渡す
  const spokenWords = [
    verb.base,
    verb.base === "read" ? "red" : verb.past,
    verb.base === "read" ? "red" : verb.pp,
  ];

  spokenWords.forEach((word, idx) => {
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = "en-US";
    utter.rate = 0.96;
    utter.pitch = 1.0;
    if (voice) utter.voice = voice;

    utter.onstart = () => onBeat?.(idx);
    if (idx === spokenWords.length - 1) {
      utter.onend = () => onBeat?.(null);
      utter.onerror = () => onBeat?.(null);
    }
    window.speechSynthesis.speak(utter);
  });
}

/**
 * -------------------------------------------------------------------------
 * 音声認識テキストの判定エンジン（同音異義語・発音揺れ・複数候補対応）
 * -------------------------------------------------------------------------
 */
function normalizeToken(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildAcceptedSet(main: string, alts?: string[], aliases?: string[]): Set<string> {
  const set = new Set<string>();
  set.add(normalizeToken(main));
  for (const a of alts || []) set.add(normalizeToken(a));
  for (const al of aliases || []) set.add(normalizeToken(al));
  return set;
}

/**
 * レーベンシュタイン距離（軽微な語尾認識ミス許容のため使用）
 */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function tokenMatches(token: string, accepted: Set<string>, allowFuzzy: boolean): boolean {
  if (!token) return false;
  if (accepted.has(token)) return true;
  if (!allowFuzzy) return false;
  // 5文字以上の単語で1文字違いのみ許容（例: broken -> brokan 等の軽微な揺れ）
  for (const target of accepted) {
    if (target.length >= 5 && editDistance(token, target) <= 1) {
      return true;
    }
  }
  return false;
}

export interface VoiceJudgeResult {
  matched: boolean;
  matchedTranscript: string;
  /** 各スロット（0: 原形, 1: 過去形, 2: 過去分詞）の判定状態 */
  slotMatches: [boolean, boolean, boolean];
  tokens: string[];
}

/**
 * Web Speech API の認識候補リスト（複数alternatives）を受け取り、
 * 不規則動詞の3変化（原形・過去形・過去分詞）が正しく言えたかを判定します。
 */
export function judgeVerbSpeech(
  verb: IrregularVerb,
  transcripts: string[]
): VoiceJudgeResult {
  const baseSet = buildAcceptedSet(verb.base, undefined, verb.speechAliases?.base);
  const pastSet = buildAcceptedSet(verb.past, verb.altPast, verb.speechAliases?.past);
  const ppSet = buildAcceptedSet(verb.pp, verb.altPp, verb.speechAliases?.pp);

  // AAA/ABA/i-a-u型は1文字違いが別変化になるため、fuzzyは短い語には使わない
  const isTightVowelChange =
    verb.pattern === "AAA" ||
    verb.pattern === "ABA" ||
    ["sing", "swim", "drink", "sit", "win", "run", "come", "eat"].includes(verb.base);
  const allowFuzzy = !isTightVowelChange;

  let bestResult: VoiceJudgeResult = {
    matched: false,
    matchedTranscript: transcripts[0] || "",
    slotMatches: [false, false, false],
    tokens: [],
  };
  let bestScore = -1;

  for (const rawTranscript of transcripts) {
    const tokens = rawTranscript
      .trim()
      .split(/[\s,、。・\-/]+/)
      .map(normalizeToken)
      .filter(Boolean);

    if (tokens.length === 0) continue;

    // 3語以上言えている場合：順番に 原形 → 過去形 → 過去分詞 を探索
    let baseIdx = -1;
    let pastIdx = -1;
    let ppIdx = -1;

    for (let i = 0; i < tokens.length; i++) {
      if (baseIdx === -1 && tokenMatches(tokens[i], baseSet, allowFuzzy)) {
        baseIdx = i;
      } else if (baseIdx !== -1 && pastIdx === -1 && tokenMatches(tokens[i], pastSet, allowFuzzy)) {
        pastIdx = i;
      } else if (pastIdx !== -1 && ppIdx === -1 && tokenMatches(tokens[i], ppSet, allowFuzzy)) {
        ppIdx = i;
      }
    }

    // 原形を省略して「過去形 → 過去分詞」の2語だけ言った場合は、
    // 3変化の練習なので「原形も言おう」として不正解にするが、部分一致表示は正確に出す
    const slot0 = baseIdx !== -1;
    const slot1 = pastIdx !== -1;
    const slot2 = ppIdx !== -1;
    const matched = slot0 && slot1 && slot2;
    const score = (slot0 ? 1 : 0) + (slot1 ? 1 : 0) + (slot2 ? 1 : 0);

    if (matched) {
      return {
        matched: true,
        matchedTranscript: rawTranscript.trim(),
        slotMatches: [true, true, true],
        tokens,
      };
    }

    if (score > bestScore) {
      bestScore = score;
      bestResult = {
        matched: false,
        matchedTranscript: rawTranscript.trim(),
        slotMatches: [slot0, slot1, slot2],
        tokens,
      };
    }
  }

  return bestResult;
}
