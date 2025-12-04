"use client";

import { useEffect } from "react";
import { Clock } from "lucide-react";
import { QuickScanInput } from "./QuickScanInput";
import { QuickCart } from "./QuickCart";
import { QuickPaymentPanel } from "./QuickPaymentPanel";

type PaymentMethod = "CASH" | "QRIS" | "CARD";

interface QuickCartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  discountPercent: number;
  stock?: number;
}

interface QuickModeLayoutProps {
  // Outlet & Shift Info
  outletName?: string;
  shiftActive: boolean;
  currentTime?: string;

  // Cart
  cart: QuickCartItem[];
  onAddProduct: (productId: string) => void;
  onBarcodeScanned?: (barcode: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;

  // Totals
  totalAmount: number;
  discount: number;
  finalTotal: number;

  // Payment
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onDiscountChange: (discount: number) => void;
  onCheckout: () => void;

  // Settings
  maxDiscountPercent?: number;
  enableBeep?: boolean;
  disabled?: boolean;
}

export function QuickModeLayout({
  outletName = "Outlet Utama",
  shiftActive = false,
  currentTime,
  cart,
  onAddProduct,
  onBarcodeScanned,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  totalAmount,
  discount,
  finalTotal,
  paymentMethod,
  onPaymentMethodChange,
  onDiscountChange,
  onCheckout,
  maxDiscountPercent = 50,
  enableBeep = true,
  disabled = false,
}: QuickModeLayoutProps) {
  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Backspace - Clear cart
      if (e.ctrlKey && e.key === "Backspace") {
        e.preventDefault();
        if (cart.length > 0) {
          onClearCart();
        }
      }

      // F2 - Checkout
      if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0 && !disabled) {
          onCheckout();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart.length, disabled, onClearCart, onCheckout]);

  // Format time
  const displayTime =
    currentTime ||
    new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-bold uppercase tracking-wide">
              QUICK MODE
            </span>
          </div>
          <span className="text-sm opacity-80">• {outletName}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Shift Status */}
          {shiftActive ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold">Shift Aktif</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/30 rounded-full">
              <div className="w-1.5 h-1.5 bg-red-300 rounded-full"></div>
              <span className="text-xs font-semibold">Shift Tutup</span>
            </div>
          )}

          {/* Time */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold font-mono">
              {displayTime}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Scan Input & Cart (60%) */}
        <div className="flex-1 lg:w-[60%] flex flex-col overflow-hidden">
          {/* Scan Input Area */}
          <div className="px-6 py-5 bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-3xl">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
                SCAN / CARI PRODUK
              </label>
              <QuickScanInput
                onProductSelect={onAddProduct}
                onBarcodeScanned={onBarcodeScanned}
                autoFocus={true}
                enableBeep={enableBeep}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Cart Area */}
          <div className="flex-1 overflow-hidden bg-white">
            <QuickCart
              items={cart}
              onUpdateQuantity={onUpdateQuantity}
              onRemoveItem={onRemoveItem}
              onClearCart={onClearCart}
              totalAmount={totalAmount}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Right Column - Payment Panel (40%) */}
        <div className="hidden lg:block w-[40%] max-w-md">
          <QuickPaymentPanel
            totalAmount={totalAmount}
            discount={discount}
            finalTotal={finalTotal}
            selectedMethod={paymentMethod}
            onMethodChange={onPaymentMethodChange}
            onDiscountChange={onDiscountChange}
            onCheckout={onCheckout}
            maxDiscountPercent={maxDiscountPercent}
            disabled={disabled || cart.length === 0}
          />
        </div>
      </div>

      {/* Mobile Payment Button (visible only on mobile) */}
      <div className="lg:hidden border-t bg-white p-4 shadow-lg">
        <button
          onClick={onCheckout}
          disabled={disabled || cart.length === 0}
          className={`
            w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 relative overflow-hidden group
            ${
              disabled || cart.length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white active:scale-95"
            }
          `}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span>BAYAR</span>
            <span className="text-base font-semibold">
              {finalTotal > 0
                ? `• ${new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                  }).format(finalTotal)}`
                : ""}
            </span>
          </span>
        </button>
      </div>

      {/* Visual feedback overlay (when item added) */}
      <div
        id="quick-add-feedback"
        className="fixed inset-0 pointer-events-none z-50 hidden"
      >
        <div className="absolute inset-0 bg-orange-500/10 animate-pulse"></div>
      </div>
    </div>
  );
}

// Helper to show visual feedback when item is added
export function showQuickAddFeedback() {
  const overlay = document.getElementById("quick-add-feedback");
  if (overlay) {
    overlay.classList.remove("hidden");
    setTimeout(() => {
      overlay.classList.add("hidden");
    }, 300);
  }
}
