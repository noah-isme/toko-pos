"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  KeyRound,
  Loader2,
  Plus,
  ShieldAlert,
  Store,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/client";
import { OutletRole } from "@/server/db/enums";

type RoleLabel = "OWNER" | "ADMIN" | "CASHIER";

const ROLE_OPTIONS: { value: RoleLabel; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "CASHIER", label: "Kasir" },
];

const OUTLET_ROLE_OPTIONS: { value: OutletRole; label: string }[] = [
  { value: OutletRole.MANAGER, label: "Manager" },
  { value: OutletRole.CASHIER, label: "Kasir" },
];

const roleBadgeVariant = (role: RoleLabel) => {
  if (role === "OWNER") return "default";
  if (role === "ADMIN") return "secondary";
  return "outline";
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: RoleLabel;
  isActive: boolean;
  outletCount: number;
  createdAt: string;
};

type OutletAssignment = {
  id: string;
  outletId: string;
  outletName: string;
  outletCode: string;
  role: OutletRole;
  isActive: boolean;
};

type CreateForm = {
  name: string;
  email: string;
  password: string;
  role: RoleLabel;
};

type EditForm = {
  name: string;
  email: string;
  role: RoleLabel;
  password: string;
};

const EMPTY_CREATE_FORM: CreateForm = {
  name: "",
  email: "",
  password: "",
  role: "CASHIER",
};

