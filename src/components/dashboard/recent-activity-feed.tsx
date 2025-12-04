"use client";

import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import {
  ReceiptText,
  Package,
  AlertCircle,
  TrendingUp,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Activity = {
  id: string;
  type: "sale" | "product" | "stock" | "user";
  title: string;
  description: string;
  timestamp: Date;
  amount?: number;
};

type RecentActivityFeedProps = {
  activities: Activity[];
  className?: string;
};

const iconMap = {
  sale: ReceiptText,
  product: Package,
  stock: AlertCircle,
  user: User,
};

const colorMap = {
  sale: "text-emerald-600 bg-emerald-50",
  product: "text-blue-600 bg-blue-50",
  stock: "text-amber-600 bg-amber-50",
  user: "text-purple-600 bg-purple-50",
};

export function RecentActivityFeed({
  activities,
  className,
}: RecentActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-sm text-gray-500 text-center">
            Belum ada aktivitas terbaru
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Aktivitas Terbaru</h3>
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = iconMap[activity.type];
            const colorClass = colorMap[activity.type];

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`rounded-lg p-2 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {activity.description}
                      </p>
                    </div>
                    {activity.amount !== undefined && (
                      <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {formatCurrency(activity.amount)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(activity.timestamp, {
                      addSuffix: true,
                      locale: id,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
