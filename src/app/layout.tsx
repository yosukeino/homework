import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "中学英語 人称代名詞 20問連続チャレンジ",
  description:
    "全50問からランダム出題！20問連続正解でクリア＆自動提出できる中学生向けオンライン英語宿題アプリです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
