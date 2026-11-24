import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ALL_DRILLS } from "@/data/drills";

export const dynamic = "force-dynamic";

export default function PortalHomePage() {
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
          {ALL_DRILLS.map((drill, idx) => (
            <Link
              key={drill.slug}
              href={`/drills/${drill.slug}`}
              className="drill-card"
            >
              <div className="drill-card-top">
                <span className="drill-grade-tag">{drill.grade}</span>
                <span className="drill-index font-mono">
                  UNIT {String(idx + 1).padStart(2, "0")}
                </span>
              </div>

              <h2 className="drill-card-title">{drill.shortTitle}</h2>
              <p className="drill-card-desc">{drill.summary}</p>

              <div className="drill-topics">
                {drill.topics.map((topic) => (
                  <span key={topic} className="drill-topic-chip">
                    {topic}
                  </span>
                ))}
              </div>

              <div className="drill-card-foot">
                <span className="font-mono">
                  {drill.questions.length}問プール / {drill.targetStreak}問連続
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
