import { ALL_DRILLS } from "@/data/drills";
import { IRREGULAR_TARGET_STREAK, IRREGULAR_VERBS } from "@/data/irregularVerbs";

export interface HomeworkUnitMeta {
  slug: string;
  href: string;
  grade: string;
  unitName: string;
  shortTitle: string;
  formatTag: string;
  formatTone: "default" | "tile" | "voice";
  summary: string;
  topics: string[];
  poolCount: number;
  targetStreak: number;
}

/**
 * サイト内の全宿題単元メタ情報（ポータル・ランキングページ共通）
 */
export const HOMEWORK_UNITS: HomeworkUnitMeta[] = [
  ...ALL_DRILLS.map((drill) => ({
    slug: drill.slug,
    href: `/drills/${drill.slug}`,
    grade: drill.grade,
    unitName: drill.unitName,
    shortTitle: drill.shortTitle,
    formatTag: "6択ドリル",
    formatTone: "default" as const,
    summary: drill.summary,
    topics: drill.topics,
    poolCount: drill.questions.length,
    targetStreak: drill.targetStreak,
  })),
  {
    slug: "irregular-tiles",
    href: "/drills/irregular-tiles",
    grade: "中2〜3英語",
    unitName: "中2〜3英語・不規則動詞（スペル組み立て）",
    shortTitle: "不規則動詞（スペル組み立て）",
    formatTag: "文字タイル＋音声",
    formatTone: "tile",
    summary:
      "文字タイルをタップして過去形・過去分詞を組み立て。回答後に英語音声で3拍子読み上げ。",
    topics: ["AAA / ABA / ABB / ABC", "スペル定着", "英語音声付き"],
    poolCount: IRREGULAR_VERBS.length,
    targetStreak: IRREGULAR_TARGET_STREAK,
  },
  {
    slug: "irregular-voice",
    href: "/drills/irregular-voice",
    grade: "中2〜3英語",
    unitName: "中2〜3英語・不規則動詞（音声リズム）",
    shortTitle: "不規則動詞（音声リズムチャレンジ）",
    formatTag: "マイク音声判定",
    formatTone: "voice",
    summary:
      "画面の原形を見て「go, went, gone」と声に出して回答。口と耳でリズミカルに完全定着。",
    topics: ["発声判定", "3拍子リズム", "同音異義語補正"],
    poolCount: IRREGULAR_VERBS.length,
    targetStreak: IRREGULAR_TARGET_STREAK,
  },
];

export function getUnitMetaBySlug(slug: string): HomeworkUnitMeta | undefined {
  return HOMEWORK_UNITS.find((u) => u.slug === slug);
}
