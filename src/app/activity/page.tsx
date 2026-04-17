import ActivityFeed from "@/components/ActivityFeed";
import { listEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

interface PageProps {
  // Next.js 15: searchParams is a Promise on Server Components
  searchParams: Promise<{ session?: string | string[] }>;
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawSession = params?.session;
  const session = Array.isArray(rawSession) ? rawSession[0] : rawSession;
  const sessionId = session && session.length > 0 ? session : null;

  const events = await listEvents({ limit: 100, sessionId });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-bold text-workshop-text">
          Activity Stream
        </h1>
        <p className="text-sm text-workshop-muted">
          Reverse-chronological feed of agent actions.{" "}
          {sessionId ? (
            <>
              Filtered to session{" "}
              <code className="rounded bg-workshop-surface px-1.5 py-0.5 font-mono text-xs text-workshop-command">
                {sessionId}
              </code>
              .
            </>
          ) : (
            <>Showing the last 100 events across all sessions.</>
          )}
        </p>
      </header>

      <ActivityFeed
        initialEvents={events}
        sessionId={sessionId}
        limit={100}
        refreshMs={5000}
      />

      <p className="font-mono text-xs text-workshop-muted">
        Filter by session: append{" "}
        <code className="text-workshop-command">?session=&lt;id&gt;</code> to
        the URL.
      </p>
    </div>
  );
}
