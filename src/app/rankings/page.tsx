import type { Metadata } from "next";
import { RankingBoard } from "@/components/RankingBoard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ランキング | 中学英語 20問連続チャレンジ",
  description:
    "各単元の20問連続正解クリアランキング。ノーミス優先・最速タイム順でリアルタイムに更新されます。",
};

interface RankingsPageProps {
  searchParams: Promise<{ unit?: string; highlight?: string }>;
}

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  const params = await searchParams;
  return (
    <RankingBoard
      initialUnitSlug={params.unit || "pronouns"}
      highlightName={params.highlight || ""}
    />
  );
}
