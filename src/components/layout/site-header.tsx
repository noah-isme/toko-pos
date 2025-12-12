"use client";

import React from "react";
import Link from "next/link";
import { 
  LogIn, 
  LogOut, 
  Menu, 
  Search, 
  Bell, 
  Settings, 
  HelpCircle,
  ChevronDown,
  Clock,
  CircleDot,
  User,
  Building2,
  LayoutDashboard,
  Receipt,
  Package,
  BarChart3,
  Command
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OutletSelector } from "@/components/ui/outlet-selector";
import { useOutlet } from "@/lib/outlet-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Brand } from "@/components/ui/brand";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cashier", label: "Kasir", icon: Receipt },
  { href: "/management/products", label: "Produk", icon: Package },
  { href: "/reports/daily", label: "Laporan", icon: BarChart3 },
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
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left Section: Logo + Navigation */}
        <div className="flex flex-1 items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Brand variant="logo" size="sm" />
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Center Section: Search (Desktop Only) */}
        {isAuthenticated && (
          <div className="hidden flex-1 justify-center lg:flex">
            <button
              className={cn(
                "flex w-full max-w-md items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground"
              )}
              onClick={() => toast.info("Quick search coming soon!")}
            >
              <Search className="h-4 w-4" />
              <span>Quick search...</span>
              <kbd className="ml-auto hidden rounded bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground shadow-sm sm:inline-block">
                <Command className="mr-1 inline h-3 w-3" />K
              </kbd>
            </button>
          </div>
        )}

        {/* Right Section: Actions + User */}
        {isAuthenticated ? (
          <div className="flex flex-1 items-center justify-end gap-2">
            {/* Outlet Selector */}
            <OutletSelector />

            {/* Shift Status */}
            <div className="hidden items-center gap-2 lg:flex">
              <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <CircleDot
                    className={cn(
                      "h-3.5 w-3.5",
                      activeShift
                        ? "text-emerald-500 animate-pulse"
                        : "text-muted-foreground"
                    )}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {activeShift ? "Shift Aktif" : "Shift Tutup"}
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

            {/* Clock */}
            <div className="hidden items-center gap-2 rounded-lg border bg-card px-3 py-2 lg:flex">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium tabular-nums">
                {mounted
                  ? time.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </span>
            </div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-1 top-1 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 text-center text-sm text-muted-foreground">
                  Tidak ada notifikasi baru
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Help */}
            <Button variant="ghost" size="icon" asChild>
              <Link href="/docs">
                <HelpCircle className="h-4 w-4" />
              </Link>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-semibold text-white shadow-sm">
                    {initials}
                  </div>
                  <div className="hidden flex-col items-start lg:flex">
                    <span className="text-sm font-medium">{session?.user?.name}</span>
                    <Badge variant="secondary" className="h-4 text-[10px] font-medium">
                      {session?.user?.role}
                    </Badge>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground lg:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{session?.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Building2 className="mr-2 h-4 w-4" />
                  Outlet Saya
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    void signOut({ callbackUrl: "/auth/login" });
                  }}
                  className="text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-sm p-0">
                <nav className="flex flex-col gap-1 p-4" aria-label="Navigasi utama">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link href="/demo/cashier">Coba Demo</Link>
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/auth/login")}
              className="gap-2"
            >
              <LogIn className="h-4 w-4" />
              Masuk
            </Button>
          </div>
        )}
      </div>

      {/* Shift Dialog */}
      <Dialog
        open={shiftDialogOpen}
        onOpenChange={(open) => {
          if (isOpeningShift || isClosingShift) return;
          setShiftDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {shiftAction === "open"
                ? "Buka Shift Kasir"
                : "Tutup Shift Kasir"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShiftDialogOpen(false)}
              disabled={isOpeningShift || isClosingShift}
            >
              Batal
            </Button>
            <Button
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
