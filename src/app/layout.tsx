import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/src/components/SiteFooter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Кітап Әлемі",
  description: "Кітапханаңызда мағыналық іздеу — тақырып пен сұрау бойынша ұқсас кітаптарды табу.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="kk"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-dm-sans)] ka-app-body">
        <div className="ka-app-bg" aria-hidden />
        <div className="ka-app-main flex-1 flex flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
