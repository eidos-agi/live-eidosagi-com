// Small horizontal row at the bottom of every page.
// Muted workshop text, amber-brass on hover. Copyright on the right.

import Image from "next/image";
import Link from "next/link";

interface LinkDef {
  label: string;
  href: string;
  external: boolean;
}

const LINKS: LinkDef[] = [
  {
    label: "eidosagi.com",
    href: "https://www.eidosagi.com",
    external: true,
  },
  {
    label: "GitHub",
    href: "https://github.com/eidos-agi/live-eidosagi-com",
    external: true,
  },
  {
    label: "Daniel Shanklin",
    href: "https://www.linkedin.com/in/danielshanklin/",
    external: true,
  },
  {
    label: "Eidos AGI on Substack",
    href: "https://eidosagi.substack.com",
    external: true,
  },
];

export default function LinksFooter() {
  return (
    <footer className="mx-auto mt-8 w-full max-w-7xl px-6 pb-10 pt-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-workshop-muted/20 pt-4 font-mono text-[11px] text-workshop-muted">
        <a
          href="https://www.linkedin.com/in/danielshanklin/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80"
          aria-label="Daniel Shanklin on LinkedIn"
        >
          <Image
            src="/daniel-avatar.png"
            alt="Daniel Shanklin"
            width={28}
            height={28}
            className="rounded-full border border-workshop-muted/30"
            priority
          />
        </a>
        {LINKS.map((l) =>
          l.external ? (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-workshop-primary"
            >
              {l.label}
            </a>
          ) : (
            <Link
              key={l.label}
              href={l.href}
              className="transition-colors hover:text-workshop-primary"
            >
              {l.label}
            </Link>
          ),
        )}
        <span className="ml-auto text-workshop-muted/80">
          © 2026 Eidos AGI
        </span>
      </div>
    </footer>
  );
}
