"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { ClearSubmissionPayload } from "@/app/api/submit/route";
import { ConfettiCanvas } from "./ConfettiCanvas";

export type SubmitStatus = "sending" | "ok" | "demo" | "error";

interface ClearScreenProps {
  record: ClearSubmissionPayload;
  submitStatus: SubmitStatus;
  submitError: string;
  onRetrySubmit: () => void;
  onPlayAgain: () => void;
  onReturnToStart: () => void;
}

export function ClearScreen({
  record,
  submitStatus,
  submitError,
  onRetrySubmit,
  onPlayAgain,
  onReturnToStart,
}: ClearScreenProps) {
  return (
    <>
      <ConfettiCanvas />

      <motion.section
        key="screen-clear"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <div className="sheet cert-sheet">
          {/* 証明書ヘッダー＋スタンプ */}
          <div className="cert-top">
            <div>
              <div className="cert-kicker font-mono">COMPLETION CERTIFICATE</div>
              <h2 className="cert-title">{record.targetStreak}問連続正解 クリア</h2>
              <p className="cert-subtitle">
                {record.studentName} さん、お疲れさまでした。今日のオンライン宿題は完了です。
              </p>
            </div>

            <motion.div
              className="cert-stamp"
              initial={{ scale: 1.5, opacity: 0, rotate: -22 }}
              animate={{ scale: 1, opacity: 1, rotate: -8 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              aria-hidden="true"
            >
              <span className="cert-stamp-num font-mono">{record.targetStreak}</span>
              <span className="cert-stamp-sub font-mono">CLEARED</span>
            </motion.div>
          </div>

          {/* 提出ステータスバナー */}
          <div className={`submit-banner status-${submitStatus}`} aria-live="polite">
            <div className="submit-banner-main">
              {submitStatus === "sending" && (
                <>
                  <div className="submit-banner-title">
                    <Loader2 size={16} className="spin" />
                    <span>クリア記録を送信しています...</span>
                  </div>
                  <span className="submit-banner-sub">画面を閉じずに少しお待ちください</span>
                </>
              )}

              {submitStatus === "ok" && (
                <>
                  <div className="submit-banner-title">
                    <Check size={17} strokeWidth={3} />
                    <span>先生への提出が完了しました</span>
                  </div>
                  <span className="submit-banner-sub">
                    「{record.studentName}」のクリア記録が自動保存されました
                  </span>
                </>
              )}

              {submitStatus === "demo" && (
                <>
                  <div className="submit-banner-title">
                    <Sparkles size={16} />
                    <span>テストモードでクリアを確認しました</span>
                  </div>
                  <span className="submit-banner-sub">
                    GAS_WEB_APP_URL 未設定のため送信はスキップされています
                  </span>
                </>
              )}

              {submitStatus === "error" && (
                <>
                  <div className="submit-banner-title">
                    <AlertTriangle size={16} />
                    <span>クリア記録の送信に失敗しました</span>
                  </div>
                  <span className="submit-banner-sub">
                    {submitError || "通信状況を確認して再送信してください（この画面を保存しておくと安心です）"}
                  </span>
                </>
              )}
            </div>

            {submitStatus === "error" && (
              <button type="button" className="btn-resend" onClick={onRetrySubmit}>
                <RefreshCw size={14} />
                <span>再送信</span>
              </button>
            )}
          </div>

          {/* 記録データテーブル */}
          <div className="cert-data-grid">
            <div className="cert-data-cell">
              <div className="cert-label">氏名</div>
              <div className="cert-value">{record.studentName}</div>
            </div>
            <div className="cert-data-cell">
              <div className="cert-label">クリア日時</div>
              <div className="cert-value font-mono">{record.clearedAtDisplay}</div>
            </div>
            <div className="cert-data-cell">
              <div className="cert-label">総解答数</div>
              <div className="cert-value font-mono">
                {record.totalAnswered}問（ミス {record.missCount}回）
              </div>
            </div>
            <div className="cert-data-cell">
              <div className="cert-label">所要時間</div>
              <div className="cert-value font-mono">{record.elapsedText}</div>
            </div>
          </div>

          <div className="cert-code-bar">
            <span>確認コード</span>
            <code>{record.submissionId}</code>
          </div>

          <div className="cert-actions">
            <button type="button" className="btn-brand" onClick={onPlayAgain}>
              <RotateCcw size={16} />
              <span>もう一度挑戦する</span>
            </button>
            <button type="button" className="btn-paper-outline" onClick={onReturnToStart}>
              名前を変えて最初から
            </button>
          </div>
        </div>
      </motion.section>
    </>
  );
}
