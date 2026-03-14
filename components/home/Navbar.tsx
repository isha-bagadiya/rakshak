"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";

const quickLinks = [
  { label: "Dashboard", href: "/dashboard", description: "Sign in and manage wallets" },
  { label: "Demo Flow", href: "/demo-flow", description: "Run full lifecycle demo" },
  { label: "Recovery Requests", href: "/guardian/requests", description: "Review guardian approvals" },
  { label: "Transfer", href: "/transfer", description: "Send testnet transactions" },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-[min(92vw,42rem)] overflow-hidden rounded-2xl border border-[rgb(122_27_122_/_0.7)] bg-[linear-gradient(160deg,rgba(65,8,65,0.88),rgba(10,10,10,0.96))] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-white/10 px-6 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#D6BCE5]/80">Rakshak Menu</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#F3E9FA]">Quick Navigation</h3>
              </div>

              <div className="grid gap-3 p-6 md:grid-cols-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-[rgb(122_27_122_/_0.75)] hover:bg-[rgb(122_27_122_/_0.12)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-widest text-[#EBDDF7]">{link.label}</span>
                      <ArrowRight size={14} className="text-[#B57ACC] transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="mt-2 text-sm text-[#C6B2D6]">{link.description}</p>
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center">
        <div className="flex h-16 w-[320px] items-center justify-between border border-[rgb(122_27_122_/_0.55)] bg-[#0A0A0A] px-6 shadow-2xl md:w-[450px]">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 rotate-45 items-center justify-center border border-[#D6BCE5]">
              <div className="h-2 w-2 bg-[#D6BCE5]" />
            </div>
            <span className="text-[10px] font-black tracking-[0.3em] text-[#EBDDF7]">RAKSHAK</span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="inline-flex cursor-pointer items-center gap-2 text-[#BDA9CC] transition-colors hover:text-[#B57ACC]"
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            <span className="text-sm uppercase tracking-[0.2em]">Menu</span>
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </>
  );
};

