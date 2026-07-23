"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronDown, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProductImageUpload } from "@/components/products/product-image-upload";
import { BarcodeField } from "@/components/products/barcode-field";

interface OutletStock {
  outletId: string;
  outletName: string;
  stock: number;
  minStock: number;
}

export default function AddProductPage() {
  const router = useRouter();
  const utils = api.useContext();

  const outletsQuery = api.outlets.getUserOutlets.useQuery();
  const categoriesQuery = api.products.categories.useQuery();
  const suppliersQuery = api.products.suppliers.useQuery();

  const [loading, setLoading] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    supplierId: "",
    description: "",
    image: "",
    status: "active" as "active" | "inactive",
    sku: "",
    barcode: "",
    unit: "",
    tags: [] as string[],
    costPrice: "",
    sellingPrice: "",
    taxId: "",
    discount: "",
    promoName: "",
    promoType: "",
    promoValue: "",
    promoStartDate: "",
    promoEndDate: "",
  });

  const [outletStocks, setOutletStocks] = useState<OutletStock[]>([]);

  // Initialize outlet stocks when data loads
  if (outletsQuery.data && outletStocks.length === 0) {
    setOutletStocks(
      outletsQuery.data.map((o) => ({
        outletId: o.outletId,
        outletName: o.outlet.name,
        stock: 0,
        minStock: 0,
      })),
    );
  }

  const createMutation = api.products.upsert.useMutation({
    onSuccess: () => {
      toast.success("Produk berhasil disimpan");
      void utils.products.list.invalidate();
    },
    onError: (err) => {
      toast.error("Gagal menyimpan produk", { description: err.message });
    },
  });

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOutletStockChange = (
    index: number,
    field: "stock" | "minStock",
    value: number,
  ) => {
    setOutletStocks((prev) => {
      const next = [...prev];
      next[index][field] = value;
      return next;
    });
  };

  const calculateSummary = () => {
    const sellingPrice = parseFloat(formData.sellingPrice) || 0;
    const costPrice = parseFloat(formData.costPrice) || 0;
    const taxRate = formData.taxId === "1" ? 11 : formData.taxId === "2" ? 12 : 0;
    const taxAmount = sellingPrice * (taxRate / 100);
    const priceWithTax = sellingPrice + taxAmount;
    const margin =
      costPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 0;

    return { sellingPrice, taxAmount, priceWithTax, margin };
  };

  const handleSave = (addMore: boolean) => {
    if (!formData.name.trim()) {
      toast.error("Validasi Gagal", { description: "Nama produk harus diisi" });
      return;
    }

    if (!formData.sku.trim()) {
      toast.error("Validasi Gagal", { description: "SKU harus diisi" });
      return;
    }

    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
      toast.error("Validasi Gagal", {
        description: "Harga jual harus diisi dengan nilai yang valid",
      });
      return;
    }

    setLoading(true);

    createMutation.mutate(
      {
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode || undefined,
        imageUrl: formData.image || undefined,
        description: formData.description || undefined,
        price: parseFloat(formData.sellingPrice) || 0,
        costPrice: parseFloat(formData.costPrice) || undefined,
        categoryId: formData.categoryId || undefined,
        supplierId: formData.supplierId || undefined,
        isActive: formData.status === "active",
        defaultDiscountPercent: parseFloat(formData.discount) || undefined,
        promoName: formData.promoName || undefined,
        promoPrice: parseFloat(formData.promoValue) || undefined,
        promoStart: formData.promoStartDate
          ? new Date(formData.promoStartDate).toISOString()
          : undefined,
        promoEnd: formData.promoEndDate
          ? new Date(formData.promoEndDate).toISOString()
          : undefined,
        isTaxable: formData.taxId !== "" && formData.taxId !== "0",
        taxRate: formData.taxId === "1" ? 11 : formData.taxId === "2" ? 12 : undefined,
        minStock: 0,
        inventoryLines: outletStocks.map((o) => ({
          outletId: o.outletId,
          quantity: o.stock,
        })),
      },
      {
        onSuccess: () => {
          if (addMore) {
            setFormData({
              name: "",
              categoryId: "",
              supplierId: "",
              description: "",
              image: "",
              status: "active",
              sku: "",
              barcode: "",
              unit: "",
              tags: [],
              costPrice: "",
              sellingPrice: "",
              taxId: "",
              discount: "",
              promoName: "",
              promoType: "",
              promoValue: "",
              promoStartDate: "",
              promoEndDate: "",
            });
            setOutletStocks(
              (outletsQuery.data ?? []).map((o) => ({
                outletId: o.outletId,
                outletName: o.outlet.name,
                stock: 0,
                minStock: 0,
              })),
            );
          } else {
            router.push("/management/products");
          }
        },
        onSettled: () => setLoading(false),
      },
    );
  };

  const summary = calculateSummary();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/management/products")}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Kembali ke Produk
              </Button>
              <div className="border-l h-8" />
              <div>
                <h1 className="text-2xl font-bold">Tambah Produk</h1>
                <p className="text-sm text-muted-foreground">
                  Lengkapi detail produk untuk mulai dijual di outlet.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleSave(false)} disabled={loading}>
                Simpan
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave(true)}
                disabled={loading}
              >
                Simpan & Tambah Lagi
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Informasi Dasar */}
            <Card>
              <CardHeader>
                <CardTitle>Informasi Dasar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nama Produk *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Air Mineral 600ml"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="category">Kategori</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) =>
                        handleInputChange("categoryId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesQuery.data?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="supplier">Supplier</Label>
                    <Select
                      value={formData.supplierId}
                      onValueChange={(value) =>
                        handleInputChange("supplierId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliersQuery.data?.map((sup) => (
                          <SelectItem key={sup.id} value={sup.id}>
                            {sup.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    rows={3}
                    placeholder="Deskripsi produk..."
                  />
                </div>

                <div>
                  <Label>Gambar</Label>
                  <ProductImageUpload
                    value={formData.image}
                    onChange={(url) => handleInputChange("image", url)}
                  />
                </div>

                <div>
                  <Label>Status Produk</Label>
                  <RadioGroup
                    value={formData.status}
                    onValueChange={(value) =>
                      handleInputChange("status", value)
                    }
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="active" id="active" />
                      <Label htmlFor="active">Aktif</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="inactive" id="inactive" />
                      <Label htmlFor="inactive">Nonaktif</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* 2. Identitas SKU & Barcode */}
            <Card>
              <CardHeader>
                <CardTitle>Identitas SKU & Barcode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange("sku", e.target.value)}
                    placeholder="AM-003"
                  />
                </div>

                <BarcodeField
                  value={formData.barcode}
                  onChange={(value) => handleInputChange("barcode", value)}
                  productName={formData.name}
                  sku={formData.sku}
                />

                <div>
                  <Label>Tags (Opsional)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer"
                          onClick={() => {
                            const newTags = formData.tags.filter(
                              (_, i) => i !== idx,
                            );
                            handleInputChange("tags", newTags);
                          }}
                        />
                      </Badge>
                    ))}
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Tag
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Harga & Pajak */}
            <Card>
              <CardHeader>
                <CardTitle>Harga & Pajak</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="costPrice">Harga Pokok</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) =>
                      handleInputChange("costPrice", e.target.value)
                    }
                    placeholder="3000"
                  />
                </div>

                <div>
                  <Label htmlFor="sellingPrice">Harga Jual *</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) =>
                      handleInputChange("sellingPrice", e.target.value)
                    }
                    placeholder="4500"
                  />
                </div>

                <div>
                  <Label htmlFor="tax">PPN</Label>
                  <Select
                    value={formData.taxId}
                    onValueChange={(value) => handleInputChange("taxId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih PPN" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Tanpa PPN</SelectItem>
                      <SelectItem value="1">PPN 11%</SelectItem>
                      <SelectItem value="2">PPN 12%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="discount">Diskon Default % (Opsional)</Label>
                  <Input
                    id="discount"
                    type="number"
                    value={formData.discount}
                    onChange={(e) =>
                      handleInputChange("discount", e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 4. Promo (Collapsible) */}
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setShowPromo(!showPromo)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle>Promo (Opsional)</CardTitle>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${
                      showPromo ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </CardHeader>
              {showPromo && (
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="promoName">Nama Promo</Label>
                    <Input
                      id="promoName"
                      value={formData.promoName}
                      onChange={(e) =>
                        handleInputChange("promoName", e.target.value)
                      }
                      placeholder="Ramadhan Hemat"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="promoValue">Harga Promo</Label>
                      <Input
                        id="promoValue"
                        type="number"
                        value={formData.promoValue}
                        onChange={(e) =>
                          handleInputChange("promoValue", e.target.value)
                        }
                        placeholder="4000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="promoStartDate">Tanggal Mulai</Label>
                      <Input
                        id="promoStartDate"
                        type="date"
                        value={formData.promoStartDate}
                        onChange={(e) =>
                          handleInputChange("promoStartDate", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="promoEndDate">Tanggal Selesai</Label>
                      <Input
                        id="promoEndDate"
                        type="date"
                        value={formData.promoEndDate}
                        onChange={(e) =>
                          handleInputChange("promoEndDate", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Right Column - Stock & Summary */}
          <div className="space-y-6">
            {/* Stok per Outlet */}
            <Card>
              <CardHeader>
                <CardTitle>Stok per Outlet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {outletStocks.map((outlet, idx) => (
                  <div
                    key={outlet.outletId}
                    className="space-y-2 pb-4 border-b last:border-0"
                  >
                    <p className="font-medium text-sm">{outlet.outletName}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`stock-${idx}`} className="text-xs">
                          Stok
                        </Label>
                        <Input
                          id={`stock-${idx}`}
                          type="number"
                          value={outlet.stock}
                          onChange={(e) =>
                            handleOutletStockChange(
                              idx,
                              "stock",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`minStock-${idx}`} className="text-xs">
                          Min Stock
                        </Label>
                        <Input
                          id={`minStock-${idx}`}
                          type="number"
                          value={outlet.minStock}
                          onChange={(e) =>
                            handleOutletStockChange(
                              idx,
                              "minStock",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {outletStocks.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Memuat outlet...
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Ringkasan Harga */}
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan Harga</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Harga Jual</span>
                  <span className="font-medium">
                    Rp {summary.sellingPrice.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PPN</span>
                  <span>
                    {formData.taxId === "1"
                      ? "PPN 11%"
                      : formData.taxId === "2"
                        ? "PPN 12%"
                        : "Tanpa PPN"}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">Harga + PPN</span>
                  <span className="font-bold">
                    Rp {summary.priceWithTax.toLocaleString("id-ID")}
                  </span>
                </div>
                {formData.costPrice && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Margin Koto (estimasi)
                    </span>
                    <span className="font-medium text-green-600">
                      {summary.margin.toFixed(1)}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
