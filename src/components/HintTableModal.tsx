"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { PRONOUN_TABLE_ROWS } from "@/data/pronouns";
import type { HintKind } from "@/types/drill";

interface HintTableModalProps {
  open: boolean;
  kind: HintKind;
  onClose: () => void;
}

const COMPARISON_CHANGE_ROWS = [
  { rule: "基本（短い語）", base: "tall / fast", comp: "taller / faster", sup: "the tallest / fastest" },
  { rule: "語尾が e", base: "large / nice", comp: "larger / nicer", sup: "the largest / nicest" },
  { rule: "短母音＋子音字", base: "hot / big", comp: "hotter / bigger", sup: "the hottest / biggest" },
  { rule: "子音字＋y", base: "easy / happy", comp: "easier / happier", sup: "the easiest / happiest" },
  { rule: "長い語（more / most）", base: "famous / popular", comp: "more famous", sup: "the most famous" },
  { rule: "不規則①（良い・上手に）", base: "good / well", comp: "better", sup: "the best" },
  { rule: "不規則②（悪い）", base: "bad", comp: "worse", sup: "the worst" },
  { rule: "不規則③（多い）", base: "many / much", comp: "more", sup: "the most" },
];

export function HintTableModal({ open, kind, onClose }: HintTableModalProps) {
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

  const isComparison = kind === "comparison";

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
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
          >
            <div className="modal-header">
              <div>
                <h2 id="hint-modal-title" className="modal-title">
                  {isComparison ? "比較の変化・トラップ対策表" : "人称代名詞の変化表"}
                </h2>
                <p className="modal-subtitle">
                  {isComparison
                    ? "原級・比較級・最上級の形と in / of / than の使い分けを確認しよう"
                    : "主格・所有格・目的格・所有代名詞の形と意味を確認しよう"}
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
              {isComparison ? (
                <>
                  <div className="table-wrap">
                    <table className="pronoun-table">
                      <thead>
                        <tr>
                          <th>変化パターン</th>
                          <th>
                            原級<small>as 〜 as</small>
                          </th>
                          <th>
                            比較級<small>〜 than</small>
                          </th>
                          <th>
                            最上級<small>in / of</small>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {COMPARISON_CHANGE_ROWS.map((row) => (
                          <tr key={row.rule}>
                            <td>{row.rule}</td>
                            <td>{row.base}</td>
                            <td>{row.comp}</td>
                            <td>{row.sup}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="tips-box">
                    <p className="tips-box-title">テストで引っかかりやすいトラップ対策</p>
                    <ul>
                      <li>
                        <strong>in と of の見分け</strong>：後ろが場所・単数の集団（<code>in Japan</code>, <code>in our class</code>, <code>in your family</code>）なら <strong>in</strong>。後ろが数・複数・all（<code>of the three</code>, <code>of all</code>）なら <strong>of</strong>。
                      </li>
                      <li>
                        <strong>as 〜 as の中は必ず原級</strong>：taller や more 〜 を入れない（<code>as tall as</code> / <code>not as long as</code>）。
                      </li>
                      <li>
                        <strong>比較級の強調は much</strong>：「ずっと大きい」は <code>very larger</code> ではなく <strong><code>much larger</code></strong>。
                      </li>
                      <li>
                        <strong>like A better than B / like A the best</strong>：「より好き・一番好き」は more / most ではなく <strong>better / best</strong>。
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div className="table-wrap">
                    <table className="pronoun-table">
                      <thead>
                        <tr>
                          <th>意味</th>
                          <th>
                            主格<small>〜は・〜が</small>
                          </th>
                          <th>
                            所有格<small>〜の</small>
                          </th>
                          <th>
                            目的格<small>〜を・〜に</small>
                          </th>
                          <th>
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
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-ink"
                style={{ padding: "10px 22px", fontSize: "13.5px" }}
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
