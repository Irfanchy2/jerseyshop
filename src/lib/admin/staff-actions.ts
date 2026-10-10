"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hashPassword, passwordProblems } from "@/lib/auth/password";
import { ALL_PERMISSIONS } from "@/lib/auth/permissions";
import { staffAction, fail, type ActionResult } from "./guard";

const staffSchema = z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), roleId: z.string(), isActive: z.boolean(), password: z.string().optional() });

async function ownersLeft(excludingUserId: string) {
  return db.user.count({ where: { kind: "STAFF", isActive: true, id: { not: excludingUserId }, role: { permissions: { some: { permissionKey: "staff.manage" } } } } });
}

export async function saveStaffAction(input: z.infer<typeof staffSchema>): Promise<ActionResult> {
  try {
    const me = await staffAction("staff.manage");
    const d = staffSchema.parse(input);
    const role = await db.role.findUniqueOrThrow({ where: { id: d.roleId }, include: { permissions: true } });
    if (d.id) {
      const losesAdmin = !d.isActive || !role.permissions.some((p) => p.permissionKey === "staff.manage");
      if (losesAdmin && (await ownersLeft(d.id)) === 0) return { ok: false, error: "At least one active staff member must keep “Manage staff” permission." };
      const data: Record<string, unknown> = { name: d.name, email: d.email, roleId: d.roleId, isActive: d.isActive };
      if (d.password) {
        const problem = passwordProblems(d.password);
        if (problem) return { ok: false, error: problem };
        data.passwordHash = await hashPassword(d.password);
      }
      await db.user.update({ where: { id: d.id }, data });
      if (!d.isActive || d.password) await db.session.deleteMany({ where: { userId: d.id } });
      await audit({ actorId: me.id, action: "staff.update", entityType: "user", entityId: d.id, summary: `${d.email} → ${role.name}${d.isActive ? "" : " (disabled)"}${d.password ? " · password reset" : ""}` });
    } else {
      const problem = passwordProblems(d.password ?? "");
      if (problem) return { ok: false, error: `Temporary password: ${problem}` };
      const existing = await db.user.findUnique({ where: { email: d.email } });
      if (existing) return { ok: false, error: "A user with this email already exists." };
      const u = await db.user.create({ data: { name: d.name, email: d.email, kind: "STAFF", roleId: d.roleId, isActive: d.isActive, passwordHash: await hashPassword(d.password!) } });
      await audit({ actorId: me.id, action: "staff.create", entityType: "user", entityId: u.id, summary: `${d.email} as ${role.name}` });
    }
    revalidatePath("/admin/staff");
    return { ok: true, message: "Staff member saved." };
  } catch (e) {
    return fail(e);
  }
}

const roleSchema = z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(40), description: z.string().max(200).optional(), permissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])) });

export async function saveRoleAction(input: z.infer<typeof roleSchema>): Promise<ActionResult> {
  try {
    const me = await staffAction("staff.manage");
    const d = roleSchema.parse(input);
    if (d.id && !d.permissions.includes("staff.manage")) {
      const holders = await db.user.findMany({ where: { roleId: d.id, isActive: true, kind: "STAFF" }, select: { id: true } });
      const others = await db.user.count({ where: { kind: "STAFF", isActive: true, roleId: { not: d.id }, role: { permissions: { some: { permissionKey: "staff.manage" } } } } });
      if (holders.length && others === 0) return { ok: false, error: "This would remove the last role able to manage staff." };
    }
    const role = await db.$transaction(async (tx) => {
      const r = d.id ? await tx.role.update({ where: { id: d.id }, data: { name: d.name, description: d.description } }) : await tx.role.create({ data: { name: d.name, description: d.description } });
      await tx.rolePermission.deleteMany({ where: { roleId: r.id } });
      await tx.rolePermission.createMany({ data: d.permissions.map((permissionKey) => ({ roleId: r.id, permissionKey })) });
      return r;
    });
    await audit({ actorId: me.id, action: "role.save", entityType: "role", entityId: role.id, summary: role.name, diff: { permissions: d.permissions } });
    revalidatePath("/admin/staff");
    return { ok: true, message: "Role saved." };
  } catch (e) {
    return fail(e);
  }
}
