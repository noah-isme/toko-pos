"use client";

import { useState } from "react";
import { Minus, Plus, X, Trash2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface QuickCartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  discountPercent: number;
  stock?: number;
}

interface QuickCartProps {
  items: QuickCartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  totalAmount: number;
  disabled?: boolean;
}

export function QuickCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  totalAmount,
  disabled = false,
}: QuickCartProps) {
  const [removingItem, setRemovingItem] = useState<string | null>(null);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

  const handleRemove = (productId: string) => {
    setRemovingItem(productId);
    setTimeout(() => {
      onRemoveItem(productId);
      setRemovingItem(null);
    }, 150);
  };

  const handleQuantityChange = (
    productId: string,
    currentQty: number,
    delta: number
  ) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      handleRemove(productId);
      return;
    }

    setUpdatingItem(productId);
    onUpdateQuantity(productId, newQty);
    setTimeout(() => setUpdatingItem(null), 100);
  };

  const isLowStock = (item: QuickCartItem) => {
    if (!item.stock) return false;
    return item.stock <= 5 && item.stock > 0;
  };

  const calculateSubtotal = (item: QuickCartItem) => {
    const gross = item.price * item.quantity;
    const discount = (gross * item.discountPercent) / 100;
    return gross - discount;
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-500 font-medium">Keranjang kosong</p>
        <p className="text-xs text-gray-400 mt-1">
          Scan atau cari produk untuk mulai
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            KERANJANG ({items.length})
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(totalAmount)}
          </span>
          <button
            onClick={onClearCart}
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ctrl+Backspace"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hapus Semua</span>
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-200">
          {items.map((item) => {
            const subtotal = calculateSubtotal(item);
            const lowStock = isLowStock(item);
            const isRemoving = removingItem === item.productId;
            const isUpdating = updatingItem === item.productId;

            return (
              <div
                key={item.productId}
                className={`
                  px-4 py-3 transition-all duration-150
                  ${isRemoving ? "opacity-0 -translate-x-4" : "opacity-100"}
                  ${isUpdating ? "bg-orange-50" : "bg-white hover:bg-gray-50"}
                  ${lowStock ? "bg-amber-50/30" : ""}
                `}
              >
                {/* Product Name & Price */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(item.productId)}
                    disabled={disabled}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Hapus item"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quantity Controls & Subtotal */}
                <div className="flex items-center justify-between gap-3">
                  {/* Quantity */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">
                      Qty:
                    </span>
                    <div className="flex items-center gap-1 bg-white border border-gray-300 rounded">
                      <button
                        onClick={() =>
                          handleQuantityChange(item.productId, item.quantity, -1)
                        }
                        disabled={disabled}
                        className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span
                        className={`
                          min-w-[2rem] text-center text-sm font-semibold text-gray-900 transition-transform
                          ${isUpdating ? "scale-110" : ""}
                        `}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          handleQuantityChange(item.productId, item.quantity, 1)
                        }
                        disabled={disabled}
                        className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Discount */}
                    {item.discountPercent > 0 && (
                      <span className="text-xs text-green-600 font-medium">
                        -{item.discountPercent}%
                      </span>
                    )}
                  </div>

                  {/* Subtotal */}
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {formatCurrency(subtotal)}
                    </div>
                  </div>
                </div>

                {/* Low Stock Warning */}
                {lowStock && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span className="font-medium">
                      Stok rendah ({item.stock})
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Helper */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded font-mono">
              Ctrl+Backspace
            </kbd>{" "}
            Hapus Semua
          </span>
          <span className="text-gray-400">{items.length} item</span>
        </div>
      </div>
    </div>
  );
}
