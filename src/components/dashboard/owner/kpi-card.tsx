"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  suffix?: string;
  className?: string;
  delay?: number;
}

export function KpiCard({
  title,
  value,
  trend,
  suffix,
  className,
  delay = 0,
}: KpiCardProps) {
  const trendColor = trend
    ? trend.direction === "up"
      ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30"
      : trend.direction === "down"
        ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30"
        : "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-950/30"
    : "";

  const TrendIcon = trend
    ? trend.direction === "up"
      ? TrendingUp
      : trend.direction === "down"
        ? TrendingDown
        : Minus
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: delay * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        scale: 1.01,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        transition: { duration: 0.15 },
      }}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-6 transition-all",
        "hover:border-primary/20",
        className,
      )}
    >
      {/* Background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Content */}
      <div className="relative space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>

        <div className="flex items-end gap-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: delay * 0.1 + 0.2 }}
            className="flex items-baseline gap-1"
          >
            <span className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
              {value}
            </span>
            {suffix && (
              <span className="text-base font-medium text-muted-foreground">
                {suffix}
              </span>
            )}
          </motion.div>

          {trend && TrendIcon && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: delay * 0.1 + 0.4,
                ease: "easeOut",
              }}
              className={cn(
                "mb-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                trendColor,
              )}
            >
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(trend.value)}%</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
