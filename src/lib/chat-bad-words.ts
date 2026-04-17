// Bad-word filter for the public chat.
//
// Intentionally short and egregious-only. Matched messages are still stored
// (for audit / reversal) but inserted with deleted_at set so they never
// render. This makes false-positive reversal cheap.
//
// Additions: append new terms here; case-insensitive word-boundary match.

export const BAD_WORDS: readonly string[] = [
  "nigger",
  "nigga",
  "faggot",
  "kike",
  "chink",
  "spic",
  "retard",
  "tranny",
  "cunt",
  "whore",
  "slut",
  "rape",
  "pedophile",
  "childporn",
  "cp",
];

const RX = new RegExp(
  `\\b(${BAD_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "i",
);

export function containsBadWord(text: string): boolean {
  if (!text) return false;
  return RX.test(text);
}
