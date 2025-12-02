"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/trpc/client";
import { useOutlet } from "@/lib/outlet-context";
import { Button } from "@/components/ui/button";

function fmt(n: number | null) {
  if (n === null) {
    return "-";
  }
  return new Intl.NumberFormat("id-ID").format(n);
}

export default function LowStockWidget() {
  const { currentOutlet } = useOutlet();

  const alertsQuery = api.inventory.listLowStock.useQuery(
    { outletId: currentOutlet?.id ?? "", limit: 10 },
    { enabled: Boolean(currentOutlet?.id) },
  );

  const acknowledgeMutation = api.inventory.acknowledgeLowStock.useMutation({
    onSuccess: async () => {
      await alertsQuery.refetch();
    },
  });

  const items = alertsQuery.data ?? [];

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeMutation.mutateAsync({ alertId });
      toast.success("Alert ditandai selesai.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengarsipkan alert.";
      toast.error(message);
    }
  };

  const renderSeverity = (quantity: number | null, minStock: number) => {
    if (quantity === 0) {
      return <span className="text-xs font-semibold text-destructive">Kritikal</span>;
    }
    if (quantity !== null && quantity <= minStock) {
      return <span className="text-xs font-semibold text-amber-600">Rendah</span>;
    }
    return <span className="text-xs text-muted-foreground">Stabil</span>;
  };

  return (
    <div className="p-4 bg-card border border-border rounded-md">
      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        Alert Stok Rendah
      </h3>
      <div className="text-sm text-muted-foreground mb-3">
        Produk kritikal{currentOutlet ? ` di ${currentOutlet.name}` : ""}.
      </div>
      {alertsQuery.isLoading && <div className="text-sm">Memuat …</div>}
      {items.length === 0 && !alertsQuery.isLoading && (
        <div className="text-sm text-muted-foreground">Semua stok aman.</div>
      )}
      <div className="space-y-2">
        {items.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between gap-3 rounded border px-3 py-2"
          >
            <div className="flex flex-col">
              <Link href="/management/stock" className="text-sm font-medium hover:underline">
                {alert.productName}
              </Link>
              <span className="text-xs text-muted-foreground">
                SKU {alert.productSku ?? "-"} · Qty {fmt(alert.quantity)} / Min {alert.minStock}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              {renderSeverity(alert.quantity, alert.minStock)}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Acknowledge alert"
                onClick={() => handleAcknowledge(alert.id)}
                disabled={acknowledgeMutation.isPending}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
