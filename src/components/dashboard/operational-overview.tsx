"use client";

import { TrendingUp, ShoppingCart, Package, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "info";
}

function MetricCard({ title, value, subtitle, icon, trend, variant = "default" }: MetricCardProps) {
  const variantStyles = {
    default: "bg-slate-50/50",
    success: "bg-emerald-50/50",
    warning: "bg-amber-50/50",
    info: "bg-sky-50/50",
  };

  const iconStyles = {
    default: "text-slate-600",
    success: "text-emerald-600",
    warning: "text-amber-600",
    info: "text-sky-600",
  };

  return (
    <Card className={cn(
      "relative overflow-hidden border border-border/50 p-5 transition-all duration-150 hover:shadow-md hover:scale-[1.01]",
      "shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-semibold text-foreground">
              {value}
            </h3>
            {trend && (
              <span className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-emerald-600" : "text-red-600"
              )}>
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn(
          "rounded-lg p-2",
          variantStyles[variant]
        )}>
          <div className={cn("h-5 w-5 stroke-[1.5]", iconStyles[variant])}>
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );
}

interface OperationalOverviewProps {
  data: {
    revenue: number;
    transactions: number;
    itemsSold: number;
    shiftStatus: {
      isActive: boolean;
      startTime?: Date;
      duration?: string;
    };
  };
}

export function OperationalOverview({ data }: OperationalOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <MetricCard
        title="Pendapatan Hari Ini"
        value={formatCurrency(data.revenue)}
        subtitle="transaksi selesai"
        icon={<TrendingUp />}
        variant="success"
      />
      <MetricCard
        title="Total Transaksi"
        value={data.transactions}
        subtitle="hari ini"
        icon={<ShoppingCart />}
        variant="info"
      />
      <MetricCard
        title="Item Terjual"
        value={data.itemsSold}
        subtitle="total unit"
        icon={<Package />}
        variant="default"
      />
      <MetricCard
        title="Status Shift"
        value={data.shiftStatus.isActive ? "Aktif" : "Tutup"}
        subtitle={
          data.shiftStatus.isActive && data.shiftStatus.duration
            ? data.shiftStatus.duration
            : "belum dibuka"
        }
        icon={<Clock />}
        variant={data.shiftStatus.isActive ? "success" : "warning"}
      />
    </div>
  );
}
