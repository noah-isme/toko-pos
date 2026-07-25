import { env } from "@/env";
import { XenditGateway } from "./xendit";
import { MidtransGateway } from "./midtrans";
import { EDCGateway } from "./edc";
import { MockPaymentGateway } from "./mock";
import { type PaymentGateway } from "./types";

export function createQRISGateway(): PaymentGateway {
  const provider = env.PAYMENT_GATEWAY_PROVIDER;
  const mode = env.PAYMENT_GATEWAY_MODE;

  if (provider === "xendit") {
    const secretKey = env.XENDIT_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        "XENDIT_SECRET_KEY is required when PAYMENT_GATEWAY_PROVIDER=xendit",
      );
    }

    return new XenditGateway({
      secretKey,
      publicKey: env.XENDIT_PUBLIC_KEY,
      apiUrl: env.XENDIT_API_URL ?? "https://api.xendit.co",
      mode,
    });
  }

  if (provider === "midtrans") {
    const serverKey = env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      throw new Error(
        "MIDTRANS_SERVER_KEY is required when PAYMENT_GATEWAY_PROVIDER=midtrans",
      );
    }

    return new MidtransGateway({
      serverKey,
      clientKey: env.MIDTRANS_CLIENT_KEY,
      apiUrl:
        env.MIDTRANS_API_URL ??
        (mode === "live"
          ? "https://app.midtrans.com"
          : "https://app.sandbox.midtrans.com"),
      mode,
    });
  }

  return new MockPaymentGateway();
}

export function createEDCGateway(): PaymentGateway {
  const provider = env.EDC_PROVIDER;
  const mode = env.PAYMENT_GATEWAY_MODE;

  if (provider === "mock") {
    return new MockPaymentGateway();
  }

  if (!env.EDC_API_URL) {
    throw new Error(
      "EDC_API_URL is required when EDC_PROVIDER is not mock",
    );
  }

  return new EDCGateway({
    provider,
    apiUrl: env.EDC_API_URL,
    terminalId: env.EDC_TERMINAL_ID,
    merchantId: env.EDC_MERCHANT_ID,
    mode,
  });
}

export function createMockGateway(): PaymentGateway {
  return new MockPaymentGateway();
}
