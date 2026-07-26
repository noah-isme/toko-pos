"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Brand } from "@/components/ui/brand";
import { cn } from "@/lib/utils";
import { isNavItemActive, visibleGroups } from "@/components/layout/nav-items";

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const groups = visibleGroups(session?.user?.role);

  return (
    <aside
      data-testid="app-sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-50 hidden shrink-0 flex-col border-r bg-card lg:flex",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && (
          <Link
            href="/"
            className="flex min-w-0 items-center transition-opacity hover:opacity-80"
          >
            <Brand variant="logo" size="sm" />
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          aria-expanded={!collapsed}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav
        aria-label="Navigasi utama"
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3"
      >
        {groups.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            {collapsed ? (
              <div className="mx-2 mb-2 border-t" aria-hidden />
            ) : (
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
