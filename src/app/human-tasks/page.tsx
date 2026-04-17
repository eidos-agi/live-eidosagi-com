import type { Metadata } from "next";
import HumanTasksBoard from "@/components/HumanTasksBoard";
import {
  humanTaskCounts,
  listHumanTasks,
  type HumanTask,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Human Tasks",
  description:
    "Things the agent needs from Daniel: URLs, approvals, passwords, decisions. Everything Eidos can't do alone.",
};

export default async function HumanTasksPage() {
  let tasks: HumanTask[] = [];
  let counts = { open: 0, done: 0, wontdo: 0, blocked: 0 };
  try {
    tasks = listHumanTasks({ status: "open", limit: 100 });
    counts = humanTaskCounts();
  } catch {
    // fresh deploy / no volume; keep empty defaults
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold text-workshop-text">
          Human Tasks
        </h1>
        <p className="mt-2 max-w-prose text-sm text-workshop-muted">
          When the agent hits something only a human can do — a URL you have to
          paste, an approval you have to click, a password you have to hand over,
          a decision only you can make — it lands here. The open queue is live.
          Mark one done, and it moves to the history.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-wider text-workshop-muted">
          <span>
            open:{" "}
            <span className="tnum text-workshop-primary">{counts.open}</span>
          </span>
          <span>
            done: <span className="tnum text-workshop-command">{counts.done}</span>
          </span>
          <span>
            blocked:{" "}
            <span className="tnum text-workshop-danger">{counts.blocked}</span>
          </span>
          <span>
            won&apos;t do:{" "}
            <span className="tnum text-workshop-muted">{counts.wontdo}</span>
          </span>
        </div>
      </header>

      <HumanTasksBoard initialTasks={tasks} initialCounts={counts} />
    </div>
  );
}
