import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { HOMEWORK_UNITS } from "@/lib/units";

export const dynamic = "force-dynamic";

export default function PortalHomePage() {
  return (
    <main className="app-shell">
      <div className="top-strip">
        <div className="top-strip-left">
          <span className="unit-dot" aria-hidden="true" />
          <span>中学英語 オンライン宿題</span>
        </div>
        <Link
          href="/rankings"
          className="ghost-toggle"
          style={{ textDecoration: "none", color: "var(--ink)" }}
        >
          <Trophy size={14} color="var(--ochre)" />
          <span>ランキングを見る</span>
        </Link>
      </div>

      <section className="sheet portal-sheet">
        <header className="portal-header">
          <div className="eyebrow font-en">ONLINE ENGLISH HOMEWORK</div>
          <h1 className="portal-title">20問連続正解チャレンジ</h1>
          <p className="portal-lead">
            挑戦する単元を選んでください。各単元とも全50問からランダム出題され、20問連続正解で自動提出＆ランキング登録されます。
          </p>
        </header>

        <div className="portal-grid">
          {HOMEWORK_UNITS.map((item, idx) => (
            <div key={item.slug} className="drill-card-wrap">
              <Link href={item.href} className="drill-card">
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

                <h2 className="drill-card-title">{item.shortTitle}</h2>
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

              <Link
                href={`/rankings?unit=${encodeURIComponent(item.slug)}`}
                className="drill-rank-link"
              >
                <Trophy size={13} color="var(--ochre)" />
                <span>この単元のランキングを見る</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
