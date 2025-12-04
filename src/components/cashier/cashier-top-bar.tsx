"use client";

import { useOutlet } from "@/lib/outlet-context";
import { OutletSelector } from "@/components/ui/outlet-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

type CashierTopBarProps = {
  onOpenShift?: () => void;
  onCloseShift?: () => void;
};

export function CashierTopBar({
  onOpenShift,
  onCloseShift,
}: CashierTopBarProps) {
  const router = useRouter();
  const { currentOutlet, userOutlets, setCurrentOutlet, activeShift } =
    useOutlet();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const outlets = userOutlets.map((entry) => ({
    id: entry.outlet.id,
    name: entry.outlet.name,
    code: entry.outlet.code,
    address: entry.outlet.address ?? undefined,
  }));

  const handleOutletChange = (outlet: {
    id: string;
    name: string;
    code: string;
    address?: string;
  }) => {
    setCurrentOutlet(outlet);
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Left: Outlet Selector */}
        <div className="flex items-center gap-4">
          <OutletSelector
            outlets={outlets}
            currentOutlet={currentOutlet}
            onOutletChange={handleOutletChange}
            variant="minimal"
          />
        </div>

        {/* Center: Shift Status & Time */}
        <div className="flex items-center gap-3 md:gap-4">
          {activeShift ? (
            <>
              <Badge
                variant="default"
                className="gap-1.5 bg-green-600 hover:bg-green-700"
              >
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="hidden sm:inline">Shift Aktif</span>
                <span className="sm:hidden">Aktif</span>
              </Badge>
              <button
                onClick={onCloseShift}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden md:block"
              >
                Tutup Shift
              </button>
            </>
          ) : (
            <>
              <Badge variant="secondary" className="gap-1.5">
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span className="hidden sm:inline">Shift Tidak Aktif</span>
                <span className="sm:hidden">Tidak Aktif</span>
              </Badge>
              <button
                onClick={onOpenShift}
                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium hidden md:block"
              >
                Buka Shift
              </button>
            </>
          )}

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono">{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Right: User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Kasir:</span>
            <span className="font-medium">
              {currentOutlet?.name?.split(" ")[0] ?? "User"}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
