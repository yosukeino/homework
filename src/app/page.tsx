import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ALL_DRILLS } from "@/data/drills";
import { IRREGULAR_TARGET_STREAK, IRREGULAR_VERBS } from "@/data/irregularVerbs";

export const dynamic = "force-dynamic";

interface PortalCardItem {
  href: string;
  grade: string;
  formatTag: string;
  formatTone: "default" | "tile" | "voice";
  title: string;
  summary: string;
  topics: string[];
  poolCount: number;
  targetStreak: number;
}

export default function PortalHomePage() {
  const cards: PortalCardItem[] = [
    ...ALL_DRILLS.map((drill) => ({
      href: `/drills/${drill.slug}`,
      grade: drill.grade,
      formatTag: "6択ドリル",
      formatTone: "default" as const,
      title: drill.shortTitle,
      summary: drill.summary,
      topics: drill.topics,
      poolCount: drill.questions.length,
      targetStreak: drill.targetStreak,
    })),
    {
      href: "/drills/irregular-tiles",
      grade: "中2〜3英語",
      formatTag: "文字タイル＋音声",
      formatTone: "tile",
      title: "不規則動詞（スペル組み立て）",
      summary:
        "文字タイルをタップして過去形・過去分詞を組み立て。回答後に英語音声で3拍子読み上げ。",
      topics: ["AAA / ABA / ABB / ABC", "スペル定着", "英語音声付き"],
      poolCount: IRREGULAR_VERBS.length,
      targetStreak: IRREGULAR_TARGET_STREAK,
    },
    {
      href: "/drills/irregular-voice",
      grade: "中2〜3英語",
      formatTag: "マイク音声判定",
      formatTone: "voice",
      title: "不規則動詞（音声リズムチャレンジ）",
      summary:
        "画面の原形を見て「go, went, gone」と声に出して回答。口と耳でリズミカルに完全定着。",
      topics: ["発声判定", "3拍子リズム", "同音異義語補正"],
      poolCount: IRREGULAR_VERBS.length,
      targetStreak: IRREGULAR_TARGET_STREAK,
    },
  ];

  return (
    <main className="app-shell">
      <div className="top-strip">
        <div className="top-strip-left">
          <span className="unit-dot" aria-hidden="true" />
          <span>中学英語 オンライン宿題</span>
        </div>
        <span className="font-mono">20 STREAK DRILLS</span>
      </div>

      <section className="sheet portal-sheet">
        <header className="portal-header">
          <div className="eyebrow font-en">ONLINE ENGLISH HOMEWORK</div>
          <h1 className="portal-title">20問連続正解チャレンジ</h1>
          <p className="portal-lead">
            挑戦する単元を選んでください。各単元とも全50問からランダム出題され、20問連続正解で自動提出されます。
          </p>
        </header>

        <div className="portal-grid">
          {cards.map((item, idx) => (
            <Link key={item.href} href={item.href} className="drill-card">
              <div className="drill-card-top">
                <div className="drill-card-badges">
                  <span className="drill-grade-tag">{item.grade}</span>
                  <span className={`drill-format-tag tone-${item.formatTone}`}>
                    {item.formatTag}
                  </span>
                </div>
                <span className="drill-index font-mono">
                  UNIT {String(idx + 1).padStart(2, "0")}
                </span>
              </div>

              <h2 className="drill-card-title">{item.title}</h2>
              <p className="drill-card-desc">{item.summary}</p>

              <div className="drill-topics">
                {item.topics.map((topic) => (
                  <span key={topic} className="drill-topic-chip">
                    {topic}
                  </span>
                ))}
              </div>

              <div className="drill-card-foot">
                <span className="font-mono">
                  {item.poolCount}問プール / {item.targetStreak}問連続
                </span>
                <span className="drill-go-label">
                  <span>挑戦する</span>
                  <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
