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
      <head>
        {/* JetBrains Mono for telemetry / tabular numerics */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b border-workshop-muted/20 bg-workshop-surface/60 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4 text-sm">
            <Link
              href="/"
              className="font-heading font-bold text-workshop-text hover:text-workshop-primary"
            >
              eidos.live
            </Link>
            <Link
              href="/"
              className="font-mono text-xs uppercase tracking-wider text-workshop-muted hover:text-workshop-primary"
            >
              race
            </Link>
            <Link
              href="/activity"
              className="font-mono text-xs uppercase tracking-wider text-workshop-muted hover:text-workshop-primary"
            >
              activity
            </Link>
            <Link
              href="/runs"
              className="font-mono text-xs uppercase tracking-wider text-workshop-muted hover:text-workshop-primary"
            >
              runs
            </Link>
            <Link
              href="/compare"
              className="font-mono text-xs uppercase tracking-wider text-workshop-muted hover:text-workshop-primary"
            >
              compare
            </Link>
            <span className="ml-auto font-mono text-xs text-workshop-muted">
              live.eidosagi.com
            </span>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        <footer className="mx-auto max-w-7xl px-6 py-8 font-mono text-xs text-workshop-muted">
          Eidos AGI · three-lane GPU race · workshop mode
        </footer>
      </body>
    </html>
  );
}
