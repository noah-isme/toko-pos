"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Package,
  ArrowRightLeft,
  RefreshCcw,
  Edit,
  Plus,
  Minus,
  User,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface ActivityEvent {
  id: string;
  type:
    | "stock_in"
    | "stock_out"
    | "transfer"
    | "refund"
    | "product_edit"
    | "user_action"
    | "other";
  title: string;
  description?: string;
  user: string;
  timestamp: Date;
  metadata?: {
    amount?: number;
    quantity?: number;
    from?: string;
    to?: string;
  };
}

interface ActivityLogProps {
  data: ActivityEvent[];
  maxDisplay?: number;
  title?: string;
  className?: string;
}

const getEventIcon = (type: ActivityEvent["type"]) => {
  switch (type) {
    case "stock_in":
      return Plus;
    case "stock_out":
      return Minus;
    case "transfer":
      return ArrowRightLeft;
    case "refund":
      return RefreshCcw;
    case "product_edit":
      return Edit;
    case "user_action":
      return User;
    default:
      return Package;
  }
};

const getEventColor = (type: ActivityEvent["type"]) => {
  switch (type) {
    case "stock_in":
      return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30";
    case "stock_out":
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30";
    case "transfer":
      return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30";
    case "refund":
      return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30";
    case "product_edit":
      return "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/30";
    case "user_action":
      return "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-950/30";
    default:
      return "text-primary bg-primary/10";
  }
};

export function ActivityLog({
  data,
  maxDisplay = 10,
  title = "Aktivitas Terbaru",
  className,
}: ActivityLogProps) {
  const displayData = data.slice(0, maxDisplay);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.7 }}
      className={cn(
        "rounded-xl border bg-card transition-shadow hover:shadow-md",
        className,
      )}
    >
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground lg:text-lg">
            {title}
          </h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Log aktivitas sistem dan pengguna
        </p>
      </div>

      {/* Content */}
      {displayData.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            Belum ada aktivitas
          </p>
          <p className="text-xs text-muted-foreground">
            Aktivitas akan muncul di sini
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {displayData.map((event, index) => {
            const Icon = getEventIcon(event.type);
            const colorClass = getEventColor(event.type);

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.8 + index * 0.03 }}
                className="group relative px-6 py-4 transition-colors hover:bg-muted/50"
              >
                {/* Timeline line */}
                {index < displayData.length - 1 && (
                  <div className="absolute left-[42px] top-[52px] h-full w-px bg-border" />
                )}

                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110",
                        colorClass,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">
                          {event.title}
                        </p>
                        {event.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {event.description}
                          </p>
                        )}
                        {event.metadata && (
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {event.metadata.quantity && (
                              <span className="rounded bg-muted px-2 py-0.5 font-medium">
                                {event.metadata.quantity} item
                              </span>
                            )}
                            {event.metadata.amount && (
                              <span className="rounded bg-muted px-2 py-0.5 font-medium">
                                {formatCurrency(event.metadata.amount)}
                              </span>
                            )}
                            {event.metadata.from && event.metadata.to && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">
                                  {event.metadata.from}
                                </span>
                                <ArrowRightLeft className="h-3 w-3" />
                                <span className="font-medium">
                                  {event.metadata.to}
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-1 flex flex-shrink-0 items-center gap-2 text-xs text-muted-foreground lg:mt-0 lg:ml-4 lg:flex-col lg:items-end lg:text-right">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{event.user}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(event.timestamp, {
                              addSuffix: true,
                              locale: idLocale,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
