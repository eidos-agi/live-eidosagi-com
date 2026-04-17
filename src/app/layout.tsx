import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import ActivitySidebar from "@/components/ActivitySidebar";
import ChatSidebar from "@/components/ChatSidebar";
import LaunchBanner from "@/components/LaunchBanner";
import LinksFooter from "@/components/LinksFooter";
import SavingsStrip from "@/components/SavingsStrip";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://live.eidosagi.com";

const DESCRIPTION =
  "Live public benchmark: three GPUs race the same language model in real time.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Crucible — live.eidosagi.com",
    template: "%s · Crucible",
  },
  description: DESCRIPTION,
  applicationName: "Crucible by Eidos AGI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "Crucible — live.eidosagi.com",
    description: DESCRIPTION,
    siteName: "Crucible by Eidos AGI",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Crucible — We put models in the fire.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Crucible — live.eidosagi.com",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#161210",
  colorScheme: "dark",
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
      <body className="min-h-screen font-sans antialiased lg:pr-[640px]">
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
            <Link
              href="/models"
              className="font-mono text-xs uppercase tracking-wider text-workshop-muted hover:text-workshop-primary"
            >
              models
            </Link>
            <Link
              href="/methodology"
              className="font-mono text-xs uppercase tracking-wider text-workshop-muted hover:text-workshop-primary"
            >
              methodology
            </Link>
            <Link
              href="/about"
              className="font-mono text-xs uppercase tracking-wider text-workshop-muted hover:text-workshop-primary"
            >
              about
            </Link>
            <span className="ml-auto font-mono text-xs text-workshop-muted">
              live.eidosagi.com
            </span>
          </nav>
        </header>
        <LaunchBanner />
        <SavingsStrip />
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        <LinksFooter />
        <ActivitySidebar />
        <ChatSidebar />
      </body>
    </html>
  );
}
