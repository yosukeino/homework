import type { DrillDefinition } from "@/types/drill";
import { COMPARISON_DRILL } from "./comparison";
import { PRONOUN_DRILL } from "./pronouns";

export const ALL_DRILLS: DrillDefinition[] = [PRONOUN_DRILL, COMPARISON_DRILL];

export function getDrillBySlug(slug: string): DrillDefinition | undefined {
  return ALL_DRILLS.find((d) => d.slug === slug);
}
