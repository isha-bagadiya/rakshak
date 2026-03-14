"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "outline";

type AppButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = ({ children, variant = "primary", className = "", ...rest }: AppButtonProps) => {
  const styles =
    variant === "primary"
      ? "border-transparent bg-[rgb(122_27_122)] text-white"
      : "border-white/25 bg-transparent text-white hover:border-[rgb(122_27_122)]";

  return (
    <button
      className={`group relative overflow-hidden border px-8 py-4 transition-colors duration-500 ${styles} ${className}`}
      {...rest}
    >
      <span className="relative z-10 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 group-hover:text-[#410841]">
        {children}
      </span>
      <div className="absolute inset-0 translate-y-[101%] bg-white transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-y-0" />
    </button>
  );
};
