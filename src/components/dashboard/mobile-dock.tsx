"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ReceiptText, Package, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DockItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const dockItems: DockItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5 stroke-[1.5]" />,
  },
  {
    href: "/cashier",
    label: "Kasir",
    icon: <ReceiptText className="h-5 w-5 stroke-[1.5]" />,
  },
  {
    href: "/management/products",
    label: "Produk",
    icon: <Package className="h-5 w-5 stroke-[1.5]" />,
  },
  {
    href: "/reports/daily",
    label: "Laporan",
    icon: <BarChart3 className="h-5 w-5 stroke-[1.5]" />,
  },
];

interface MobileDockProps {
  userRole?: "OWNER" | "ADMIN" | "CASHIER";
}

export function MobileDock({ userRole = "CASHIER" }: MobileDockProps) {
  const pathname = usePathname();

  const filteredItems = dockItems.filter((item) => {
    // Only OWNER/ADMIN can access management and reports
    if (
      (item.href.startsWith("/management") ||
        item.href.startsWith("/reports")) &&
      !["ADMIN", "OWNER"].includes(userRole)
    ) {
      return false;
    }
    return true;
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-screen-sm items-center justify-around px-4 pb-safe">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 transition-colors duration-150",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "rounded-lg p-1.5 transition-all duration-150",
                  isActive
                    ? "bg-primary/10 shadow-sm"
                    : "hover:bg-muted/50"
                )}
              >
                {item.icon}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isActive ? "font-semibold" : "font-normal"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
