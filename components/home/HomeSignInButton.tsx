"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { CircleUserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/Button";

export const HomeSignInButton = () => {
  const router = useRouter();
  const { authenticated, user, login, logout } = usePrivy();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const rawName = user?.email?.address ?? user?.id ?? "Privy user";
  const displayName = rawName.includes("@") ? rawName.split("@")[0] : rawName;

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isMenuOpen]);

  const handlePrimaryClick = () => {
    if (!authenticated) {
      login();
      return;
    }
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <div ref={menuRef} className="absolute right-6 top-6 z-20 md:right-10 md:top-10">
      <Button
        variant="outline"
        className="border-[rgb(122_27_122_/_0.55)] bg-[rgb(65_8_65_/_0.35)] text-[#EBDDF7] backdrop-blur-md hover:border-[rgb(122_27_122)]"
        onClick={handlePrimaryClick}
      >
        {authenticated ? (
          <span className="inline-flex items-center gap-2">
            <CircleUserRound size={14} />
            {displayName}
          </span>
        ) : (
          "Sign In"
        )}
      </Button>

      {authenticated && isMenuOpen ? (
        <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-[rgb(122_27_122_/_0.55)] bg-[linear-gradient(160deg,rgba(65,8,65,0.92),rgba(10,10,10,0.96))] shadow-2xl">
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              router.push("/dashboard");
            }}
            className="block w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-[#EBDDF7] transition-colors hover:bg-[rgb(122_27_122_/_0.25)]"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              logout();
            }}
            className="block w-full border-t border-white/10 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-[#EBDDF7] transition-colors hover:bg-[rgb(122_27_122_/_0.25)]"
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
};
