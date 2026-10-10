import { requireStaffPage } from "@/lib/auth/guards";
import { loadProductForm } from "@/lib/admin/product-loader";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Add product" };

export default async function NewProduct() {
  await requireStaffPage("products.write");
  const data = (await loadProductForm())!;
  return (
    <div>
      <PageHeader back={{ href: "/admin/products", label: "Products" }} title="Add product" />
      <ProductForm {...data} />
    </div>
  );
}
