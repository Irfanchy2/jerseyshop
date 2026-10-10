import { requireStaffPage } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { secretStatus } from "@/lib/secrets";
import { PageHeader } from "@/components/admin/ui";
import { PaymentSettingsForm } from "@/components/admin/integration-forms";
export const metadata = { title: "Payments" };
export default async function Payments() {
  await requireStaffPage("settings.write");
  const [s, secret] = await Promise.all([getSettings(), secretStatus("payments.sslcommerz")]);
  return (<div><PageHeader title="Payment settings" description="Cash on Delivery and online payment providers" /><PaymentSettingsForm value={s.payments} secret={secret} /></div>);
}
