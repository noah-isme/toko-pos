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
  Users,
  ScrollText,
  Building2,
  ClipboardCheck,
  Truck,
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
import { isNavItemActive, visibleGroups } from "@/components/layout/nav-items";

export function SiteHeader({
  className,
  hideBrand = false,
}: {
  className?: string;
  /** The sidebar already shows the brand on desktop; avoid rendering it twice. */
  hideBrand?: boolean;
}) {
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
  const mobileGroups = React.useMemo(
    () => visibleGroups(session?.user?.role),
    [session?.user?.role],
  );
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
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left Section: Logo. `shrink-0`, not `flex-1` — with the nav moved to
            the sidebar this is empty on desktop, and a third of the bar was
            being reserved for nothing while the right side got squeezed. */}
        <div className="flex shrink-0 items-center gap-6">
          {/* Logo — hidden on desktop when the sidebar already shows the brand */}
          <Link
            href="/"
            className={cn(
              "flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80",
              hideBrand && "lg:hidden",
            )}
          >
            <Brand variant="logo" size="sm" />
          </Link>

          {/* Primary navigation now lives in AppSidebar; see nav-items.ts. */}
        </div>

        {/* Center Section: Search (Desktop Only) */}
        {isAuthenticated && (
          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <button
              className={cn(
                "flex w-full min-w-0 max-w-md items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground"
              )}
              onClick={() => toast.info("Quick search coming soon!")}
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Quick search...</span>
              <kbd className="ml-auto hidden shrink-0 rounded bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground shadow-sm 2xl:inline-block">
                <Command className="mr-1 inline h-3 w-3" />K
              </kbd>
            </button>
          </div>
        )}

        {/* Right Section: Actions + User */}
        {isAuthenticated ? (
          <div className="flex shrink-0 items-center justify-end gap-2">
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

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="min-w-0 gap-2 px-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-semibold text-white shadow-sm">
                    {initials}
                  </div>
                  <div className="hidden min-w-0 flex-col items-start 2xl:flex">
                    <span className="max-w-[9rem] truncate text-sm font-medium">
                      {session?.user?.name}
                    </span>
                    <Badge variant="secondary" className="h-4 text-[10px] font-medium">
                      {session?.user?.role}
                    </Badge>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground 2xl:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{session?.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                    <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden />
                      <span className="tabular-nums" data-testid="header-clock">
                        {mounted
                          ? time.toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </span>
                    </p>
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
                <DropdownMenuItem asChild>
                  <Link href="/management/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Pengaturan
                  </Link>
                </DropdownMenuItem>
                {(session?.user?.role === "OWNER" ||
                  session?.user?.role === "ADMIN") && (
                  <DropdownMenuItem asChild>
                    <Link href="/management/users">
                      <Users className="mr-2 h-4 w-4" />
                      Manajemen User
                    </Link>
                  </DropdownMenuItem>
                )}
                {(session?.user?.role === "OWNER" ||
                  session?.user?.role === "ADMIN") && (
                  <DropdownMenuItem asChild>
                    <Link href="/management/audit-log">
                      <ScrollText className="mr-2 h-4 w-4" />
                      Log Audit
                    </Link>
                  </DropdownMenuItem>
                )}
                {(session?.user?.role === "OWNER" ||
                  session?.user?.role === "ADMIN") && (
                  <DropdownMenuItem asChild>
                    <Link href="/management/stock-opname">
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Stock Opname
                    </Link>
                  </DropdownMenuItem>
                )}
                {(session?.user?.role === "OWNER" ||
                  session?.user?.role === "ADMIN") && (
                  <DropdownMenuItem asChild>
                    <Link href="/management/receiving">
                      <Truck className="mr-2 h-4 w-4" />
                      Penerimaan Barang
                    </Link>
                  </DropdownMenuItem>
                )}
                {(session?.user?.role === "OWNER" ||
                  session?.user?.role === "ADMIN") && (
                  <DropdownMenuItem asChild>
                    <Link href="/management/shift-history">
                      <Clock className="mr-2 h-4 w-4" />
                      Riwayat Shift
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/docs">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Bantuan
                  </Link>
                </DropdownMenuItem>
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
                <DialogHeader className="px-4 pt-4">
                  <DialogTitle>Navigasi</DialogTitle>
                </DialogHeader>
                <nav
                  className="max-h-[70vh] overflow-y-auto p-4 pt-2"
                  aria-label="Navigasi utama"
                >
                  {mobileGroups.map((group) => (
                    <div key={group.label} className="mb-4 last:mb-0">
                      <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </p>
                      <div className="flex flex-col gap-1">
                        {group.items.map((item) => {
                          const isActive = isNavItemActive(pathname, item.href);
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileNavOpen(false)}
                              aria-current={isActive ? "page" : undefined}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
