"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { PRONOUN_TABLE_ROWS } from "@/data/pronouns";

interface PronounTableModalProps {
  open: boolean;
  onClose: () => void;
}

export function PronounTableModal({ open, onClose }: PronounTableModalProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hint-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="modal-dialog"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
          >
            <div className="modal-header">
              <div>
                <h2 id="hint-modal-title" className="modal-title">
                  人称代名詞の変化表
                </h2>
                <p className="modal-subtitle">
                  主格・所有格・目的格・所有代名詞の形と意味を確認しよう
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="閉じる"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="table-wrap">
                <table className="pronoun-table">
                  <thead>
                    <tr>
                      <th>意味</th>
                      <th className="col-sub">
                        主格<small>〜は・〜が</small>
                      </th>
                      <th className="col-pos">
                        所有格<small>〜の</small>
                      </th>
                      <th className="col-obj">
                        目的格<small>〜を・〜に</small>
                      </th>
                      <th className="col-ppr">
                        所有代名詞<small>〜のもの</small>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRONOUN_TABLE_ROWS.map((row) => (
                      <tr key={row.meaning}>
                        <td>{row.meaning}</td>
                        <td>{row.subject}</td>
                        <td>{row.possessive}</td>
                        <td>{row.object}</td>
                        <td style={row.possessivePronoun ? undefined : { color: "#94a3b8" }}>
                          {row.possessivePronoun ?? "なし"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="tips-box">
                <p className="tips-box-title">見分け方のワンポイント</p>
                <ul>
                  <li>
                    <strong>主格</strong>：文の主語（動詞の前）に置く。文頭は大文字（I はいつでも大文字）。
                  </li>
                  <li>
                    <strong>所有格</strong>：うしろに必ず名詞（book, dog, name など）が続く。
                  </li>
                  <li>
                    <strong>目的格</strong>：動詞や前置詞（with, for, to など）のうしろに置く。
                  </li>
                  <li>
                    <strong>所有代名詞</strong>：「所有格＋名詞」を1語で表す（うしろに名詞は置かない）。
                  </li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary-lg"
                style={{ width: "auto", padding: "10px 22px", fontSize: "14px" }}
                onClick={onClose}
              >
                閉じる
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
