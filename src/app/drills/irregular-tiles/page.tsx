import type { Metadata } from "next";
import { IrregularTilesApp } from "@/components/IrregularTilesApp";
import { isAnyStorageConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "不規則動詞 スペル組み立てチャレンジ | 中2〜3英語 オンライン宿題",
  description:
    "文字タイルをタップして不規則動詞の過去形・過去分詞を組み立てる20問連続チャレンジ。英語音声で3変化のリズムも定着します。",
};

export default function IrregularTilesPage() {
  return <IrregularTilesApp isGasConfigured={isAnyStorageConfigured()} />;
}
