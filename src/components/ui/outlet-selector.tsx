"use client";

import { Building2, ChevronDown } from "lucide-react";

import { useOutlet } from "@/lib/outlet-context";
import { Badge } from "@/components/ui/badge";

type Outlet = {
  id: string;
  name: string;
  code: string;
  address?: string;
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

  const currentRole =
    userOutlets.find((uo) => uo.outletId === currentOutlet.id)?.role ??
    "CASHIER";

  // One control, not two. This previously rendered the outlet name as static
  // text *and* again inside the select beside it, which was the single widest
  // block in the header and a large part of why the bar overflowed.
  return (
    <label className="flex min-w-0 items-center gap-2 rounded-md border bg-white/70 px-2.5 py-1.5 shadow-sm backdrop-blur">
      <Building2
        className="h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="relative flex min-w-0 items-center">
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
          className="max-w-[10rem] appearance-none truncate rounded-md border border-transparent bg-transparent pr-6 text-sm font-medium text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {outlets.map((outlet) => (
            <option key={outlet.id} value={outlet.id}>
              {outlet.name} ({outlet.code})
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-0 h-4 w-4 text-muted-foreground"
          aria-hidden
        />
      </div>
      <Badge
        variant="secondary"
        className="hidden shrink-0 text-[10px] uppercase tracking-wide 2xl:inline-flex"
      >
        {currentRole}
      </Badge>
    </label>
  );
}
