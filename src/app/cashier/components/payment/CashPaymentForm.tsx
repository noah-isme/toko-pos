"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Banknote } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CashPaymentFormProps {
  totalAmount: number;
  onSubmit: (amountPaid: number, change: number) => void;
  onBack: () => void;
  isProcessing: boolean;
}

export function CashPaymentForm({
  totalAmount,
  onSubmit,
  onBack,
  isProcessing,
}: CashPaymentFormProps) {
  const [inputValue, setInputValue] = useState("");
  const [amountReceived, setAmountReceived] = useState(0);
  const [change, setChange] = useState(0);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Calculate change whenever amount changes
  useEffect(() => {
    const calculatedChange = Math.max(0, amountReceived - totalAmount);
    setChange(calculatedChange);

    if (amountReceived > 0 && amountReceived < totalAmount) {
      setError("Uang tidak cukup");
    } else {
      setError("");
    }
  }, [amountReceived, totalAmount]);

  // Format input as currency
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Remove non-digits
    setInputValue(value);
    setAmountReceived(parseInt(value) || 0);
  };

  // Quick amount buttons
  const handleQuickAmount = (amount: number) => {
    setInputValue(amount.toString());
    setAmountReceived(amount);
    inputRef.current?.focus();
  };

  // Submit payment
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (amountReceived < totalAmount) {
      setError("Uang tidak cukup");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    if (amountReceived === 0) {
      setError("Masukkan jumlah uang diterima");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    onSubmit(amountReceived, change);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isProcessing) {
        handleSubmit();
      } else if (e.key === "Escape") {
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [amountReceived, isProcessing, onBack]);

  // Format display value
  const displayValue = inputValue ? formatCurrency(amountReceived) : "Rp 0";

  // Suggested amounts
  const suggestedAmounts = [
    totalAmount, // Exact amount
    Math.ceil(totalAmount / 50000) * 50000, // Rounded to 50k
    Math.ceil(totalAmount / 100000) * 100000, // Rounded to 100k
  ].filter((val, idx, arr) => arr.indexOf(val) === idx && val >= totalAmount); // Unique and >= total

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Method Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="p-3 bg-green-50 rounded-lg">
          <Banknote className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Pembayaran Tunai
          </h3>
          <p className="text-sm text-gray-600">
            Masukkan jumlah uang yang diterima
          </p>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Uang Diterima
        </label>
        <div className={`relative ${shake ? "animate-shake" : ""}`}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="0"
            disabled={isProcessing}
            className={`w-full px-6 py-4 text-3xl font-bold text-center border-2 rounded-xl transition-all duration-200 focus:outline-none ${
              error
                ? "border-red-500 bg-red-50 focus:ring-4 focus:ring-red-500/20"
                : "border-gray-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:shadow-lg"
            } disabled:opacity-50 disabled:cursor-not-allowed ${
              inputValue ? "text-transparent caret-gray-900" : "text-gray-400"
            }`}
            style={
              !error && inputRef.current === document.activeElement
                ? { boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)" }
                : undefined
            }
          />
          {/* Display formatted value overlay */}
          {inputValue && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className={`text-3xl font-bold ${error ? "text-red-900" : "text-gray-900"}`}
              >
                {displayValue}
              </span>
            </div>
          )}
          {/* Hidden actual input for accessibility */}
          <input
            type="hidden"
            value={amountReceived}
            aria-label="Jumlah uang diterima"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm font-medium animate-fade-in">
            <span className="inline-block w-1.5 h-1.5 bg-red-600 rounded-full"></span>
            {error}
          </div>
        )}
      </div>

      {/* Quick Amount Buttons */}
      {suggestedAmounts.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
            Uang Pas
          </label>
          <div className="grid grid-cols-3 gap-2">
            {suggestedAmounts.slice(0, 3).map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleQuickAmount(amount)}
                disabled={isProcessing}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formatCurrency(amount)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Change Display */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-gray-700">Kembalian:</span>
          <span
            className={`text-3xl font-bold transition-all duration-200 ${
              change > 0 ? "text-green-600 scale-105" : "text-gray-400"
            }`}
          >
            {formatCurrency(change)}
          </span>
        </div>
        {change > 0 && (
          <p className="text-xs text-green-600 mt-2 animate-fade-in">
            ✓ Kembalian siap diberikan
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-gray-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Kembali</span>
        </button>

        <button
          type="submit"
          disabled={isProcessing || amountReceived < totalAmount}
          className="flex-[2] px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700 relative overflow-hidden group"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Memproses...
            </span>
          ) : (
            <>
              <span className="relative z-10">Bayar Sekarang</span>
              <span className="hidden sm:inline text-xs text-blue-200 ml-2">
                [ENTER]
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </>
          )}
        </button>
      </div>

      {/* Helper text */}
      <div className="text-center text-xs text-gray-500">
        <p>
          Tekan{" "}
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
            Enter
          </kbd>{" "}
          untuk konfirmasi atau{" "}
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
            ESC
          </kbd>{" "}
          untuk kembali
        </p>
      </div>
    </form>
  );
}
