"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
// Define payment methods supported by this cashier interface
type PaymentMethod = "CASH" | "QRIS" | "DEBIT" | "CREDIT" | "TRANSFER";
import { toast } from "sonner";
import { useOutlet } from "@/lib/outlet-context";
import { cacheProducts } from "@/lib/catalog-cache";
import { api } from "@/trpc/client";
import {
  CashierTopBar,
  CashierShortcuts,
  CashierCart,
  CashierPaymentSummary,
  ProductSearchAutocomplete,
} from "@/components/cashier";
import { PaymentModal, type PaymentMethodType } from "./components/payment";
import {
  QuickModeLayout,
  QuickModeToggle,
  useQuickMode,
  showQuickAddFeedback,
} from "./quick-mode";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";

const DEFAULT_PAYMENT_METHOD: PaymentMethod = "CASH";
const QRIS_PAYMENT_METHOD: PaymentMethod = "QRIS";

// Map our local PaymentMethod to Prisma's PaymentMethod for API calls
const toPrismaPaymentMethod = (method: PaymentMethod): string => {
  const mapping: Record<PaymentMethod, string> = {
    CASH: "CASH",
    QRIS: "QRIS",
    DEBIT: "DEBIT",
    CREDIT: "CREDIT",
    TRANSFER: "TRANSFER",
  };
  return mapping[method];
};
const DISCOUNT_LIMIT_PERCENT = Number(
  process.env.NEXT_PUBLIC_DISCOUNT_LIMIT_PERCENT ?? 50,
);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

type CartItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  discountPercent: number;
};

type ReceiptPreviewState = {
  receiptNumber: string;
  soldAt: Date;
  totalNet: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
};

