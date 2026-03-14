"use client";

import { Hero } from "@/components/home/Hero";
import { Button } from "@/components/ui/Button";
import { ProjectHighlights } from "@/components/home/ProjectHighlights";
import { GuardianPolicySection } from "@/components/home/GuardianPolicySection";
import { RecoveryTimelineSection } from "@/components/home/RecoveryTimelineSection";
import { TechStackSection } from "@/components/home/TechStackSection";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-[#EBDDF7] selection:bg-[rgb(122_27_122)]">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <Hero />
      <ProjectHighlights />
      <GuardianPolicySection />
      <RecoveryTimelineSection />
      <TechStackSection />

      <section className="border-t border-[rgb(122_27_122_/_0.35)] px-12 py-40 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-5xl font-bold tracking-tighter text-[#EBDDF7]">
            Give your treasury team BitGo-grade security with product-grade usability.
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-[#BDA9CC]">
            From wallet creation to day-to-day transfers to key-loss recovery, Rakshak helps institutions operate safely
            on-chain without building complex custody logic from scratch.
          </p>
          <Button className="w-full md:w-auto" onClick={() => router.push("/dashboard")}>
            Open Dashboard
          </Button>
        </div>
      </section>

      <div className="h-40" />
    </main>
  );
}
