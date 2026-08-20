import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTaxonomy, getTradesPage, parseFilters } from "@/lib/queries";
import { resolveRange } from "@/lib/date-range";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filters/filter-bar";
import { TradesTable } from "@/components/trades-table";
import { Card } from "@/components/ui/primitives";
import { ExportButton } from "@/components/export-button";

export const metadata = { title: "Trades" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TradesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseFilters(params);

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const page = Math.max(1, Number(single("page") ?? 1) || 1);
  const sortBy = single("sortBy") ?? "tradeDate";
  const sortDir = single("sortDir") === "asc" ? "asc" : "desc";

  const [{ trades, total }, taxonomy] = await Promise.all([
    getTradesPage(user.id, filters, { page, pageSize: PAGE_SIZE, sortBy, sortDir }),
    getTaxonomy(user.id),
  ]);

  const range = resolveRange(filters.range, filters.from, filters.to);

  return (
    <>
      <PageHeader
        title="Trades"
        description={`${range.label} · every logged trade, filterable and sortable`}
        actions={
          <>
            <ExportButton />
            <Link href="/trades/new" className="btn btn-primary">
              <PlusCircle size={15} /> Add trade
            </Link>
          </>
        }
      >
        <FilterBar taxonomy={taxonomy} />
      </PageHeader>

      <div className="p-4 sm:p-6">
        <Card className="overflow-hidden">
          <TradesTable
            trades={trades}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            sortBy={sortBy}
            sortDir={sortDir}
            currency={user.currency}
          />
        </Card>
      </div>
    </>
  );
}
