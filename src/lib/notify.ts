import "server-only";
import { db } from "@/lib/db";

/** Staff notification shown in the admin notification centre. */
export async function notifyStaff(n: { type: string; title: string; body?: string; link?: string }) {
  await db.notification.create({ data: { ...n, userId: null } }).catch((e) => console.error("notify failed", e));
}
