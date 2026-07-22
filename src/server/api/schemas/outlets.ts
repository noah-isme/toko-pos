import { z } from "zod";

export const outletSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  address: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const outletListOutputSchema = z.array(outletSchema);

export const outletUpsertInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Nama outlet wajib diisi" }),
  code: z.string().min(1, { message: "Kode outlet wajib diisi" }),
  address: z.string().optional(),
});

export const stockSnapshotInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib diisi" }),
});

export const stockSnapshotOutputSchema = z.array(
  z.object({
    productId: z.string(),
    productName: z.string(),
    sku: z.string(),
    quantity: z.number(),
    costPrice: z.number().nullable(),
  }),
);

export const adjustStockInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib diisi" }),
  productId: z.string().min(1, { message: "Produk wajib diisi" }),
  quantity: z
    .number("Jumlah harus berupa angka")
    .int({ message: "Jumlah harus bilangan bulat" }),
  note: z.string().max(180).optional(),
});

export const transferStockInputSchema = z.object({
  productId: z.string().min(1, { message: "Produk wajib diisi" }),
  fromOutletId: z.string().min(1, { message: "Outlet asal wajib diisi" }),
  toOutletId: z.string().min(1, { message: "Outlet tujuan wajib diisi" }),
  quantity: z
    .number("Jumlah harus berupa angka")
    .int({ message: "Jumlah harus bulat" })
    .positive({ message: "Jumlah minimal 1" }),
  note: z.string().max(180).optional(),
});

export const performOpnameInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib diisi" }),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number(),
      }),
    )
    .min(1, { message: "Masukkan minimal satu produk" }),
});

// ---------------------------------------------------------------------------
// Stock Transfer approval workflow schemas
// ---------------------------------------------------------------------------

export const stockTransferStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
]);

export const stockTransferItemSchema = z.object({
  id: z.string(),
  transferNumber: z.string(),
  fromOutletId: z.string(),
  toOutletId: z.string(),
  fromOutletName: z.string(),
  toOutletName: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  quantity: z.number().int(),
  costPrice: z.number(),
  status: stockTransferStatusSchema,
  requestedById: z.string(),
  requestedByName: z.string().nullable(),
  approvedById: z.string().nullable(),
  approvedByName: z.string().nullable(),
  notes: z.string().nullable(),
  requestedAt: z.string(),
  approvedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export const stockTransferListInputSchema = z.object({
  status: stockTransferStatusSchema.optional(),
});

export const stockTransferListOutputSchema = z.array(stockTransferItemSchema);

export const createStockTransferInputSchema = z.object({
  productId: z.string().min(1, { message: "Produk wajib diisi" }),
  fromOutletId: z.string().min(1, { message: "Outlet asal wajib diisi" }),
  toOutletId: z.string().min(1, { message: "Outlet tujuan wajib diisi" }),
  quantity: z
    .number("Jumlah harus berupa angka")
    .int({ message: "Jumlah harus bulat" })
    .positive({ message: "Jumlah minimal 1" }),
  notes: z.string().max(500, { message: "Catatan maksimal 500 karakter" }).optional(),
});

export const stockTransferActionInputSchema = z.object({
  id: z.string().min(1, { message: "ID transfer wajib diisi" }),
});

// ---------------------------------------------------------------------------
// Supplier receiving (penerimaan barang) schemas
// ---------------------------------------------------------------------------

export const receiveStockItemSchema = z.object({
  productId: z.string().min(1, { message: "Produk wajib diisi" }),
  quantity: z
    .number("Jumlah harus berupa angka")
    .int({ message: "Jumlah harus bulat" })
    .positive({ message: "Jumlah minimal 1" }),
  costPrice: z
    .number("Harga modal harus berupa angka")
    .min(0, { message: "Harga modal minimal 0" }),
});

export const receiveStockInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib diisi" }),
  supplierId: z.string().min(1, { message: "Supplier wajib diisi" }),
  invoiceNumber: z
    .string()
    .max(64, { message: "Nomor invoice maksimal 64 karakter" })
    .optional(),
  notes: z.string().max(500, { message: "Catatan maksimal 500 karakter" }).optional(),
  items: z
    .array(receiveStockItemSchema)
    .min(1, { message: "Masukkan minimal satu item" }),
});

export const receiveStockResultItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int(),
  costPrice: z.number(),
  newStockLevel: z.number().int(),
});

export const receiveStockResultSchema = z.object({
  supplierId: z.string(),
  supplierName: z.string(),
  outletId: z.string(),
  invoiceNumber: z.string().nullable(),
  items: z.array(receiveStockResultItemSchema),
});
