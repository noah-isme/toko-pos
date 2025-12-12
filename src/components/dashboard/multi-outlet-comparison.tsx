"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, Store } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { api } from "@/trpc/client";
import { useOutlet } from "@/lib/outlet-context";

type OutletMetrics = {
  id: string;
  name: string;
  code: string;
  revenue: number;
  transactions: number;
  items: number;
  trend: "up" | "down" | "same";
  trendPercent: number;
};

export function MultiOutletComparison() {
  const { currentOutlet } = useOutlet();
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month">("today");

  // In real app, this would be an API call
  // For now, simulating with mock data
  const mockOutlets: OutletMetrics[] = [
    {
      id: "1",
      name: "BSD",
      code: "BR2",
      revenue: 1850000,
      transactions: 45,
      items: 120,
      trend: "up",
      trendPercent: 12.5,
    },
    {
      id: "2",
      name: "Tangerang",
      code: "TGR",
      revenue: 1420000,
      transactions: 38,
      items: 95,
      trend: "up",
      trendPercent: 8.3,
    },
    {
      id: "3",
      name: "Jakarta Pusat",
      code: "JKT",
      revenue: 2100000,
      transactions: 52,
      items: 145,
      trend: "down",
      trendPercent: -3.2,
    },
  ];

  const getTrendIcon = (trend: "up" | "down" | "same") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "same":
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: "up" | "down" | "same") => {
    switch (trend) {
      case "up":
        return "text-emerald-600";
      case "down":
        return "text-red-600";
      case "same":
        return "text-gray-600";
    }
  };

  const sortedOutlets = [...mockOutlets].sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = Math.max(...mockOutlets.map((o) => o.revenue));

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Multi-Outlet Comparison
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Compare performance across all outlets
            </p>
          </div>
          <Select value={timeframe} onValueChange={(v: "today" | "week" | "month") => setTimeframe(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {sortedOutlets.map((outlet, index) => {
            const isCurrentOutlet = outlet.id === currentOutlet?.id;
            const revenuePercent = (outlet.revenue / maxRevenue) * 100;

            return (
              <div
                key={outlet.id}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  isCurrentOutlet
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-white border-gray-200",
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold",
                        index === 0
                          ? "bg-amber-100 text-amber-700"
                          : index === 1
                            ? "bg-gray-200 text-gray-700"
                            : "bg-orange-100 text-orange-700",
                      )}
                    >
                      #{index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {outlet.name}
                        </p>
                        {isCurrentOutlet && (
                          <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{outlet.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {getTrendIcon(outlet.trend)}
                    <span className={getTrendColor(outlet.trend)}>
                      {outlet.trendPercent > 0 ? "+" : ""}
                      {outlet.trendPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Revenue Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Revenue</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(outlet.revenue)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${revenuePercent}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-600">Transactions</p>
                    <p className="font-semibold text-gray-900">
                      {outlet.transactions}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Items Sold</p>
                    <p className="font-semibold text-gray-900">{outlet.items}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
              <p className="text-sm font-bold text-gray-900">
                {formatCurrency(
                  sortedOutlets.reduce((sum, o) => sum + o.revenue, 0),
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Transactions</p>
              <p className="text-sm font-bold text-gray-900">
                {sortedOutlets.reduce((sum, o) => sum + o.transactions, 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Items</p>
              <p className="text-sm font-bold text-gray-900">
                {sortedOutlets.reduce((sum, o) => sum + o.items, 0)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
