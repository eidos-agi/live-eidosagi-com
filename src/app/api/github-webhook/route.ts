// POST /api/github-webhook
//
// Receives GitHub webhook deliveries, HMAC-validates them against
// GITHUB_WEBHOOK_SECRET, and records them to the SQLite volume as both
// repo_activity rows (structured) and events rows (for the activity feed).
//
// Supported event types: push, pull_request, pull_request_review.
// Anything else is acknowledged with 200 and a note, so GitHub doesn't retry.
//
// Always returns HTTP 200 on parse or storage errors so GitHub's delivery
// queue doesn't pile up. Errors are captured in the response body for
// debugging via the delivery log, not via retries.

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { insertEvent, insertRepoActivity } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifySignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return timingSafeEq(expected, signature);
  } catch {
    return false;
  }
}

function shortSha(sha: string | null | undefined): string {
  if (!sha) return "";
  return sha.slice(0, 7);
}

function truncate(s: string, n = 200): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 3) + "...";
}

interface GithubRepo {
  full_name?: string;
  html_url?: string;
  name?: string;
}
interface GithubUser {
  login?: string;
}
interface GithubCommit {
  id?: string;
  message?: string;
  author?: { name?: string; username?: string };
  url?: string;
}
interface GithubPull {
  number?: number;
  title?: string;
  html_url?: string;
  user?: GithubUser;
  state?: string;
  merged?: boolean;
  head?: { ref?: string; sha?: string };
  base?: { ref?: string };
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "GITHUB_WEBHOOK_SECRET not configured" },
      { status: 200 },
    );
  }

  const signature = req.headers.get("x-hub-signature-256");
  const deliveryId = req.headers.get("x-github-delivery") ?? "";
  const eventType = req.headers.get("x-github-event") ?? "";

  const raw = await req.text();
  if (!verifySignature(raw, signature, secret)) {
    return NextResponse.json(
      { ok: false, error: "invalid signature" },
      { status: 200 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 200 },
    );
  }

  try {
    const repoObj = (payload.repository ?? {}) as GithubRepo;
    const repoName = repoObj.full_name ?? repoObj.name ?? "unknown/unknown";
    const senderLogin = (payload.sender as GithubUser | undefined)?.login ?? null;

    switch (eventType) {
      case "push": {
        const ref = (payload.ref as string | undefined) ?? null;
        const afterSha = (payload.after as string | undefined) ?? null;
        const commits = (payload.commits as GithubCommit[] | undefined) ?? [];
        const head = (payload.head_commit as GithubCommit | undefined) ?? null;

        const branch = ref ? ref.replace(/^refs\/heads\//, "") : null;
        const commitCount = commits.length;
        const title = head?.message
          ? truncate(head.message.split("\n")[0], 120)
          : `${commitCount} commit${commitCount === 1 ? "" : "s"}`;
        const url =
          head?.url ??
          (afterSha && repoObj.html_url
            ? `${repoObj.html_url}/commit/${afterSha}`
            : (repoObj.html_url ?? "https://github.com"));

        insertRepoActivity({
          repo: repoName,
          kind: "push",
          actor: senderLogin,
          ref,
          sha: afterSha,
          title,
          url,
          summary: `${commitCount} commit${commitCount === 1 ? "" : "s"} to ${branch ?? ref ?? "?"}`,
          meta: { delivery: deliveryId, payload },
          ts: Date.now(),
        });

        insertEvent({
          sessionId: "github",
          actor: "github",
          kind: "commit",
          summary: truncate(
            `[${repoName}${branch ? `@${branch}` : ""}] ${title}${afterSha ? ` (${shortSha(afterSha)})` : ""}`,
            200,
          ),
          details: { delivery: deliveryId, payload },
          icon: "git-branch",
          relatedRun: null,
        });
        return NextResponse.json({ ok: true, kind: "push", repo: repoName });
      }

      case "pull_request": {
        const action = (payload.action as string | undefined) ?? "updated";
        const pull = (payload.pull_request as GithubPull | undefined) ?? {};
        const number = pull.number ?? 0;
        const title = pull.title ?? "(no title)";
        const url = pull.html_url ?? repoObj.html_url ?? "https://github.com";
        const author = pull.user?.login ?? senderLogin;
        const headRef = pull.head?.ref ?? null;
        const baseRef = pull.base?.ref ?? null;
        const sha = pull.head?.sha ?? null;

        insertRepoActivity({
          repo: repoName,
          kind: `pr.${action}`,
          actor: author,
          ref: headRef,
          sha,
          title: `PR #${number}: ${truncate(title, 160)}`,
          url,
          summary: `${action}${baseRef ? ` -> ${baseRef}` : ""}`,
          meta: { delivery: deliveryId, payload },
          ts: Date.now(),
        });

        insertEvent({
          sessionId: "github",
          actor: "github",
          kind: "pr",
          summary: truncate(
            `[${repoName}] PR #${number} ${action}: ${title}`,
            200,
          ),
          details: { delivery: deliveryId, payload },
          icon: "git-pull-request",
          relatedRun: null,
        });
        return NextResponse.json({
          ok: true,
          kind: "pull_request",
          action,
          pr: number,
        });
      }

      case "pull_request_review": {
        const action = (payload.action as string | undefined) ?? "submitted";
        const review = (payload.review as
          | { state?: string; html_url?: string; user?: GithubUser; body?: string }
          | undefined) ?? {};
        const pull = (payload.pull_request as GithubPull | undefined) ?? {};
        const number = pull.number ?? 0;
        const reviewer = review.user?.login ?? senderLogin;
        const state = review.state ?? "commented";
        const url = review.html_url ?? pull.html_url ?? repoObj.html_url ?? "https://github.com";

        insertRepoActivity({
          repo: repoName,
          kind: `review.${action}`,
          actor: reviewer,
          ref: pull.head?.ref ?? null,
          sha: pull.head?.sha ?? null,
          title: `Review on PR #${number}: ${state}`,
          url,
          summary: review.body ? truncate(review.body, 200) : null,
          meta: { delivery: deliveryId, payload },
          ts: Date.now(),
        });

        insertEvent({
          sessionId: "github",
          actor: "github",
          kind: "pr_review",
          summary: truncate(
            `[${repoName}] ${reviewer ?? "someone"} ${state} PR #${number}`,
            200,
          ),
          details: { delivery: deliveryId, payload },
          icon: "git-pull-request",
          relatedRun: null,
        });
        return NextResponse.json({
          ok: true,
          kind: "pull_request_review",
          action,
          pr: number,
        });
      }

      case "ping": {
        return NextResponse.json({ ok: true, kind: "ping" });
      }

      default:
        return NextResponse.json({
          ok: true,
          kind: eventType || "unknown",
          note: "event type not handled",
        });
    }
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 },
    );
  }
}
