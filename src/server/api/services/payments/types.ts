export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export type QRISChargeRequest = {
  amount: number;
  referenceId: string;
  description: string;
  expiresInSeconds?: number;
  customerName?: string;
};

export type QRISChargeResponse = {
  transactionId: string;
  referenceId: string;
  qrString: string;
  amount: number;
  status: PaymentStatus;
  expiresAt: Date;
  checkoutUrl?: string;
};

export type PaymentStatusResponse = {
  transactionId: string;
  referenceId: string;
  amount: number;
  status: PaymentStatus;
  paidAt?: Date;
  paymentMethod?: string;
};

export type EDCChargeRequest = {
  amount: number;
  referenceId: string;
  description: string;
  terminalId?: string;
};

export type EDCChargeResponse = {
  transactionId: string;
  referenceId: string;
  amount: number;
  status: PaymentStatus;
  cardLastFour?: string;
  cardBrand?: string;
  receiptUrl?: string;
};

export interface PaymentGateway {
  readonly provider: string;
  createQRISCharge(request: QRISChargeRequest): Promise<QRISChargeResponse>;
  checkQRISStatus(transactionId: string): Promise<PaymentStatusResponse>;
  initiateEDCCharge(request: EDCChargeRequest): Promise<EDCChargeResponse>;
  checkEDCStatus(transactionId: string): Promise<PaymentStatusResponse>;
  verifyWebhookSignature?(
    payload: string,
    signature: string,
    secret: string,
  ): boolean | Promise<boolean>;
}
