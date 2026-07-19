"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarcodeRenderer } from "@/components/ui/barcode";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BarcodePrintDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  productName?: string;
  priceLabel?: string;
};

/**
 * Printable barcode label. Renders the barcode + product metadata in a
 * fixed-size label layout. Print uses a dedicated stylesheet so only the
 * label area is printed.
 */
export function BarcodePrintDialog({
  open,
  onOpenChange,
  value,
  productName,
  priceLabel,
}: BarcodePrintDialogProps) {
  const [copies, setCopies] = useState(1);
  const [labelName, setLabelName] = useState(productName ?? "");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setLabelName(productName ?? "");
  }, [open, productName]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=480,height=640");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html><head><title>Cetak Label Barcode</title>
      <style>
        @page { size: auto; margin: 8mm; }
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 8px; }
        .label-sheet { display: flex; flex-wrap: wrap; gap: 8px; }
        .label { width: 180px; border: 1px dashed #ccc; padding: 8px; text-align: center; box-sizing: border-box; }
        .label svg { width: 100%; height: auto; }
        .label-name { font-size: 11px; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .label-price { font-size: 13px; font-weight: 700; margin-top: 4px; }
      </style></head><body><div class="label-sheet">${content}</div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setTimeout(() => printWindow.close(), 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cetak Label Barcode</DialogTitle>
          <DialogDescription>
            Pratinjau label dan jumlah salinan sebelum dicetak.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-3">
            <div ref={printRef} className="flex flex-wrap gap-2">
              {Array.from({ length: copies }).map((_, i) => (
                <div
                  key={i}
                  className="w-44 rounded border border-dashed border-border p-2 text-center"
                >
                  <p className="truncate text-xs font-semibold">{labelName || "Produk"}</p>
                  <BarcodeRenderer value={value} format="CODE128" height={50} margin={2} fontSize={12} />
                  {priceLabel ? (
                    <p className="text-sm font-bold">{priceLabel}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="label-name" className="text-xs">Nama di Label</Label>
              <Input
                id="label-name"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                maxLength={28}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="copies" className="text-xs">Jumlah Salinan</Label>
              <Input
                id="copies"
                type="number"
                min={1}
                max={50}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handlePrint} disabled={!value} className="gap-1">
            <Printer className="h-4 w-4" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
