"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

type RevenueTrendChartProps = {
  data: Array<{
    date: Date;
    revenue: number;
  }>;
  className?: string;
};

export function RevenueTrendChart({ data, className }: RevenueTrendChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      }),
      revenue: item.revenue,
    }));
  }, [data]);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            width={40}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload?.[0]) {
                return (
                  <div className="rounded-lg border bg-white p-3 shadow-lg">
                    <p className="text-xs text-gray-600">
                      {payload[0].payload.date}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(payload[0].value as number)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
