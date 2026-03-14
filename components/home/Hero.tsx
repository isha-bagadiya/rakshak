"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { HomeSignInButton } from "./HomeSignInButton";
import { Button } from "../ui/Button";
import image from "@/app/assets/Images/image.png";

export const Hero = () => {
  const router = useRouter();

  return (
    <section className="relative min-h-[92vh] border-b border-white/10">
      <HomeSignInButton />
      <div className="grid min-h-[82vh] grid-cols-12">
        <div className="col-span-12 flex flex-col justify-center px-6 py-16 sm:px-10 lg:col-span-8 lg:px-20 lg:py-24 xl:px-24">
          <span className="mb-6 font-mono text-[10px] uppercase tracking-[0.1em] text-[#7A1B7A] sm:text-xs sm:tracking-[0.2em]">
            Rakshak: Institutional Security, Team Simplicity.
          </span>
          <h1 className="mb-8 text-xl font-medium leading-[1.05] tracking-tighter text-white sm:text-3xl lg:text-4xl xl:text-6xl">
            Institutional wallet security,
            <br />
            <span className="bg-gradient-to-r from-[rgb(122,27,122)] to-[rgb(65,8,65)] bg-clip-text text-transparent">
              without institutional complexity.
            </span>
          </h1>
          <p className="mb-10 max-w-xl text-base font-light text-white/60 sm:mb-12 sm:text-lg">
            We built an orchestration layer on top of BitGo so NGOs, DAOs, and startups can run treasury operations,
            transfers, and key-loss recovery without deep SDK work.
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <Button variant="primary" className="w-full sm:w-auto" onClick={() => router.push("/dashboard")}>
              Open Dashboard
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push("/recover-address")}>
              Recover Wallet
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push("/demo-flow")}>
              View Demo
            </Button>
          </div>
        </div>

        <div className="relative col-span-12 mt-6 w-full lg:col-span-4 lg:mt-0 lg:self-center lg:mr-8 xl:mr-20">
          <div className="relative z-10 mx-auto w-full max-w-[29rem]">
            <div className="relative h-[360px] w-full sm:h-[460px] lg:h-[650px]">
              <Image
                src={image}
                alt="Rakshak recovery flow visualization"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