export default function ManagementUsersPage() {
  const { data: session, status } = useSession();
  const utils = api.useContext();
  const usersQuery = api.users.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [assigning, setAssigning] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);

  const currentUserRole = (session?.user?.role as RoleLabel | undefined) ?? undefined;
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const invalidateUsers = async () => {
    await utils.users.list.invalidate();
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Memuat sesi...
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-8">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">Akses Ditolak</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Halaman manajemen user hanya tersedia untuk Owner atau Admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Manajemen User
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold">Daftar Pengguna</h1>
            <p className="text-sm text-muted-foreground">
              Kelola akun, role, dan penugasan outlet untuk seluruh pengguna sistem.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Tambah User
          </Button>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 md:p-6">
        {usersQuery.isLoading ? (
          <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Memuat daftar user...
          </div>
        ) : usersQuery.error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Gagal memuat daftar user: {usersQuery.error.message}
          </div>
        ) : usersQuery.data && usersQuery.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Outlet</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name ?? <span className="text-muted-foreground">Tanpa nama</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(user.role)}>
                      {ROLE_OPTIONS.find((opt) => opt.value === user.role)?.label ?? user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Nonaktif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.outletCount > 0 ? `${user.outletCount} outlet` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAssigning(user)}
                        className="gap-1"
                      >
                        <Store className="h-3.5 w-3.5" />
                        Outlet
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(user)}
                        className="gap-1"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(user)}
                        className="gap-1 text-destructive hover:text-destructive"
                        disabled={user.id === (session?.user?.id ?? "")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Belum ada pengguna terdaftar. Tambahkan user pertama untuk mulai.
            </p>
            <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah User
            </Button>
          </div>
        )}
      </section>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={invalidateUsers}
      />

      <EditUserDialog
        user={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSuccess={invalidateUsers}
      />

      <OutletAssignmentDialog
        user={assigning}
        onOpenChange={(open) => !open && setAssigning(null)}
        onSuccess={invalidateUsers}
      />

      <DeleteUserDialog
        user={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onSuccess={invalidateUsers}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const createUser = api.users.create.useMutation();
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE_FORM);

  useEffect(() => {
    if (!open) setForm(EMPTY_CREATE_FORM);
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error("Nama, email, dan password wajib diisi.");
      return;
    }

    try {
      await createUser.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      toast.success("User berhasil dibuat.");
      onOpenChange(false);
      await onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat user.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah User Baru</DialogTitle>
          <DialogDescription>
            Buat akun baru dengan role dan kredensial yang dapat digunakan untuk login.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Nama Lengkap" htmlFor="create-name">
            <Input
              id="create-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nama kasir / admin"
              maxLength={120}
            />
          </Field>
          <Field label="Email" htmlFor="create-email">
            <Input
              id="create-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="user@example.com"
              maxLength={180}
            />
          </Field>
          <Field label="Password" htmlFor="create-password" hint="Minimal 8 karakter">
            <Input
              id="create-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="••••••••"
            />
          </Field>
          <Field label="Role" htmlFor="create-role">
            <Select
              value={form.role}
              onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as RoleLabel }))}
            >
              <SelectTrigger id="create-role">
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createUser.isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  onOpenChange,
  onSuccess,
}: {
  user: UserRow | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const updateUser = api.users.update.useMutation();
  const [form, setForm] = useState<EditForm>({
    name: "",
    email: "",
    role: "CASHIER",
    password: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? "",
        email: user.email ?? "",
        role: user.role,
        password: "",
      });
    }
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    if (!user) return;
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Nama dan email wajib diisi.");
      return;
    }

    try {
      await updateUser.mutateAsync({
        id: user.id,
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password || undefined,
      });
      toast.success("User berhasil diperbarui.");
      onOpenChange(false);
      await onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui user.");
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Perbarui profil, role, atau reset password. Kosongkan password jika tidak ingin mengubahnya.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Nama Lengkap" htmlFor="edit-name">
            <Input
              id="edit-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              maxLength={120}
            />
          </Field>
          <Field label="Email" htmlFor="edit-email">
            <Input
              id="edit-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              maxLength={180}
            />
          </Field>
          <Field label="Role" htmlFor="edit-role">
            <Select
              value={form.role}
              onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as RoleLabel }))}
            >
              <SelectTrigger id="edit-role">
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Password Baru" htmlFor="edit-password" hint="Kosongkan untuk mempertahankan">
            <Input
              id="edit-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="••••••••"
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateUser.isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OutletAssignmentDialog({
  user,
  onOpenChange,
  onSuccess,
}: {
  user: UserRow | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const outletsQuery = api.outlets.list.useQuery();
  const assignmentsQuery = api.users.getOutletAssignments.useQuery(
    { id: user?.id ?? "" },
    { enabled: !!user },
  );
  const setAssignment = api.users.setOutletAssignment.useMutation();
  const removeAssignment = api.users.removeOutletAssignment.useMutation();
  const [selectedOutletId, setSelectedOutletId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<OutletRole>(OutletRole.CASHIER);

  useEffect(() => {
    if (user && outletsQuery.data && !selectedOutletId) {
      setSelectedOutletId(outletsQuery.data[0]?.id ?? "");
    }
    if (!user) {
      setSelectedOutletId("");
    }
  }, [user, outletsQuery.data, selectedOutletId]);

  const assignments = useMemo<OutletAssignment[]>(
    () => assignmentsQuery.data ?? [],
    [assignmentsQuery.data],
  );

  const assignedOutletIds = useMemo(
    () => new Set(assignments.map((a) => a.outletId)),
    [assignments],
  );

  const handleAdd = async () => {
    if (!user || !selectedOutletId) {
      toast.error("Pilih outlet terlebih dahulu.");
      return;
    }
    try {
      await setAssignment.mutateAsync({
        userId: user.id,
        outletId: selectedOutletId,
        role: selectedRole,
        isActive: true,
      });
      toast.success("Outlet ditugaskan.");
      await assignmentsQuery.refetch();
      await onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menugaskan outlet.");
    }
  };

  const handleToggleActive = async (assignment: OutletAssignment) => {
    if (!user) return;
    try {
      await setAssignment.mutateAsync({
        userId: user.id,
        outletId: assignment.outletId,
        role: assignment.role,
        isActive: !assignment.isActive,
      });
      await assignmentsQuery.refetch();
      await onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengubah status outlet.");
    }
  };

  const handleRemove = async (assignment: OutletAssignment) => {
    if (!user) return;
    try {
      await removeAssignment.mutateAsync({
        userId: user.id,
        outletId: assignment.outletId,
      });
      toast.success("Penugasan outlet dihapus.");
      await assignmentsQuery.refetch();
      await onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus penugasan.");
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Penugasan Outlet</DialogTitle>
          <DialogDescription>
            Kelola outlet yang dapat diakses oleh{" "}
            <span className="font-semibold">{user?.name ?? user?.email ?? "user"}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tambah Penugasan
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Outlet</Label>
                <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {outletsQuery.data?.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as OutletRole)}
                >
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTLET_ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAdd}
                disabled={setAssignment.isPending || !selectedOutletId}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Tambah
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Outlet Saat Ini
            </p>
            {assignmentsQuery.isLoading ? (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat penugasan...
              </div>
            ) : assignments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Belum ada outlet ditugaskan.
              </p>
            ) : (
              <ul className="space-y-2">
                {assignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {assignment.outletName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.outletCode} ·{" "}
                        {OUTLET_ROLE_OPTIONS.find((o) => o.value === assignment.role)?.label ?? assignment.role}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(assignment)}
                        className="h-7 text-xs"
                      >
                        {assignment.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(assignment)}
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        aria-label={`Hapus penugasan ${assignment.outletName}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({
  user,
  onOpenChange,
  onSuccess,
}: {
  user: UserRow | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const deleteUser = api.users.delete.useMutation();

  const handleConfirm = async () => {
    if (!user) return;
    try {
      await deleteUser.mutateAsync({ id: user.id });
      toast.success("User dihapus.");
      onOpenChange(false);
      await onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus user.");
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus User</DialogTitle>
          <DialogDescription>
            Tindakan ini permanen. User dengan riwayat transaksi tidak dapat dihapus —
            cabut akses outlet sebagai pengganti.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-background/60 p-4 text-sm">
          <p className="text-muted-foreground">Anda akan menghapus:</p>
          <p className="mt-1 font-semibold">{user?.name ?? "Tanpa nama"}</p>
          <p className="text-muted-foreground">{user?.email ?? "—"}</p>
          <p className="mt-1">
            <Badge variant={roleBadgeVariant(user?.role ?? "CASHIER")}>
              {ROLE_OPTIONS.find((opt) => opt.value === user?.role)?.label ?? user?.role}
            </Badge>
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteUser.isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteUser.isPending}
          >
            {deleteUser.isPending ? "Menghapus..." : "Hapus Permanen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
