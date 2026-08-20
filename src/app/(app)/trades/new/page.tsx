import { requireUser } from "@/lib/auth";
import { getTaxonomy } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { TradeForm } from "@/components/trade-form";

export const metadata = { title: "Add trade" };
export const dynamic = "force-dynamic";

export default async function NewTradePage() {
  const user = await requireUser();
  const taxonomy = await getTaxonomy(user.id);

  return (
    <>
      <PageHeader
        title="Add trade"
        description="Log the trade with the context you'll want when you review it later."
      />
      <div className="p-4 sm:p-6">
        <TradeForm taxonomy={taxonomy} currency={user.currency} />
      </div>
    </>
  );
}
