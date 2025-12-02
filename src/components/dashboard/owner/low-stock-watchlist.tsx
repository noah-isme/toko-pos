"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LowStockItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  severity: "critical" | "low" | "warning";
}

interface LowStockWatchlistProps {
  data: LowStockItem[];
  maxDisplay?: number;
  onViewAll?: () => void;
  className?: string;
}

export function LowStockWatchlist({
  data,
  maxDisplay = 5,
  onViewAll,
  className,
}: LowStockWatchlistProps) {
  const displayData = data.slice(0, maxDisplay);
  const hasMore = data.length > maxDisplay;

  const getSeverityColor = (severity: LowStockItem["severity"]) => {
    switch (severity) {
      case "critical":
        return "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/30";
      case "low":
        return "text-orange-700 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30";
      case "warning":
        return "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30";
    }
  };

  const getSeverityLabel = (severity: LowStockItem["severity"]) => {
    switch (severity) {
      case "critical":
        return "Kritis";
      case "low":
        return "Rendah";
      case "warning":
        return "Peringatan";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className={cn(
        "rounded-xl border bg-card transition-shadow hover:shadow-md",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b p-6">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <h3 className="text-base font-semibold text-foreground lg:text-lg">
              Stok Hampir Habis
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.length} item memerlukan perhatian
          </p>
        </div>
        {onViewAll && hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="hidden items-center gap-1 text-xs lg:flex"
          >
            Lihat Semua
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Content */}
      {displayData.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            Semua stok dalam kondisi baik
          </p>
          <p className="text-xs text-muted-foreground">
            Tidak ada item yang perlu diperhatikan
          </p>
        </div>
      ) : (
        <>
          {/* Desktop List */}
          <div className="hidden divide-y lg:block">
            {displayData.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      getSeverityColor(item.severity),
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {item.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Min: {item.minStock} {item.unit}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">
                      {item.currentStock}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.unit}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-semibold",
                      getSeverityColor(item.severity),
                    )}
                  >
                    {getSeverityLabel(item.severity)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Mobile List */}
          <div className="divide-y lg:hidden">
            {displayData.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                className="space-y-2 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        getSeverityColor(item.severity),
                      )}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {item.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Stok: {item.currentStock} {item.unit}
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-semibold",
                      getSeverityColor(item.severity),
                    )}
                  >
                    {getSeverityLabel(item.severity)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Mobile View All Button */}
          {onViewAll && hasMore && (
            <div className="border-t p-4 lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={onViewAll}
                className="w-full"
              >
                Lihat Semua ({data.length})
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
