"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discountPercent: number;
};

type CashierCartProps = {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdateDiscount: (productId: string, discountPercent: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  totalAmount: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 40, 50];

export function CashierCart({
  items,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemoveItem,
  onClearCart,
  totalAmount,
}: CashierCartProps) {
  const [animatingItemId, setAnimatingItemId] = useState<string | null>(null);

  const handleQuantityChange = (
    productId: string,
    currentQty: number,
    delta: number,
  ) => {
    const newQty = Math.max(1, currentQty + delta);
    onUpdateQuantity(productId, newQty);

    // Trigger animation
    setAnimatingItemId(productId);
    setTimeout(() => setAnimatingItemId(null), 300);
  };

  const handleRemoveItem = (productId: string) => {
    // Add exit animation class before removing
    const element = document.getElementById(`cart-item-${productId}`);
    if (element) {
      element.classList.add("animate-slide-out-left");
      setTimeout(() => onRemoveItem(productId), 120);
    } else {
      onRemoveItem(productId);
    }
  };

  const calculateSubtotal = (item: CartItem) => {
    const gross = item.price * item.quantity;
    const discount = (gross * item.discountPercent) / 100;
    return gross - discount;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">KERANJANG</h2>
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            {items.length} item
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Sementara</p>
          <p className="text-xl font-bold text-primary">
            {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <svg
                className="h-10 w-10 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <p className="mb-2 font-medium text-foreground">
              Keranjang masih kosong
            </p>
            <p className="text-sm text-muted-foreground">
              Scan atau cari produk untuk mulai transaksi
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const subtotal = calculateSubtotal(item);
              const isAnimating = animatingItemId === item.productId;

              return (
                <div
                  key={item.productId}
                  id={`cart-item-${item.productId}`}
                  className={cn(
                    "group relative rounded-lg border border-border bg-card p-4 shadow-sm transition-all duration-200",
                    isAnimating && "scale-105 shadow-md",
                    "hover:shadow-md",
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  {/* Item Header */}
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium leading-tight text-foreground">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatCurrency(item.price)} / pcs
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item.productId)}
                      className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                      title="Hapus item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Controls Row */}
                  <div className="flex items-center gap-4">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Qty:
                      </label>
                      <div className="flex items-center gap-1 rounded-md border border-border bg-background">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleQuantityChange(
                              item.productId,
                              item.quantity,
                              -1,
                            )
                          }
                          className="h-8 w-8 rounded-r-none hover:bg-muted"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            onUpdateQuantity(item.productId, Math.max(1, val));
                          }}
                          className="h-8 w-14 border-0 border-x border-border text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          min={1}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleQuantityChange(
                              item.productId,
                              item.quantity,
                              1,
                            )
                          }
                          className="h-8 w-8 rounded-l-none hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Discount */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Diskon:
                      </label>
                      <Select
                        value={item.discountPercent.toString()}
                        onValueChange={(value) =>
                          onUpdateDiscount(item.productId, parseInt(value))
                        }
                      >
                        <SelectTrigger className="h-8 w-24 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DISCOUNT_OPTIONS.map((percent) => (
                            <SelectItem
                              key={percent}
                              value={percent.toString()}
                            >
                              {percent}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subtotal */}
                    <div className="ml-auto text-right">
                      <p className="text-xs text-muted-foreground">Subtotal</p>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(subtotal)}
                      </p>
                    </div>
                  </div>

                  {/* Discount Indicator */}
                  {item.discountPercent > 0 && (
                    <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                      Hemat {formatCurrency((item.price * item.quantity * item.discountPercent) / 100)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {items.length > 0 && (
        <div className="border-t border-border bg-muted/30 px-6 py-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClearCart}
              className="flex-1 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus Semua
            </Button>
            <Button variant="outline" className="flex-1" disabled>
              Tambah Catatan
            </Button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-out-left {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-100%);
          }
        }
        .animate-slide-out-left {
          animation: slide-out-left 120ms ease-out forwards;
        }
      `}</style>
    </div>
  );
}
