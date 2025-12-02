"use client";

import Link from "next/link";
import { ReceiptText, Layers, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  variant: "primary" | "secondary" | "tertiary";
}

const actions: QuickAction[] = [
  {
    title: "Buka Kasir",
    description: "Mulai transaksi penjualan",
    href: "/cashier",
    icon: <ReceiptText className="h-6 w-6 stroke-[1.5]" />,
    variant: "primary",
  },
  {
    title: "Kelola Produk",
    description: "Atur stok dan kategori",
    href: "/management/products",
    icon: <Layers className="h-6 w-6 stroke-[1.5]" />,
    variant: "secondary",
  },
  {
    title: "Laporan Harian",
    description: "Pantau performa toko",
    href: "/reports/daily",
    icon: <BarChart3 className="h-6 w-6 stroke-[1.5]" />,
    variant: "tertiary",
  },
];

interface QuickActionsProps {
  userRole?: "OWNER" | "ADMIN" | "CASHIER";
}

export function QuickActions({ userRole = "CASHIER" }: QuickActionsProps) {
  const filteredActions = actions.filter((action) => {
    // Only OWNER/ADMIN can access management and reports
    if (
      (action.href.startsWith("/management") ||
        action.href.startsWith("/reports")) &&
      !["ADMIN", "OWNER"].includes(userRole)
    ) {
      return false;
    }
    return true;
  });

  const variantStyles = {
    primary: "border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 to-white hover:border-emerald-300",
    secondary: "border-sky-200/60 bg-gradient-to-br from-sky-50/50 to-white hover:border-sky-300",
    tertiary: "border-amber-200/60 bg-gradient-to-br from-amber-50/50 to-white hover:border-amber-300",
  };

  const iconStyles = {
    primary: "text-emerald-600",
    secondary: "text-sky-600",
    tertiary: "text-amber-600",
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {filteredActions.map((action) => (
        <Link key={action.href} href={action.href} className="group">
          <Card
            className={cn(
              "h-full border p-5 transition-all duration-150",
              "hover:scale-[1.01] hover:shadow-md",
              "shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
              variantStyles[action.variant]
            )}
          >
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={cn("rounded-lg bg-white p-2.5 shadow-sm", iconStyles[action.variant])}>
                  {action.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground">
                    {action.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                <span>Buka</span>
                <ArrowRight className="h-4 w-4 stroke-[1.5] transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
