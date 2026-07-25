import { env } from "@/env";
import nodemailer from "nodemailer";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailProvider {
  private transporter: nodemailer.Transporter | null = null;
  private initialized = false;

  private initialize(): void {
    if (this.initialized) return;

    const { EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD } = env;

    if (!EMAIL_SERVER_HOST || !EMAIL_SERVER_USER || !EMAIL_SERVER_PASSWORD) {
      console.warn("[Email] SMTP not configured, email sending disabled");
      this.initialized = true;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: EMAIL_SERVER_HOST,
      port: EMAIL_SERVER_PORT ?? 587,
      secure: EMAIL_SERVER_PORT === 465,
      auth: {
        user: EMAIL_SERVER_USER,
        pass: EMAIL_SERVER_PASSWORD,
      },
    });

    this.initialized = true;
  }

  isConfigured(): boolean {
    this.initialize();
    return this.transporter !== null;
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    this.initialize();

    if (!this.transporter) {
      return { success: false, error: "Email not configured" };
    }

    const from = message.from ?? env.EMAIL_FROM ?? "Toko POS <no-reply@tokopos.local>";

    try {
      const info = await this.transporter.sendMail({
        from,
        to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("[Email] Failed to send email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async verifyConnection(): Promise<boolean> {
    this.initialize();
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

export const emailProvider = new EmailProvider();