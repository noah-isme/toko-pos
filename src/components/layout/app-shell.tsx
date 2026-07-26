"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import PageProgress from "@/components/ui/page-progress";
import PageTransition from "@/components/ui/page-transition";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "toko-pos:sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();
  const [collapsed, setCollapsed] = React.useState(false);

  // Read after mount: touching localStorage during render would make the
  // server and client markup disagree.
  React.useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // The cashier screen is a focused, full-width task; cashiers do not navigate
  // mid-transaction, so the sidebar would only cost them horizontal room.
  const showSidebar =
    status === "authenticated" && !pathname?.startsWith("/cashier");

  return (
    <>
      {showSidebar && <AppSidebar collapsed={collapsed} onToggle={toggle} />}
      <div
        className={cn(
          "min-h-screen transition-[padding-left] duration-200 ease-out",
          showSidebar && (collapsed ? "lg:pl-16" : "lg:pl-64"),
        )}
      >
        <SiteHeader hideBrand={showSidebar} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-20 sm:px-6 lg:px-8"
        >
          <PageProgress />
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </>
  );
}
