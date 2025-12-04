"use client";

import { Building2, ChevronDown } from "lucide-react";

import { useOutlet } from "@/lib/outlet-context";
import { Badge } from "@/components/ui/badge";

type Outlet = {
  id: string;
  name: string;
  code: string;
  address?: string | null;
};

type OutletSelectorProps = {
  outlets?: Outlet[];
  currentOutlet?: Outlet | null;
  onOutletChange?: (outlet: Outlet) => void;
  variant?: "default" | "minimal";
};

export function OutletSelector({
  outlets: propOutlets,
  currentOutlet: propCurrentOutlet,
  onOutletChange: propOnOutletChange,
  variant = "default",
}: OutletSelectorProps = {}) {
  const context = useOutlet();

  // Use props if provided, otherwise use context
  const outlets = propOutlets ?? context.userOutlets.map((uo) => uo.outlet);
  const currentOutlet = propCurrentOutlet ?? context.currentOutlet;
  const setCurrentOutlet = propOnOutletChange ?? context.setCurrentOutlet;
  const isLoading = context.isLoading;

  // For context-based outlets, we need the full userOutlets for role
  const userOutlets = propOutlets ? [] : context.userOutlets;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-4 w-4" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!currentOutlet || outlets.length === 0) {
    return null;
  }

  if (variant === "minimal") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Outlet:</span>
        <div className="relative">
          <select
            aria-label="Pilih outlet aktif"
            value={currentOutlet.id}
            onChange={(event) => {
              const selectedOutlet = outlets.find(
                (o) => o.id === event.target.value,
              );
              if (selectedOutlet) {
                setCurrentOutlet(selectedOutlet);
              }
            }}
            className="appearance-none rounded-md border bg-background px-3 py-1.5 pr-8 text-sm font-medium focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        </div>
      </div>
    );
  }

  return (
    <label className="flex items-center gap-3 rounded-md border bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
      <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          {currentOutlet.name}
        </span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{currentOutlet.code}</span>
          <Badge
            variant="secondary"
            className="text-[10px] uppercase tracking-wide"
          >
            {userOutlets.find((uo) => uo.outletId === currentOutlet.id)?.role ||
              "CASHIER"}
          </Badge>
        </div>
      </div>
      <div className="relative ml-2 flex items-center">
        <select
          aria-label="Pilih outlet aktif"
          value={currentOutlet.id}
          onChange={(event) => {
            const selectedOutlet = outlets.find(
              (o) => o.id === event.target.value,
            );
            if (selectedOutlet) {
              setCurrentOutlet(selectedOutlet);
            }
          }}
          className="appearance-none rounded-md border border-transparent bg-transparent px-3 py-2 pr-8 text-sm font-medium text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {outlets.map((outlet) => (
            <option key={outlet.id} value={outlet.id}>
              {outlet.name} ({outlet.code})
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 h-4 w-4 text-muted-foreground"
          aria-hidden
        />
      </div>
    </label>
  );
}
