"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Store } from "lucide-react";
import { cn } from "@/lib/utils";

interface OutletPerformance {
  id: string;
  name: string;
  sales: number;
  transactions: number;
  avgTicket: number;
  trend: {
    value: number;
    direction: "up" | "down";
  };
}

interface OutletPerformanceTableProps {
  data: OutletPerformance[];
  onOutletClick?: (outletId: string) => void;
  className?: string;
}

export function OutletPerformanceTable({
  data,
  onOutletClick,
  className,
}: OutletPerformanceTableProps) {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format compact currency
  const formatCompactCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `Rp${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `Rp${(value / 1_000).toFixed(1)}K`;
    }
    return formatCurrency(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className={cn(
        "rounded-xl border bg-card transition-shadow hover:shadow-md",
        className,
      )}
    >
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground lg:text-lg">
            Performa Outlet
          </h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Ringkasan penjualan per outlet
        </p>
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Outlet
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Penjualan
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Transaksi
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Avg Ticket
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((outlet, index) => (
              <motion.tr
                key={outlet.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                onClick={() => onOutletClick?.(outlet.id)}
                className={cn(
                  "group transition-colors",
                  onOutletClick && "cursor-pointer hover:bg-muted/50",
                )}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Store className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-foreground">
                      {outlet.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-semibold text-foreground">
                    {formatCompactCurrency(outlet.sales)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-foreground">{outlet.transactions}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-foreground">
                    {formatCurrency(outlet.avgTicket)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
                        outlet.trend.direction === "up"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
                      )}
                    >
                      {outlet.trend.direction === "up" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{outlet.trend.value}%</span>
                    </span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="divide-y lg:hidden">
        {data.map((outlet, index) => (
          <motion.div
            key={outlet.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
            onClick={() => onOutletClick?.(outlet.id)}
            className={cn(
              "space-y-3 p-4 transition-colors",
              onOutletClick && "active:bg-muted/50",
            )}
          >
            {/* Outlet Name & Trend */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {outlet.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {outlet.transactions} transaksi
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
                  outlet.trend.direction === "up"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
                )}
              >
                {outlet.trend.direction === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{outlet.trend.value}%</span>
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Penjualan</div>
                <div className="mt-0.5 font-semibold text-foreground">
                  {formatCompactCurrency(outlet.sales)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Avg Ticket</div>
                <div className="mt-0.5 font-semibold text-foreground">
                  {formatCurrency(outlet.avgTicket)}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
