import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SCC ProPresenter Lyrics Formatter",
  description:
    "Format song lyrics for ProPresenter and ProPresenter-compatible software at Solace of Christ Church — paste or upload lyrics, queue them up, and download the formatted results.",
  authors: [{ name: "Zherish Galvin Mayordo" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
    >
      {/*
        Extensions (Grammarly, password managers, Dark Reader) stamp attributes
        onto <body> before React hydrates, which reads as a mismatch. Suppressing
        here covers this element only — it does not mask mismatches in our own
        components, which nest deeper.
      */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
