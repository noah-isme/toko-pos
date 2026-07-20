"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  ScrollText,
  ShieldAlert,
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
import { Role } from "@/server/db/enums";

type ActionLabel =
  | "SHIFT_OPEN"
  | "SHIFT_CLOSE"
  | "SALE_RECORD"
  | "SALE_VOID"
  | "SALE_REFUND"
  | "LOW_STOCK_TRIGGER"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "USER_OUTLET_ASSIGN"
  | "USER_OUTLET_REVOKE"
  | "PRODUCT_CREATE"
  | "PRODUCT_UPDATE"
  | "PRODUCT_DELETE"
  | "PRODUCT_ARCHIVE"
  | "PROMOTION_CREATE"
  | "PROMOTION_UPDATE"
  | "OUTLET_CREATE"
  | "OUTLET_UPDATE";

const ACTION_GROUPS: { label: string; actions: ActionLabel[] }[] = [
  {
    label: "Shift & Penjualan",
    actions: ["SHIFT_OPEN", "SHIFT_CLOSE", "SALE_RECORD", "SALE_VOID", "SALE_REFUND", "LOW_STOCK_TRIGGER"],
  },
  {
    label: "Manajemen User",
    actions: ["USER_CREATE", "USER_UPDATE", "USER_DELETE", "USER_OUTLET_ASSIGN", "USER_OUTLET_REVOKE"],
  },
  {
    label: "Produk",
    actions: ["PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE", "PRODUCT_ARCHIVE"],
  },
  {
    label: "Promosi & Outlet",
    actions: ["PROMOTION_CREATE", "PROMOTION_UPDATE", "OUTLET_CREATE", "OUTLET_UPDATE"],
  },
];

const ALL_ACTIONS = ACTION_GROUPS.flatMap((g) => g.actions);

