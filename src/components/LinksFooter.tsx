// Small horizontal row at the bottom of every page.
// Muted workshop text, amber-brass on hover. Copyright on the right.
//
// TODO(user): Replace the REPLACEME placeholders with real handles.

import Link from "next/link";

interface LinkDef {
  label: string;
  href: string;
  external: boolean;
  todo?: boolean;
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
    // TODO(user): replace REPLACEME with the real LinkedIn slug.
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/REPLACEME",
    external: true,
    todo: true,
  },
  {
    // TODO(user): replace REPLACEME with the real X handle.
    label: "X",
    href: "https://x.com/REPLACEME",
    external: true,
    todo: true,
  },
  {
    // TODO(user): confirm substack URL; mark active once live.
    label: "Eidos AGI on substack",
    href: "https://eidosagi.substack.com",
    external: true,
    todo: true,
  },
];

export default function LinksFooter() {
  return (
    <footer className="mx-auto mt-8 w-full max-w-7xl px-6 pb-10 pt-6 lg:pr-[352px]">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-workshop-muted/20 pt-4 font-mono text-[11px] text-workshop-muted">
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
