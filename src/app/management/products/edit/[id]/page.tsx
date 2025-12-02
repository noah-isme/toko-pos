"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import {
  ChevronLeft,
  ChevronDown,
  Plus,
  Camera,
  X,
  Copy,
  Archive,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OutletStock {
  outletId: string;
  outletName: string;
  stock: number;
  minStock: number;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    description: "",
    image: "",
    status: "active",
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

  const [outlets, setOutlets] = useState<OutletStock[]>([
    { outletId: "1", outletName: "Outlet Cabang BSD", stock: 0, minStock: 0 },
    {
      outletId: "2",
      outletName: "Outlet Cabang BSD (BR2)",
      stock: 0,
      minStock: 0,
    },
  ]);

  const [categories] = useState([
    { id: "1", name: "Minuman" },
    { id: "2", name: "Makanan" },
    { id: "3", name: "Sembako" },
  ]);

  const [taxRates] = useState([
    { id: "0", name: "Tanpa PPN", rate: 0 },
    { id: "1", name: "PPN 11%", rate: 11 },
    { id: "2", name: "PPN 12%", rate: 12 },
  ]);

  // Load product data
  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch(`/api/products/${params.id}`);
        if (!response.ok) throw new Error("Failed to load product");

        const product = (await response.json()) as {
          name?: string;
          categoryId?: string;
          description?: string;
          image?: string;
          status?: string;
          sku?: string;
          barcode?: string;
          unit?: string;
          tags?: string[];
          costPrice?: number;
          sellingPrice?: number;
          taxId?: string;
          discount?: number;
          promoName?: string;
          promoType?: string;
          promoValue?: number;
          promoStartDate?: string;
          promoEndDate?: string;
          stocks?: Array<{
            outletId: string;
            outlet?: { name: string };
            quantity: number;
            minStock: number;
          }>;
        };

        // Populate form data
        setFormData({
          name: product.name || "",
          categoryId: product.categoryId || "",
          description: product.description || "",
          image: product.image || "",
          status: product.status || "active",
          sku: product.sku || "",
          barcode: product.barcode || "",
          unit: product.unit || "",
          tags: product.tags || [],
          costPrice: product.costPrice?.toString() || "",
          sellingPrice: product.sellingPrice?.toString() || "",
          taxId: product.taxId || "",
          discount: product.discount?.toString() || "",
          promoName: product.promoName || "",
          promoType: product.promoType || "",
          promoValue: product.promoValue?.toString() || "",
          promoStartDate: product.promoStartDate || "",
          promoEndDate: product.promoEndDate || "",
        });

        // Load outlet stocks if available
        if (product.stocks && product.stocks.length > 0) {
          setOutlets(
            product.stocks.map(
              (s: {
                outletId: string;
                outlet?: { name?: string };
                quantity?: number;
                minStock?: number;
              }) => ({
                outletId: s.outletId,
                outletName: s.outlet?.name || `Outlet ${s.outletId}`,
                stock: s.quantity || 0,
                minStock: s.minStock || 0,
              }),
            ),
          );
        }
      } catch {
        toast({
          title: "Error",
          description: "Gagal memuat data produk",
          variant: "destructive",
        });
      }
    };

    if (params.id) {
      loadProduct();
    }
  }, [params.id, toast]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOutletStockChange = (
    index: number,
    field: "stock" | "minStock",
    value: number,
  ) => {
    const newOutlets = [...outlets];
    newOutlets[index][field] = value;
    setOutlets(newOutlets);
  };

  const calculateSummary = () => {
    const sellingPrice = parseFloat(formData.sellingPrice) || 0;
    const costPrice = parseFloat(formData.costPrice) || 0;
    const selectedTax = taxRates.find((t) => t.id === formData.taxId);
    const taxRate = selectedTax?.rate || 0;
    const taxAmount = sellingPrice * (taxRate / 100);
    const priceWithTax = sellingPrice + taxAmount;
    const margin =
      costPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 0;

    return {
      sellingPrice,
      taxName: selectedTax?.name || "Tanpa PPN",
      taxAmount,
      priceWithTax,
      margin,
    };
  };

  const handleSave = async () => {
    // Validasi
    if (!formData.name.trim()) {
      toast({
        title: "Validasi Gagal",
        description: "Nama produk harus diisi",
        variant: "destructive",
      });
      return;
    }

    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
      toast({
        title: "Validasi Gagal",
        description: "Harga jual harus diisi dengan nilai yang valid",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/products/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          costPrice: parseFloat(formData.costPrice) || 0,
          sellingPrice: parseFloat(formData.sellingPrice) || 0,
          outlets: outlets.map((o) => ({
            outletId: o.outletId,
            stock: o.stock,
            minStock: o.minStock,
          })),
        }),
      });

      if (!response.ok) throw new Error("Gagal menyimpan produk");

      toast({
        title: "Berhasil",
        description: "Produk berhasil diperbarui",
      });

      router.push("/management/products");
    } catch {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan produk",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${params.id}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Gagal menduplikasi produk");

      const newProduct = await response.json();

      toast({
        title: "Berhasil",
        description: "Produk berhasil diduplikasi",
      });

      router.push(`/management/products/edit/${newProduct.id}`);
    } catch {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menduplikasi produk",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${params.id}/archive`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Gagal mengarsipkan produk");

      toast({
        title: "Berhasil",
        description: "Produk berhasil diarsipkan",
      });

      router.push("/management/products");
    } catch {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengarsipkan produk",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowArchiveDialog(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Gagal menghapus produk");

      toast({
        title: "Berhasil",
        description: "Produk berhasil dihapus",
      });

      router.push("/management/products");
    } catch {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menghapus produk",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
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
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">
                    Edit Produk – {formData.name}
                  </h1>
                  <Badge
                    variant={
                      formData.status === "active" ? "default" : "secondary"
                    }
                  >
                    {formData.status === "active" ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Perbarui detail produk yang ada.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading}>
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
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

                <div className="flex gap-2">
                  <div className="flex-1">
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
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" className="mt-8">
                    <Plus className="h-4 w-4 mr-1" />
                    Kategori Baru
                  </Button>
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
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-gray-50 cursor-pointer">
                    <Plus className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Upload atau Drag & Drop
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG hingga 5MB</p>
                  </div>
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
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange("sku", e.target.value)}
                    placeholder="AM-003"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) =>
                        handleInputChange("barcode", e.target.value)
                      }
                      placeholder="6789012345678"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="mt-8">
                    <Camera className="h-4 w-4 mr-1" />
                    Scan
                  </Button>
                </div>

                <div>
                  <Label htmlFor="unit">Satuan</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => handleInputChange("unit", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="botol">Botol</SelectItem>
                      <SelectItem value="pcs">Pcs</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="liter">Liter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                      {taxRates.map((tax) => (
                        <SelectItem key={tax.id} value={tax.id}>
                          {tax.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="discount">Diskon Default (Opsional)</Label>
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
                      <Label htmlFor="promoType">Tipe</Label>
                      <Select
                        value={formData.promoType}
                        onValueChange={(value) =>
                          handleInputChange("promoType", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Potongan %</SelectItem>
                          <SelectItem value="fixed">Potongan Tetap</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="promoValue">Nilai</Label>
                      <Input
                        id="promoValue"
                        type="number"
                        value={formData.promoValue}
                        onChange={(e) =>
                          handleInputChange("promoValue", e.target.value)
                        }
                        placeholder="5"
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

          {/* Right Column - Stock & Summary & Quick Actions */}
          <div className="space-y-6">
            {/* Stok per Outlet */}
            <Card>
              <CardHeader>
                <CardTitle>Stok per Outlet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {outlets.map((outlet, idx) => (
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
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Outlet Lain
                </Button>
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
                  <span>{summary.taxName}</span>
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
                      Margin Kotor (estimasi)
                    </span>
                    <span className="font-medium text-green-600">
                      {summary.margin.toFixed(1)}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Aksi Cepat */}
            <Card>
              <CardHeader>
                <CardTitle>Aksi Cepat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleDuplicate}
                  disabled={loading}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplikasi Produk
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowArchiveDialog(true)}
                  disabled={loading}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Arsipkan Produk
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus Produk
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Produk akan dihapus secara
              permanen dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arsipkan Produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk akan diarsipkan dan tidak akan muncul di daftar aktif. Anda
              dapat mengaktifkannya kembali nanti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Arsipkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
