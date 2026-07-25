import {
  type PaymentGateway,
  type QRISChargeRequest,
  type QRISChargeResponse,
  type PaymentStatusResponse,
  type EDCChargeRequest,
  type EDCChargeResponse,
  type PaymentStatus,
} from "./types";

export type MidtransConfig = {
  serverKey: string;
  clientKey?: string;
  apiUrl: string;
  mode: "sandbox" | "live";
};

export class MidtransGateway implements PaymentGateway {
  readonly provider = "midtrans";

  constructor(private readonly config: MidtransConfig) {}

  async createQRISCharge(
    request: QRISChargeRequest,
  ): Promise<QRISChargeResponse> {
    const response = await fetch(`${this.config.apiUrl}/v2/charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${this.config.serverKey}:`).toString("base64")}`,
      },
      body: JSON.stringify({
        payment_type: "qris",
        transaction_details: {
          order_id: request.referenceId,
          gross_amount: request.amount,
        },
        customer_details: request.customerName
          ? { first_name: request.customerName }
          : undefined,
        qris: {
          acquirer: "gopay",
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "unknown");
      throw new Error(`Midtrans QRIS charge failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      transaction_id: string;
      order_id: string;
      gross_amount: string;
      transaction_status: string;
      actions?: Array<{ name: string; url: string }>;
      expiry_time?: string;
    };

    const qrString = data.actions?.find((action) => action.name === "generate-qr-code")?.url ?? "";

    return {
      transactionId: data.transaction_id,
      referenceId: data.order_id,
      qrString,
      amount: Number(data.gross_amount),
      status: mapMidtransStatus(data.transaction_status),
      expiresAt: data.expiry_time ? new Date(data.expiry_time) : new Date(Date.now() + 300_000),
      checkoutUrl: data.actions?.find((action) => action.name === "deeplink-redirect")?.url,
    };
  }

  async checkQRISStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const response = await fetch(
      `${this.config.apiUrl}/v2/${encodeURIComponent(transactionId)}/status`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(`${this.config.serverKey}:`).toString("base64")}`,
        },
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "unknown");
      throw new Error(`Midtrans status failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      transaction_id: string;
      order_id: string;
      gross_amount: string;
      transaction_status: string;
      settlement_time?: string;
      payment_type?: string;
    };

    return {
      transactionId: data.transaction_id,
      referenceId: data.order_id,
      amount: Number(data.gross_amount),
      status: mapMidtransStatus(data.transaction_status),
      paidAt: data.settlement_time ? new Date(data.settlement_time) : undefined,
      paymentMethod: data.payment_type,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initiateEDCCharge(_request: EDCChargeRequest): Promise<EDCChargeResponse> {
    throw new Error("Midtrans EDC is not supported. Use a dedicated EDC provider.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async checkEDCStatus(_transactionId: string): Promise<PaymentStatusResponse> {
    throw new Error("Midtrans EDC is not supported.");
  }

  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    const expected = await sha512(payload + secret);
    return signature === expected;
  }
}

function mapMidtransStatus(status: string): PaymentStatus {
  switch (status.toLowerCase()) {
    case "pending":
    case "authorize":
      return "PENDING";
    case "settlement":
    case "capture":
    case "success":
      return "PAID";
    case "deny":
    case "failure":
    case "failed":
      return "FAILED";
    case "expire":
      return "EXPIRED";
    case "cancel":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

async function sha512(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
