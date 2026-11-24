import { PronounChallengeApp } from "@/components/PronounChallengeApp";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const isGasConfigured = Boolean((process.env.GAS_WEB_APP_URL || "").trim());
  return <PronounChallengeApp isGasConfigured={isGasConfigured} />;
}
