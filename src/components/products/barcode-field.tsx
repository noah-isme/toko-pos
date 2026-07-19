"use client";

import { useState } from "react";
import { RefreshCw, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarcodeRenderer, generateProductCode } from "@/components/ui/barcode";
import { BarcodePrintDialog } from "@/components/products/barcode-print-dialog";

type BarcodeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  productName?: string;
  sku?: string;
  priceLabel?: string;
  className?: string;
};

/**
 * Combines the manual barcode input with a live Code128 preview, a one-click
 * generator (derives a scannable code from the product name/SKU), and a
 * printable label dialog.
 */
export function BarcodeField({
  value,
  onChange,
  productName,
  sku,
  priceLabel,
  className,
}: BarcodeFieldProps) {
  const [printOpen, setPrintOpen] = useState(false);

  const handleGenerate = () => {
    const code = generateProductCode({ name: productName, sku });
    onChange(code);
  };

  return (
    <div className={className}>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Barcode
          </label>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Scan atau ketik barcode"
            maxLength={64}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          className="gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Generate
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPrintOpen(true)}
          className="gap-1"
          disabled={!value}
        >
          <Printer className="h-3.5 w-3.5" />
          Cetak
        </Button>
      </div>
      {value ? (
        <div className="mt-3 rounded-lg border bg-white p-2">
          <BarcodeRenderer value={value} format="CODE128" height={60} margin={4} />
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Klik Generate untuk membuat kode otomatis dari nama/SKU produk.
        </p>
      )}
      <BarcodePrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        value={value}
        productName={productName}
        priceLabel={priceLabel}
      />
    </div>
  );
}
