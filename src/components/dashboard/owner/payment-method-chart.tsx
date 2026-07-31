"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

interface PaymentMethodChartProps {
  data: Array<{
    method: string;
    sales: number;
    transactions: number;
    percentage: number;
  }>;
  title?: string;
  height?: number;
  className?: string;
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  CASH: "#10b981",
  CARD: "#3b82f6",
  QRIS: "#8b5cf6",
  EWALLET: "#f59e0b",
};

const FALLBACK_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Tunai",
  CARD: "Kartu",
  QRIS: "QRIS",
  EWALLET: "E-Wallet",
};

export function PaymentMethodChart({
  data,
  title = "Metode Pembayaran",
  height = 300,
  className,
}: PaymentMethodChartProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      label: PAYMENT_METHOD_LABELS[item.method] ?? item.method,
      color:
        PAYMENT_METHOD_COLORS[item.method] ??
        FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    }));
  }, [data]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: { label: string; sales: number; percentage: number; transactions: number };
    }>;
  }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-xs font-medium text-muted-foreground">
            {point.label}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(point.sales)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {point.percentage.toFixed(1)}% · {point.transactions} transaksi
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className={cn(
        "rounded-xl border bg-card p-6 transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
          <Wallet className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground lg:text-lg">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground">
            Berdasarkan nilai transaksi
          </p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Belum ada data pembayaran
        </div>
      ) : (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="mx-auto h-[200px] w-[200px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  isAnimationActive={!prefersReducedMotion}
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="85%"
                  paddingAngle={2}
                  dataKey="sales"
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-1 min-w-0">
            {chartData.map((item, index) => (
              <motion.div
                key={item.method}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                className="flex items-center justify-between gap-2 rounded-lg p-1.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="h-3 w-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs sm:text-sm font-medium text-foreground truncate" title={item.label}>
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-right">
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {item.percentage.toFixed(1)}%
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap min-w-[85px] text-right">
                    {formatCurrency(item.sales)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
