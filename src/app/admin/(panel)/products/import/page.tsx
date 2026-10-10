import { requireStaffPage } from "@/lib/auth/guards";
import { PageHeader, Card } from "@/components/admin/ui";
import { ProductImport } from "@/components/admin/product-import";
export const metadata = { title: "Import products" };
export default async function ImportPage() {
  await requireStaffPage("products.write");
  return (
    <div>
      <PageHeader back={{ href: "/admin/products", label: "Products" }} title="Bulk import" description="Create or update products and variants from CSV. Products match by slug, variants by SKU." />
      <Card><ProductImport /></Card>
    </div>
  );
}
