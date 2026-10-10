import "server-only";
import { redirect } from "next/navigation";
import { getCustomer, getStaff } from "./session";
import type { PermissionKey } from "./permissions";

export async function requireCustomer(next = "/account") {
  const user = await getCustomer();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** For admin pages: redirect to login when signed out; show 403 view when lacking permission. */
export async function requireStaffPage(permission?: PermissionKey) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (permission && !staff.permissions.has(permission)) redirect("/admin?denied=" + permission);
  return staff;
}
