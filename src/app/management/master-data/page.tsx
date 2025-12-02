'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Trash2, Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Category {
  id: string
  name: string
  description: string
  defaultTaxId?: string
  defaultSupplierId?: string
  productCount: number
}

interface Supplier {
  id: string
  name: string
  contact: string
  email: string
  address: string
  notes: string
  productCount: number
}

interface TaxRate {
  id: string
  name: string
  rate: number
  status: 'active' | 'inactive'
  productCount: number
}

export default function MasterDataPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('categories')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string; name: string } | null>(null)

  // Categories State
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'Minuman', description: 'Minuman ringan dan berat', productCount: 12, defaultTaxId: '1' },
    { id: '2', name: 'Makanan Ringan', description: 'Snack dan makanan kecil', productCount: 18, defaultTaxId: '1' },
    { id: '3', name: 'Sembako', description: 'Bahan pokok dan kebutuhan dasar', productCount: 23, defaultTaxId: '0' },
    { id: '4', name: 'ATK', description: 'Alat tulis kantor', productCount: 8, defaultTaxId: '1' },
  ])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    defaultTaxId: '',
    defaultSupplierId: '',
  })

  // Suppliers State
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: '1', name: 'PT Beras Sejahtera', contact: '0812-3456-7890', email: 'admin@beras.co.id', address: 'Jakarta', notes: '', productCount: 12 },
    { id: '2', name: 'PT Gula Manis', contact: '0813-4567-8901', email: 'info@gulamanis.com', address: 'Bandung', notes: '', productCount: 8 },
    { id: '3', name: 'Kopi Mantap Distributor', contact: '0821-5678-9012', email: 'order@kopimantap.id', address: 'Surabaya', notes: 'Pengiriman setiap Senin', productCount: 5 },
  ])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact: '',
    email: '',
    address: '',
    notes: '',
  })

  // Tax Rates State
  const [taxRates, setTaxRates] = useState<TaxRate[]>([
    { id: '0', name: 'Tanpa PPN', rate: 0, status: 'active', productCount: 23 },
    { id: '1', name: 'PPN 11%', rate: 11, status: 'active', productCount: 87 },
    { id: '2', name: 'PPN 12%', rate: 12, status: 'active', productCount: 12 },
  ])
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null)
  const [taxRateForm, setTaxRateForm] = useState({
    name: '',
    rate: '',
    status: 'active' as 'active' | 'inactive',
  })

  // Category Handlers
  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description,
      defaultTaxId: category.defaultTaxId || '',
      defaultSupplierId: category.defaultSupplierId || '',
    })
  }

  const handleNewCategory = () => {
    setSelectedCategory(null)
    setCategoryForm({
      name: '',
      description: '',
      defaultTaxId: '',
      defaultSupplierId: '',
    })
  }

  const handleSaveCategory = () => {
    if (!categoryForm.name.trim()) {
      toast({
        title: 'Validasi Gagal',
        description: 'Nama kategori harus diisi',
        variant: 'destructive',
      })
      return
    }

    if (selectedCategory) {
      // Update
      setCategories(categories.map(c =>
        c.id === selectedCategory.id
          ? { ...c, ...categoryForm }
          : c
      ))
      toast({ title: 'Berhasil', description: 'Kategori berhasil diperbarui' })
    } else {
      // Create
      const newCategory: Category = {
        id: Date.now().toString(),
        ...categoryForm,
        productCount: 0,
      }
      setCategories([...categories, newCategory])
      toast({ title: 'Berhasil', description: 'Kategori berhasil ditambahkan' })
    }

    handleNewCategory()
  }

  // Supplier Handlers
  const handleSelectSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setSupplierForm({
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      address: supplier.address,
      notes: supplier.notes,
    })
  }

  const handleNewSupplier = () => {
    setSelectedSupplier(null)
    setSupplierForm({
      name: '',
      contact: '',
      email: '',
      address: '',
      notes: '',
    })
  }

  const handleSaveSupplier = () => {
    if (!supplierForm.name.trim()) {
      toast({
        title: 'Validasi Gagal',
        description: 'Nama supplier harus diisi',
        variant: 'destructive',
      })
      return
    }

    if (selectedSupplier) {
      // Update
      setSuppliers(suppliers.map(s =>
        s.id === selectedSupplier.id
          ? { ...s, ...supplierForm }
          : s
      ))
      toast({ title: 'Berhasil', description: 'Supplier berhasil diperbarui' })
    } else {
      // Create
      const newSupplier: Supplier = {
        id: Date.now().toString(),
        ...supplierForm,
        productCount: 0,
      }
      setSuppliers([...suppliers, newSupplier])
      toast({ title: 'Berhasil', description: 'Supplier berhasil ditambahkan' })
    }

    handleNewSupplier()
  }

  // Tax Rate Handlers
  const handleSelectTaxRate = (taxRate: TaxRate) => {
    setSelectedTaxRate(taxRate)
    setTaxRateForm({
      name: taxRate.name,
      rate: taxRate.rate.toString(),
      status: taxRate.status,
    })
  }

  const handleNewTaxRate = () => {
    setSelectedTaxRate(null)
    setTaxRateForm({
      name: '',
      rate: '',
      status: 'active',
    })
  }

  const handleSaveTaxRate = () => {
    if (!taxRateForm.name.trim()) {
      toast({
        title: 'Validasi Gagal',
        description: 'Nama tarif PPN harus diisi',
        variant: 'destructive',
      })
      return
    }

    if (!taxRateForm.rate || parseFloat(taxRateForm.rate) < 0) {
      toast({
        title: 'Validasi Gagal',
        description: 'Persentase PPN harus valid',
        variant: 'destructive',
      })
      return
    }

    if (selectedTaxRate) {
      // Update
      setTaxRates(taxRates.map(t =>
        t.id === selectedTaxRate.id
          ? { ...t, name: taxRateForm.name, rate: parseFloat(taxRateForm.rate), status: taxRateForm.status }
          : t
      ))
      toast({ title: 'Berhasil', description: 'Tarif PPN berhasil diperbarui' })
    } else {
      // Create
      const newTaxRate: TaxRate = {
        id: Date.now().toString(),
        name: taxRateForm.name,
        rate: parseFloat(taxRateForm.rate),
        status: taxRateForm.status,
        productCount: 0,
      }
      setTaxRates([...taxRates, newTaxRate])
      toast({ title: 'Berhasil', description: 'Tarif PPN berhasil ditambahkan' })
    }

    handleNewTaxRate()
  }

  // Delete Handlers
  const confirmDelete = (type: string, id: string, name: string) => {
    setItemToDelete({ type, id, name })
    setShowDeleteDialog(true)
  }

  const handleDelete = () => {
    if (!itemToDelete) return

    switch (itemToDelete.type) {
      case 'category':
        setCategories(categories.filter(c => c.id !== itemToDelete.id))
        if (selectedCategory?.id === itemToDelete.id) handleNewCategory()
        break
      case 'supplier':
        setSuppliers(suppliers.filter(s => s.id !== itemToDelete.id))
        if (selectedSupplier?.id === itemToDelete.id) handleNewSupplier()
        break
      case 'taxRate':
        setTaxRates(taxRates.filter(t => t.id !== itemToDelete.id))
        if (selectedTaxRate?.id === itemToDelete.id) handleNewTaxRate()
        break
    }

    toast({ title: 'Berhasil', description: `${itemToDelete.type} berhasil dihapus` })
    setShowDeleteDialog(false)
    setItemToDelete(null)
  }

  // Filter function
  const filterItems = <T extends { name: string }>(items: T[]) => {
    if (!searchQuery) return items
    return items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Master Data</h1>
          <p className="text-muted-foreground mt-1">
            Kelola kategori, supplier, dan tarif PPN produk Anda
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="categories">Kategori</TabsTrigger>
            <TabsTrigger value="suppliers">Supplier</TabsTrigger>
            <TabsTrigger value="taxes">PPN</TabsTrigger>
          </TabsList>

          {/* KATEGORI TAB */}
          <TabsContent value="categories" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* List Kiri */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Kategori</CardTitle>
                      <Button size="sm" onClick={handleNewCategory}>
                        <Plus className="h-4 w-4 mr-1" />
                        Kategori
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari kategori..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {filterItems(categories).map((category) => (
                          <div
                            key={category.id}
                            onClick={() => handleSelectCategory(category)}
                            className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition ${
                              selectedCategory?.id === category.id ? 'bg-blue-50 border-blue-300' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{category.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {category.productCount} produk
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Detail Kanan */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
                    </CardTitle>
                    <CardDescription>
                      {selectedCategory
                        ? 'Perbarui informasi kategori produk'
                        : 'Buat kategori baru untuk mengorganisir produk'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="categoryName">Nama Kategori *</Label>
                      <Input
                        id="categoryName"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        placeholder="Sembako"
                      />
                    </div>

                    <div>
                      <Label htmlFor="categoryDescription">Deskripsi</Label>
                      <Textarea
                        id="categoryDescription"
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        placeholder="Bahan pokok dan kebutuhan dasar"
                        rows={3}
                      />
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Pengaturan Default (Opsional)</h4>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="defaultTax">Default PPN</Label>
                          <Select
                            value={categoryForm.defaultTaxId}
                            onValueChange={(value) => setCategoryForm({ ...categoryForm, defaultTaxId: value })}
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
                          <Label htmlFor="defaultSupplier">Default Supplier</Label>
                          <Select
                            value={categoryForm.defaultSupplierId}
                            onValueChange={(value) => setCategoryForm({ ...categoryForm, defaultSupplierId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih Supplier" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id}>
                                  {supplier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {selectedCategory && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>Digunakan oleh {selectedCategory.productCount} produk</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveCategory}>
                        {selectedCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
                      </Button>
                      {selectedCategory && (
                        <Button
                          variant="destructive"
                          onClick={() => confirmDelete('category', selectedCategory.id, selectedCategory.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Hapus Kategori
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* SUPPLIER TAB */}
          <TabsContent value="suppliers" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* List Kiri */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Supplier</CardTitle>
                      <Button size="sm" onClick={handleNewSupplier}>
                        <Plus className="h-4 w-4 mr-1" />
                        Supplier
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari supplier..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {filterItems(suppliers).map((supplier) => (
                          <div
                            key={supplier.id}
                            onClick={() => handleSelectSupplier(supplier)}
                            className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition ${
                              selectedSupplier?.id === supplier.id ? 'bg-blue-50 border-blue-300' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{supplier.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {supplier.productCount} produk
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Detail Kanan */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}
                    </CardTitle>
                    <CardDescription>
                      {selectedSupplier
                        ? 'Perbarui informasi supplier'
                        : 'Tambahkan supplier baru untuk produk Anda'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="supplierName">Nama Supplier *</Label>
                      <Input
                        id="supplierName"
                        value={supplierForm.name}
                        onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                        placeholder="PT Beras Sejahtera"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="supplierContact">Kontak</Label>
                        <Input
                          id="supplierContact"
                          value={supplierForm.contact}
                          onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })}
                          placeholder="0812-xxxxxxx"
                        />
                      </div>

                      <div>
                        <Label htmlFor="supplierEmail">Email</Label>
                        <Input
                          id="supplierEmail"
                          type="email"
                          value={supplierForm.email}
                          onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                          placeholder="admin@supplier.com"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="supplierAddress">Alamat</Label>
                      <Textarea
                        id="supplierAddress"
                        value={supplierForm.address}
                        onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                        placeholder="Jl. Contoh No. 123, Jakarta"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="supplierNotes">Catatan</Label>
                      <Textarea
                        id="supplierNotes"
                        value={supplierForm.notes}
                        onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                        placeholder="Catatan tambahan tentang supplier"
                        rows={3}
                      />
                    </div>

                    {selectedSupplier && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>Memasok {selectedSupplier.productCount} produk aktif</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveSupplier}>
                        {selectedSupplier ? 'Simpan Perubahan' : 'Tambah Supplier'}
                      </Button>
                      {selectedSupplier && (
                        <Button
                          variant="destructive"
                          onClick={() => confirmDelete('supplier', selectedSupplier.id, selectedSupplier.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Hapus Supplier
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* PPN TAB */}
          <TabsContent value="taxes" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* List Kiri */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Tarif PPN</CardTitle>
                      <Button size="sm" onClick={handleNewTaxRate}>
                        <Plus className="h-4 w-4 mr-1" />
                        Tarif
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari tarif..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {filterItems(taxRates).map((taxRate) => (
                          <div
                            key={taxRate.id}
                            onClick={() => handleSelectTaxRate(taxRate)}
                            className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition ${
                              selectedTaxRate?.id === taxRate.id ? 'bg-blue-50 border-blue-300' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{taxRate.name}</p>
                                  <Badge variant={taxRate.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                    {taxRate.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {taxRate.productCount} produk
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Detail Kanan */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedTaxRate ? 'Edit Tarif PPN' : 'Tambah Tarif PPN Baru'}
                    </CardTitle>
                    <CardDescription>
                      {selectedTaxRate
                        ? 'Perbarui tarif pajak pertambahan nilai'
                        : 'Tambahkan tarif PPN baru'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="taxName">Nama Tarif *</Label>
                      <Input
                        id="taxName"
                        value={taxRateForm.name}
                        onChange={(e) => setTaxRateForm({ ...taxRateForm, name: e.target.value })}
                        placeholder="PPN 11%"
                      />
                    </div>

                    <div>
                      <Label htmlFor="taxRate">Persentase *</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="taxRate"
                          type="number"
                          value={taxRateForm.rate}
                          onChange={(e) => setTaxRateForm({ ...taxRateForm, rate: e.target.value })}
                          placeholder="11"
                          className="flex-1"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>

                    <div>
                      <Label>Status</Label>
                      <RadioGroup
                        value={taxRateForm.status}
                        onValueChange={(value) => setTaxRateForm({ ...taxRateForm, status: value as 'active' | 'inactive' })}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="active" id="tax-active" />
                          <Label htmlFor="tax-active">Aktif</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="inactive" id="tax-inactive" />
                          <Label htmlFor="tax-inactive">Nonaktif</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {selectedTaxRate && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>Digunakan oleh {selectedTaxRate.productCount} produk</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveTaxRate}>
                        {selectedTaxRate ? 'Simpan Perubahan' : 'Tambah Tarif'}
                      </Button>
                      {selectedTaxRate && (
                        <Button
                          variant="destructive"
                          onClick={() => confirmDelete('taxRate', selectedTaxRate.id, selectedTaxRate.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Hapus Tarif
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {itemToDelete?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus <strong>{itemToDelete?.name}</strong>.
              Tindakan ini tidak dapat dibatalkan.
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
    </div>
  )
}
