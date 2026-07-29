"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Coins,
  Loader2,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/client";
import { CustomerTier } from "@/server/db/enums";

type TierValue = keyof typeof CustomerTier;

const TIER_OPTIONS: { value: TierValue; label: string }[] = [
  { value: "REGULAR", label: "Reguler" },
  { value: "SILVER", label: "Silver" },
  { value: "GOLD", label: "Gold" },
  { value: "PLATINUM", label: "Platinum" },
];

const POINT_TYPE_OPTIONS = [
  { value: "EARNED", label: "Poin Masuk (Earned)" },
  { value: "REDEEMED", label: "Penukaran (Redeemed)" },
  { value: "ADJUSTED", label: "Koreksi Manual (Adjusted)" },
  { value: "EXPIRED", label: "Kedaluwarsa (Expired)" },
] as const;

type PointType = (typeof POINT_TYPE_OPTIONS)[number]["value"];

const tierBadgeClass = (tier: TierValue) => {
  if (tier === "PLATINUM") return "border-violet-500/40 text-violet-600";
  if (tier === "GOLD") return "border-amber-500/40 text-amber-600";
  if (tier === "SILVER") return "border-slate-400/40 text-slate-600";
  return "text-muted-foreground";
};

const tierLabel = (tier: string) =>
  TIER_OPTIONS.find((opt) => opt.value === tier)?.label ?? tier;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  membershipCard: string | null;
  tier: string;
  points: number;
  totalSpent: number;
  visitCount: number;
  lastVisitAt: string | null;
  notes: string | null;
  isActive: boolean;
};

type CustomerForm = {
  name: string;
  email: string;
  phone: string;
  membershipCard: string;
  tier: TierValue;
  notes: string;
};

const EMPTY_FORM: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  membershipCard: "",
  tier: "REGULAR",
  notes: "",
};

