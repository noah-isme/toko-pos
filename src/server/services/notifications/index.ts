import { emailProvider } from "./email";
import { whatsappProvider } from "./whatsapp";

export interface NotificationTemplate {
  subject: string;
  text: string;
  html?: string;
  whatsappBody?: string;
}

export type NotificationChannel = "email" | "whatsapp" | "both";

export interface SendNotificationOptions {
  to: string;
  channel?: NotificationChannel;
  template: NotificationTemplate;
  whatsappNumber?: string;
}

export interface NotificationResult {
  email?: { success: boolean; messageId?: string; error?: string };
  whatsapp?: { success: boolean; messageId?: string; error?: string };
}

export class NotificationService {
  private defaultChannel: NotificationChannel = "both";

  setDefaultChannel(channel: NotificationChannel): void {
    this.defaultChannel = channel;
  }

  async sendNotification(options: SendNotificationOptions): Promise<NotificationResult> {
    const channel = options.channel ?? this.defaultChannel;
    const result: NotificationResult = {};

    if (channel === "email" || channel === "both") {
      result.email = await this.sendEmail(options.to, options.template);
    }

    if (channel === "whatsapp" || channel === "both") {
      const phoneNumber = options.whatsappNumber ?? options.to;
      result.whatsapp = await this.sendWhatsApp(phoneNumber, options.template);
    }

    return result;
  }

  private async sendEmail(to: string, template: NotificationTemplate): Promise<NotificationResult["email"]> {
    if (!emailProvider.isConfigured()) {
      console.warn("[Notification] Email not configured, skipping");
      return { success: false, error: "Email not configured" };
    }

    return emailProvider.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html ?? template.text,
    });
  }

  private async sendWhatsApp(to: string, template: NotificationTemplate): Promise<NotificationResult["whatsapp"]> {
    if (!whatsappProvider.isConfigured()) {
      console.warn("[Notification] WhatsApp not configured, skipping");
      return { success: false, error: "WhatsApp not configured" };
    }

    const body = template.whatsappBody ?? template.text;

    return whatsappProvider.sendWhatsApp({
      to: this.formatPhoneNumber(to),
      body,
    });
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, "");

    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.slice(1);
    } else if (!cleaned.startsWith("62")) {
      cleaned = "62" + cleaned;
    }

    return cleaned;
  }
}

export const notificationService = new NotificationService();