import { QUESTION_POOL, type PronounCaseType } from "@/data/pronouns";
import type { BadgeTone, DrillDefinition } from "@/types/drill";

function caseToTone(caseType: PronounCaseType): BadgeTone {
  switch (caseType) {
    case "主格":
      return "blue";
    case "所有格":
      return "emerald";
    case "目的格":
      return "violet";
    case "所有代名詞":
      return "ochre";
  }
}

export const PRONOUN_DRILL: DrillDefinition = {
  slug: "pronouns",
  grade: "中1英語",
  unitName: "中学英語・人称代名詞",
  eyebrow: "PERSONAL PRONOUNS DRILL",
  title: "人称代名詞 連続正解チャレンジ",
  shortTitle: "人称代名詞（主格・所有格・目的格・所有代名詞）",
  lead: "主格・所有格・目的格・所有代名詞の使い分けを、1問ずつテンポよく演習します。",
  summary: "I / you / he / she / it / we / they の4変化を文脈で使い分ける全50問。",
  topics: ["主格", "所有格", "目的格", "所有代名詞"],
  targetStreak: 20,
  storageKey: "pronoun_20streak_best",
  hintKind: "pronouns",
  hintButtonLabel: "挑戦前に「人称代名詞の変化表」を確認",
  reviewHintButtonLabel: "人称代名詞の変化表で復習する",
  questions: QUESTION_POOL.map((q) => ({
    id: q.id,
    category: q.caseType,
    badgeTone: caseToTone(q.caseType),
    before: q.before,
    after: q.after,
    answer: q.answer,
    ja: q.ja,
    choices: q.choices,
    explanation: q.explanation,
  })),
};