export default function ManagementCustomersPage() {
  const { data: session, status } = useSession();
  const utils = api.useContext();

  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TierValue | "ALL">("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [adjusting, setAdjusting] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState<CustomerRow | null>(null);

  const outletsQuery = api.outlets.list.useQuery();

  const outlets = outletsQuery.data ?? [];
  const activeOutletId = selectedOutletId || outlets[0]?.id || "";

  const customersQuery = api.customers.list.useQuery(
    {
      outletId: activeOutletId,
      search: search.trim() || undefined,
      tier: tierFilter === "ALL" ? undefined : CustomerTier[tierFilter],
      take: 50,
    },
    { enabled: Boolean(activeOutletId) },
  );

  const currentUserRole = session?.user?.role;
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const invalidate = async () => {
    await utils.customers.list.invalidate();
  };

  const summary = useMemo(() => {
    const rows = customersQuery.data?.customers ?? [];
    return {
      total: rows.length,
      totalPoints: rows.reduce((sum, c) => sum + c.points, 0),
      totalSpent: rows.reduce((sum, c) => sum + c.totalSpent, 0),
    };
  }, [customersQuery.data]);

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
            Halaman manajemen pelanggan hanya tersedia untuk Owner atau Admin.
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
                Manajemen Pelanggan
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold" data-testid="customers-title">
              Pelanggan &amp; Loyalitas
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola data pelanggan, tier keanggotaan, dan saldo poin loyalitas.
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2"
            disabled={!activeOutletId}
            data-testid="customer-add-button"
          >
            <UserPlus className="h-4 w-4" />
            Tambah Pelanggan
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total Pelanggan
          </p>
          <p className="mt-1 text-2xl font-semibold" data-testid="customers-count">
            {summary.total}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total Poin
          </p>
          <p className="mt-1 text-2xl font-semibold">{summary.totalPoints}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total Belanja
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatCurrency(summary.totalSpent)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="customer-search">Cari pelanggan</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="customer-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nama, email, telepon, atau kartu member"
                className="pl-9"
                data-testid="customer-search-input"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:w-48">
            <Label htmlFor="customer-outlet">Outlet</Label>
            <Select
              value={activeOutletId}
              onValueChange={setSelectedOutletId}
              disabled={outletsQuery.isLoading || outlets.length === 0}
            >
              <SelectTrigger id="customer-outlet">
                <SelectValue placeholder="Pilih outlet" />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:w-40">
            <Label htmlFor="customer-tier-filter">Tier</Label>
            <Select
              value={tierFilter}
              onValueChange={(value) => setTierFilter(value as TierValue | "ALL")}
            >
              <SelectTrigger id="customer-tier-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua tier</SelectItem>
                {TIER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!activeOutletId ? (
          <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Pilih outlet terlebih dahulu untuk melihat daftar pelanggan.
          </div>
        ) : customersQuery.isLoading ? (
          <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Memuat daftar pelanggan...
          </div>
        ) : customersQuery.error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Gagal memuat daftar pelanggan: {customersQuery.error.message}
          </div>
        ) : summary.total > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Kartu Member</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Poin</TableHead>
                <TableHead className="text-right">Total Belanja</TableHead>
                <TableHead>Kunjungan Terakhir</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersQuery.data?.customers.map((customer) => (
                <TableRow key={customer.id} data-testid="customer-row">
                  <TableCell className="font-medium">
                    {customer.name}
                    {!customer.isActive && (
                      <Badge variant="outline" className="ml-2 text-muted-foreground">
                        Nonaktif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.phone ?? customer.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.membershipCard ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={tierBadgeClass(customer.tier as TierValue)}
                    >
                      {tierLabel(customer.tier)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {customer.points}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(customer.totalSpent)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(customer.lastVisitAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => setAdjusting(customer)}
                      >
                        <Coins className="h-3.5 w-3.5" />
                        Poin
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(customer)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(customer)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div
            className="rounded-xl border border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground"
            data-testid="customers-empty"
          >
            {search.trim()
              ? `Tidak ada pelanggan yang cocok dengan "${search.trim()}".`
              : "Belum ada pelanggan di outlet ini. Tambahkan pelanggan pertama Anda."}
          </div>
        )}
      </section>

      <CustomerFormDialog
        key={editing?.id ?? "create"}
        open={createOpen || Boolean(editing)}
        mode={editing ? "edit" : "create"}
        outletId={activeOutletId}
        customer={editing}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        onSaved={invalidate}
      />

      <AdjustPointsDialog
        key={adjusting?.id ?? "adjust"}
        customer={adjusting}
        outletId={activeOutletId}
        onClose={() => setAdjusting(null)}
        onSaved={invalidate}
      />

      <DeleteCustomerDialog
        customer={deleting}
        outletId={activeOutletId}
        onClose={() => setDeleting(null)}
        onDeleted={invalidate}
      />
    </div>
  );
}

function CustomerFormDialog({
  open,
  mode,
  outletId,
  customer,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  outletId: string;
  customer: CustomerRow | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<CustomerForm>(
    customer
      ? {
          name: customer.name,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          membershipCard: customer.membershipCard ?? "",
          tier: customer.tier as TierValue,
          notes: customer.notes ?? "",
        }
      : EMPTY_FORM,
  );

  const createMutation = api.customers.create.useMutation({
    onSuccess: async () => {
      toast.success("Pelanggan berhasil ditambahkan");
      await onSaved();
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = api.customers.update.useMutation({
    onSuccess: async () => {
      toast.success("Data pelanggan berhasil diperbarui");
      await onSaved();
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      membershipCard: form.membershipCard.trim(),
      tier: CustomerTier[form.tier],
      notes: form.notes.trim(),
      outletId,
    };

    if (mode === "create") {
      createMutation.mutate(payload);
    } else if (customer) {
      updateMutation.mutate({ ...payload, id: customer.id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Tambah Pelanggan" : "Edit Pelanggan"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Daftarkan pelanggan baru untuk program loyalitas."
                : "Perbarui data pelanggan dan tier keanggotaannya."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">Nama *</Label>
              <Input
                id="customer-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                data-testid="customer-name-input"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="customer-phone">Telepon</Label>
                <Input
                  id="customer-phone"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  placeholder="08xxxxxxxxxx"
                  data-testid="customer-phone-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="customer-card">Kartu Member</Label>
                <Input
                  id="customer-card"
                  value={form.membershipCard}
                  onChange={(event) =>
                    setForm({ ...form, membershipCard: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer-tier">Tier</Label>
                <Select
                  value={form.tier}
                  onValueChange={(value) => setForm({ ...form, tier: value as TierValue })}
                >
                  <SelectTrigger id="customer-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customer-notes">Catatan</Label>
              <Textarea
                id="customer-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending} data-testid="customer-submit">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Simpan" : "Perbarui"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdjustPointsDialog({
  customer,
  outletId,
  onClose,
  onSaved,
}: {
  customer: CustomerRow | null;
  outletId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [points, setPoints] = useState("");
  const [type, setType] = useState<PointType>("ADJUSTED");
  const [reference, setReference] = useState("");

  const adjustMutation = api.customers.adjustPoints.useMutation({
    onSuccess: async (result) => {
      toast.success(`Poin diperbarui — saldo baru ${result.customer.points}`);
      await onSaved();
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  const parsedPoints = Number.parseInt(points, 10);
  const isValid = Number.isFinite(parsedPoints) && parsedPoints !== 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!customer || !isValid) return;

    // REDEEMED and EXPIRED always reduce the balance, so normalise the sign here
    // instead of asking the operator to type a minus.
    const signed =
      type === "REDEEMED" || type === "EXPIRED"
        ? -Math.abs(parsedPoints)
        : parsedPoints;

    adjustMutation.mutate({
      customerId: customer.id,
      points: signed,
      type,
      reference: reference.trim() || undefined,
      outletId,
    });
  };

  return (
    <Dialog open={Boolean(customer)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Sesuaikan Poin</DialogTitle>
            <DialogDescription>
              {customer
                ? `${customer.name} — saldo saat ini ${customer.points} poin.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="point-type">Jenis</Label>
              <Select value={type} onValueChange={(value) => setType(value as PointType)}>
                <SelectTrigger id="point-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POINT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="point-amount">Jumlah Poin *</Label>
              <Input
                id="point-amount"
                type="number"
                min={1}
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                required
                data-testid="point-amount-input"
              />
              <p className="text-xs text-muted-foreground">
                {type === "REDEEMED" || type === "EXPIRED"
                  ? "Jumlah ini akan mengurangi saldo poin."
                  : "Jumlah ini akan menambah saldo poin."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="point-reference">Referensi</Label>
              <Input
                id="point-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Nomor struk atau alasan koreksi"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={adjustMutation.isPending || !isValid}
              data-testid="point-submit"
            >
              {adjustMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCustomerDialog({
  customer,
  outletId,
  onClose,
  onDeleted,
}: {
  customer: CustomerRow | null;
  outletId: string;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const deleteMutation = api.customers.delete.useMutation({
    onSuccess: async () => {
      toast.success("Pelanggan berhasil dihapus");
      await onDeleted();
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog open={Boolean(customer)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus Pelanggan</DialogTitle>
          <DialogDescription>
            {customer
              ? `Hapus "${customer.name}"? Tindakan ini tidak dapat dibatalkan. Pelanggan yang sudah memiliki riwayat transaksi tidak dapat dihapus.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() =>
              customer && deleteMutation.mutate({ id: customer.id, outletId })
            }
            data-testid="customer-delete-confirm"
          >
            {deleteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
