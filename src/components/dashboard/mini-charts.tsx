"use client";

import { useState } from "react";
import { TrendingUp, Package, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SalesDataPoint {
  hour: string;
  amount: number;
}

interface TopProduct {
  id: string;
  name: string;
  sold: number;
  revenue: number;
}

interface MiniChartsProps {
  salesData: SalesDataPoint[];
  topProducts: TopProduct[];
  isLoading?: boolean;
}

function SimpleSalesChart({ data }: { data: SalesDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Belum ada data penjualan
      </div>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="flex h-40 items-end gap-1.5">
      {data.map((point, index) => {
        const heightPercent = (point.amount / maxAmount) * 100;
        return (
          <div
            key={index}
            className="group relative flex flex-1 flex-col items-center gap-1"
          >
            <div
              className={cn(
                "w-full rounded-t-sm bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-150",
                "group-hover:from-emerald-600 group-hover:to-emerald-500"
              )}
              style={{ height: `${heightPercent}%`, minHeight: point.amount > 0 ? "4px" : "0px" }}
            />
            <div className="absolute -top-8 hidden rounded bg-slate-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
              }).format(point.amount)}
            </div>
            <span className="text-[10px] text-muted-foreground">{point.hour}</span>
          </div>
        );
      })}
    </div>
  );
}

function TopProductsList({ products }: { products: TopProduct[] }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (products.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Belum ada produk terjual
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.slice(0, 5).map((product, index) => (
        <div
          key={product.id}
          className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 transition-all duration-150 hover:bg-muted/40"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            #{index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {product.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {product.sold} unit · {formatCurrency(product.revenue)}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {product.sold}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export function MiniCharts({ salesData, topProducts, isLoading = false }: MiniChartsProps) {
  const [salesExpanded, setSalesExpanded] = useState(true);
  const [productsExpanded, setProductsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-32 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-40 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Sales Chart */}
      <Card className="border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <TrendingUp className="h-4 w-4 stroke-[1.5]" />
              </div>
              <CardTitle className="text-base font-semibold">
                Penjualan Hari Ini
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 lg:hidden"
              onClick={() => setSalesExpanded(!salesExpanded)}
            >
              {salesExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Grafik penjualan per jam
          </p>
        </CardHeader>
        <CardContent
          className={cn(
            "transition-all duration-150",
            !salesExpanded && "hidden lg:block"
          )}
        >
          <SimpleSalesChart data={salesData} />
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                <Package className="h-4 w-4 stroke-[1.5]" />
              </div>
              <CardTitle className="text-base font-semibold">
                Produk Terlaris
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 lg:hidden"
              onClick={() => setProductsExpanded(!productsExpanded)}
            >
              {productsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Top 5 hari ini
          </p>
        </CardHeader>
        <CardContent
          className={cn(
            "transition-all duration-150",
            !productsExpanded && "hidden lg:block"
          )}
        >
          <TopProductsList products={topProducts} />
        </CardContent>
      </Card>
    </div>
  );
}
