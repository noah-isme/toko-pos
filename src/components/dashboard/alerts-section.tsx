"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCcw, QrCode, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "low-stock" | "refund" | "qris-pending" | "warning";
  title: string;
  count?: number;
  href?: string;
  severity: "high" | "medium" | "low";
}

interface AlertsSectionProps {
  alerts: Alert[];
}

export function AlertsSection({ alerts }: AlertsSectionProps) {
  if (alerts.length === 0) {
    return null;
  }

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "low-stock":
        return <AlertTriangle className="h-5 w-5 stroke-[1.5]" />;
      case "refund":
        return <RefreshCcw className="h-5 w-5 stroke-[1.5]" />;
      case "qris-pending":
        return <QrCode className="h-5 w-5 stroke-[1.5]" />;
      default:
        return <AlertTriangle className="h-5 w-5 stroke-[1.5]" />;
    }
  };

  const getAlertStyles = (severity: Alert["severity"]) => {
    switch (severity) {
      case "high":
        return {
          card: "border-red-200/60 bg-gradient-to-r from-red-50/50 to-white hover:border-red-300",
          icon: "text-red-600 bg-red-50",
          badge: "bg-red-100 text-red-700 border-red-200",
        };
      case "medium":
        return {
          card: "border-amber-200/60 bg-gradient-to-r from-amber-50/50 to-white hover:border-amber-300",
          icon: "text-amber-600 bg-amber-50",
          badge: "bg-amber-100 text-amber-700 border-amber-200",
        };
      case "low":
        return {
          card: "border-sky-200/60 bg-gradient-to-r from-sky-50/50 to-white hover:border-sky-300",
          icon: "text-sky-600 bg-sky-50",
          badge: "bg-sky-100 text-sky-700 border-sky-200",
        };
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Perlu Perhatian
        </h2>
        <Badge variant="secondary" className="text-xs">
          {alerts.length}
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert) => {
          const styles = getAlertStyles(alert.severity);
          const content = (
            <Card
              className={cn(
                "border p-4 transition-all duration-150",
                "hover:scale-[1.01] hover:shadow-md",
                "shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
                styles.card,
                alert.href && "cursor-pointer"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("rounded-lg p-2", styles.icon)}>
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {alert.title}
                    </h3>
                    {alert.count !== undefined && (
                      <Badge
                        variant="outline"
                        className={cn("text-xs font-semibold shrink-0", styles.badge)}
                      >
                        {alert.count} item
                      </Badge>
                    )}
                  </div>
                  {alert.href && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Lihat detail</span>
                      <ArrowRight className="h-3 w-3 stroke-[1.5]" />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );

          if (alert.href) {
            return (
              <Link key={alert.id} href={alert.href} className="block">
                {content}
              </Link>
            );
          }

          return <div key={alert.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}
