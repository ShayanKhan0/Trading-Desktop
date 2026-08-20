import { requireUser } from "@/lib/auth";
import { getTaxonomy } from "@/lib/queries";
import { hasDemoData } from "@/lib/seed";
import { PageHeader } from "@/components/page-header";
import { SettingsView } from "@/components/settings-view";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const [taxonomy, demoLoaded] = await Promise.all([getTaxonomy(user.id), hasDemoData(user.id)]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Account preferences, your trading taxonomy, and data import and export."
      />
      <div className="p-4 sm:p-6">
        <SettingsView
          account={{
            name: user.name,
            email: user.email,
            startingBalance: Number(user.startingBalance),
            currency: user.currency,
            timezone: user.timezone,
          }}
          taxonomy={taxonomy}
          demoLoaded={demoLoaded}
        />
      </div>
    </>
  );
}
