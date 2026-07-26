import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { MockPaymentGateway } from "@/server/api/services/payments/mock";
import { XenditGateway } from "@/server/api/services/payments/xendit";
import { MidtransGateway } from "@/server/api/services/payments/midtrans";
import { EDCGateway } from "@/server/api/services/payments/edc";

const VALID_STATUSES = ["PENDING", "PAID", "FAILED", "EXPIRED", "CANCELLED"] as const;

describe("MockPaymentGateway", () => {
  it("creates a QRIS charge with correct shape and expiry", async () => {
    const gateway = new MockPaymentGateway();
    const response = await gateway.createQRISCharge({
      amount: 150000,
      referenceId: "REF-001",
      description: "Test QRIS",
      expiresInSeconds: 300,
    });

    expect(response.amount).toBe(150000);
    expect(response.referenceId).toBe("REF-001");
    expect(response.status).toBe("PENDING");
    expect(response.qrString).toContain("MOCK|QRIS|REF-001|150000|");
    expect(response.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("creates an EDC charge with correct shape", async () => {
    const gateway = new MockPaymentGateway();
    const response = await gateway.initiateEDCCharge({
      amount: 250000,
      referenceId: "REF-EDC-001",
      description: "Test EDC",
    });

    expect(response.amount).toBe(250000);
    expect(response.referenceId).toBe("REF-EDC-001");
    expect(response.status).toBe("PENDING");
    expect(response.cardBrand).toBe("VISA");
    expect(response.cardLastFour).toBe("0000");
  });

  it("returns a valid status when checking QRIS", async () => {
    const gateway = new MockPaymentGateway();
    const charge = await gateway.createQRISCharge({
      amount: 100000,
      referenceId: "REF-002",
      description: "Test QRIS status",
    });

    const status = await gateway.checkQRISStatus(charge.transactionId);

    expect(status.transactionId).toBe(charge.transactionId);
    expect(status.referenceId).toBe(charge.referenceId);
    expect(VALID_STATUSES).toContain(status.status);
  });

  it("returns a valid status when checking EDC", async () => {
    const gateway = new MockPaymentGateway();
    const charge = await gateway.initiateEDCCharge({
      amount: 100000,
      referenceId: "REF-003",
      description: "Test EDC status",
    });

    const status = await gateway.checkEDCStatus(charge.transactionId);

    expect(status.transactionId).toBe(charge.transactionId);
    expect(VALID_STATUSES).toContain(status.status);
  });
});

describe("XenditGateway", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a QRIS charge with the correct API call", async () => {
    const gateway = new XenditGateway({
      secretKey: "test-secret",
      apiUrl: "https://api.xendit.test",
      mode: "sandbox",
    });

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "qr-123",
          reference_id: "REF-XENDIT-001",
          qr_string: "xendit-qr-string",
          amount: 175000,
          status: "ACTIVE",
          expires_at: new Date(Date.now() + 300_000).toISOString(),
        }),
        { status: 200 },
      ),
    );

    const response = await gateway.createQRISCharge({
      amount: 175000,
      referenceId: "REF-XENDIT-001",
      description: "Test Xendit",
      expiresInSeconds: 300,
    });

    expect(response.transactionId).toBe("qr-123");
    expect(response.qrString).toBe("xendit-qr-string");
    expect(response.status).toBe("PENDING");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.xendit.test/qr_codes",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Basic "),
        }),
        body: expect.stringContaining("REF-XENDIT-001"),
      }),
    );
  });

  it("throws when the Xendit API returns an error", async () => {
    const gateway = new XenditGateway({
      secretKey: "test-secret",
      apiUrl: "https://api.xendit.test",
      mode: "sandbox",
    });

    vi.mocked(fetch).mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));

    await expect(
      gateway.createQRISCharge({
        amount: 100000,
        referenceId: "REF-ERROR",
        description: "Test error",
      }),
    ).rejects.toThrow("Xendit QRIS charge failed: 401");
  });
});

describe("MidtransGateway", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a QRIS charge with the correct API call", async () => {
    const gateway = new MidtransGateway({
      serverKey: "test-server-key",
      apiUrl: "https://app.sandbox.midtrans.com",
      mode: "sandbox",
    });

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          transaction_id: "midtrans-123",
          order_id: "REF-MIDTRANS-001",
          gross_amount: "200000",
          transaction_status: "pending",
          actions: [
            { name: "generate-qr-code", url: "https://qr.midtrans.test/qr-123" },
          ],
          expiry_time: new Date(Date.now() + 300_000).toISOString(),
        }),
        { status: 200 },
      ),
    );

    const response = await gateway.createQRISCharge({
      amount: 200000,
      referenceId: "REF-MIDTRANS-001",
      description: "Test Midtrans",
    });

    expect(response.transactionId).toBe("midtrans-123");
    expect(response.qrString).toBe("https://qr.midtrans.test/qr-123");
    expect(response.status).toBe("PENDING");

    expect(fetch).toHaveBeenCalledWith(
      "https://app.sandbox.midtrans.com/v2/charge",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("REF-MIDTRANS-001"),
      }),
    );
  });

  it("throws when the Midtrans API returns an error", async () => {
    const gateway = new MidtransGateway({
      serverKey: "test-server-key",
      apiUrl: "https://app.sandbox.midtrans.com",
      mode: "sandbox",
    });

    vi.mocked(fetch).mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

    await expect(
      gateway.createQRISCharge({
        amount: 100000,
        referenceId: "REF-ERROR",
        description: "Test error",
      }),
    ).rejects.toThrow("Midtrans QRIS charge failed: 403");
  });
});

describe("EDCGateway", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("initiates an EDC charge with the correct API call", async () => {
    const gateway = new EDCGateway({
      provider: "verifone",
      apiUrl: "https://edc.test",
      terminalId: "TERM-001",
      merchantId: "MERCH-001",
      mode: "sandbox",
    });

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          transaction_id: "edc-123",
          reference_id: "REF-EDC-001",
          amount: 125000,
          status: "PENDING",
          card_last_four: "1234",
          card_brand: "MASTERCARD",
        }),
        { status: 200 },
      ),
    );

    const response = await gateway.initiateEDCCharge({
      amount: 125000,
      referenceId: "REF-EDC-001",
      description: "Test EDC",
    });

    expect(response.transactionId).toBe("edc-123");
    expect(response.status).toBe("PENDING");
    expect(response.cardBrand).toBe("MASTERCARD");
    expect(response.cardLastFour).toBe("1234");

    expect(fetch).toHaveBeenCalledWith(
      "https://edc.test/v1/payment",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Terminal-Id": "TERM-001",
          "X-Merchant-Id": "MERCH-001",
        }),
      }),
    );
  });
});
