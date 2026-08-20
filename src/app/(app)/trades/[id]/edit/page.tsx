import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getTaxonomy, serializeTrade, tradeInclude } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { TradeForm } from "@/components/trade-form";

export const metadata = { title: "Edit trade" };
export const dynamic = "force-dynamic";

export default async function EditTradePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const [record, taxonomy] = await Promise.all([
    prisma.trade.findFirst({ where: { id, userId: user.id }, include: tradeInclude }),
    getTaxonomy(user.id),
  ]);

  if (!record) notFound();

  return (
    <>
      <PageHeader title={`Edit ${record.symbol} trade`} description="Update any field — figures recalculate automatically." />
      <div className="p-4 sm:p-6">
        <TradeForm taxonomy={taxonomy} trade={serializeTrade(record)} currency={user.currency} />
      </div>
    </>
  );
}