export default function CashierPageRedesign() {
  const {
    currentOutlet,
    activeShift,
    isShiftLoading,
    openShift,
    closeShift,
    refreshShift,
  } = useOutlet();

  const activeOutlet = currentOutlet;
  const activeOutletId = activeOutlet?.id ?? null;

  // Quick Mode state
  const {
    isQuickMode,
    isLoaded: isQuickModeLoaded,
    toggleQuickMode,
  } = useQuickMode();

  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    DEFAULT_PAYMENT_METHOD,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrisCode, setQrisCode] = useState<string | null>(null);

  // Dialogs
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isOpenShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setCloseShiftModalOpen] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState("");
  const [closingCashInput, setClosingCashInput] = useState("");
  const [receiptPreview, setReceiptPreview] =
    useState<ReceiptPreviewState | null>(null);
  const [hasPromptedShift, setHasPromptedShift] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // API
  const catalogQuery = api.products.list.useQuery(
    { take: 100 },
    { staleTime: 300_000 },
  );
  const recordSale = api.sales.recordSale.useMutation();
  const recentSales = api.sales.listRecent.useQuery({ limit: 1 });

  // Cache products on load
  useEffect(() => {
    if (!catalogQuery.data?.length) return;
    void cacheProducts(
      catalogQuery.data
        .filter((item) => item.barcode)
        .map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          barcode: item.barcode as string,
          price: item.price ?? 0,
        })),
    );
  }, [catalogQuery.data]);

  // Refresh shift on outlet change
  useEffect(() => {
    if (!activeOutletId) return;
    void refreshShift();
  }, [activeOutletId, refreshShift]);

  // Prompt shift open if needed
  useEffect(() => {
    if (isShiftLoading) return;
    if (!activeShift && activeOutletId && !hasPromptedShift) {
      setOpenShiftModalOpen(true);
      setHasPromptedShift(true);
    }
    if (activeShift && hasPromptedShift) {
      setHasPromptedShift(false);
    }
  }, [activeShift, activeOutletId, hasPromptedShift, isShiftLoading]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalGross = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const itemDiscounts = cart.reduce((sum, item) => {
      const discountAmount =
        (item.price * item.quantity * item.discountPercent) / 100;
      return sum + discountAmount;
    }, 0);
    const totalDiscount = itemDiscounts + manualDiscount;
    const totalNet = Math.max(totalGross - totalDiscount, 0);

    return {
      totalGross,
      totalDiscount,
      totalNet,
      itemDiscounts,
    };
  }, [cart, manualDiscount]);

  // Generate QRIS code when payment method changes
  useEffect(() => {
    if (paymentMethod !== QRIS_PAYMENT_METHOD) {
      setQrisCode(null);
      return;
    }

    let cancelled = false;
    const payload = `QRIS-SIM|${totals.totalNet}|${Date.now()}`;

    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      width: 220,
      margin: 1,
    })
      .then((url) => {
        if (!cancelled) setQrisCode(url);
      })
      .catch(() => {
        if (!cancelled) setQrisCode(null);
      });

    return () => {
      cancelled = true;
    };
  }, [paymentMethod, totals.totalNet]);

  // Handlers
  const addProductToCart = useCallback(
    (product: {
      id: string;
      name: string;
      sku: string;
      barcode: string | null;
      price: number;
    }) => {
      setCart((prev) => {
        const existing = prev.find((item) => item.productId === product.id);
        if (existing) {
          return prev.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            discountPercent: 0,
          },
        ];
      });

      toast.success(`${product.name} ditambahkan`);

      // Cache for faster lookups
      if (product.barcode) {
        void cacheProducts([
          {
            id: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            price: product.price,
          },
        ]);
      }
    },
    [],
  );

  const updateItemQuantity = useCallback(
    (productId: string, quantity: number) => {
      const safeQuantity = Number.isNaN(quantity) ? 1 : quantity;
      setCart((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(safeQuantity, 1) }
            : item,
        ),
      );
    },
    [],
  );

  const updateItemDiscountPercent = useCallback(
    (productId: string, discountPercent: number) => {
      const safeDiscount = Number.isNaN(discountPercent) ? 0 : discountPercent;
      const clamped = Math.min(Math.max(safeDiscount, 0), 100);
      setCart((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? { ...item, discountPercent: clamped }
            : item,
        ),
      );
    },
    [],
  );

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setManualDiscount(0);
    toast.info("Keranjang dikosongkan");
  }, []);

  const handleManualDiscountChange = (value: number) => {
    const safeValue = Math.max(value, 0);
    if (totals.totalGross === 0) {
      setManualDiscount(safeValue);
      return;
    }
    const limitValue = (totals.totalGross * DISCOUNT_LIMIT_PERCENT) / 100;
    if (safeValue > limitValue) {
      toast.warning(
        `Diskon maksimal ${DISCOUNT_LIMIT_PERCENT}% dari subtotal: ${formatCurrency(limitValue)}`,
      );
      setManualDiscount(limitValue);
    } else {
      setManualDiscount(safeValue);
    }
  };

  const handleOpenPaymentDialog = () => {
    if (cart.length === 0) {
      toast.error("Keranjang masih kosong");
      return;
    }
    if (!activeShift) {
      toast.error("Buka shift terlebih dahulu untuk melakukan transaksi");
      setOpenShiftModalOpen(true);
      return;
    }
    setPaymentDialogOpen(true);
  };

  const handlePaymentComplete = async (
    method: PaymentMethodType,
    amountPaid: number,
    change?: number,
  ) => {
    if (!activeShift || !activeOutletId) {
      toast.error("Shift tidak aktif atau outlet tidak dipilih");
      throw new Error("Shift tidak aktif");
    }

    if (cart.length === 0) {
      toast.error("Keranjang masih kosong");
      throw new Error("Keranjang kosong");
    }

    try {
      // Map PaymentMethodType to Prisma PaymentMethod enum
      const mappedMethod = method === "TUNAI" ? "CASH" : method;

      const result = await recordSale.mutateAsync({
        outletId: activeOutletId,
        receiptNumber: `TRX-${Date.now()}`,
        discountTotal: manualDiscount,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: (item.price * item.quantity * item.discountPercent) / 100,
        })),
        payments: [
          {
            method: mappedMethod as "CASH" | "QRIS" | "CARD" | "EWALLET",
            amount: totals.totalNet,
            reference:
              change !== undefined
                ? `Cash: ${formatCurrency(amountPaid)}, Change: ${formatCurrency(change)}`
                : undefined,
          },
        ],
      });

      setReceiptPreview({
        receiptNumber: result.receiptNumber,
        soldAt: new Date(result.soldAt),
        totalNet: result.totalNet,
        paymentMethod: mappedMethod as PaymentMethod,
        paymentReference: undefined,
      });

      // Clear cart and reset
      setCart([]);
      setManualDiscount(0);

      toast.success(`Transaksi ${result.receiptNumber} berhasil!`);

      // Refetch recent sales
      await recentSales.refetch();

      // Auto-focus search after successful payment
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 500);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memproses pembayaran";
      toast.error(message);
      throw error;
    }
  };

  const handleClosePaymentModal = () => {
    setPaymentDialogOpen(false);
    // Auto-focus search when modal closes
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleOpenShift = async () => {
    if (!activeOutletId) {
      toast.error("Pilih outlet terlebih dahulu");
      return;
    }

    const value = Number(openingCashInput || 0);
    if (Number.isNaN(value) || value < 0) {
      toast.error("Nominal kas awal tidak valid");
      return;
    }

    try {
      await openShift(value);
      toast.success("Shift berhasil dibuka");
      setOpenShiftModalOpen(false);
      setOpeningCashInput("");
      await refreshShift();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal membuka shift";
      toast.error(message);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) {
      toast.error("Tidak ada shift aktif");
      return;
    }

    const value = Number(closingCashInput || 0);
    if (Number.isNaN(value) || value < 0) {
      toast.error("Nominal kas akhir tidak valid");
      return;
    }

    try {
      await closeShift(value);
      toast.success("Shift berhasil ditutup");
      setCloseShiftModalOpen(false);
      setClosingCashInput("");
      await refreshShift();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menutup shift";
      toast.error(message);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 - Open payment dialog
      if (e.key === "F2") {
        e.preventDefault();
        if (cart.length === 0) {
          toast.error("Keranjang masih kosong");
          return;
        }
        if (!activeShift) {
          toast.error("Buka shift terlebih dahulu untuk melakukan transaksi");
          setOpenShiftModalOpen(true);
          return;
        }
        setPaymentDialogOpen(true);
      }
      // ESC - Clear last item or close dialog
      if (e.key === "Escape") {
        if (isPaymentDialogOpen) {
          setPaymentDialogOpen(false);
        } else if (cart.length > 0) {
          const lastItem = cart[cart.length - 1];
          if (lastItem) {
            removeItem(lastItem.productId);
            toast.info(`${lastItem.name} dihapus dari keranjang`);
          }
        }
      }
      // Ctrl+K - Focus search
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, isPaymentDialogOpen, removeItem, activeShift]);

  const recentTransaction = recentSales.data?.[0]
    ? {
        receiptNumber: recentSales.data[0].receiptNumber,
        totalNet: recentSales.data[0].totalNet,
        createdAt: new Date(recentSales.data[0].soldAt),
        itemCount: recentSales.data[0].items.length,
      }
    : null;

  // Wait for Quick Mode preference to load
  if (!isQuickModeLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Render Quick Mode Layout
  if (isQuickMode) {
    return (
      <>
        <QuickModeLayout
          outletName={activeOutlet?.name}
          shiftActive={!!activeShift}
          cart={cart.map((item) => ({
            ...item,
            stock: undefined, // TODO: Add stock from product query
          }))}
          onAddProduct={(productId) => {
            const product = catalogQuery.data?.find((p) => p.id === productId);
            if (product) {
              addProductToCart({
                id: product.id,
                name: product.name,
                sku: product.sku,
                barcode: product.barcode,
                price: product.price ?? 0,
              });
            }
          }}
          onBarcodeScanned={(barcode) => {
            const product = catalogQuery.data?.find(
              (p) => p.barcode === barcode,
            );
            if (product) {
              addProductToCart({
                id: product.id,
                name: product.name,
                sku: product.sku,
                barcode: product.barcode,
                price: product.price ?? 0,
              });
              showQuickAddFeedback();
            } else {
              toast.error(`Produk dengan barcode ${barcode} tidak ditemukan`);
            }
          }}
          onUpdateQuantity={updateItemQuantity}
          onRemoveItem={removeItem}
          onClearCart={clearCart}
          totalAmount={totals.totalGross}
          discount={manualDiscount}
          finalTotal={totals.totalNet}
          paymentMethod={paymentMethod as "CASH" | "QRIS" | "CARD"}
          onPaymentMethodChange={(method) =>
            setPaymentMethod(method as PaymentMethod)
          }
          onDiscountChange={setManualDiscount}
          onCheckout={handleOpenPaymentDialog}
          maxDiscountPercent={DISCOUNT_LIMIT_PERCENT}
          disabled={!activeShift}
        />

        {/* Mode Toggle - Fixed position */}
        <div className="fixed top-4 right-4 z-50">
          <QuickModeToggle
            isQuickMode={isQuickMode}
            onToggle={toggleQuickMode}
          />
        </div>

        {/* Payment Modal (shared with normal mode) */}
        <PaymentModal
          isOpen={isPaymentDialogOpen}
          onClose={handleClosePaymentModal}
          totalAmount={totals.totalGross}
          discount={totals.totalDiscount}
          finalTotal={totals.totalNet}
          outletName={activeOutlet?.name ?? "Outlet"}
          cashierName={activeShift?.user?.name ?? "Kasir"}
          onPaymentComplete={handlePaymentComplete}
        />

        {/* Shift Modals (shared) */}
        <Dialog
          open={isOpenShiftModalOpen}
          onOpenChange={setOpenShiftModalOpen}
        >
          <DialogContent className="max-w-md">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Buka Shift Kasir</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Masukkan nominal kas awal untuk membuka shift
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening-cash">Kas Awal (Rp)</Label>
                <Input
                  id="opening-cash"
                  type="number"
                  placeholder="0"
                  value={openingCashInput}
                  onChange={(e) => setOpeningCashInput(e.target.value)}
                  min="0"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setOpenShiftModalOpen(false)}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button onClick={handleOpenShift} className="flex-1">
                  Buka Shift
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isCloseShiftModalOpen}
          onOpenChange={setCloseShiftModalOpen}
        >
          <DialogContent className="max-w-md">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Tutup Shift Kasir</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Masukkan nominal kas akhir untuk menutup shift
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="closing-cash">Kas Akhir (Rp)</Label>
                <Input
                  id="closing-cash"
                  type="number"
                  placeholder="0"
                  value={closingCashInput}
                  onChange={(e) => setClosingCashInput(e.target.value)}
                  min="0"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCloseShiftModalOpen(false)}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button onClick={handleCloseShift} className="flex-1">
                  Tutup Shift
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Render Normal Mode Layout
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Bar with Mode Toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <CashierTopBar
          onOpenShift={() => setOpenShiftModalOpen(true)}
          onCloseShift={() => setCloseShiftModalOpen(true)}
        />
        <QuickModeToggle isQuickMode={isQuickMode} onToggle={toggleQuickMode} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side - Cart & Search (60%) */}
        <div className="flex w-full flex-col border-r lg:w-[60%]">
          {/* Shortcuts Bar */}
          <div className="border-b p-4">
            <CashierShortcuts />
          </div>

          {/* Search Input */}
          <div className="border-b p-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Scan / Cari Produk
              </label>
              <ProductSearchAutocomplete
                onProductSelect={addProductToCart}
                placeholder="Ketik nama, SKU, atau scan barcode..."
                autoFocus={true}
              />
              <p className="text-xs text-muted-foreground">
                Fokus otomatis setiap selesai transaksi • Tekan Ctrl+K untuk
                fokus kembali
              </p>
            </div>
          </div>

          {/* Cart */}
          <div className="flex-1 overflow-hidden">
            <CashierCart
              items={cart}
              onUpdateQuantity={updateItemQuantity}
              onUpdateDiscount={updateItemDiscountPercent}
              onRemoveItem={removeItem}
              onClearCart={clearCart}
              totalAmount={totals.totalGross}
            />
          </div>
        </div>

        {/* Right Side - Payment Summary (40%) */}
        <div className="hidden w-[40%] overflow-y-auto bg-muted/20 p-6 lg:block">
          <CashierPaymentSummary
            cart={cart}
            subtotal={totals.totalGross}
            itemDiscounts={totals.itemDiscounts}
            manualDiscount={manualDiscount}
            maxDiscountPercent={DISCOUNT_LIMIT_PERCENT}
            totalNet={totals.totalNet}
            paymentMethod={paymentMethod}
            isProcessing={isProcessing}
            recentTransaction={recentTransaction}
            qrisCode={qrisCode}
            onPaymentMethodChange={setPaymentMethod}
            onManualDiscountChange={handleManualDiscountChange}
            onCheckout={handleOpenPaymentDialog}
          />
        </div>
      </div>

      {/* Mobile Payment Button (visible only on mobile) */}
      <div className="border-t bg-background p-4 lg:hidden">
        <Button
          onClick={handleOpenPaymentDialog}
          disabled={cart.length === 0}
          size="lg"
          className="w-full text-lg font-bold"
        >
          Bayar (F2) • {formatCurrency(totals.totalNet)}
        </Button>
      </div>

      {/* Payment Modal (Normal Mode) */}
      <PaymentModal
        isOpen={isPaymentDialogOpen}
        onClose={handleClosePaymentModal}
        totalAmount={totals.totalGross}
        discount={totals.totalDiscount}
        finalTotal={totals.totalNet}
        outletName={activeOutlet?.name ?? "Outlet"}
        cashierName={activeShift?.user?.name ?? "Kasir"}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Receipt Success Dialog */}
      <Dialog
        open={!!receiptPreview}
        onOpenChange={(open) => !open && setReceiptPreview(null)}
      >
        <DialogContent className="max-w-md">
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h2 className="text-2xl font-bold">Pembayaran Berhasil!</h2>
              {receiptPreview && (
                <p className="mt-2 text-sm text-muted-foreground">
                  No. Struk: {receiptPreview.receiptNumber}
                </p>
              )}
            </div>

            {receiptPreview && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(receiptPreview.totalNet)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Metode</span>
                  <span className="font-medium">
                    {receiptPreview.paymentMethod === "CASH" ? "Tunai" : "QRIS"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Waktu</span>
                  <span className="font-medium">
                    {new Date(receiptPreview.soldAt).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={() => setReceiptPreview(null)}
              className="w-full"
              size="lg"
            >
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Open Shift Dialog */}
      <Dialog open={isOpenShiftModalOpen} onOpenChange={setOpenShiftModalOpen}>
        <DialogContent className="max-w-md">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Buka Shift Kasir</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Masukkan nominal kas awal untuk membuka shift
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opening-cash">Kas Awal (Rp)</Label>
              <Input
                id="opening-cash"
                type="number"
                placeholder="0"
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
                min="0"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setOpenShiftModalOpen(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button onClick={handleOpenShift} className="flex-1">
                Buka Shift
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog
        open={isCloseShiftModalOpen}
        onOpenChange={setCloseShiftModalOpen}
      >
        <DialogContent className="max-w-md">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Tutup Shift Kasir</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Masukkan nominal kas akhir untuk menutup shift
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="closing-cash">Kas Akhir (Rp)</Label>
              <Input
                id="closing-cash"
                type="number"
                placeholder="0"
                value={closingCashInput}
                onChange={(e) => setClosingCashInput(e.target.value)}
                min="0"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCloseShiftModalOpen(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button onClick={handleCloseShift} className="flex-1">
                Tutup Shift
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
