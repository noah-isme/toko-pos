"use client";

import { cn } from "@/lib/utils";

type CashierShortcutsProps = {
  className?: string;
};

export function CashierShortcuts({ className }: CashierShortcutsProps) {
  const shortcuts = [
    { keys: ["F1"], label: "+Tambah Item", variant: "default" as const },
    { keys: ["F2"], label: "Bayar", variant: "primary" as const },
    { keys: ["ESC"], label: "Batal", variant: "default" as const },
    { keys: ["Ctrl", "K"], label: "Fokus Scan", variant: "default" as const },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 px-4 py-3",
        className,
      )}
    >
      <span className="text-sm font-medium text-muted-foreground">
        Shortcut:
      </span>
      {shortcuts.map((shortcut, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {shortcut.keys.map((key, keyIndex) => (
              <span key={keyIndex} className="flex items-center">
                <kbd
                  className={cn(
                    "inline-flex h-6 min-w-[24px] items-center justify-center rounded border px-2 text-xs font-semibold shadow-sm",
                    shortcut.variant === "primary"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground",
                  )}
                >
                  {key}
                </kbd>
                {keyIndex < shortcut.keys.length - 1 && (
                  <span className="mx-1 text-xs text-muted-foreground">+</span>
                )}
              </span>
            ))}
          </div>
          <span className="text-sm text-foreground">{shortcut.label}</span>
          {index < shortcuts.length - 1 && (
            <span className="mx-1 text-muted-foreground">|</span>
          )}
        </div>
      ))}
    </div>
  );
}
