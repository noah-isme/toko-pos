"use client";

import React from "react";
import Link from "next/link";
import { LogIn, LogOut, Menu } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { MotionButton as Button } from "@/components/ui/button";
import MotionList, { MotionItem } from "@/components/ui/motion-list";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OutletSelector } from "@/components/ui/outlet-selector";
import { useOutlet } from "@/lib/outlet-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/ui/brand";

const navItems = [
  { href: "/cashier", label: "Kasir" },
  { href: "/management/products", label: "Produk" },
  { href: "/reports/daily", label: "Laporan" },
];

export function SiteHeader({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const {
    currentOutlet,
    activeShift,
    isShiftLoading,
    openShift,
    closeShift,
    refreshShift,
    isOpeningShift,
    isClosingShift,
  } = useOutlet();
  const [time, setTime] = React.useState(() => new Date());
  const [mounted, setMounted] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [shiftDialogOpen, setShiftDialogOpen] = React.useState(false);
  const [shiftAction, setShiftAction] = React.useState<"open" | "close">(
    "open",
  );
  const [shiftCashInput, setShiftCashInput] = React.useState("");

  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    // mark client-mounted so we don't render time on the server and cause
    // a mismatch between server and client HTML during hydration
    setMounted(true);
  }, []);

  React.useEffect(() => {
    router.prefetch("/cashier");
    router.prefetch("/management/products");
    router.prefetch("/reports/daily");
    router.prefetch("/demo/cashier");
  }, [router]);

  const isAuthenticated = status === "authenticated";
  const initials = React.useMemo(() => {
    const name = session?.user?.name;
    if (name) {
      const letters = name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join("");
      if (letters) {
        return letters.slice(0, 2);
      }
    }
    const email = session?.user?.email;
    if (email && email.length > 0) {
      return email[0]?.toUpperCase() ?? "KP";
    }
    return "KP";
  }, [session?.user?.name, session?.user?.email]);
  const shiftButtonDisabled =
    isShiftLoading || isOpeningShift || isClosingShift || !currentOutlet;
  const shiftButtonLabel = activeShift ? "Tutup Shift" : "Buka Shift";

  const handleShiftButton = (action: "open" | "close") => {
    setShiftAction(action);
    setShiftCashInput("");
    setShiftDialogOpen(true);
  };

  const handleShiftSubmit = async () => {
    const value = Number(shiftCashInput || 0);
    if (Number.isNaN(value) || value < 0) {
      toast.error("Nominal kas tidak valid.");
      return;
    }

    try {
      if (shiftAction === "open") {
        await openShift(value);
        toast.success("Shift dibuka.");
      } else {
        await closeShift(value);
        toast.success("Shift ditutup.");
      }
      setShiftDialogOpen(false);
      setShiftCashInput("");
      await refreshShift();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memproses shift.";
      toast.error(message);
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/80",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] min-w-[44px] lg:hidden"
                  aria-label="Buka menu navigasi"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-80 p-0">
                <nav
                  className="flex flex-col gap-1 p-3"
                  aria-label="Navigasi utama"
                >
                  {navItems.map((item) => {
                    const isActive = pathname?.startsWith(item.href);
                    return (
                      <Button
                        key={item.href}
                        variant={isActive ? "secondary" : "ghost"}
                        size="lg"
                        className="justify-start"
                        asChild
                      >
                        <Link
                          href={item.href}
                          onClick={() => setMobileNavOpen(false)}
                        >
                          {item.label}
                        </Link>
                      </Button>
                    );
                  })}
                </nav>
              </DialogContent>
            </Dialog>
          )}
          <Link href="/" className="flex items-center">
            <Brand variant="logo" size="sm" />
          </Link>
          {isAuthenticated ? (
            <nav className="hidden gap-0.5 lg:flex" aria-label="Navigasi utama">
              <MotionList as="div" className="flex gap-0.5">
                {navItems.map((item) => {
                  const isActive = pathname?.startsWith(item.href);
                  return (
                    <MotionItem
                      key={item.href}
                      as="div"
                      className="inline-block"
                    >
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 text-sm font-normal"
                        asChild
                      >
                        <Link href={item.href}>{item.label}</Link>
                      </Button>
                    </MotionItem>
                  );
                })}
              </MotionList>
            </nav>
          ) : null}
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-2 text-sm lg:gap-3">
            <OutletSelector />
            <div className="hidden items-center gap-2 lg:flex">
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col">
                <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  Jam
                </span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {mounted
                    ? time.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--"}
                </span>
              </div>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      activeShift
                        ? "animate-pulse bg-emerald-500"
                        : "bg-slate-300",
                    )}
                  />
                  <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    Shift
                  </span>
                </div>
                <Button
                  variant={activeShift ? "outline" : "default"}
                  size="sm"
                  className="h-7 text-xs"
                  disabled={shiftButtonDisabled}
                  onClick={() =>
                    handleShiftButton(activeShift ? "close" : "open")
                  }
                >
                  {shiftButtonLabel}
                </Button>
              </div>
            </div>
            <div className="hidden h-8 w-px bg-border lg:block" />
            <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-foreground lg:flex">
              {initials}
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void signOut({ callbackUrl: "/auth/login" });
              }}
              className="h-8 gap-1.5 text-xs"
              aria-label="Keluar dari aplikasi"
            >
              <LogOut className="h-3.5 w-3.5 stroke-[1.5]" />
              <span className="hidden lg:inline">Keluar</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-8 text-xs lg:flex"
              asChild
            >
              <Link href="/demo/cashier">Coba Demo</Link>
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/auth/login")}
              className="h-8 gap-1.5 text-xs"
              aria-label="Masuk ke aplikasi"
            >
              <LogIn className="h-3.5 w-3.5 stroke-[1.5]" />
              Masuk
            </Button>
          </div>
        )}
      </div>
      <Dialog
        open={shiftDialogOpen}
        onOpenChange={(open) => {
          if (isOpeningShift || isClosingShift) return;
          setShiftDialogOpen(open);
        }}
      >
        <DialogContent className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {shiftAction === "open"
                ? "Buka Shift Kasir"
                : "Tutup Shift Kasir"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="header-shift-cash">
              Kas {shiftAction === "open" ? "awal" : "akhir"}
            </Label>
            <Input
              id="header-shift-cash"
              type="number"
              min={0}
              step={1000}
              value={shiftCashInput}
              onChange={(event) => setShiftCashInput(event.target.value)}
              placeholder="0"
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShiftDialogOpen(false)}
              disabled={isOpeningShift || isClosingShift}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleShiftSubmit}
              disabled={isOpeningShift || isClosingShift}
            >
              {shiftAction === "open" ? "Buka Shift" : "Tutup Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
