"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CategoryChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  title?: string;
  height?: number;
  className?: string;
}

const DEFAULT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const FALLBACK_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
];

export function CategoryChart({
  data,
  title = "Kontribusi Kategori",
  height = 300,
  className,
}: CategoryChartProps) {
  // Calculate percentages and assign colors
  const chartData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return data.map((item, index) => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0,
      color:
        item.color ||
        DEFAULT_COLORS[index % DEFAULT_COLORS.length] ||
        FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    }));
  }, [data]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: { name: string; value: number; percentage: number };
    }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-xs font-medium text-muted-foreground">
            {data.name}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(data.value)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data.percentage.toFixed(1)}% dari total
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
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground lg:text-lg">
          {title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Berdasarkan penjualan
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        {/* Chart */}
        <div className="flex-shrink-0">
          <ResponsiveContainer width={height} height={height}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="85%"
                paddingAngle={2}
                dataKey="value"
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

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {chartData.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
              className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium text-foreground">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {item.percentage.toFixed(1)}%
                </span>
                <span className="min-w-[80px] text-right text-sm font-semibold text-foreground">
                  {formatCurrency(item.value)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
