import { z } from "zod";

import { Role, OutletRole } from "@/server/db/enums";

export const userRoleSchema = z.nativeEnum(Role);

export const userListOutputSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    role: userRoleSchema,
    isActive: z.boolean(),
    outletCount: z.number().int().min(0),
    createdAt: z.string(),
  }),
);

export const userCreateInputSchema = z
  .object({
    name: z.string().trim().min(1, { message: "Nama wajib diisi" }).max(120, {
      message: "Nama maksimal 120 karakter",
    }),
    email: z
      .string()
      .trim()
      .min(1, { message: "Email wajib diisi" })
      .email({ message: "Format email tidak valid" })
      .max(180, { message: "Email maksimal 180 karakter" }),
    password: z
      .string()
      .min(8, { message: "Password minimal 8 karakter" })
      .max(120, { message: "Password maksimal 120 karakter" }),
    role: userRoleSchema,
  })
  .strict();

export const userUpdateInputSchema = z
  .object({
    id: z.string().min(1, { message: "ID user wajib diisi" }),
    name: z
      .string()
      .trim()
      .min(1, { message: "Nama wajib diisi" })
      .max(120, { message: "Nama maksimal 120 karakter" })
      .optional(),
    email: z
      .string()
      .trim()
      .min(1, { message: "Email wajib diisi" })
      .email({ message: "Format email tidak valid" })
      .max(180, { message: "Email maksimal 180 karakter" })
      .optional(),
    role: userRoleSchema.optional(),
    // Opsional: kosongkan jika tidak ingin reset password.
    password: z
      .string()
      .min(8, { message: "Password minimal 8 karakter" })
      .max(120, { message: "Password maksimal 120 karakter" })
      .optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.email !== undefined || value.role !== undefined || value.password !== undefined, {
    message: "Minimal satu field harus diisi untuk pembaruan",
    path: [],
  });

export const userDeleteInputSchema = z
  .object({
    id: z.string().min(1, { message: "ID user wajib diisi" }),
  })
  .strict();

export const userOutletRoleSchema = z.nativeEnum(OutletRole);

export const userOutletAssignmentInputSchema = z
  .object({
    userId: z.string().min(1, { message: "User wajib dipilih" }),
    outletId: z.string().min(1, { message: "Outlet wajib dipilih" }),
    role: userOutletRoleSchema,
    isActive: z.boolean().default(true),
  })
  .strict();

export const userOutletAssignmentRemoveInputSchema = z
  .object({
    userId: z.string().min(1, { message: "User wajib dipilih" }),
    outletId: z.string().min(1, { message: "Outlet wajib dipilih" }),
  })
  .strict();

export const userOutletsOutputSchema = z.array(
  z.object({
    id: z.string(),
    outletId: z.string(),
    outletName: z.string(),
    outletCode: z.string(),
    role: userOutletRoleSchema,
    isActive: z.boolean(),
  }),
);
