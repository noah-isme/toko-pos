"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Code, Plus, Trash2, Tag, Percent, ShoppingBag, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/trpc/client";
import { cn } from "@/lib/utils";

type PromotionTypeLabel = "BUY_X_GET_Y" | "BUNDLE_DISCOUNT" | "TIERED_DISCOUNT";

const PROMOTION_TYPE_OPTIONS: Record<PromotionTypeLabel, string> = {
  BUY_X_GET_Y: "Beli X Gratis Y",
  BUNDLE_DISCOUNT: "Diskon Bundel",
  TIERED_DISCOUNT: "Diskon Bertingkat",
};

const describePromotionRules = (rules: unknown) => {
  if (!rules || typeof rules !== "object") return "Aturan promo standar";
  const r = rules as Record<string, any>;
  if (r.triggerProductId || r.triggerQuantity) {
    const trigger = r.triggerProductId ? ` (${r.triggerProductId})` : "";
    const reward = r.rewardProductId ? ` (${r.rewardProductId})` : "";
    return `Beli ${r.triggerQuantity ?? 1}x${trigger} gratis ${r.rewardQuantity ?? 1}x${reward}`;
  }
  if (r.minSpend || r.discountPercent) {
    return `Min. belanja Rp${Number(r.minSpend || 0).toLocaleString("id-ID")}, diskon ${r.discountPercent || 0}%`;
  }
  if (r.bundlePrice) {
    return `Harga paket bundel Rp${Number(r.bundlePrice).toLocaleString("id-ID")}`;
  }
  try {
    const json = JSON.stringify(rules);
    if (json.length <= 50) return json;
    return `${json.slice(0, 50)}...`;
  } catch {
    return "Aturan promo khusus";
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

type SimulationItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

type SimulationResult = {
  promotions: {
    id: string;
    name: string;
    description: string | null;
    discount: number;
  }[];
  discount: number;
  totalGross: number;
};

export default function ManagementPromotionsPage() {
  const outletsQuery = api.outlets.list.useQuery();
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const promotionsQuery = api.promotions.list.useQuery(
    { outletId: selectedOutletId ?? "" },
    {
      enabled: !!selectedOutletId,
      staleTime: 300_000,
    },
  );
  const createPromotion = api.promotions.create.useMutation();

  useEffect(() => {
    if (!selectedOutletId && outletsQuery.data?.length) {
      setSelectedOutletId(outletsQuery.data[0].id);
    }
  }, [outletsQuery.data, selectedOutletId]);

  // Form State with Friendly Rule Builders
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "BUY_X_GET_Y" as PromotionTypeLabel,
    isGlobal: true,
    startDate: "",
    endDate: "",
    // Visual Rule Builder state
    triggerProductId: "SKU-COFFEE-ARABICA-250",
    triggerQuantity: 2,
    rewardProductId: "SKU-BREAD-WHOLEGRAIN",
    rewardQuantity: 1,
    minSpend: 100000,
    discountPercent: 10,
    bundlePrice: 50000,
    // Advanced mode
    useAdvancedJson: false,
    rawJsonRules: '{"triggerProductId": "SKU-001", "triggerQuantity": 2, "rewardProductId": "SKU-002", "rewardQuantity": 1}',
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Nama promo wajib diisi");
      return;
    }

    if (!form.isGlobal && !selectedOutletId) {
      toast.error("Pilih outlet terlebih dahulu");
      return;
    }

    let parsedRules: unknown;

    if (form.useAdvancedJson) {
      try {
        parsedRules = JSON.parse(form.rawJsonRules);
      } catch (error) {
        toast.error("Aturan JSON tidak valid");
        return;
      }
    } else {
      // Build rule object dynamically based on promotion type
      if (form.type === "BUY_X_GET_Y") {
        parsedRules = {
          triggerProductId: form.triggerProductId,
          triggerQuantity: form.triggerQuantity,
          rewardProductId: form.rewardProductId,
          rewardQuantity: form.rewardQuantity,
        };
      } else if (form.type === "TIERED_DISCOUNT") {
        parsedRules = {
          minSpend: form.minSpend,
          discountPercent: form.discountPercent,
        };
      } else if (form.type === "BUNDLE_DISCOUNT") {
        parsedRules = {
          bundlePrice: form.bundlePrice,
        };
      }
    }

    try {
      await createPromotion.mutateAsync({
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        rules: parsedRules,
        isActive: true,
        isGlobal: form.isGlobal,
        priority: 0,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        outletIds: form.isGlobal ? undefined : [selectedOutletId!],
      });
      toast.success("Promo berhasil disimpan");
      setForm((prev) => ({
        ...prev,
        name: "",
        description: "",
      }));
      promotionsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menyimpan promo";
      toast.error(message);
    }
  };

  const renderedPromotions = promotionsQuery.data ?? [];
  const [simulationItems, setSimulationItems] = useState<SimulationItem[]>([
    { productId: "SKU-COFFEE-ARABICA-250", quantity: 2, unitPrice: 35000 },
    { productId: "SKU-BREAD-WHOLEGRAIN", quantity: 1, unitPrice: 18000 },
  ]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(
    null,
  );

  const simulatePromotion = api.promotions.simulate.useMutation({
    onSuccess(data) {
      setSimulationResult(data);
    },
  });

  const promotionUsageSummaryQuery =
    api.analytics.getPromotionUsageSummary.useQuery(
      {
        outletId: selectedOutletId ?? undefined,
      },
      {
        enabled: !!selectedOutletId,
        staleTime: 300_000,
      },
    );

  const taskFeedbackQuery = api.analytics.getTaskFeedbackSummary.useQuery(
    {
      outletId: selectedOutletId ?? undefined,
    },
    {
      enabled: !!selectedOutletId,
      staleTime: 120_000,
    },
  );

  const handleSimulationItemChange = (
    index: number,
    field: keyof SimulationItem,
    value: string | number,
  ) => {
    setSimulationItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [field]:
                field === "productId"
                  ? String(value)
                  : Number(value),
            }
          : item,
      ),
    );
  };

  const addSimulationItem = () => {
    setSimulationItems((prev) => [
      ...prev,
      { productId: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeSimulationItem = (index: number) => {
    if (simulationItems.length <= 1) return;
    setSimulationItems((prev) =>
      prev.filter((_, idx) => idx !== index),
    );
  };

  const handleSimulatePromotion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOutletId) {
      toast.error("Pilih outlet terlebih dahulu");
      return;
    }

    const invalidItem = simulationItems.some(
      (item) =>
        !item.productId.trim() ||
        item.quantity <= 0 ||
        item.unitPrice < 0,
    );

    if (invalidItem) {
      toast.error("Isi semua kolom simulasi dengan nilai valid");
      return;
    }

    setSimulationResult(null);
    try {
      await simulatePromotion.mutateAsync({
        outletId: selectedOutletId,
        items: simulationItems,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menjalankan simulasi promo";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dynamic Promotion Engine</h1>
            <p className="text-sm text-muted-foreground">
              Buat dan kelola aturan promo yang akan otomatis diterapkan di kasir.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Form Promo Baru */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Form Promo Baru</h2>
              <p className="text-sm text-muted-foreground">
                Konfigurasi aturan promo dengan opsi visual sederhana.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  useAdvancedJson: !prev.useAdvancedJson,
                }))
              }
              className="gap-1.5 text-xs"
            >
              <Code className="h-3.5 w-3.5" />
              {form.useAdvancedJson ? "Mode Visual" : "Mode JSON"}
            </Button>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nama Promo
              </label>
              <Input
                placeholder="Contoh: Promo Sarapan Kopi & Roti"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Deskripsi Singkat
              </label>
              <Input
                placeholder="Contoh: Beli 2 kopi gratis 1 roti fresh"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tipe Promo
                </label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, type: value as PromotionTypeLabel }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe promo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROMOTION_TYPE_OPTIONS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cakupan Outlet
                </label>
                <Select
                  value={form.isGlobal ? "global" : "outlet"}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, isGlobal: value === "global" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aplikasikan ke" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Semua Outlet (Global)</SelectItem>
                    <SelectItem value="outlet">Outlet Spesifik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!form.isGlobal && (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Outlet Target
                </label>
                <Select
                  value={selectedOutletId ?? ""}
                  onValueChange={(value) => setSelectedOutletId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {outletsQuery.data?.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* RULE BUILDER CONTAINER */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-primary">
                {form.useAdvancedJson
                  ? "Aturan (JSON Raw Editor)"
                  : `Konfigurasi Aturan: ${PROMOTION_TYPE_OPTIONS[form.type]}`}
              </p>

              {form.useAdvancedJson ? (
                <div className="space-y-1">
                  <textarea
                    value={form.rawJsonRules}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        rawJsonRules: event.target.value,
                      }))
                    }
                    className="h-28 w-full rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Edit struktur JSON secara manual jika memerlukan opsi rule lanjutan.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.type === "BUY_X_GET_Y" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          SKU Produk Syarat (Beli)
                        </label>
                        <Input
                          placeholder="SKU-COFFEE-ARABICA-250"
                          value={form.triggerProductId}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, triggerProductId: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Jumlah Beli (X)
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={form.triggerQuantity}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, triggerQuantity: Number(e.target.value) }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          SKU Produk Hadiah (Gratis)
                        </label>
                        <Input
                          placeholder="SKU-BREAD-WHOLEGRAIN"
                          value={form.rewardProductId}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, rewardProductId: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Jumlah Hadiah (Y)
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={form.rewardQuantity}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, rewardQuantity: Number(e.target.value) }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {form.type === "TIERED_DISCOUNT" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Minimal Belanja (Rp)
                        </label>
                        <Input
                          type="number"
                          step="5000"
                          value={form.minSpend}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, minSpend: Number(e.target.value) }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Diskon (%)
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={form.discountPercent}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, discountPercent: Number(e.target.value) }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {form.type === "BUNDLE_DISCOUNT" && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Harga Special Paket Bundel (Rp)
                      </label>
                      <Input
                        type="number"
                        step="1000"
                        value={form.bundlePrice}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, bundlePrice: Number(e.target.value) }))
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tanggal Mulai
                </label>
                <Input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tanggal Selesai
                </label>
                <Input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              {createPromotion.isPending ? "Menyimpan..." : "Simpan Promo"}
            </Button>
          </form>
        </div>

        {/* Promo Aktif List */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Promo Aktif</h2>
          <p className="text-sm text-muted-foreground">
            Daftar promo aktif yang berlaku untuk outlet pilihan.
          </p>
          <div className="mt-5 space-y-3">
            {promotionsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat promo...</p>
            ) : renderedPromotions.length ? (
              renderedPromotions.map((promotion) => (
                <div
                  key={promotion.id}
                  className="rounded-xl border border-border bg-background/80 p-4 transition-all hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-foreground">{promotion.name}</p>
                      <span className="mt-0.5 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {PROMOTION_TYPE_OPTIONS[promotion.type]}
                      </span>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {promotion.isGlobal ? "Global" : "Outlet"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-medium text-foreground/80">
                    {promotion.description || describePromotionRules(promotion.rules)}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-[11px] text-muted-foreground">
                    <span>
                      {promotion.startDate
                        ? `Mulai: ${new Date(promotion.startDate).toLocaleDateString("id-ID")}`
                        : "Mulai: Kapan Saja"}
                    </span>
                    <span>
                      {promotion.endDate
                        ? `Selesai: ${new Date(promotion.endDate).toLocaleDateString("id-ID")}`
                        : "Selesai: Tanpa Batas"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada promo aktif untuk outlet ini.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Simulator & Analytics Section */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Promo Simulator */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Promo Simulator</h2>
              <p className="text-sm text-muted-foreground">
                Uji aturan promo dengan item keranjang sebelum digunakan kasir.
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
              {selectedOutletId ? "Outlet Siap" : "Pilih Outlet"}
            </span>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSimulatePromotion}>
            <div className="space-y-3">
              <div className="hidden grid-cols-12 gap-2 text-xs font-semibold uppercase text-muted-foreground md:grid">
                <span className="col-span-6">Produk / SKU</span>
                <span className="col-span-2">Jumlah</span>
                <span className="col-span-3">Harga Satuan (Rp)</span>
                <span className="col-span-1"></span>
              </div>

              {simulationItems.map((item, index) => (
                <div
                  key={`${item.productId}-${index}`}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 md:grid md:grid-cols-12 md:items-center"
                >
                  <div className="md:col-span-6">
                    <Input
                      placeholder="Product ID / SKU (misal: SKU-COFFEE-ARABICA-250)"
                      value={item.productId}
                      onChange={(event) =>
                        handleSimulationItemChange(index, "productId", event.target.value)
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(event) =>
                        handleSimulationItemChange(
                          index,
                          "quantity",
                          Number(event.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="Harga Satuan"
                      value={item.unitPrice}
                      onChange={(event) =>
                        handleSimulationItemChange(
                          index,
                          "unitPrice",
                          Number(event.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="flex justify-end md:col-span-1">
                    {simulationItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSimulationItem(index)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={addSimulationItem} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Tambah Item
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={simulatePromotion.isPending || !selectedOutletId}
              >
                {simulatePromotion.isPending ? "Memeriksa..." : "Preview Promo"}
              </Button>
            </div>
          </form>

          {simulationResult && (
            <div className="mt-5 space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total Gross:</span>
                <span className="font-medium text-foreground">{formatCurrency(simulationResult.totalGross)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total Diskon Promo:</span>
                <span className="font-semibold text-emerald-600">
                  -{formatCurrency(simulationResult.discount)}
                </span>
              </div>
              {simulationResult.promotions.length ? (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-bold uppercase text-foreground">Promo Terpanggil:</p>
                  {simulationResult.promotions.map((promo) => (
                    <div
                      key={promo.id}
                      className="rounded-lg border border-border bg-background p-3"
                    >
                      <p className="text-sm font-bold text-foreground">{promo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {promo.description ?? "Deskripsi tidak tersedia"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-emerald-600">
                        Hemat: {formatCurrency(promo.discount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="border-t pt-2 text-xs text-muted-foreground">
                  Tidak ada promo yang cocok dengan item simulasi ini.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Analytics & Task Loop */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Promotion Usage Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Pantau redeem rate dan dampak diskon.
                </p>
              </div>
              {promotionUsageSummaryQuery.data ? (
                <span className="text-xs text-muted-foreground">
                  {new Date(
                    promotionUsageSummaryQuery.data.from,
                  ).toLocaleDateString("id-ID")}{" "}
                  –{" "}
                  {new Date(
                    promotionUsageSummaryQuery.data.to,
                  ).toLocaleDateString("id-ID")}
                </span>
              ) : null}
            </div>

            {/* RESPONSIVE SUMMARY CARDS GRID */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background/80 p-3.5 text-center min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Redemptions</p>
                <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl truncate">
                  {promotionUsageSummaryQuery.data?.totalRedemptions ?? "-"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 p-3.5 text-center min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Diskon</p>
                <p className="mt-1 text-lg font-bold text-emerald-600 sm:text-xl truncate" title={formatCurrency(promotionUsageSummaryQuery.data?.totalDiscount ?? 0)}>
                  {formatCurrency(
                    promotionUsageSummaryQuery.data?.totalDiscount ?? 0,
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 p-3.5 text-center min-w-0">
                <p className="text-xs text-muted-foreground truncate">Redemption Rate</p>
                <p className="mt-1 text-xl font-bold text-primary sm:text-2xl truncate">
                  {promotionUsageSummaryQuery.data
                    ? `${Math.round(
                        promotionUsageSummaryQuery.data.redemptionRate * 100,
                      )}%`
                    : "-"}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Top Promotions
              </p>
              {promotionUsageSummaryQuery.data?.topPromotions.length ? (
                promotionUsageSummaryQuery.data.topPromotions.map((promo) => (
                  <div
                    key={promo.promotionId}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-foreground">{promo.name ?? promo.promotionId}</span>
                    <span className="font-semibold text-emerald-600">
                      {promo.redemptions}x • {formatCurrency(promo.discount)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  Belum ada data pemakaian promo.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Task Feedback Loop</h3>
                <p className="text-sm text-muted-foreground">
                  Sinkronkan status tugas kasir dan alert stok.
                </p>
              </div>
              {taskFeedbackQuery.data ? (
                <span className="text-xs text-muted-foreground">
                  {new Date(taskFeedbackQuery.data.period.from).toLocaleDateString(
                    "id-ID",
                  )}{" "}
                  –{" "}
                  {new Date(taskFeedbackQuery.data.period.to).toLocaleDateString(
                    "id-ID",
                  )}
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-border bg-background/80 p-3 min-w-0">
                <p className="text-xs text-muted-foreground truncate">Pending</p>
                <p className="mt-1 text-xl font-bold text-amber-600">
                  {taskFeedbackQuery.data?.pendingTasks ?? "-"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 p-3 min-w-0">
                <p className="text-xs text-muted-foreground truncate">Selesai</p>
                <p className="mt-1 text-xl font-bold text-emerald-600">
                  {taskFeedbackQuery.data?.completedTasks ?? "-"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 p-3 min-w-0">
                <p className="text-xs text-muted-foreground truncate">Alert Kritis</p>
                <p className="mt-1 text-xl font-bold text-rose-600">
                  {taskFeedbackQuery.data?.criticalAlerts ?? "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
