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
    "AI-powered Playwright test generation for developers, automation engineers, and SDETs.",
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
        <div className="min-h-screen bg-[#fafafa] text-black">
          <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link
                href="/"
                className="text-xl font-bold tracking-tight text-black"
              >
                PlaywrightGen
              </Link>

              <div className="flex items-center gap-5 text-sm text-gray-600">
                <Link href="/generator" className="transition hover:text-black">
                  Generator
                </Link>
                <Link href="/pricing" className="transition hover:text-black">
                  Pricing
                </Link>
                <Link href="/" className="transition hover:text-black">
                  Home
                </Link>
              </div>
            </div>
          </nav>

          {children}
        </div>
      </body>
    </html>
  );
}