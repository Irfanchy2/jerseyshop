import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { AdminShell } from "@/components/admin/shell";
import { Toaster } from "@/components/ui/toast";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffPage();
  const [settings, notifications, unread] = await Promise.all([
    getSettings(),
    db.notification.findMany({ where: { OR: [{ userId: null }, { userId: staff.id }] }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.notification.count({ where: { OR: [{ userId: null }, { userId: staff.id }], readAt: null } }),
  ]);
  return (
    <AdminShell
      user={{ name: staff.name, email: staff.email, roleName: staff.roleName }}
      permissions={[...staff.permissions]}
      brand={settings.brand.name}
      unread={unread}
      notifications={notifications.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, createdAt: n.createdAt.toISOString(), read: !!n.readAt }))}
    >
      {children}
      <Toaster />
    </AdminShell>
  );
}
