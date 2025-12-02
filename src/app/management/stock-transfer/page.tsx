"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  SheetTrigger,
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
import { Plus, MoreVertical, ArrowRight, X, Check, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TransferItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
}

interface StockTransfer {
  id: string;
  code: string;
  fromOutlet: string;
  toOutlet: string;
  items: TransferItem[];
  createdBy: string;
  createdAt: Date;
  status: "pending" | "completed" | "cancelled";
  notes?: string;
}

// Mock data
const mockTransfers: StockTransfer[] = [
  {
    id: "1",
    code: "TRF-0012",
    fromOutlet: "BSD",
    toOutlet: "BR2",
    items: [
      {
        id: "1",
        productId: "p1",
        productName: "Air Mineral 600ml",
        quantity: 10,
      },
      { id: "2", productId: "p2", productName: "Gula Pasir 1kg", quantity: 2 },
    ],
    createdBy: "Owner",
    createdAt: new Date("2025-12-02T12:10:00"),
    status: "pending",
    notes: "Kirim stok menjelang weekend",
  },
  {
    id: "2",
    code: "TRF-0011",
    fromOutlet: "BR2",
    toOutlet: "BSD",
    items: [
      { id: "3", productId: "p3", productName: "Kopi Bubuk 200g", quantity: 8 },
    ],
    createdBy: "Admin",
    createdAt: new Date("2025-12-01T09:30:00"),
    status: "completed",
    notes: "",
  },
  {
    id: "3",
    code: "TRF-0010",
    fromOutlet: "BSD",
    toOutlet: "Gudang Pusat",
    items: [
      {
        id: "4",
        productId: "p4",
        productName: "Beras Premium 5kg",
        quantity: 50,
      },
    ],
    createdBy: "Owner",
    createdAt: new Date("2025-11-30T14:00:00"),
    status: "cancelled",
    notes: "Dibatalkan karena stok tidak mencukupi",
  },
];

