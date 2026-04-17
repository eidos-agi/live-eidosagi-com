import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://live.eidosagi.com";

export const metadata: Metadata = {
  title: "Eidos Live — GPU Benchmark Race",
  description:
    "Real-time LLM benchmark runs streaming across three Thunder Compute GPU instances.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "Eidos Live — GPU Benchmark Race",
    description:
      "Three-lane GPU race: A6000 vs A100 vs H100, live tokens-per-second.",
    url: SITE_URL,
    siteName: "live.eidosagi.com",
    images: ["/og.png"],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-mono antialiased">
        <header className="border-b border-bg-border bg-bg-raised/60 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4 text-sm">
            <Link href="/" className="font-bold text-white">
              eidos.live
            </Link>
            <Link href="/" className="text-gray-400 hover:text-white">
              race
            </Link>
            <Link href="/runs" className="text-gray-400 hover:text-white">
              runs
            </Link>
            <Link href="/compare" className="text-gray-400 hover:text-white">
              compare
            </Link>
            <span className="ml-auto text-xs text-gray-500">
              live.eidosagi.com
            </span>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        <footer className="mx-auto max-w-7xl px-6 py-8 text-xs text-gray-500">
          Eidos AGI · three-lane GPU race · dark mode always
        </footer>
      </body>
    </html>
  );
}
