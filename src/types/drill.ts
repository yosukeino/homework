export type BadgeTone = "blue" | "emerald" | "violet" | "ochre";

export interface DrillQuestion {
  id: number;
  category: string;
  badgeTone: BadgeTone;
  before: string;
  after: string;
  answer: string;
  ja: string;
  choices: string[];
  explanation: string;
}

export type HintKind = "pronouns" | "comparison";

export interface DrillDefinition {
  slug: string;
  grade: string;
  unitName: string;
  eyebrow: string;
  title: string;
  shortTitle: string;
  lead: string;
  summary: string;
  topics: string[];
  targetStreak: number;
  storageKey: string;
  hintKind: HintKind;
  hintButtonLabel: string;
  reviewHintButtonLabel: string;
  questions: DrillQuestion[];
}
