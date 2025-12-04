"use client";

import { CheckCircle2, Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PaymentMethodType } from "./PaymentModal";

interface PaymentSuccessProps {
  method: PaymentMethodType;
  totalAmount: number;
  amountPaid: number;
  change?: number;
  onFinish: () => void;
  onPrintReceipt?: () => void;
}

export function PaymentSuccess({
  method,
  totalAmount,
  amountPaid,
  change,
  onFinish,
  onPrintReceipt,
}: PaymentSuccessProps) {
  const handlePrint = () => {
    if (onPrintReceipt) {
      onPrintReceipt();
    } else {
      // Default print behavior
      window.print();
    }
  };

  const methodLabel = {
    TUNAI: "Tunai",
    QRIS: "QRIS",
    TRANSFER: "Transfer Bank",
  }[method];

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 animate-fade-in">
      {/* Success Icon */}
      <div className="relative mb-6 animate-bounce-in">
        <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full"></div>
        <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-full">
          <CheckCircle2 className="w-24 h-24 text-green-600" strokeWidth={2} />
        </div>
      </div>

      {/* Success Message */}
      <h2 className="text-3xl font-bold text-gray-900 mb-2 animate-slide-up">
        Pembayaran Berhasil!
      </h2>
      <p
        className="text-gray-600 mb-8 animate-slide-up"
        style={{ animationDelay: "100ms" }}
      >
        Transaksi telah diselesaikan
      </p>

      {/* Payment Details Card */}
      <div
        className="w-full max-w-md bg-white border-2 border-gray-200 rounded-2xl p-6 mb-8 animate-slide-up"
        style={{ animationDelay: "200ms" }}
      >
        <div className="space-y-4">
          {/* Total Amount */}
          <div className="pb-4 border-b border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Pembayaran</p>
            <p className="text-4xl font-bold text-gray-900">
              {formatCurrency(totalAmount)}
            </p>
          </div>

          {/* Payment Method */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Metode Pembayaran</span>
            <span className="font-semibold text-gray-900">{methodLabel}</span>
          </div>

          {/* Cash Specific Details */}
          {method === "TUNAI" && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Uang Diterima</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(amountPaid)}
                </span>
              </div>

              {change !== undefined && change > 0 && (
                <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg p-3 -mx-1">
                  <span className="text-sm font-medium text-green-800">
                    Kembalian
                  </span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(change)}
                  </span>
                </div>
              )}
            </>
          )}

          {/* QRIS Specific Details */}
          {method === "QRIS" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 -mx-1">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <CheckCircle2 className="w-4 h-4" />
                <span>Pembayaran digital berhasil diverifikasi</span>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>Waktu Transaksi</span>
            <span>{new Date().toLocaleString("id-ID")}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className="flex flex-col sm:flex-row gap-3 w-full max-w-md animate-slide-up"
        style={{ animationDelay: "300ms" }}
      >
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-400/20"
        >
          <Printer className="w-5 h-5" />
          Cetak Struk
        </button>

        <button
          onClick={onFinish}
          className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/50 relative overflow-hidden group"
        >
          <span className="relative z-10">Selesai</span>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </button>
      </div>

      {/* Close button (optional, for mobile) */}
      <button
        onClick={onFinish}
        className="mt-6 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
      >
        Tutup
      </button>

      {/* Decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-green-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>
    </div>
  );
}
