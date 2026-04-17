import { notFound } from "next/navigation";
import RunDetail from "@/components/RunDetail";
import { readRunMeta, readScores } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await readRunMeta(id);
  if (!run) notFound();
  const scores = await readScores(id);
  return <RunDetail run={run} initialScores={scores} />;
}
