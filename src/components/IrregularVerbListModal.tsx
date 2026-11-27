"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, X } from "lucide-react";
import { IRREGULAR_VERBS, type VerbPattern } from "@/data/irregularVerbs";
import { speakVerbTriplet, stopSpeech } from "@/lib/speech";

interface IrregularVerbListModalProps {
  open: boolean;
  highlightVerbId?: number | null;
  onClose: () => void;
}

const FILTERS: Array<{ key: "ALL" | VerbPattern; label: string }> = [
  { key: "ALL", label: "すべて (50)" },
  { key: "AAA", label: "AAA型" },
  { key: "ABA", label: "ABA型" },
  { key: "ABB", label: "ABB型" },
  { key: "ABC", label: "ABC型" },
];

export function IrregularVerbListModal({
  open,
  highlightVerbId = null,
  onClose,
}: IrregularVerbListModalProps) {
  const [filter, setFilter] = useState<"ALL" | VerbPattern>("ALL");
  const [playingId, setPlayingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      stopSpeech();
      setPlayingId(null);
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      stopSpeech();
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const filtered =
    filter === "ALL"
      ? IRREGULAR_VERBS
      : IRREGULAR_VERBS.filter((v) => v.pattern === filter);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verb-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="modal-dialog modal-dialog-wide"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
          >
            <div className="modal-header">
              <div>
                <h2 id="verb-modal-title" className="modal-title">
                  不規則動詞 3変化リスト（全50語）
                </h2>
                <p className="modal-subtitle">
                  スピーカーボタンで「原形 → 過去形 → 過去分詞」のお手本音声を聴けます
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
              <div className="pattern-tabs" role="tablist" aria-label="変化型フィルタ">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={filter === f.key}
                    className={`pattern-tab${filter === f.key ? " is-active" : ""}`}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="table-wrap">
                <table className="pronoun-table verb-ref-table">
                  <thead>
                    <tr>
                      <th>型</th>
                      <th>意味</th>
                      <th>原形</th>
                      <th>過去形</th>
                      <th>過去分詞</th>
                      <th>音声</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((verb) => {
                      const isHighlighted = highlightVerbId === verb.id;
                      const isPlaying = playingId === verb.id;
                      return (
                        <tr
                          key={verb.id}
                          className={isHighlighted ? "row-highlight" : undefined}
                        >
                          <td>
                            <span className={`pattern-mini-badge pat-${verb.pattern.toLowerCase()}`}>
                              {verb.pattern}
                            </span>
                          </td>
                          <td>{verb.meaning}</td>
                          <td className="font-en" style={{ fontWeight: 800 }}>
                            {verb.base}
                          </td>
                          <td className="font-en">{verb.past}</td>
                          <td className="font-en">{verb.pp}</td>
                          <td>
                            <button
                              type="button"
                              className={`audio-mini-btn${isPlaying ? " is-playing" : ""}`}
                              aria-label={`${verb.base} ${verb.past} ${verb.pp} を再生`}
                              onClick={() => {
                                setPlayingId(verb.id);
                                speakVerbTriplet(verb, (beat) => {
                                  if (beat === null) setPlayingId(null);
                                });
                              }}
                            >
                              <Volume2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
