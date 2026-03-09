import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlaywrightGen",
  description:
    "AI-powered Playwright test generation platform for QA engineers, SDETs, and developers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/" className="text-xl font-bold tracking-tight text-black">
            PlaywrightGen
          </Link>

          <div className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/generator" className="hover:text-black">
              Generator
            </Link>

            <Link href="/pricing" className="hover:text-black">
              Pricing
            </Link>

            <Link href="/" className="hover:text-black">
              Home
            </Link>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}