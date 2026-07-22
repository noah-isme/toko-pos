"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { api } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, ArrowRight, Check, Ban } from "lucide-react";

type TransferStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

const STATUS_TABS: { label: string; value: TransferStatus | "ALL" }[] = [
  { label: "Semua", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Disetujui", value: "APPROVED" },
  { label: "Selesai", value: "COMPLETED" },
  { label: "Ditolak", value: "REJECTED" },
];

export default function StockTransferPage() {
  const utils = api.useContext();
  const [statusFilter, setStatusFilter] = useState<TransferStatus | "ALL">("ALL");
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const transfersQuery = api.outlets.listStockTransfers.useQuery(
    statusFilter === "ALL" ? {} : { status: statusFilter },
  );

  const outletsQuery = api.outlets.list.useQuery();
  const productsQuery = api.products.list.useQuery({ take: 100 });

  const invalidateTransfers = async () => {
    await utils.outlets.listStockTransfers.invalidate();
  };

  const createMutation = api.outlets.createStockTransfer.useMutation({
    onSuccess: () => {
      toast.success("Transfer stok berhasil dibuat");
      void invalidateTransfers();
    },
    onError: (err) => {
      toast.error("Gagal membuat transfer", { description: err.message });
    },
  });

  const approveMutation = api.outlets.approveStockTransfer.useMutation({
    onSuccess: () => {
      toast.success("Transfer disetujui");
      void invalidateTransfers();
    },
    onError: (err) => {
      toast.error("Gagal menyetujui transfer", { description: err.message });
    },
  });

  const rejectMutation = api.outlets.rejectStockTransfer.useMutation({
    onSuccess: () => {
      toast.success("Transfer ditolak");
      void invalidateTransfers();
    },
    onError: (err) => {
      toast.error("Gagal menolak transfer", { description: err.message });
    },
  });

  const completeMutation = api.outlets.completeStockTransfer.useMutation({
    onSuccess: () => {
      toast.success("Transfer selesai — stok telah dipindahkan");
      void invalidateTransfers();
    },
    onError: (err) => {
      toast.error("Gagal menyelesaikan transfer", { description: err.message });
    },
  });

  const transfers = transfersQuery.data ?? [];

  const getStatusBadge = (status: TransferStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Disetujui
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Selesai
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
            Ditolak
          </Badge>
        );
    }
  };

  const handleViewDetail = (transferId: string) => {
    setSelectedTransferId(transferId);
    setShowDetailDrawer(true);
  };

  const handleApprove = (transferId: string) => {
    approveMutation.mutate({ id: transferId });
    setShowDetailDrawer(false);
  };

  const handleReject = (transferId: string) => {
    rejectMutation.mutate({ id: transferId });
    setShowDetailDrawer(false);
  };

  const handleComplete = (transferId: string) => {
    completeMutation.mutate({ id: transferId });
    setShowDetailDrawer(false);
  };

  const selectedTransfer = transfers.find((t) => t.id === selectedTransferId) ?? null;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Stok Antar Outlet</h1>
              <p className="text-muted-foreground mt-1">
                Ajukan, setujui, dan pindahkan stok antar outlet dengan audit
                lengkap.
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Buat Transfer Stok
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Status Filter Tabs */}
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {transfersQuery.isLoading && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Memuat data transfer...
          </div>
        )}

        {transfersQuery.error && (
          <Card className="p-6 text-center text-sm text-red-600">
            Gagal memuat data: {transfersQuery.error.message}
          </Card>
        )}

        {!transfersQuery.isLoading && !transfersQuery.error && transfers.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              Belum ada transfer stok. Klik &quot;Buat Transfer Stok&quot; untuk memulai.
            </p>
          </Card>
        )}

        {!transfersQuery.isLoading && transfers.length > 0 && (
          <>
            {/* Desktop Table */}
            <Card className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Dari → Ke</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Diajukan Oleh</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow
                      key={transfer.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleViewDetail(transfer.id)}
                    >
                      <TableCell className="font-mono font-medium">
                        {transfer.transferNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {transfer.fromOutletName}
                          </span>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {transfer.toOutletName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">
                            {transfer.productName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {transfer.productSku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">
                        {transfer.quantity}
                      </TableCell>
                      <TableCell>{transfer.requestedByName ?? "—"}</TableCell>
                      <TableCell>{formatDate(transfer.requestedAt)}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetail(transfer.id);
                              }}
                            >
                              Lihat Detail
                            </DropdownMenuItem>
                            {transfer.status === "PENDING" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApprove(transfer.id);
                                  }}
                                >
                                  Setujui
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReject(transfer.id);
                                  }}
                                >
                                  Tolak
                                </DropdownMenuItem>
                              </>
                            )}
                            {transfer.status === "APPROVED" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleComplete(transfer.id);
                                  }}
                                >
                                  Selesaikan Transfer
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Mobile Card List */}
            <div className="space-y-3 md:hidden">
              {transfers.map((transfer) => (
                <Card
                  key={transfer.id}
                  className="cursor-pointer p-4"
                  onClick={() => handleViewDetail(transfer.id)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono font-bold text-sm">
                      {transfer.transferNumber}
                    </span>
                    {getStatusBadge(transfer.status)}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <span>{transfer.fromOutletName}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span>{transfer.toOutletName}</span>
                    </div>
                    <div className="text-gray-600">
                      {transfer.productName} • {transfer.quantity} unit
                    </div>
                    <div className="text-gray-500">
                      {transfer.requestedByName ?? "—"} •{" "}
                      {formatDate(transfer.requestedAt)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Detail Drawer */}
      <Sheet open={showDetailDrawer} onOpenChange={setShowDetailDrawer}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedTransfer && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>
                    Transfer {selectedTransfer.transferNumber}
                  </SheetTitle>
                  {getStatusBadge(selectedTransfer.status)}
                </div>
                <SheetDescription>
                  Detail transfer stok antar outlet
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Transfer Info */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dari Outlet</span>
                    <span className="font-medium">
                      {selectedTransfer.fromOutletName}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ke Outlet</span>
                    <span className="font-medium">
                      {selectedTransfer.toOutletName}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Produk</span>
                    <span className="font-medium">
                      {selectedTransfer.productName}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SKU</span>
                    <span className="font-mono text-sm">
                      {selectedTransfer.productSku}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Jumlah</span>
                    <span className="font-bold">{selectedTransfer.quantity} unit</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Diajukan oleh</span>
                    <span className="font-medium">
                      {selectedTransfer.requestedByName ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tanggal diajukan</span>
                    <span className="font-medium">
                      {formatDateTime(selectedTransfer.requestedAt)}
                    </span>
                  </div>
                  {selectedTransfer.approvedByName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Disetujui/Ditolak oleh
                      </span>
                      <span className="font-medium">
                        {selectedTransfer.approvedByName}
                      </span>
                    </div>
                  )}
                  {selectedTransfer.approvedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Tanggal disetujui/ditolak
                      </span>
                      <span className="font-medium">
                        {formatDateTime(selectedTransfer.approvedAt)}
                      </span>
                    </div>
                  )}
                  {selectedTransfer.completedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Tanggal selesai
                      </span>
                      <span className="font-medium">
                        {formatDateTime(selectedTransfer.completedAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {selectedTransfer.notes && (
                  <div>
                    <h4 className="mb-2 font-semibold text-sm uppercase text-gray-600">
                      Catatan
                    </h4>
                    <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                      {selectedTransfer.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {selectedTransfer.status === "PENDING" && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      className="flex-1"
                      onClick={() => handleApprove(selectedTransfer.id)}
                      disabled={approveMutation.isPending}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Setujui
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 hover:bg-red-50"
                      onClick={() => handleReject(selectedTransfer.id)}
                      disabled={rejectMutation.isPending}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Tolak
                    </Button>
                  </div>
                )}
                {selectedTransfer.status === "APPROVED" && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      className="flex-1"
                      onClick={() => handleComplete(selectedTransfer.id)}
                      disabled={completeMutation.isPending}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Selesaikan Transfer
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Transfer Dialog */}
      <CreateTransferDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        outlets={outletsQuery.data ?? []}
        products={productsQuery.data ?? []}
        isLoading={createMutation.isPending}
        onCreate={(values) => {
          createMutation.mutate(values, {
            onSuccess: () => {
              setShowCreateDialog(false);
            },
          });
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Transfer Dialog (single-product per transfer per Prisma model)
// ---------------------------------------------------------------------------

interface CreateTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outlets: { id: string; name: string; code: string }[];
  products: { id: string; name: string; sku: string }[];
  isLoading: boolean;
  onCreate: (values: {
    productId: string;
    fromOutletId: string;
    toOutletId: string;
    quantity: number;
    notes?: string;
  }) => void;
}

function CreateTransferDialog({
  open,
  onOpenChange,
  outlets,
  products,
  isLoading,
  onCreate,
}: CreateTransferDialogProps) {
  const [productId, setProductId] = useState("");
  const [fromOutletId, setFromOutletId] = useState("");
  const [toOutletId, setToOutletId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!productId || !fromOutletId || !toOutletId) {
      toast.error("Validasi Gagal", {
        description: "Pilih produk dan outlet asal/tujuan",
      });
      return;
    }

    if (fromOutletId === toOutletId) {
      toast.error("Validasi Gagal", {
        description: "Outlet asal dan tujuan harus berbeda",
      });
      return;
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      toast.error("Validasi Gagal", {
        description: "Jumlah harus minimal 1",
      });
      return;
    }

    onCreate({
      productId,
      fromOutletId,
      toOutletId,
      quantity: qty,
      notes: notes.trim() || undefined,
    });

    setProductId("");
    setFromOutletId("");
    setToOutletId("");
    setQuantity("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Transfer Stok</DialogTitle>
          <DialogDescription>
            Ajukan transfer stok dari satu outlet ke outlet lainnya. Transfer
            akan melalui persetujuan sebelum stok dipindahkan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="product">Produk</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Pilih produk" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from-outlet">Dari Outlet</Label>
              <Select value={fromOutletId} onValueChange={setFromOutletId}>
                <SelectTrigger id="from-outlet">
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

            <div>
              <Label htmlFor="to-outlet">Ke Outlet</Label>
              <Select value={toOutletId} onValueChange={setToOutletId}>
                <SelectTrigger id="to-outlet">
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
          </div>

          <div>
            <Label htmlFor="quantity">Jumlah</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Masukkan jumlah"
            />
          </div>

          <div>
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan opsional untuk transfer ini..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Buat Transfer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
