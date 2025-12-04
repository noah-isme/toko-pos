"use client";

import { useState } from "react";
import { Banknote, Smartphone, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type PaymentMethod = "CASH" | "QRIS" | "CARD";

interface QuickPaymentPanelProps {
  totalAmount: number;
  discount: number;
  finalTotal: number;
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  onDiscountChange: (discount: number) => void;
  onCheckout: () => void;
  maxDiscountPercent?: number;
  disabled?: boolean;
}

export function QuickPaymentPanel({
  totalAmount,
  discount,
  finalTotal,
  selectedMethod,
  onMethodChange,
  onDiscountChange,
  onCheckout,
  maxDiscountPercent = 50,
  disabled = false,
}: QuickPaymentPanelProps) {
  const [discountInput, setDiscountInput] = useState("");

  const handleDiscountChange = (value: string) => {
    setDiscountInput(value);
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.min(Math.max(0, numValue), maxDiscountPercent);
    onDiscountChange((totalAmount * clampedValue) / 100);
  };

  const methods: Array<{
    id: PaymentMethod;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }> = [
    { id: "CASH", label: "Tunai", icon: Banknote, color: "green" },
    { id: "QRIS", label: "QRIS", icon: Smartphone, color: "blue" },
    { id: "CARD", label: "Card", icon: CreditCard, color: "purple" },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Total Display */}
      <div className="px-6 py-6 bg-gradient-to-br from-gray-50 to-white border-b border-gray-200">
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            TOTAL
          </p>
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500/5 blur-2xl rounded-full"></div>
            <p className="relative text-4xl font-bold text-gray-900 tracking-tight">
              {formatCurrency(finalTotal)}
            </p>
          </div>
          {discount > 0 && (
            <p className="text-xs text-green-600 font-medium mt-2">
              Hemat {formatCurrency(discount)}
            </p>
          )}
        </div>
      </div>

      {/* Discount Input */}
      <div className="px-6 py-4 border-b border-gray-200">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Diskon tambahan (optional)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={discountInput}
            onChange={(e) => handleDiscountChange(e.target.value)}
            placeholder="0"
            min="0"
            max={maxDiscountPercent}
            step="1"
            disabled={disabled}
            className="flex-1 px-3 py-2 text-sm text-right font-medium border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-sm font-semibold text-gray-700">%</span>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            Maks {maxDiscountPercent}%
          </span>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="px-6 py-4 border-b border-gray-200">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Metode Pembayaran
        </label>
        <div className="grid grid-cols-3 gap-2">
          {methods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;

            return (
              <button
                key={method.id}
                onClick={() => onMethodChange(method.id)}
                disabled={disabled}
                className={`
                  flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg border-2 transition-all duration-150
                  ${
                    isSelected
                      ? method.color === "green"
                        ? "bg-green-50 border-green-500 text-green-700"
                        : method.color === "blue"
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-purple-50 border-purple-500 text-purple-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }
                  ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{method.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Checkout Button */}
      <div className="px-6 py-6 bg-gray-50 border-t border-gray-200">
        <button
          onClick={onCheckout}
          disabled={disabled || finalTotal <= 0}
          className={`
            w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 relative overflow-hidden group
            ${
              disabled || finalTotal <= 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white hover:shadow-xl active:scale-95"
            }
          `}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span>BAYAR SEKARANG</span>
            <span className="text-sm font-normal opacity-80">(F2)</span>
          </span>
          {!disabled && finalTotal > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          )}
        </button>

        {/* Helper Text */}
        <div className="mt-3 text-center text-xs text-gray-500">
          Tekan{" "}
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded font-mono">
            F2
          </kbd>{" "}
          untuk bayar
        </div>
      </div>

      {/* Subtotal Breakdown (if discount exists) */}
      {discount > 0 && (
        <div className="px-6 py-3 bg-white border-t border-gray-200 text-xs space-y-1">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span className="font-medium">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Diskon:</span>
            <span className="font-medium">-{formatCurrency(discount)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
