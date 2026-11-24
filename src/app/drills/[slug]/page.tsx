import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DrillChallengeApp } from "@/components/DrillChallengeApp";
import { getDrillBySlug } from "@/data/drills";

export const dynamic = "force-dynamic";

interface DrillPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DrillPageProps): Promise<Metadata> {
  const { slug } = await params;
  const drill = getDrillBySlug(slug);
  if (!drill) {
    return { title: "単元が見つかりません" };
  }
  return {
    title: `${drill.title} | ${drill.grade} オンライン宿題`,
    description: drill.lead,
  };
}

export default async function DrillPage({ params }: DrillPageProps) {
  const { slug } = await params;
  const drill = getDrillBySlug(slug);

  if (!drill) {
    notFound();
  }

  const isGasConfigured = Boolean((process.env.GAS_WEB_APP_URL || "").trim());

  return <DrillChallengeApp drill={drill} isGasConfigured={isGasConfigured} />;
}