export default function StockTransferPage() {
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<StockTransfer[]>(mockTransfers);
  const [selectedTransfer, setSelectedTransfer] =
    useState<StockTransfer | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form state for create transfer
  const [fromOutlet, setFromOutlet] = useState("");
  const [toOutlet, setToOutlet] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [newItemProduct, setNewItemProduct] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Pending
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Selesai
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
            Dibatalkan
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewDetail = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer);
    setShowDetailDrawer(true);
  };

  const handleMarkCompleted = (transferId: string) => {
    setTransfers(
      transfers.map((t) =>
        t.id === transferId ? { ...t, status: "completed" as const } : t,
      ),
    );
    toast({
      title: "Berhasil",
      description: "Transfer berhasil ditandai selesai",
    });
    setShowDetailDrawer(false);
  };

  const handleCancelTransfer = (transferId: string) => {
    setTransfers(
      transfers.map((t) =>
        t.id === transferId ? { ...t, status: "cancelled" as const } : t,
      ),
    );
    toast({
      title: "Berhasil",
      description: "Transfer berhasil dibatalkan",
    });
    setShowDetailDrawer(false);
  };

  const handleAddItem = () => {
    if (!newItemProduct || !newItemQuantity) {
      toast({
        title: "Validasi Gagal",
        description: "Pilih produk dan masukkan jumlah",
        variant: "destructive",
      });
      return;
    }

    const newItem: TransferItem = {
      id: Date.now().toString(),
      productId: newItemProduct,
      productName: newItemProduct,
      quantity: parseInt(newItemQuantity),
    };

    setTransferItems([...transferItems, newItem]);
    setNewItemProduct("");
    setNewItemQuantity("");
  };

  const handleRemoveItem = (itemId: string) => {
    setTransferItems(transferItems.filter((item) => item.id !== itemId));
  };

  const handleCreateTransfer = () => {
    if (!fromOutlet || !toOutlet) {
      toast({
        title: "Validasi Gagal",
        description: "Pilih outlet asal dan tujuan",
        variant: "destructive",
      });
      return;
    }

    if (transferItems.length === 0) {
      toast({
        title: "Validasi Gagal",
        description: "Tambahkan minimal satu item",
        variant: "destructive",
      });
      return;
    }

    const newTransfer: StockTransfer = {
      id: Date.now().toString(),
      code: `TRF-${String(transfers.length + 13).padStart(4, "0")}`,
      fromOutlet,
      toOutlet,
      items: transferItems,
      createdBy: "Owner",
      createdAt: new Date(),
      status: "pending",
      notes: transferNotes,
    };

    setTransfers([newTransfer, ...transfers]);
    toast({
      title: "Berhasil",
      description: "Transfer stok berhasil dibuat",
    });

    // Reset form
    setFromOutlet("");
    setToOutlet("");
    setTransferNotes("");
    setTransferItems([]);
    setShowCreateDialog(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Stok Antar Outlet</h1>
              <p className="text-muted-foreground mt-1">
                Pindahkan stok antar outlet dengan catatan yang jelas dan audit
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
        {/* Desktop Table */}
        <Card className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Dari → Ke</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Dibuat Oleh</TableHead>
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
                  onClick={() => handleViewDetail(transfer)}
                >
                  <TableCell className="font-mono font-medium">
                    {transfer.code}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{transfer.fromOutlet}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{transfer.toOutlet}</span>
                    </div>
                  </TableCell>
                  <TableCell>{transfer.items.length} item</TableCell>
                  <TableCell>{transfer.createdBy}</TableCell>
                  <TableCell>
                    {transfer.createdAt.toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
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
                            handleViewDetail(transfer);
                          }}
                        >
                          Lihat Detail
                        </DropdownMenuItem>
                        {transfer.status === "pending" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkCompleted(transfer.id);
                              }}
                            >
                              Tandai Selesai
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelTransfer(transfer.id);
                              }}
                            >
                              Batalkan Transfer
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
              className="cursor-pointer"
              onClick={() => handleViewDetail(transfer)}
            >
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono font-bold text-sm">
                    {transfer.code}
                  </span>
                  {getStatusBadge(transfer.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <span>{transfer.fromOutlet}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span>{transfer.toOutlet}</span>
                  </div>
                  <div className="text-gray-600">
                    {transfer.items.length} item • {transfer.createdBy} •{" "}
                    {transfer.createdAt.toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Detail Drawer */}
      <Sheet open={showDetailDrawer} onOpenChange={setShowDetailDrawer}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedTransfer && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>Transfer {selectedTransfer.code}</SheetTitle>
                  {getStatusBadge(selectedTransfer.status)}
                </div>
                <SheetDescription>Detail transfer stok antar outlet</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Transfer Info */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dari Outlet</span>
                    <span className="font-medium">
                      {selectedTransfer.fromOutlet}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ke Outlet</span>
                    <span className="font-medium">
                      {selectedTransfer.toOutlet}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dibuat oleh</span>
                    <span className="font-medium">
                      {selectedTransfer.createdBy}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tanggal</span>
                    <span className="font-medium">
                      {selectedTransfer.createdAt.toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div>
                  <h4 className="mb-3 font-semibold text-sm uppercase text-gray-600">
                    Daftar Item
                  </h4>
                  <div className="space-y-2">
                    {selectedTransfer.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border bg-gray-50 p-3"
                      >
                        <span className="text-sm font-medium">
                          {item.productName}
                        </span>
                        <span className="text-sm font-bold">
                          {item.quantity} unit
                        </span>
                      </div>
                    ))}
                  </div>
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
                {selectedTransfer.status === "pending" && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      className="flex-1"
                      onClick={() => handleMarkCompleted(selectedTransfer.id)}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Tandai Selesai
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 hover:bg-red-50"
                      onClick={() => handleCancelTransfer(selectedTransfer.id)}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Batalkan
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Transfer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Transfer Stok</DialogTitle>
            <DialogDescription>
              Transfer stok dari satu outlet ke outlet lainnya
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="from-outlet">Dari Outlet</Label>
                <Select value={fromOutlet} onValueChange={setFromOutlet}>
                  <SelectTrigger id="from-outlet">
                    <SelectValue placeholder="Pilih outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BSD">BSD</SelectItem>
                    <SelectItem value="BR2">BR2</SelectItem>
                    <SelectItem value="Gudang Pusat">Gudang Pusat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="to-outlet">Ke Outlet</Label>
                <Select value={toOutlet} onValueChange={setToOutlet}>
                  <SelectTrigger id="to-outlet">
                    <SelectValue placeholder="Pilih outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BSD">BSD</SelectItem>
                    <SelectItem value="BR2">BR2</SelectItem>
                    <SelectItem value="Gudang Pusat">Gudang Pusat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Catatan opsional untuk transfer ini..."
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="mb-3 font-semibold">Tambah Item</h4>

              {/* Add Item Form */}
              <div className="mb-4 flex gap-2">
                <div className="flex-1">
                  <Select
                    value={newItemProduct}
                    onValueChange={setNewItemProduct}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Air Mineral 600ml">
                        Air Mineral 600ml
                      </SelectItem>
                      <SelectItem value="Gula Pasir 1kg">
                        Gula Pasir 1kg
                      </SelectItem>
                      <SelectItem value="Kopi Bubuk 200g">
                        Kopi Bubuk 200g
                      </SelectItem>
                      <SelectItem value="Beras Premium 5kg">
                        Beras Premium 5kg
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  placeholder="Jumlah"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  className="w-24"
                />
                <Button onClick={handleAddItem} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Items List */}
              {transferItems.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-600">
                    Daftar Item ({transferItems.length})
                  </h5>
                  {transferItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border bg-gray-50 p-3"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          {item.productName}
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.quantity} unit
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Batalkan
            </Button>
            <Button onClick={handleCreateTransfer}>Buat Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