const ACTION_VARIANT: Record<ActionLabel, "default" | "secondary" | "outline" | "destructive"> = {
  SHIFT_OPEN: "secondary",
  SHIFT_CLOSE: "secondary",
  SALE_RECORD: "default",
  SALE_VOID: "destructive",
  SALE_REFUND: "destructive",
  LOW_STOCK_TRIGGER: "outline",
  USER_CREATE: "default",
  USER_UPDATE: "secondary",
  USER_DELETE: "destructive",
  USER_OUTLET_ASSIGN: "secondary",
  USER_OUTLET_REVOKE: "outline",
  PRODUCT_CREATE: "default",
  PRODUCT_UPDATE: "secondary",
  PRODUCT_DELETE: "destructive",
  PRODUCT_ARCHIVE: "outline",
  PROMOTION_CREATE: "default",
  PROMOTION_UPDATE: "secondary",
  OUTLET_CREATE: "default",
  OUTLET_UPDATE: "secondary",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

type ActivityEntry = {
  id: string;
  timestamp: string;
  type: string;
  userId: string | null;
  user: string;
  outletId: string | null;
  outlet: string;
  entity: string | null;
  entityId: string | null;
  description: string;
  metadata?: Record<string, unknown>;
};

const PAGE_SIZE = 25;

export default function ManagementAuditLogPage() {
  const { data: session, status } = useSession();
  const utils = api.useContext();
  const [filters, setFilters] = useState<{
    outletId?: string;
    userId?: string;
    action?: ActionLabel;
    from?: string;
    to?: string;
  }>({});
  const [offset, setOffset] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detail, setDetail] = useState<ActivityEntry | null>(null);

  const currentUserRole = (session?.user?.role as Role | undefined) ?? undefined;
  const canManage = currentUserRole === Role.OWNER || currentUserRole === Role.ADMIN;

  const outletsQuery = api.outlets.list.useQuery();
  const usersQuery = api.users.list.useQuery(undefined, { enabled: canManage });

  const activityQuery = api.analytics.getActivityLog.useQuery(
    {
      outletId: filters.outletId,
      userId: filters.userId,
      action: filters.action,
      ...(filters.from || filters.to
        ? {
            dateRange: {
              from: filters.from ? new Date(filters.from) : new Date(0),
              to: filters.to ? new Date(filters.to) : new Date(),
            },
          }
        : {}),
      limit: PAGE_SIZE,
      offset,
    },
  );

  // Reset offset whenever filters change.
  useEffect(() => {
    setOffset(0);
  }, [filters.outletId, filters.userId, filters.action, filters.from, filters.to]);

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
            Log audit hanya tersedia untuk Owner atau Admin.
          </p>
        </div>
      </div>
    );
  }

  const activities = activityQuery.data?.activities ?? [];
  const total = activityQuery.data?.total ?? 0;
  const hasMore = activityQuery.data?.hasMore ?? false;
  const isLoading = activityQuery.isLoading || activityQuery.isFetching;

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ScrollText className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Log Audit
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold">Riwayat Aktivitas Sistem</h1>
            <p className="text-sm text-muted-foreground">
              Lacak setiap aksi admin, transaksi, dan perubahan stok di seluruh outlet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setFilterOpen(true)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await utils.analytics.getActivityLog.invalidate();
                toast.success("Log audit diperbarui.");
              }}
              className="gap-2"
            >
              <Activity className="h-4 w-4" />
              Segarkan
            </Button>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.outletId && (
              <FilterChip
                label={`Outlet: ${outletsQuery.data?.find((o) => o.id === filters.outletId)?.name ?? filters.outletId}`}
                onClear={() => setFilters((prev) => ({ ...prev, outletId: undefined }))}
              />
            )}
            {filters.userId && (
              <FilterChip
                label={`User: ${usersQuery.data?.find((u) => u.id === filters.userId)?.name ?? filters.userId}`}
                onClear={() => setFilters((prev) => ({ ...prev, userId: undefined }))}
              />
            )}
            {filters.action && (
              <FilterChip
                label={`Aksi: ${filters.action}`}
                onClear={() => setFilters((prev) => ({ ...prev, action: undefined }))}
              />
            )}
            {filters.from && (
              <FilterChip
                label={`Dari: ${formatDate(filters.from)}`}
                onClear={() => setFilters((prev) => ({ ...prev, from: undefined }))}
              />
            )}
            {filters.to && (
              <FilterChip
                label={`Sampai: ${formatDate(filters.to)}`}
                onClear={() => setFilters((prev) => ({ ...prev, to: undefined }))}
              />
            )}
          </div>
        )}
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 md:p-6">
        {activityQuery.isLoading ? (
          <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Memuat log audit...
          </div>
        ) : activityQuery.error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Gagal memuat log audit: {activityQuery.error.message}
          </div>
        ) : activities.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Entitas</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(activity.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ACTION_VARIANT[activity.type as ActionLabel] ?? "outline"
                        }
                      >
                        {activity.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{activity.user}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {activity.outlet}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {activity.entity ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetail(activity)}
                        disabled={!activity.metadata && !activity.entityId}
                      >
                        Lihat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Menampilkan {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} dari {total} entri
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                  disabled={offset === 0 || isLoading}
                  className="gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                  disabled={!hasMore || isLoading}
                  className="gap-1"
                >
                  Berikutnya
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <ScrollText className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Tidak ada entri log audit yang cocok dengan filter saat ini.
            </p>
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                onClick={() => setFilters({})}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Reset Filter
              </Button>
            )}
          </div>
        )}
      </section>

      <FilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
        onClear={() => {
          setFilters({});
          setFilterOpen(false);
        }}
        outlets={outletsQuery.data ?? []}
        users={usersQuery.data ?? []}
      />

      <DetailDialog entry={detail} onOpenChange={(open) => !open && setDetail(null)} />
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="text-muted-foreground hover:text-foreground"
        aria-label={`Hapus filter ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

type FilterState = {
  outletId?: string;
  userId?: string;
  action?: ActionLabel;
  from?: string;
  to?: string;
};

function FilterDialog({
  open,
  onOpenChange,
  filters,
  onApply,
  onClear,
  outlets,
  users,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterState;
  onApply: (next: FilterState) => void;
  onClear: () => void;
  outlets: { id: string; name: string }[];
  users: { id: string; name: string | null; email: string | null }[];
}) {
  const [draft, setDraft] = useState<FilterState>(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply(draft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Filter Log Audit</DialogTitle>
          <DialogDescription>
            Saring entri berdasarkan outlet, pengguna, jenis aksi, atau rentang tanggal.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Outlet</Label>
              <Select
                value={draft.outletId ?? "all"}
                onValueChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    outletId: value === "all" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua outlet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua outlet</SelectItem>
                  {outlets.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pengguna</Label>
              <Select
                value={draft.userId ?? "all"}
                onValueChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    userId: value === "all" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua pengguna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua pengguna</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name ?? user.email ?? "Tanpa nama"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Jenis Aksi</Label>
            <Select
              value={draft.action ?? "all"}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  action: value === "all" ? undefined : (value as ActionLabel),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua aksi</SelectItem>
                {ACTION_GROUPS.map((group) => (
                  <div key={group.label} className="py-1">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                    {group.actions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Dari</Label>
              <Input
                type="datetime-local"
                value={draft.from ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, from: e.target.value || undefined }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sampai</Label>
              <Input
                type="datetime-local"
                value={draft.to ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, to: e.target.value || undefined }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClear}>
              Reset
            </Button>
            <Button type="submit">Terapkan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({
  entry,
  onOpenChange,
}: {
  entry: ActivityEntry | null;
  onOpenChange: (open: boolean) => void;
}) {
  const formatted = useMemo(() => {
    if (!entry?.metadata) return null;
    try {
      return JSON.stringify(entry.metadata, null, 2);
    } catch {
      return String(entry.metadata);
    }
  }, [entry]);

  return (
    <Dialog open={!!entry} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detail Entri Audit</DialogTitle>
          <DialogDescription>
            {entry ? formatDate(entry.timestamp) : ""}
          </DialogDescription>
        </DialogHeader>
        {entry && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <DetailRow label="Aksi" value={entry.type} />
              <DetailRow label="Pengguna" value={entry.user} />
              <DetailRow label="Outlet" value={entry.outlet} />
              <DetailRow label="Entitas" value={entry.entity ?? "—"} />
              <DetailRow label="Entity ID" value={entry.entityId ?? "—"} />
              <DetailRow label="User ID" value={entry.userId ?? "—"} />
            </div>
            {formatted && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Metadata
                </p>
                <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs">
                  {formatted}
                </pre>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-xs">{value}</p>
    </div>
  );
}
