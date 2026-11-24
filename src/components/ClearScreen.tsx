"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trophy,
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
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="card clear-card">
          <motion.div
            className="trophy-circle"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 16, delay: 0.08 }}
            aria-hidden="true"
          >
            <Trophy size={40} />
          </motion.div>

          <h2 className="clear-title">{record.targetStreak}問連続正解クリア！</h2>
          <p className="clear-subtitle">
            {record.studentName} さん、お疲れさまでした！{record.targetStreak}問連続正解を達成しました。
          </p>

          {/* 提出ステータス */}
          <div className={`submit-status-box status-${submitStatus}`} aria-live="polite">
            {submitStatus === "sending" && (
              <>
                <div className="submit-status-title-row">
                  <Loader2 size={17} className="spin" />
                  <span>先生にクリア記録を送信しています...</span>
                </div>
                <span className="submit-status-sub">このまま画面を閉じずにお待ちください</span>
              </>
            )}

            {submitStatus === "ok" && (
              <>
                <div className="submit-status-title-row">
                  <CheckCircle2 size={18} />
                  <span>先生への提出が完了しました！</span>
                </div>
                <span className="submit-status-sub">
                  「{record.studentName}」のクリア記録がスプレッドシートに保存されました
                </span>
              </>
            )}

            {submitStatus === "demo" && (
              <>
                <div className="submit-status-title-row">
                  <Sparkles size={17} />
                  <span>テストモード：画面上でのクリアを確認しました</span>
                </div>
                <span className="submit-status-sub">
                  Vercelの環境変数 GAS_WEB_APP_URL を設定すると自動でスプレッドシートに記録されます
                </span>
              </>
            )}

            {submitStatus === "error" && (
              <>
                <div className="submit-status-title-row">
                  <AlertTriangle size={18} />
                  <span>クリア記録の送信に失敗しました</span>
                </div>
                <span className="submit-status-sub">
                  {submitError || "通信状況を確認してもう一度お試しください（念のためこの画面のスクショを撮っておくと安心です）"}
                </span>
                <button type="button" className="btn-resend" onClick={onRetrySubmit}>
                  <RefreshCw size={14} />
                  <span>もう一度送信する</span>
                </button>
              </>
            )}
          </div>

          {/* クリア証明書カード */}
          <div className="cert-panel">
            <div className="cert-grid">
              <div>
                <div className="cert-item-label">氏名</div>
                <div className="cert-item-value">{record.studentName}</div>
              </div>
              <div>
                <div className="cert-item-label">クリア日時</div>
                <div className="cert-item-value">{record.clearedAtDisplay}</div>
              </div>
              <div>
                <div className="cert-item-label">クリアまでの総解答数</div>
                <div className="cert-item-value">
                  {record.totalAnswered}問（ミス {record.missCount}回）
                </div>
              </div>
              <div>
                <div className="cert-item-label">所要時間</div>
                <div className="cert-item-value">{record.elapsedText}</div>
              </div>
            </div>
            <div className="cert-code-row">
              <span>確認コード</span>
              <code>{record.submissionId}</code>
            </div>
          </div>

          <div className="clear-actions">
            <motion.button
              type="button"
              className="btn-primary-lg"
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onClick={onPlayAgain}
            >
              <RotateCcw size={17} />
              <span>もう一度{record.targetStreak}問連続にチャレンジする</span>
            </motion.button>
            <button type="button" className="btn-secondary-lg" onClick={onReturnToStart}>
              最初の画面に戻る（名前を変更）
            </button>
          </div>
        </div>
      </motion.section>
    </>
  );
}
