"use client";

import { motion } from "framer-motion";
import { Clock, User, DollarSign, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface ShiftData {
  id: string;
  cashierName: string;
  startTime: Date;
  endTime?: Date;
  sales: number;
  transactions: number;
  isActive: boolean;
}

interface ShiftMonitoringProps {
  data: ShiftData[];
  title?: string;
  className?: string;
}

export function ShiftMonitoring({
  data,
  title = "Shift Aktif Hari Ini",
  className,
}: ShiftMonitoringProps) {
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

  // Format time range
  const formatTimeRange = (start: Date, end?: Date) => {
    const startTime = format(start, "HH:mm");
    const endTime = end ? format(end, "HH:mm") : "sekarang";
    return `${startTime} – ${endTime}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className={cn(
        "rounded-xl border bg-card transition-shadow hover:shadow-md",
        className,
      )}
    >
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground lg:text-lg">
            {title}
          </h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Monitoring kasir dan transaksi
        </p>
      </div>

      {/* Content */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
          <Clock className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            Belum ada shift aktif
          </p>
          <p className="text-xs text-muted-foreground">
            Shift akan muncul setelah kasir membuka shift
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Kasir
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Waktu
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Penjualan
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Transaksi
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((shift, index) => (
                  <motion.tr
                    key={shift.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-foreground">
                          {shift.cashierName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-foreground">
                        {formatTimeRange(shift.startTime, shift.endTime)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-foreground">
                        {formatCompactCurrency(shift.sales)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-foreground">
                        {shift.transactions}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {shift.isActive ? (
                          <div className="flex items-center gap-2">
                            <motion.div
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                              className="h-2 w-2 rounded-full bg-emerald-500"
                            />
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              LIVE
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground">
                            Selesai
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="divide-y lg:hidden">
            {data.map((shift, index) => (
              <motion.div
                key={shift.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                className="space-y-3 p-4"
              >
                {/* Cashier & Status */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {shift.cashierName}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTimeRange(shift.startTime, shift.endTime)}
                      </div>
                    </div>
                  </div>
                  {shift.isActive && (
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 dark:bg-emerald-950/30">
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="h-2 w-2 rounded-full bg-emerald-500"
                      />
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        LIVE
                      </span>
                    </div>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Penjualan
                      </div>
                      <div className="font-semibold text-foreground">
                        {formatCompactCurrency(shift.sales)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Transaksi
                      </div>
                      <div className="font-semibold text-foreground">
                        {shift.transactions}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
