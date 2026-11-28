import type { Metadata } from "next";
import { IrregularVoiceApp } from "@/components/IrregularVoiceApp";
import { isAnyStorageConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "不規則動詞 音声リズムチャレンジ | 中2〜3英語 オンライン宿題",
  description:
    "マイクに向かって「go, went, gone」と3拍子で答える不規則動詞の音声20問連続チャレンジです。",
};

export default function IrregularVoicePage() {
  return <IrregularVoiceApp isGasConfigured={isAnyStorageConfigured()} />;
}
