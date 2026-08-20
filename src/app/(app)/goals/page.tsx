import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTrades } from "@/lib/queries";
import { evaluateGoal, type GoalDefinition } from "@/lib/goals";
import { PageHeader } from "@/components/page-header";
import { GoalsView } from "@/components/goals-view";

export const metadata = { title: "Goals" };
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const user = await requireUser();

  const [goals, trades, journals] = await Promise.all([
    prisma.goal.findMany({ where: { userId: user.id }, orderBy: [{ active: "desc" }, { createdAt: "asc" }] }),
    getTrades(user.id, { range: "all" }),
    prisma.dailyJournal.findMany({ where: { userId: user.id }, select: { date: true } }),
  ]);

  const journalDates = new Set(journals.map((j) => j.date.toISOString().slice(0, 10)));

  const progress = goals.map((goal) =>
    evaluateGoal(
      {
        id: goal.id,
        title: goal.title,
        metric: goal.metric,
        period: goal.period,
        target: Number(goal.target),
        direction: goal.direction,
        active: goal.active,
        notes: goal.notes,
      } satisfies GoalDefinition,
      trades,
      journalDates,
    ),
  );

  return (
    <>
      <PageHeader
        title="Goals"
        description="Guardrails and targets — measured against the trades you've actually logged."
      />
      <div className="p-4 sm:p-6">
        <GoalsView progress={progress} currency={user.currency} />
      </div>
    </>
  );
}
