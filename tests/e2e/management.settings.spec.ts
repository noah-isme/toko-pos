// @ts-nocheck
import { expect, test } from "@playwright/test";

import { mockAuthSession, setupTrpcMock } from "./mocks";

const baseHandlers = {
  "settings.listTaxSettings": () => [
    { id: "tax-1", name: "PPN 11%", rate: 11, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "tax-2", name: "PPN 10%", rate: 10, isActive: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],
  "settings.getActiveTaxSetting": () => ({ id: "tax-1", name: "PPN 11%", rate: 11 }),
  "outlets.list": () => [{ id: "outlet-1", name: "Outlet Pusat", code: "OP", address: "Jl. Utama" }],
  "outlets.getUserOutlets": () => [{ id: "uo-1", outletId: "outlet-1", role: "ADMIN", outlet: { id: "outlet-1", name: "Outlet Pusat", code: "OP", address: "Jl. Utama" } }],
};

test.beforeEach(async ({ page }) => {
  await mockAuthSession(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("cashier-quick-mode", "false");
  });
});

test.describe("Settings - Tax Management", () => {
  test("displays active tax setting and list of tax settings", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers);
    await page.goto("/management/settings");

    await expect(page.getByRole("heading", { name: "Pengaturan", exact: true })).toBeVisible();
    await expect(page.getByText("PPN Aktif Saat Ini")).toBeVisible();
    await expect(page.getByText("PPN 11%").first()).toBeVisible();
    await expect(page.getByText("11%", { exact: true })).toBeVisible();
    await expect(page.getByText("PPN 10%")).toBeVisible();
    await expect(page.getByText("Tarif: 10%")).toBeVisible();
  });

  test("creates a new tax setting", async ({ page }) => {
    const createCalls = [];
    await setupTrpcMock(page, {
      ...baseHandlers,
      "settings.upsertTaxSetting": ({ input }) => {
        createCalls.push(input);
        return { id: "tax-new" };
      },
    });

    await page.goto("/management/settings");

    await page.getByLabel("Nama Pengaturan").fill("PPN 12%");
    await page.getByLabel("Tarif (%)").fill("12");
    await page.getByLabel("Jadikan PPN aktif (hanya satu yang bisa aktif)").check();
    await page.getByRole("button", { name: "Tambah" }).click();

    await expect(page.getByText("Pengaturan PPN ditambahkan")).toBeVisible();
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0]).toMatchObject({
      name: "PPN 12%",
      rate: 12,
      isActive: true,
    });
  });

  test("edits an existing tax setting", async ({ page }) => {
    const editCalls = [];
    await setupTrpcMock(page, {
      ...baseHandlers,
      "settings.upsertTaxSetting": ({ input }) => {
        editCalls.push(input);
        return { id: input.id };
      },
    });

    await page.goto("/management/settings");

    // Click edit on the inactive tax setting (second button in the PPN 10% row)
    const ppn10Row = page.locator("div").filter({ hasText: "PPN 10%" });
    await ppn10Row.locator("button").last().click();

    await expect(page.getByLabel("Nama Pengaturan")).toHaveValue("PPN 10%");
    await page.getByLabel("Nama Pengaturan").fill("PPN 10% (Updated)");
    await page.getByLabel("Tarif (%)").fill("10.5");
    await page.getByRole("button", { name: "Simpan" }).click();

    await expect(page.getByText("Pengaturan PPN diperbarui")).toBeVisible();
    expect(editCalls).toHaveLength(1);
    expect(editCalls[0]).toMatchObject({
      id: "tax-2",
      name: "PPN 10% (Updated)",
      rate: 10.5,
    });
  });

  test("activates a tax setting", async ({ page }) => {
    const activateCalls = [];
    await setupTrpcMock(page, {
      ...baseHandlers,
      "settings.activateTaxSetting": ({ input }) => {
        activateCalls.push(input);
        return { success: true };
      },
    });

    await page.goto("/management/settings");

    // Click activate on the inactive tax setting
    await page.getByRole("button", { name: "Aktifkan" }).click();

    await expect(page.getByText("Pengaturan PPN diaktifkan")).toBeVisible();
    expect(activateCalls).toHaveLength(1);
    expect(activateCalls[0]).toEqual({ id: "tax-2" });
  });

  test("validates empty name", async ({ page }) => {
    await setupTrpcMock(page, baseHandlers);
    await page.goto("/management/settings");

    await page.getByRole("button", { name: "Tambah" }).click();
    await expect(page.getByText("Nama pengaturan PPN wajib diisi")).toBeVisible();
  });

  test("validates rate range", async ({ page }) => {
    const upsertCalls = [];
    await setupTrpcMock(page, {
      ...baseHandlers,
      "settings.upsertTaxSetting": ({ input }) => {
        upsertCalls.push(input);
        return { id: input.id ?? "tax-new" };
      },
    });
    await page.goto("/management/settings");

    await page.getByLabel("Nama Pengaturan").fill("Test");
    await page.getByLabel("Tarif (%)").fill("101");
    await page.getByRole("button", { name: "Tambah" }).click();

    // Verify validation prevented the API call
    expect(upsertCalls).toHaveLength(0);
    // Verify the form was not reset (validation failed)
    await expect(page.getByLabel("Nama Pengaturan")).toHaveValue("Test");
    await expect(page.getByLabel("Tarif (%)")).toHaveValue("101");
  });
});