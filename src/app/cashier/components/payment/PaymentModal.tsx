"use client";

import { useState, useEffect, useRef } from "react";
import { X, CreditCard, Smartphone, Banknote } from "lucide-react";
import { CashPaymentForm } from "@/app/cashier/components/payment/CashPaymentForm";
import { QRISPaymentForm } from "@/app/cashier/components/payment/QRISPaymentForm";
import { PaymentSuccess } from "@/app/cashier/components/payment/PaymentSuccess";
import { formatCurrency } from "@/lib/utils";

export type PaymentMethodType = "TUNAI" | "QRIS" | "TRANSFER";

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  discount: number;
  finalTotal: number;
  outletName?: string;
  cashierName?: string;
  onPaymentComplete: (
    method: PaymentMethodType,
    amountPaid: number,
    change?: number,
  ) => Promise<void>;
}

type PaymentStep = "select-method" | "payment" | "success";

export function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  discount,
  finalTotal,
  outletName = "Outlet Utama",
  cashierName = "Kasir",
  onPaymentComplete,
}: PaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>("select-method");
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethodType>("TUNAI");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    method: PaymentMethodType;
    amountPaid: number;
    change?: number;
    totalAmount: number;
  } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("select-method");
      setSelectedMethod("TUNAI");
      setPaymentDetails(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && step === "select-method") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, step, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleMethodSelect = (method: PaymentMethodType) => {
    setSelectedMethod(method);
    setStep("payment");
  };

  const handlePaymentSubmit = async (amountPaid: number, change?: number) => {
    setIsProcessing(true);
    // Store the total amount BEFORE the payment completes (and cart gets cleared)
    const currentTotal = finalTotal;
    try {
      await onPaymentComplete(selectedMethod, amountPaid, change);
      setPaymentDetails({
        method: selectedMethod,
        amountPaid,
        change,
        totalAmount: currentTotal, // Use the stored total
      });
      setStep("success");
    } catch (error) {
      console.error("Payment failed:", error);
      // Error handling will be done by parent component
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToMethod = () => {
    setStep("select-method");
  };

  const handleFinish = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        ref={modalRef}
        className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl bg-white md:rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-5 h-5" />
                <h2 className="text-xl font-bold">Pembayaran</h2>
              </div>
              <p className="text-sm text-blue-100">
                {outletName} • {cashierName}
              </p>
            </div>
            {step === "select-method" && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Tutup"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(100vh-80px)] md:max-h-[calc(90vh-80px)]">
          {step !== "success" && (
            <div className="bg-gradient-to-b from-blue-50 to-white py-8 px-6">
              {/* Total Amount - Large and Prominent */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 mb-2 uppercase tracking-wide font-medium">
                  Total yang Harus Dibayar
                </p>
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-blue-600/10 blur-xl rounded-full"></div>
                  <h1 className="relative text-5xl md:text-6xl font-bold text-gray-900 tracking-tight">
                    {formatCurrency(finalTotal)}
                  </h1>
                </div>
                {discount > 0 && (
                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    <p>Subtotal: {formatCurrency(totalAmount)}</p>
                    <p className="text-green-600 font-medium">
                      Diskon: -{formatCurrency(discount)}
                    </p>
                  </div>
                )}
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-6"></div>
            </div>
          )}

          {/* Step: Select Method */}
          {step === "select-method" && (
            <div className="px-6 pb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Pilih Metode Pembayaran
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tunai */}
                <button
                  onClick={() => handleMethodSelect("TUNAI")}
                  className="group relative p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="p-4 bg-green-50 group-hover:bg-green-100 rounded-full transition-colors">
                      <Banknote className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">
                        Tunai
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Pembayaran dengan uang tunai
                      </p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/0 group-hover:from-green-500/5 group-hover:to-green-500/10 rounded-xl transition-all"></div>
                </button>

                {/* QRIS */}
                <button
                  onClick={() => handleMethodSelect("QRIS")}
                  className="group relative p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="p-4 bg-blue-50 group-hover:bg-blue-100 rounded-full transition-colors">
                      <Smartphone className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">
                        QRIS
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Scan QR Code untuk bayar
                      </p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-blue-500/10 rounded-xl transition-all"></div>
                </button>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={onClose}
                  className="text-gray-600 hover:text-gray-900 font-medium text-sm px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-xs text-gray-500 mr-2">[ESC]</span>
                  Batalkan
                </button>
              </div>
            </div>
          )}

          {/* Step: Payment Form */}
          {step === "payment" && (
            <div className="px-6 pb-8">
              {selectedMethod === "TUNAI" && (
                <CashPaymentForm
                  totalAmount={finalTotal}
                  onSubmit={handlePaymentSubmit}
                  onBack={handleBackToMethod}
                  isProcessing={isProcessing}
                />
              )}
              {selectedMethod === "QRIS" && (
                <QRISPaymentForm
                  totalAmount={finalTotal}
                  onSuccess={handlePaymentSubmit}
                  onBack={handleBackToMethod}
                  isProcessing={isProcessing}
                />
              )}
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && paymentDetails && (
            <PaymentSuccess
              method={paymentDetails.method}
              totalAmount={paymentDetails.totalAmount}
              amountPaid={paymentDetails.amountPaid}
              change={paymentDetails.change}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
}
