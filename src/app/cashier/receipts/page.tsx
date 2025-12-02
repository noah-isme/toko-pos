"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useOutlet } from "@/lib/outlet-context";
import { Badge } from "@/components/ui/badge";
import { MotionButton as Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { MotionTableBody, MotionTableRow } from "@/components/ui/motion-table";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/trpc/client";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function ReceiptHistoryPage() {
  const { currentOutlet, userOutlets, setCurrentOutlet, activeShift } = useOutlet();
  const outlets = userOutlets.map((entry) => entry.outlet);
  const activeOutlet = currentOutlet;
  const activeOutletId = activeOutlet?.id ?? null;
  const [actionReason, setActionReason] = useState("");
  const [afterSalesAction, setAfterSalesAction] = useState<{
    type: "void" | "refund";
    sale: { id: string; receiptNumber: string; totalNet: number };
  } | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const receiptsQuery = api.sales.getReceiptsByOutlet.useQuery(
    { outletId: activeOutletId ?? "" },
    { enabled: Boolean(activeOutletId) },
  );
  const printReceipt = api.sales.printReceipt.useMutation();
  const voidSale = api.sales.voidSale.useMutation();
  const refundSale = api.sales.refundSale.useMutation();

  const isLoading = receiptsQuery.isLoading || receiptsQuery.isFetching;
  const receipts = useMemo(() => receiptsQuery.data ?? [], [receiptsQuery.data]);

  useEffect(() => {
    if (!receiptUrl) return;
    return () => {
      URL.revokeObjectURL(receiptUrl);
    };
  }, [receiptUrl]);

  const handleReprint = async (saleId: string, receiptNumber: string) => {
    try {
      const receipt = await printReceipt.mutateAsync({ saleId, paperSize: "58MM" });
      const bytes = Uint8Array.from(atob(receipt.base64), (char) => char.charCodeAt(0));
      const file = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(file);
      setReceiptUrl(url);
      window.open(url, "_blank", "noopener");
      toast.success(`Struk ${receiptNumber} siap dicetak ulang.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mencetak ulang struk.";
      toast.error(message);
    }
  };

  const openAfterSalesDialog = (
    sale: { id: string; receiptNumber: string; totalNet: number },
    type: "void" | "refund",
  ) => {
    setAfterSalesAction({ type, sale });
    setActionReason("");
  };

  const handleAfterSalesConfirm = async () => {
    if (!afterSalesAction) return;
    const reason = actionReason.trim();

    if (reason.length < 3) {
      toast.error("Alasan minimal 3 karakter.");
      return;
    }

    try {
      if (afterSalesAction.type === "void") {
        await voidSale.mutateAsync({ saleId: afterSalesAction.sale.id, reason });
        toast.success(`Struk ${afterSalesAction.sale.receiptNumber} dibatalkan.`);
      } else {
        await refundSale.mutateAsync({
          saleId: afterSalesAction.sale.id,
          reason,
          amount: afterSalesAction.sale.totalNet,
        });
        toast.success(`Refund ${afterSalesAction.sale.receiptNumber} berhasil.`);
      }
      setAfterSalesAction(null);
      setActionReason("");
      await receiptsQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memproses tindakan.";
      toast.error(message);
    }
  };

  const resetAfterSalesDialog = () => {
    if (voidSale.isPending || refundSale.isPending) return;
    setAfterSalesAction(null);
    setActionReason("");
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Riwayat Struk</p>
            <h1 className="text-3xl font-semibold text-foreground">{activeOutlet?.name ?? "Outlet belum dipilih"}</h1>
            <p className="text-muted-foreground">
              Lihat 10 transaksi terakhir, cetak ulang struk 58mm, dan batalkan transaksi yang bermasalah.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/cashier">Kembali ke Kasir</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => receiptsQuery.refetch()}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filter Outlet</CardTitle>
          <CardDescription>Pilih outlet untuk melihat transaksi terkait.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Label htmlFor="outlet" className="text-sm text-muted-foreground">
            Outlet Aktif
          </Label>
          <select
            id="outlet"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={activeOutletId ?? ""}
            onChange={(event) => {
              const selected = outlets.find((outlet) => outlet.id === event.target.value);
              if (selected) {
                setCurrentOutlet(selected);
              }
            }}
          >
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>10 Transaksi Terakhir</CardTitle>
          <CardDescription>Gunakan aksi di kolom terakhir untuk mencetak ulang atau melakukan void.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table className="[&_tbody]:block [&_tbody]:max-h-[460px] [&_tbody]:overflow-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Nomor Struk</TableHead>
                  <TableHead className="w-40">Waktu</TableHead>
                  <TableHead className="w-40">Kasir</TableHead>
                  <TableHead className="w-40">Shift</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                  <TableHead className="w-40">Metode</TableHead>
                  <TableHead className="w-32 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <MotionTableBody>
                {isLoading ? (
                  <MotionTableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat riwayat transaksi…
                      </div>
                    </TableCell>
                  </MotionTableRow>
                ) : receipts.length === 0 ? (
                  <MotionTableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Belum ada transaksi untuk outlet ini.
                    </TableCell>
                  </MotionTableRow>
                ) : (
                  receipts.map((sale) => {
                    const isCompleted = sale.status === "COMPLETED";
                    return (
                      <MotionTableRow key={sale.id} className="border-b">
                        <TableCell className="font-medium text-foreground">
                          <div className="flex flex-col gap-1">
                            <span>{sale.receiptNumber}</span>
                            {sale.status !== "COMPLETED" ? (
                              <Badge variant="outline" className="w-fit text-xs uppercase">
                                {sale.status === "VOIDED"
                                  ? "Void"
                                  : sale.status === "REFUNDED"
                                    ? "Refund"
                                    : sale.status}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(sale.soldAt).toLocaleString("id-ID")}</TableCell>
                        <TableCell>{sale.cashierName ?? "-"}</TableCell>
                        <TableCell>
                          {sale.shiftOpenedAt
                            ? new Date(sale.shiftOpenedAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(sale.totalNet)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {sale.paymentMethods.map((method) => (
                              <Badge key={`${sale.id}-${method}`} variant="secondary" className="text-xs">
                                {method}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => void handleReprint(sale.id, sale.receiptNumber)}
                              disabled={printReceipt.isPending}
                            >
                              {printReceipt.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Cetak Ulang
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                openAfterSalesDialog(
                                  {
                                    id: sale.id,
                                    receiptNumber: sale.receiptNumber,
                                    totalNet: sale.totalNet,
                                  },
                                  "void",
                                )
                              }
                              disabled={!isCompleted || voidSale.isPending}
                            >
                              Void
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openAfterSalesDialog(
                                  {
                                    id: sale.id,
                                    receiptNumber: sale.receiptNumber,
                                    totalNet: sale.totalNet,
                                  },
                                  "refund",
                                )
                              }
                              disabled={!isCompleted || refundSale.isPending}
                            >
                              Refund
                            </Button>
                          </div>
                        </TableCell>
                      </MotionTableRow>
                    );
                  })
                )}
              </MotionTableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(afterSalesAction)} onOpenChange={(open) => !open && resetAfterSalesDialog()}>
        <DialogContent className="max-w-md">
          {afterSalesAction ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {afterSalesAction.type === "void" ? "Konfirmasi Void Struk" : "Konfirmasi Refund"}
                </DialogTitle>
                <DialogDescription>
                  {afterSalesAction.type === "void"
                    ? "Pembatalan akan mengembalikan stok ke gudang. Masukkan alasan untuk audit."
                    : "Refund akan mengembalikan dana dan stok. Cantumkan alasan singkat."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="text-sm font-semibold text-foreground">
                    {afterSalesAction.sale.receiptNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Nominal {formatCurrency(afterSalesAction.sale.totalNet)}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="receipt-action-reason" className="text-xs font-semibold text-muted-foreground">
                    Alasan
                  </Label>
                  <Input
                    id="receipt-action-reason"
                    value={actionReason}
                    onChange={(event) => setActionReason(event.target.value)}
                    placeholder="Contoh: Produk rusak / transaksi ganda"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetAfterSalesDialog}
                  disabled={voidSale.isPending || refundSale.isPending}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleAfterSalesConfirm()}
                  disabled={voidSale.isPending || refundSale.isPending}
                >
                  {(voidSale.isPending || refundSale.isPending) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {afterSalesAction.type === "void" ? "Konfirmasi Void" : "Konfirmasi Refund"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
