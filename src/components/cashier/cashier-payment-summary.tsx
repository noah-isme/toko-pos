"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Loader2, CreditCard, Wallet, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

type PaymentMethod = "CASH" | "QRIS" | "DEBIT" | "CREDIT" | "TRANSFER";

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discountPercent: number;
};

type RecentTransaction = {
  receiptNumber: string;
  totalNet: number;
  createdAt: Date;
  itemCount: number;
};

interface CashierPaymentSummaryProps {
  cart: CartItem[];
  subtotal: number;
  itemDiscounts: number;
  manualDiscount: number;
  maxDiscountPercent: number;
  totalNet: number;
  paymentMethod: PaymentMethod;
  isProcessing: boolean;
  recentTransaction: RecentTransaction | null;
  qrisCode?: string | null;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onManualDiscountChange: (value: number) => void;
  onCheckout: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export function CashierPaymentSummary({
  cart,
  subtotal,
  itemDiscounts,
  manualDiscount,
  maxDiscountPercent,
  totalNet,
  paymentMethod,
  isProcessing,
  recentTransaction,
  qrisCode,
  onPaymentMethodChange,
  onManualDiscountChange,
  onCheckout,
}: CashierPaymentSummaryProps) {
  const canCheckout = cart.length > 0 && !isProcessing;

  return (
    <div className="sticky top-4 h-fit">
      <Card className="border-2 shadow-lg">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="border-b pb-4">
            <h2 className="text-lg font-bold text-foreground">
              Ringkasan Pembayaran
            </h2>
          </div>

          {/* Totals Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>

            <AnimatePresence mode="wait">
              {itemDiscounts > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">Diskon Item</span>
                  <span className="font-medium text-green-600">
                    - {formatCurrency(itemDiscounts)}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Manual Discount Input */}
            <div className="space-y-2">
              <Label
                htmlFor="manual-discount"
                className="text-xs text-muted-foreground"
              >
                Diskon Tambahan (maks {maxDiscountPercent}%)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="manual-discount"
                  type="number"
                  min="0"
                  value={manualDiscount || ""}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 0;
                    onManualDiscountChange(value);
                  }}
                  disabled={cart.length === 0 || isProcessing}
                  className="pl-10 h-9 text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {manualDiscount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">Diskon Manual</span>
                  <span className="font-medium text-green-600">
                    - {formatCurrency(manualDiscount)}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Total */}
            <div className="border-t pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Total Dibayar
                </span>
                <motion.span
                  key={totalNet}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-bold text-primary"
                >
                  {formatCurrency(totalNet)}
                </motion.span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-sm font-semibold">Metode Pembayaran</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) =>
                onPaymentMethodChange(value as PaymentMethod)
              }
              disabled={isProcessing}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 rounded-lg border-2 border-border p-3 hover:border-primary/50 transition-colors">
                <RadioGroupItem value="CASH" id="payment-cash" />
                <Label
                  htmlFor="payment-cash"
                  className="flex-1 cursor-pointer flex items-center gap-2"
                >
                  <Wallet className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Tunai</span>
                </Label>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border-2 border-border p-3 hover:border-primary/50 transition-colors">
                <RadioGroupItem value="QRIS" id="payment-qris" />
                <Label
                  htmlFor="payment-qris"
                  className="flex-1 cursor-pointer flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Non-Tunai (QRIS)</span>
                </Label>
              </div>
            </RadioGroup>

            {/* QRIS Code Preview */}
            <AnimatePresence mode="wait">
              {paymentMethod === "QRIS" && qrisCode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="rounded-lg border bg-muted/30 p-4 flex flex-col items-center"
                >
                  <p className="text-xs text-muted-foreground mb-2">
                    Preview QRIS
                  </p>
                  <Image
                    src={qrisCode}
                    alt="QRIS Code"
                    width={128}
                    height={128}
                    className="rounded-md"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Checkout Button */}
          <motion.div
            whileHover={canCheckout ? { scale: 1.02 } : {}}
            whileTap={canCheckout ? { scale: 0.98 } : {}}
          >
            <Button
              onClick={onCheckout}
              disabled={!canCheckout}
              size="lg"
              className={cn(
                "w-full h-14 text-lg font-bold uppercase tracking-wide shadow-lg",
                canCheckout && "animate-pulse-subtle",
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-5 w-5" />
                  Bayar (F2)
                </>
              )}
            </Button>
          </motion.div>

          {/* Recent Transaction */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
              Transaksi Terakhir
            </h3>
            <AnimatePresence mode="wait">
              {recentTransaction ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-lg border bg-muted/30 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">
                      #{recentTransaction.receiptNumber}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(recentTransaction.createdAt).toLocaleTimeString(
                        "id-ID",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {recentTransaction.itemCount} item
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {formatCurrency(recentTransaction.totalNet)}
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-dashed bg-muted/20 p-4 text-center"
                >
                  <p className="text-sm text-muted-foreground">
                    Belum ada transaksi
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </div>
  );
}
