"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
  if (!rules) return "Aturan promo tidak tersedia";
  try {
    const json = JSON.stringify(rules);
    if (json.length <= 60) return json;
    return `${json.slice(0, 60)}...`;
  } catch {
    return "Aturan spesial";
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

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "BUY_X_GET_Y" as PromotionTypeLabel,
    rules: '{"triggerProductId": "", "triggerQuantity": 2, "rewardProductId": "", "rewardQuantity": 1}',
    isGlobal: true,
    startDate: "",
    endDate: "",
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
    try {
      parsedRules = JSON.parse(form.rules);
    } catch (error) {
      toast.error("Aturan harus berupa JSON yang valid");
      return;
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
        rules: prev.rules,
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
    { productId: "", quantity: 1, unitPrice: 0 },
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
    <div className="space-y-6">
      <header className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold">Dynamic Promotion Engine</h1>
        <p className="text-sm text-muted-foreground">
          Buat dan kelola aturan promo yang akan otomatis diterapkan di kasir.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Form Promo Baru</h2>
          <p className="text-sm text-muted-foreground">
            Isi parameter promo, misal BUY_X_GET_Y atau BUNDLE_DISCOUNT.
          </p>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nama Promo
              </label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Deskripsi
              </label>
              <Input
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
                  Gaya promo
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
                    <SelectItem value="global">Global</SelectItem>
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

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Aturan (JSON)
              </label>
              <textarea
                value={form.rules}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, rules: event.target.value }))
                }
                className={cn(
                  "h-32 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed",
                )}
              />
              <p className="text-xs text-muted-foreground">
                Contoh BUY_X_GET_Y: {"{triggerProductId:'SKU-001', triggerQuantity:2, rewardProductId:'SKU-002', rewardQuantity:1}"}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Mulai
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
                  Selesai
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

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Promo Aktif</h2>
          <p className="text-sm text-muted-foreground">
            Aturan yang berlaku untuk outlet yang dipilih.
          </p>
          <div className="mt-4 space-y-3">
            {promotionsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat promo...</p>
            ) : renderedPromotions.length ? (
              renderedPromotions.map((promotion) => (
                <div
                  key={promotion.id}
                  className="rounded-xl border border-border bg-background/60 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold">{promotion.name}</p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {PROMOTION_TYPE_OPTIONS[promotion.type]}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {promotion.description ??
                          describePromotionRules(promotion.rules)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {promotion.isGlobal ? "Global" : "Outlet"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {promotion.startDate ? `Start ${promotion.startDate}` : "Mulai kapan saja"}
                    </span>
                    <span>
                      {promotion.endDate ? `Selesai ${promotion.endDate}` : "Tanpa batas"}
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
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Promo Simulator</h2>
              <p className="text-sm text-muted-foreground">
                Uji aturan dengan keranjang contoh sebelum dipublikasikan.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {selectedOutletId ? "Outlet siap" : "Pilih outlet"}
            </span>
          </div>
          <form className="mt-4 space-y-4" onSubmit={handleSimulatePromotion}>
            <div className="space-y-3">
              {simulationItems.map((item, index) => (
                <div
                  key={`${item.productId}-${index}`}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-background/60 p-3 md:flex-row md:items-center"
                >
                  <Input
                    placeholder="Product ID / SKU"
                    value={item.productId}
                    onChange={(event) =>
                      handleSimulationItemChange(index, "productId", event.target.value)
                    }
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(event) =>
                      handleSimulationItemChange(
                        index,
                        "quantity",
                        Number(event.target.value),
                      )
                    }
                    className="w-full md:w-28"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={item.unitPrice}
                    onChange={(event) =>
                      handleSimulationItemChange(
                        index,
                        "unitPrice",
                        Number(event.target.value),
                      )
                    }
                    className="w-full md:w-36"
                  />
                  {simulationItems.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSimulationItem(index)}
                    >
                      Hapus
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" type="button" onClick={addSimulationItem}>
                Tambah item
              </Button>
              <Button
                type="submit"
                disabled={simulatePromotion.isPending || !selectedOutletId}
              >
                {simulatePromotion.isPending ? "Memeriksa..." : "Preview promo"}
              </Button>
            </div>
          </form>
          {simulationResult && (
            <div className="mt-4 space-y-3 rounded-2xl border border-border bg-muted/20 p-4 text-sm">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total Gross</span>
                <span>{formatCurrency(simulationResult.totalGross)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total Diskon</span>
                <span>{formatCurrency(simulationResult.discount)}</span>
              </div>
              {simulationResult.promotions.length ? (
                <div className="space-y-2 pt-2">
                  {simulationResult.promotions.map((promo) => (
                    <div
                      key={promo.id}
                      className="rounded-xl border border-border bg-background/70 p-3"
                    >
                      <p className="text-sm font-semibold">{promo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {promo.description ?? "Deskripsi tidak tersedia"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Diskon: {formatCurrency(promo.discount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Tidak ada promo yang terpanggil dengan simulasi ini.
                </p>
              )}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">Promotion Usage Dashboard</p>
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
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Total Redemptions</p>
                <p className="text-2xl font-semibold">
                  {promotionUsageSummaryQuery.data?.totalRedemptions ?? "-"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Total Diskon</p>
                <p className="text-2xl font-semibold">
                  {formatCurrency(
                    promotionUsageSummaryQuery.data?.totalDiscount ?? 0,
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Redemption Rate</p>
                <p className="text-2xl font-semibold">
                  {promotionUsageSummaryQuery.data
                    ? `${Math.round(
                        promotionUsageSummaryQuery.data.redemptionRate * 100,
                      )}%`
                    : "-"}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Top promotions
              </p>
              {promotionUsageSummaryQuery.data?.topPromotions.length ? (
                promotionUsageSummaryQuery.data.topPromotions.map((promo) => (
                  <div
                    key={promo.promotionId}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/70 px-3 py-2 text-xs"
                  >
                    <span>{promo.name ?? promo.promotionId}</span>
                    <span className="font-semibold">
                      {promo.redemptions}x •{" "}
                      {formatCurrency(promo.discount)}
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
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">Task Feedback Loop</p>
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
            {taskFeedbackQuery.isLoading ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Memuat data tugas...
              </p>
            ) : taskFeedbackQuery.data ? (
              <div className="mt-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1 rounded-xl border border-border bg-background/70 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-2xl font-semibold">
                      {taskFeedbackQuery.data.pendingTasks}
                    </p>
                  </div>
                  <div className="flex-1 rounded-xl border border-border bg-background/70 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Selesai</p>
                    <p className="text-2xl font-semibold">
                      {taskFeedbackQuery.data.completedTasks}
                    </p>
                  </div>
                  <div className="flex-1 rounded-xl border border-border bg-background/70 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Alert kritis</p>
                    <p className="text-2xl font-semibold">
                      {taskFeedbackQuery.data.criticalAlerts}
                    </p>
                  </div>
                </div>
                {taskFeedbackQuery.data.recentNotes.length ? (
                  <div className="space-y-2 text-sm">
                    <p className="text-xs text-muted-foreground">
                      Catatan terbaru
                    </p>
                    {taskFeedbackQuery.data.recentNotes.map((note) => (
                      <div
                        key={`${note.taskId}-${note.updatedAt}`}
                        className="rounded-xl border border-border bg-background/70 p-3"
                      >
                        <p className="text-sm font-semibold">{note.taskId}</p>
                        <p className="text-xs text-muted-foreground">{note.notes}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(note.updatedAt).toLocaleString("id-ID")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Belum ada catatan tugas terbaru.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Data belum tersedia.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
