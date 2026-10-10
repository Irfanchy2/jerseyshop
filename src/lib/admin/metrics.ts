import "server-only";
import { db } from "@/lib/db";

const REVENUE_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"] as const;

export function rangeStart(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

/** All figures come from the database; nothing is estimated or invented. */
export async function dashboardMetrics(days: number) {
  const since = rangeStart(days);
  const prevSince = new Date(since.getTime() - days * 86400000);
  const todayStart = rangeStart(1);
  const revenueWhere = { status: { in: [...REVENUE_STATUSES] } };

  const [inRange, prevRange, allTime, today, byStatus, daily, topItems, lowStock, demoCount, customerCounts, events, couriers, cod] = await Promise.all([
    db.order.aggregate({ where: { ...revenueWhere, placedAt: { gte: since } }, _sum: { totalMinor: true }, _count: true }),
    db.order.aggregate({ where: { ...revenueWhere, placedAt: { gte: prevSince, lt: since } }, _sum: { totalMinor: true }, _count: true }),
    db.order.aggregate({ where: revenueWhere, _sum: { totalMinor: true }, _count: true }),
    db.order.count({ where: { placedAt: { gte: todayStart } } }),
    db.order.groupBy({ by: ["status"], where: { placedAt: { gte: since } }, _count: true }),
    db.$queryRaw<{ day: Date; revenue: bigint; orders: bigint }[]>`
      SELECT date_trunc('day', "placedAt") AS day, COALESCE(SUM("totalMinor") FILTER (WHERE status::text <> ALL(ARRAY['CANCELLED','RETURNED'])), 0) AS revenue, COUNT(*) AS orders
      FROM "Order" WHERE "placedAt" >= ${since} GROUP BY 1 ORDER BY 1`,
    db.orderItem.groupBy({ by: ["productId", "productName"], where: { order: { ...revenueWhere, placedAt: { gte: since } } }, _sum: { quantity: true, lineTotalMinor: true }, orderBy: { _sum: { quantity: "desc" } }, take: 6 }),
    db.$queryRaw<{ id: string; sku: string; size: string; stock: number; lowStockThreshold: number; name: string; productId: string }[]>`
      SELECT v.id, v.sku, v.size, v.stock, v."lowStockThreshold", p.name, p.id AS "productId" FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId"
      WHERE v."isActive" AND p.status = 'ACTIVE' AND v.stock <= v."lowStockThreshold" ORDER BY v.stock ASC LIMIT 8`,
    db.order.count({ where: { isDemo: true } }),
    db.$queryRaw<{ customers: bigint; returning: bigint }[]>`
      SELECT COUNT(*) AS customers, COUNT(*) FILTER (WHERE n > 1) AS returning FROM (
        SELECT phone, COUNT(*) AS n FROM "Order" WHERE status::text <> 'CANCELLED' GROUP BY phone
      ) t WHERE phone IN (SELECT phone FROM "Order" WHERE "placedAt" >= ${since})`,
    db.$queryRaw<{ sessions: bigint; product_sessions: bigint; cart_sessions: bigint; checkout_sessions: bigint; purchase_sessions: bigint }[]>`
      SELECT COUNT(DISTINCT "sessionId") FILTER (WHERE name = 'page_view') AS sessions,
             COUNT(DISTINCT "sessionId") FILTER (WHERE name = 'product_view') AS product_sessions,
             COUNT(DISTINCT "sessionId") FILTER (WHERE name = 'add_to_cart') AS cart_sessions,
             COUNT(DISTINCT "sessionId") FILTER (WHERE name = 'begin_checkout') AS checkout_sessions,
             COUNT(DISTINCT "sessionId") FILTER (WHERE name = 'purchase') AS purchase_sessions
      FROM "AnalyticsEvent" WHERE "createdAt" >= ${since} AND "sessionId" IS NOT NULL`,
    db.$queryRaw<{ provider: string; total: bigint; delivered: bigint; failed: bigint; returned: bigint; avg_hours: number | null }[]>`
      SELECT s."providerCode" AS provider, COUNT(*) AS total,
        COUNT(*) FILTER (WHERE s.status = 'DELIVERED') AS delivered,
        COUNT(*) FILTER (WHERE s.status = 'FAILED') AS failed,
        COUNT(*) FILTER (WHERE s.status IN ('RETURNED','CANCELLED')) AS returned,
        AVG(EXTRACT(EPOCH FROM (o."deliveredAt" - s."bookedAt")) / 3600) FILTER (WHERE s.status = 'DELIVERED' AND o."deliveredAt" IS NOT NULL) AS avg_hours
      FROM "Shipment" s JOIN "Order" o ON o.id = s."orderId" WHERE s."createdAt" >= ${since} GROUP BY 1`,
    db.$queryRaw<{ collected: bigint; outstanding: bigint; collected_n: bigint; outstanding_n: bigint }[]>`
      SELECT COALESCE(SUM("totalMinor") FILTER (WHERE status = 'DELIVERED'), 0) AS collected,
             COALESCE(SUM("totalMinor") FILTER (WHERE status IN ('SHIPPED','READY_TO_SHIP')), 0) AS outstanding,
             COUNT(*) FILTER (WHERE status = 'DELIVERED') AS collected_n,
             COUNT(*) FILTER (WHERE status IN ('SHIPPED','READY_TO_SHIP')) AS outstanding_n
      FROM "Order" WHERE "paymentMethod" = 'COD' AND "placedAt" >= ${since}`,
  ]);

  // Fill missing days so the trend line is continuous.
  const series: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const row = daily.find((r) => new Date(r.day).toISOString().slice(0, 10) === key);
    series.push({ date: key, revenue: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0) });
  }
  const status = Object.fromEntries(byStatus.map((s) => [s.status, s._count])) as Record<string, number>;
  const revenue = inRange._sum.totalMinor ?? 0;
  const prevRevenue = prevRange._sum.totalMinor ?? 0;
  const ev = events[0];
  const sessions = Number(ev?.sessions ?? 0);
  const cc = customerCounts[0];
  return {
    days,
    revenue,
    revenueDelta: prevRevenue ? (revenue - prevRevenue) / prevRevenue : null,
    orders: inRange._count,
    ordersDelta: prevRange._count ? (inRange._count - prevRange._count) / prevRange._count : null,
    aov: inRange._count ? Math.round(revenue / inRange._count) : 0,
    allTimeSales: allTime._sum.totalMinor ?? 0,
    allTimeOrders: allTime._count,
    today,
    status,
    series,
    top: topItems.map((t) => ({ productId: t.productId, name: t.productName, qty: t._sum.quantity ?? 0, revenue: t._sum.lineTotalMinor ?? 0 })),
    lowStock,
    demo: demoCount > 0,
    customers: Number(cc?.customers ?? 0),
    returning: Number(cc?.returning ?? 0),
    funnel: sessions
      ? { sessions, product: Number(ev.product_sessions), cart: Number(ev.cart_sessions), checkout: Number(ev.checkout_sessions), orders: Number(ev.purchase_sessions) }
      : null,
    couriers: couriers.map((c) => ({ provider: c.provider, total: Number(c.total), delivered: Number(c.delivered), failed: Number(c.failed), returned: Number(c.returned), avgHours: c.avg_hours })),
    cod: { collected: Number(cod[0]?.collected ?? 0), outstanding: Number(cod[0]?.outstanding ?? 0), collectedN: Number(cod[0]?.collected_n ?? 0), outstandingN: Number(cod[0]?.outstanding_n ?? 0) },
  };
}
