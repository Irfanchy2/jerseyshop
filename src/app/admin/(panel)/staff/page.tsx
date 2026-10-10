import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth/guards";
import { PageHeader } from "@/components/admin/ui";
import { StaffManager } from "@/components/admin/staff-forms";
export const metadata = { title: "Staff & roles" };
export default async function Staff() {
  const me = await requireStaffPage("staff.manage");
  const [staff, roles] = await Promise.all([db.user.findMany({ where: { kind: "STAFF" }, orderBy: { createdAt: "asc" } }), db.role.findMany({ include: { permissions: true, _count: { select: { users: true } } }, orderBy: { createdAt: "asc" } })]);
  return (<div><PageHeader title="Staff & permissions" description="Role-based access. Every admin API re-checks permissions on the server." /><StaffManager meId={me.id} staff={staff.map((u) => ({ id: u.id, name: u.name, email: u.email, roleId: u.roleId ?? "", isActive: u.isActive, lastLoginAt: u.lastLoginAt?.toISOString() ?? null }))} roles={roles.map((r) => ({ id: r.id, name: r.name, description: r.description ?? "", permissions: r.permissions.map((p) => p.permissionKey), members: r._count.users }))} /></div>);
}
