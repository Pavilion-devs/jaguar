import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jaguar — The decision engine for Solana launches",
  description:
    "Jaguar watches every new Solana pair, scores conviction minute by minute, and tells you — with evidence — whether to ignore, watch, or enter.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script src="https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
