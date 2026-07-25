import {
  type PaymentGateway,
  type QRISChargeRequest,
  type QRISChargeResponse,
  type PaymentStatusResponse,
  type EDCChargeRequest,
  type EDCChargeResponse,
  type PaymentStatus,
} from "./types";

export type XenditConfig = {
  secretKey: string;
  publicKey?: string;
  apiUrl: string;
  mode: "sandbox" | "live";
};

const XENDIT_QRIS_API_VERSION = "2022-07-31";

export class XenditGateway implements PaymentGateway {
  readonly provider = "xendit";

  constructor(private readonly config: XenditConfig) {}

  async createQRISCharge(
    request: QRISChargeRequest,
  ): Promise<QRISChargeResponse> {
    const response = await fetch(`${this.config.apiUrl}/qr_codes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-version": XENDIT_QRIS_API_VERSION,
        Authorization: `Basic ${Buffer.from(`${this.config.secretKey}:`).toString("base64")}`,
      },
      body: JSON.stringify({
        reference_id: request.referenceId,
        type: "DYNAMIC",
        currency: "IDR",
        amount: request.amount,
        expires_at: request.expiresInSeconds
          ? new Date(Date.now() + request.expiresInSeconds * 1000).toISOString()
          : undefined,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "unknown");
      throw new Error(`Xendit QRIS charge failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      id: string;
      reference_id: string;
      qr_string: string;
      amount?: number;
      status: string;
      expires_at?: string;
    };

    return {
      transactionId: data.id,
      referenceId: data.reference_id,
      qrString: data.qr_string,
      amount: data.amount ?? request.amount,
      status: mapXenditStatus(data.status),
      expiresAt: data.expires_at ? new Date(data.expires_at) : new Date(Date.now() + 300_000),
    };
  }

  async checkQRISStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const response = await fetch(
      `${this.config.apiUrl}/qr_codes/${encodeURIComponent(transactionId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "api-version": XENDIT_QRIS_API_VERSION,
          Authorization: `Basic ${Buffer.from(`${this.config.secretKey}:`).toString("base64")}`,
        },
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "unknown");
      throw new Error(`Xendit QRIS status failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      id: string;
      reference_id: string;
      amount?: number;
      status: string;
      paid_at?: string;
      payment_method?: string;
    };

    return {
      transactionId: data.id,
      referenceId: data.reference_id,
      amount: data.amount ?? 0,
      status: mapXenditStatus(data.status),
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      paymentMethod: data.payment_method,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initiateEDCCharge(_request: EDCChargeRequest): Promise<EDCChargeResponse> {
    throw new Error("Xendit EDC is not supported. Use QRIS or a dedicated EDC provider.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async checkEDCStatus(_transactionId: string): Promise<PaymentStatusResponse> {
    throw new Error("Xendit EDC is not supported.");
  }
}

function mapXenditStatus(status: string): PaymentStatus {
  switch (status.toUpperCase()) {
    case "ACTIVE":
    case "PENDING":
      return "PENDING";
    case "COMPLETED":
    case "PAID":
      return "PAID";
    case "FAILED":
      return "FAILED";
    case "EXPIRED":
      return "EXPIRED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}
