"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Pencil, Search, ShieldCheck, Store, Trash2, UserPlus, Users } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ConfirmDialog, Modal } from "@/components/ui/Overlay";
import {
  Avatar,
  EmptyState,
  ErrorState,
  GridSkeleton,
  PageHeader,
  RoleBadge,
  StatCard,
  staggerContainer,
} from "@/components/ui/Display";
import { useResource } from "@/lib/client/useResource";
import { errorMessage } from "@/lib/client/api";
import type { ApiUser, Role, Session } from "@/lib/client/types";

const ROLES: Role[] = ["CUSTOMER", "VENDOR", "ADMIN", "SUPERADMIN", "USER"];
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Create (user = null) or edit an existing user. */
function UserFormModal({ open, user, onClose, onSaved }: {
  open: boolean;
  user: ApiUser | null;
  onClose: () => void;
  onSaved: (user: ApiUser) => void;
}) {
  const { request } = useSession();
  const toast = useToast();
  const { m } = useI18n();
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "CUSTOMER" as Role });
  const [saving, setSaving] = useState(false);
  const editing = Boolean(user);

  useEffect(() => {
    if (!open) return;
    setForm(
      user
        ? { email: user.email, name: user.name ?? "", password: "", role: user.role }
        : { email: "", name: "", password: "", role: "CUSTOMER" }
    );
  }, [open, user]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = editing
        ? await request<ApiUser>(`/api/user/${user!.id}`, {
            method: "PUT",
            body: {
              ...(form.email.trim() !== user!.email && { email: form.email.trim() }),
              name: form.name.trim(),
              role: form.role,
              ...(form.password && { password: form.password }),
            },
          })
        : await request<ApiUser>("/api/user", {
            method: "POST",
            body: {
              email: form.email.trim(),
              password: form.password,
              role: form.role,
              ...(form.name.trim() && { name: form.name.trim() }),
            },
          });
      toast.success(editing ? m.users.updated : m.users.created, saved.email);
      onSaved(saved);
      onClose();
    } catch (error) {
      toast.error(editing ? m.users.updateFailed : m.users.createFailed, errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? m.users.editTitle : m.users.newTitle}
      description={editing ? user!.email : m.users.newDescription}
    >
      <form onSubmit={submit} className="space-y-4">
        <Input label={m.common.email} type="email" required value={form.email} onChange={set("email")} />
        <Input label={m.common.name} value={form.name} onChange={set("name")} hint={m.common.optional} />
        <Input
          label={editing ? m.users.newPassword : m.common.password}
          type="password"
          autoComplete="new-password"
          required={!editing}
          value={form.password}
          onChange={set("password")}
          hint={editing ? m.users.keepPassword : undefined}
        />
        <Select label={m.users.role} value={form.role} onChange={set("role")}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {capitalize(m.roles[r])}
            </option>
          ))}
        </Select>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>{m.common.cancel}</Button>
          <Button type="submit" loading={saving}>{editing ? m.common.saveChanges : m.users.create}</Button>
        </div>
      </form>
    </Modal>
  );
}

function UsersAdmin({ session }: { session: Session }) {
  const { can, request } = useSession();
  const toast = useToast();
  const { m, formatDate } = useI18n();
  const users = useResource<ApiUser[]>("/api/user");
  const [list, setList] = useState<ApiUser[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApiUser | null>(null);
  const [deleting, setDeleting] = useState<ApiUser | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (users.data) setList(users.data);
  }, [users.data]);

  const canEdit = can("PUT", "/api/user/x");
  const canDelete = can("DELETE", "/api/user/x");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter((u) => roleFilter === "ALL" || u.role === roleFilter)
      .filter((u) => !q || u.email.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [list, query, roleFilter]);

  const count = (role: Role) => list.filter((u) => u.role === role).length;

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await request(`/api/user/${deleting.id}`, { method: "DELETE" });
      setList((l) => l.filter((u) => u.id !== deleting.id));
      toast.success(m.users.deleted, deleting.email);
      setDeleting(null);
    } catch (error) {
      const message = errorMessage(error);
      toast.error(
        m.users.deleteFailed,
        /reference/i.test(message) ? m.users.stillReferenced : message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={m.users.eyebrow}
        title={m.users.title}
        description={canEdit ? m.users.descriptionEdit : m.users.descriptionReadOnly}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <UserPlus className="size-4" /> {m.users.newUser}
          </Button>
        }
      />

      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={m.users.statAll} value={list.length} icon={<Users className="size-4" />} />
        <StatCard label={m.users.statCustomers} value={count("CUSTOMER")} icon={<Users className="size-4" />} />
        <StatCard label={m.users.statVendors} value={count("VENDOR")} icon={<Store className="size-4" />} />
        <StatCard label={m.users.statAdmins} value={count("ADMIN") + count("SUPERADMIN")} icon={<ShieldCheck className="size-4" />} />
      </motion.div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={m.users.searchPlaceholder}
            aria-label={m.users.searchLabel}
            className="w-full rounded-2xl border border-line bg-surface py-2.5 pr-4 pl-10 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
        </label>
        <LayoutGroup id="role-filter">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label={m.users.filterByRole}>
            {(["ALL", ...ROLES] as const).map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={roleFilter === r}
                onClick={() => setRoleFilter(r)}
                className={`relative rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  roleFilter === r ? "text-white" : "text-muted hover:text-ink"
                }`}
              >
                {roleFilter === r && (
                  <motion.span layoutId="role-filter-pill" className="absolute inset-0 rounded-full bg-accent" />
                )}
                <span className="relative">{r === "ALL" ? m.common.all : capitalize(m.roles[r])}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
      </div>

      {users.error ? (
        <ErrorState error={users.error} onRetry={users.reload} />
      ) : users.loading && !users.data ? (
        <GridSkeleton count={3} className="h-16" />
      ) : visible.length === 0 ? (
        <EmptyState icon={<Users className="size-7" />} title={m.users.noMatch} description={m.users.noMatchHint} />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((user, i) => (
                <motion.li
                  key={user.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.03 } }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                  className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2/50"
                >
                  <Avatar email={user.email} name={user.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {user.name || user.email}
                      {user.id === session.id && <span className="ml-2 text-xs text-accent">{m.common.you}</span>}
                    </p>
                    {user.name && <p className="truncate text-sm text-muted">{user.email}</p>}
                  </div>
                  <div className="hidden text-right text-xs text-muted md:block">
                    {m.users.joined(formatDate(user.createdAt))}
                    {!user.activated && <p className="text-danger">{m.users.deactivated}</p>}
                  </div>
                  <RoleBadge role={user.role} />
                  {(canEdit || canDelete) && (
                    <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      {canEdit && (
                        <button
                          onClick={() => { setEditing(user); setFormOpen(true); }}
                          className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-ink"
                          aria-label={m.common.editItem(user.email)}
                        >
                          <Pencil className="size-4" />
                        </button>
                      )}
                      {canDelete && user.id !== session.id && (
                        <button
                          onClick={() => setDeleting(user)}
                          className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                          aria-label={m.common.deleteItem(user.email)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      <UserFormModal
        open={formOpen}
        user={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) =>
          setList((l) => (l.some((u) => u.id === saved.id) ? l.map((u) => (u.id === saved.id ? saved : u)) : [saved, ...l]))
        }
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title={m.users.deleteTitle}
        description={m.users.deleteDescription(deleting?.email ?? "")}
      />
    </>
  );
}

export default function UsersPage() {
  return <RoleGate roles={["ADMIN", "SUPERADMIN"]}>{(session) => <UsersAdmin session={session} />}</RoleGate>;
}
