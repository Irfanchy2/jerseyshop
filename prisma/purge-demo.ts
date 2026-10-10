/** Removes all demo data created by `db:seed -- --demo` (demo orders, demo customers and their reviews). */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const orders = await db.order.deleteMany({ where: { isDemo: true } });
  const users = await db.user.deleteMany({ where: { email: { endsWith: "@demo.jerseystudio.local" } } });
  console.log(`Deleted ${orders.count} demo orders and ${users.count} demo customers (with their reviews).`);
  console.log("Demo catalog products are kept; archive or delete them from Admin → Products.");
}
main().finally(() => db.$disconnect());
