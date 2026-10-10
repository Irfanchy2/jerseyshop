"use client";
import * as React from "react";
import { Plus } from "lucide-react";
import { saveRoleAction, saveStaffAction } from "@/lib/admin/staff-actions";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useAction } from "./use-action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { StatusBadge, Table } from "./ui";

type Staff = { id?: string; name: string; email: string; roleId: string; isActive: boolean; lastLoginAt?: string | null; password?: string };
type Role = { id?: string; name: string; description: string; permissions: string[]; members?: number };

export function StaffManager({ staff, roles, meId }: { staff: Staff[]; roles: Role[]; meId: string }) {
  const [edit, setEdit] = React.useState<Staff | null>(null);
  const [role, setRole] = React.useState<Role | null>(null);
  const s = useAction(saveStaffAction);
  const r = useAction(saveRoleAction);
  const groups = [...new Set(Object.values(PERMISSIONS).map((p) => p.group))];
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Staff</h2><Button size="sm" onClick={() => setEdit({ name: "", email: "", roleId: roles[0]?.id ?? "", isActive: true, password: "" })}><Plus className="h-4 w-4" /> Invite staff</Button></div>
        <Table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
          <tbody>{staff.map((u) => <tr key={u.id}><td className="font-medium">{u.name}{u.id === meId && <span className="ml-1 text-[11px] text-muted-foreground">(you)</span>}<p className="text-[12px] font-normal text-muted-foreground">{u.email}</p></td><td>{roles.find((x) => x.id === u.roleId)?.name}</td><td><StatusBadge status={u.isActive ? "ACTIVE" : "ARCHIVED"} label={u.isActive ? "active" : "disabled"} /></td><td className="text-[12px] text-muted-foreground">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-GB") : "never"}</td><td className="text-right"><Button size="sm" variant="ghost" onClick={() => setEdit({ ...u, password: "" })}>Edit</Button></td></tr>)}</tbody></Table>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Roles & permissions</h2><Button size="sm" variant="outline" onClick={() => setRole({ name: "", description: "", permissions: ["dashboard.view"] })}><Plus className="h-4 w-4" /> New role</Button></div>
        <div className="grid gap-3 md:grid-cols-2">{roles.map((ro) => <div key={ro.id} className="rounded-xl border border-border bg-surface p-4"><div className="flex items-start justify-between"><div><p className="font-medium">{ro.name}</p><p className="text-[12px] text-muted-foreground">{ro.description} · {ro.members} member(s)</p></div><Button size="sm" variant="ghost" onClick={() => setRole(ro)}>Edit</Button></div><p className="mt-2 text-[12px] text-muted-foreground">{ro.permissions.length} permissions</p></div>)}</div>
      </section>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        {edit && (
          <DialogContent title={edit.id ? "Edit staff" : "Invite staff"} description={edit.id ? "Set a new password only if you need to reset it." : "Share the temporary password securely; ask them to change it."} className="admin-theme">
            <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const res = await s.run({ ...edit, password: edit.password || undefined }); if (res.ok) setEdit(null); }}>
              <Field label="Name" htmlFor="sn"><Input id="sn" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Email" htmlFor="se"><Input id="se" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
              <Field label="Role" htmlFor="sr"><NativeSelect id="sr" value={edit.roleId} onChange={(e) => setEdit({ ...edit, roleId: e.target.value })}>{roles.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</NativeSelect></Field>
              <Field label={edit.id ? "New password (optional)" : "Temporary password"} htmlFor="sp"><Input id="sp" type="password" autoComplete="new-password" value={edit.password ?? ""} onChange={(e) => setEdit({ ...edit, password: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><Switch checked={edit.isActive} onCheckedChange={(v) => setEdit({ ...edit, isActive: v })} /> Active</label>
              <Button type="submit" loading={s.pending}>Save</Button>
            </form>
          </DialogContent>
        )}
      </Dialog>
      <Dialog open={!!role} onOpenChange={(v) => !v && setRole(null)}>
        {role && (
          <DialogContent title={role.id ? `Edit ${role.name}` : "New role"} className="admin-theme max-w-2xl">
            <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); const res = await r.run(role); if (res.ok) setRole(null); }}>
              <div className="grid gap-3 sm:grid-cols-2"><Field label="Name" htmlFor="rn"><Input id="rn" value={role.name} onChange={(e) => setRole({ ...role, name: e.target.value })} /></Field><Field label="Description" htmlFor="rd"><Input id="rd" value={role.description} onChange={(e) => setRole({ ...role, description: e.target.value })} /></Field></div>
              <div className="grid gap-4 sm:grid-cols-2">
                {groups.map((g) => (
                  <fieldset key={g}><legend className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">{g}</legend>
                    {Object.entries(PERMISSIONS).filter(([, p]) => p.group === g).map(([k, p]) => (
                      <label key={k} className="flex items-start gap-2 py-1 text-sm"><input type="checkbox" className="mt-1" checked={role.permissions.includes(k)} onChange={(e) => setRole({ ...role, permissions: e.target.checked ? [...role.permissions, k] : role.permissions.filter((x) => x !== k) })} /><span>{p.description}<span className="block font-mono text-[11px] text-muted-foreground">{k}</span></span></label>
                    ))}
                  </fieldset>
                ))}
              </div>
              <Button type="submit" loading={r.pending}>Save role</Button>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
