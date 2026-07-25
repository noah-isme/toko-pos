import {
  type PaymentGateway,
  type QRISChargeRequest,
  type QRISChargeResponse,
  type PaymentStatusResponse,
  type EDCChargeRequest,
  type EDCChargeResponse,
  type PaymentStatus,
} from "./types";

export type EDCProviderConfig = {
  provider: "verifone" | "ingenico" | "mock";
  apiUrl: string;
  terminalId?: string;
  merchantId?: string;
  mode: "sandbox" | "live";
};

export class EDCGateway implements PaymentGateway {
  readonly provider: string;

  constructor(private readonly config: EDCProviderConfig) {
    this.provider = config.provider;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createQRISCharge(_request: QRISChargeRequest): Promise<QRISChargeResponse> {
    throw new Error("EDC provider does not support QRIS. Use a QRIS gateway instead.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async checkQRISStatus(_transactionId: string): Promise<PaymentStatusResponse> {
    throw new Error("EDC provider does not support QRIS.");
  }

  async initiateEDCCharge(
    request: EDCChargeRequest,
  ): Promise<EDCChargeResponse> {
    const terminalId = request.terminalId ?? this.config.terminalId ?? "";

    const response = await fetch(`${this.config.apiUrl}/v1/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Terminal-Id": terminalId,
        "X-Merchant-Id": this.config.merchantId ?? "",
        "X-Mode": this.config.mode,
      },
      body: JSON.stringify({
        amount: request.amount,
        reference_id: request.referenceId,
        description: request.description,
        terminal_id: terminalId,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "unknown");
      throw new Error(`EDC charge failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      transaction_id: string;
      reference_id: string;
      amount: number;
      status: string;
      card_last_four?: string;
      card_brand?: string;
      receipt_url?: string;
    };

    return {
      transactionId: data.transaction_id,
      referenceId: data.reference_id,
      amount: data.amount,
      status: mapEdcStatus(data.status),
      cardLastFour: data.card_last_four,
      cardBrand: data.card_brand,
      receiptUrl: data.receipt_url,
    };
  }

  async checkEDCStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const response = await fetch(
      `${this.config.apiUrl}/v1/payment/${encodeURIComponent(transactionId)}/status`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Terminal-Id": this.config.terminalId ?? "",
          "X-Merchant-Id": this.config.merchantId ?? "",
          "X-Mode": this.config.mode,
        },
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "unknown");
      throw new Error(`EDC status failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      transaction_id: string;
      reference_id: string;
      amount: number;
      status: string;
      paid_at?: string;
      payment_method?: string;
    };

    return {
      transactionId: data.transaction_id,
      referenceId: data.reference_id,
      amount: data.amount,
      status: mapEdcStatus(data.status),
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      paymentMethod: data.payment_method,
    };
  }
}

function mapEdcStatus(status: string): PaymentStatus {
  switch (status.toUpperCase()) {
    case "PENDING":
    case "PROCESSING":
      return "PENDING";
    case "APPROVED":
    case "PAID":
    case "SUCCESS":
      return "PAID";
    case "DECLINED":
    case "FAILED":
    case "ERROR":
      return "FAILED";
    case "EXPIRED":
      return "EXPIRED";
    case "CANCELLED":
    case "VOID":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}
