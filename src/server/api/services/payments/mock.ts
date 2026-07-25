import {
  type PaymentGateway,
  type QRISChargeRequest,
  type QRISChargeResponse,
  type PaymentStatusResponse,
  type EDCChargeRequest,
  type EDCChargeResponse,
  type PaymentStatus,
} from "./types";

const DEFAULT_EXPIRY_SECONDS = 300;

export class MockPaymentGateway implements PaymentGateway {
  readonly provider = "mock";

  async createQRISCharge(
    request: QRISChargeRequest,
  ): Promise<QRISChargeResponse> {
    const transactionId = buildMockTransactionId("QRIS", request.referenceId);
    const expirySeconds = request.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS;

    return {
      transactionId,
      referenceId: request.referenceId,
      qrString: `MOCK|QRIS|${request.referenceId}|${request.amount}|${transactionId}`,
      amount: request.amount,
      status: "PENDING",
      expiresAt: new Date(Date.now() + expirySeconds * 1000),
    };
  }

  async checkQRISStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const status = resolveMockStatus(transactionId);

    return {
      transactionId,
      referenceId: extractReferenceId(transactionId),
      amount: 0,
      status,
      paidAt: status === "PAID" ? new Date() : undefined,
      paymentMethod: status === "PAID" ? "QRIS" : undefined,
    };
  }

  async initiateEDCCharge(
    request: EDCChargeRequest,
  ): Promise<EDCChargeResponse> {
    const transactionId = buildMockTransactionId("EDC", request.referenceId);

    return {
      transactionId,
      referenceId: request.referenceId,
      amount: request.amount,
      status: "PENDING",
      cardBrand: "VISA",
      cardLastFour: "0000",
    };
  }

  async checkEDCStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const status = resolveMockStatus(transactionId);

    return {
      transactionId,
      referenceId: extractReferenceId(transactionId),
      amount: 0,
      status,
      paidAt: status === "PAID" ? new Date() : undefined,
      paymentMethod: status === "PAID" ? "CARD" : undefined,
    };
  }
}

function buildMockTransactionId(
  type: "QRIS" | "EDC",
  referenceId: string,
): string {
  const random = Math.random().toString(36).slice(2, 8);
  const encodedReference = Buffer.from(referenceId).toString("base64url");
  return `MOCK-${type}-${Date.now()}-${encodedReference}-${random}`;
}

function resolveMockStatus(transactionId: string): PaymentStatus {
  const hash = transactionId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bucket = hash % 10;

  if (bucket < 6) return "PENDING";
  if (bucket < 8) return "PAID";
  if (bucket === 8) return "FAILED";
  return "EXPIRED";
}

function extractReferenceId(transactionId: string): string {
  const match = transactionId.match(/^MOCK-(?:QRIS|EDC)-\d+-([A-Za-z0-9_-]+)-[a-z0-9]+$/);
  if (match?.[1]) {
    try {
      return Buffer.from(match[1], "base64url").toString("utf-8");
    } catch {
      return match[1];
    }
  }
  return transactionId;
}
