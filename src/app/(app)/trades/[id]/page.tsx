import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { serializeTrade, tradeInclude } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { TradeDetail } from "@/components/trade-detail";
import { DeleteTradeButton } from "@/components/delete-trade-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = await prisma.trade.findUnique({ where: { id }, select: { symbol: true } });
  return { title: trade ? `${trade.symbol} trade` : "Trade" };
}

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const record = await prisma.trade.findFirst({
    where: { id, userId: user.id },
    include: { ...tradeInclude, images: { orderBy: { sortOrder: "asc" } } },
  });

  if (!record) notFound();

  // Previous / next by chronological position for quick review sessions.
  const [previous, next] = await Promise.all([
    prisma.trade.findFirst({
      where: { userId: user.id, entryTime: { lt: record.entryTime } },
      orderBy: { entryTime: "desc" },
      select: { id: true, symbol: true },
    }),
    prisma.trade.findFirst({
      where: { userId: user.id, entryTime: { gt: record.entryTime } },
      orderBy: { entryTime: "asc" },
      select: { id: true, symbol: true },
    }),
  ]);

  const trade = serializeTrade(record);
  const images = record.images.map((image) => ({
    id: image.id,
    url: image.url,
    caption: image.caption,
    phase: image.phase,
  }));

  return (
    <>
      <PageHeader
        title={`${trade.symbol} · ${trade.direction === "LONG" ? "Long" : "Short"}`}
        description={`Trade review · ${trade.setupName ?? "no setup"} · ${trade.sessionName ?? "no session"}`}
        actions={
          <>
            <div className="flex items-center gap-1">
              {previous ? (
                <Link
                  href={`/trades/${previous.id}`}
                  className="btn btn-ghost"
                  title={`Previous: ${previous.symbol}`}
                >
                  <ChevronLeft size={15} /> Previous
                </Link>
              ) : (
                <span className="btn btn-ghost pointer-events-none opacity-40">
                  <ChevronLeft size={15} /> Previous
                </span>
              )}
              {next ? (
                <Link href={`/trades/${next.id}`} className="btn btn-ghost" title={`Next: ${next.symbol}`}>
                  Next <ChevronRight size={15} />
                </Link>
              ) : (
                <span className="btn btn-ghost pointer-events-none opacity-40">
                  Next <ChevronRight size={15} />
                </span>
              )}
            </div>
            <Link href={`/trades/${trade.id}/edit`} className="btn btn-ghost">
              <Pencil size={14} /> Edit
            </Link>
            <DeleteTradeButton id={trade.id} />
          </>
        }
      />

      <div className="p-4 sm:p-6">
        <TradeDetail trade={trade} images={images} currency={user.currency} />
      </div>
    </>
  );
}
