export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
}

export interface WhatsAppMessage {
  to: string;
  body: string;
  mediaUrl?: string;
}

export interface NotificationResult {
  success: boolean;
  channel: "email" | "whatsapp";
  messageId?: string;
  error?: string;
}

export interface NotificationProvider {
  isConfigured(): boolean;
  sendEmail(message: EmailMessage): Promise<NotificationResult>;
  sendWhatsApp(message: WhatsAppMessage): Promise<NotificationResult>;
}

export interface NotificationTemplate {
  subject: string;
  text: string;
  html: string;
  whatsappBody?: string;
}

export type NotificationChannel = "email" | "whatsapp" | "both";

export interface SendNotificationOptions {
  to: string;
  channel?: NotificationChannel;
  template: NotificationTemplate;
  whatsappNumber?: string;
}