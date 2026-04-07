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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-screen bg-[#fafafa] text-black">
          <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
              <Link
                href="/"
                className="text-2xl font-bold tracking-tight text-black"
              >
                PlaywrightGen
              </Link>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
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

          <footer className="mt-20 border-t py-6 text-center text-sm text-gray-500">
            <div className="flex justify-center gap-6">
              <a href="/terms" className="hover:text-black">
                Terms
              </a>
              <a href="/privacy" className="hover:text-black">
                Privacy
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}