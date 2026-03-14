import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Play } from "next/font/google";
import { Navbar } from "@/components/home/Navbar";
import "./globals.css";
import { Providers } from "./providers";

const play = Play({
  weight: ["400", "700"],
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Wallet Recovery",
  description: "Guardian-approved wallet recovery workflows for team treasuries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${play.className} ${jetbrainsMono.variable} antialiased`}>
        <Providers>
          {children}
          <Navbar />
        </Providers>
      </body>
    </html>
  );
}
