import { env } from "@/env";

export interface WhatsAppMessage {
  to: string;
  body: string;
  mediaUrl?: string;
}

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type WhatsAppProviderType = "wablas" | "fonnte" | "custom" | "mock";

interface WhatsAppConfig {
  provider: WhatsAppProviderType;
  apiUrl: string;
  apiKey: string;
  deviceId?: string;
  senderId?: string;
}

function getWhatsAppConfig(): WhatsAppConfig | null {
  const provider = env.WHATSAPP_PROVIDER as WhatsAppProviderType | undefined;
  const apiUrl = env.WHATSAPP_API_URL;
  const apiKey = env.WHATSAPP_API_KEY;

  if (!provider || !apiUrl || !apiKey) {
    return null;
  }

  return {
    provider,
    apiUrl,
    apiKey,
    deviceId: env.WHATSAPP_DEVICE_ID,
    senderId: env.WHATSAPP_SENDER_ID,
  };
}

class MockWhatsAppProvider {
  isConfigured(): boolean {
    return true;
  }

  async sendWhatsApp(message: WhatsAppMessage): Promise<WhatsAppResult> {
    console.info("[WhatsApp Mock] Sending message:", {
      to: message.to,
      body: message.body,
      mediaUrl: message.mediaUrl,
    });

    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }
}

class WablasProvider {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && !!this.config.apiUrl;
  }

  async sendWhatsApp(message: WhatsAppMessage): Promise<WhatsAppResult> {
    try {
      const params = new URLSearchParams({
        phone: message.to,
        message: message.body,
        isGroup: "false",
      });

      if (message.mediaUrl) {
        params.append("mediaUrl", message.mediaUrl);
      }

      const response = await fetch(`${this.config.apiUrl}/api/send-message`, {
        method: "POST",
        headers: {
          Authorization: this.config.apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = (await response.json()) as {
        status?: boolean;
        message?: string;
        data?: { id?: string };
      };

      if (data.status) {
        return {
          success: true,
          messageId: data.data?.id,
        };
      }

      return {
        success: false,
        error: data.message ?? "Wablas API error",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

class FonnteProvider {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && !!this.config.apiUrl;
  }

  async sendWhatsApp(message: WhatsAppMessage): Promise<WhatsAppResult> {
    try {
      const formData = new FormData();
      formData.append("target", message.to);
      formData.append("message", message.body);
      formData.append("countryCode", "62");

      if (message.mediaUrl) {
        formData.append("url", message.mediaUrl);
      }

      const response = await fetch(`${this.config.apiUrl}/send`, {
        method: "POST",
        headers: {
          Authorization: this.config.apiKey,
        },
        body: formData,
      });

      const data = (await response.json()) as {
        status?: boolean;
        reason?: string;
        messageId?: string;
      };

      if (data.status) {
        return {
          success: true,
          messageId: data.messageId,
        };
      }

      return {
        success: false,
        error: data.reason ?? "Fonnte API error",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

class CustomWebhookProvider {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!this.config.apiKey && !!this.config.apiUrl;
  }

  async sendWhatsApp(message: WhatsAppMessage): Promise<WhatsAppResult> {
    try {
      const response = await fetch(this.config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          to: message.to,
          body: message.body,
          mediaUrl: message.mediaUrl,
          senderId: this.config.senderId,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { messageId?: string };
        return {
          success: true,
          messageId: data.messageId,
        };
      }

      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

function createProvider(): MockWhatsAppProvider | WablasProvider | FonnteProvider | CustomWebhookProvider {
  const config = getWhatsAppConfig();

  if (!config) {
    return new MockWhatsAppProvider();
  }

  switch (config.provider) {
    case "wablas":
      return new WablasProvider(config);
    case "fonnte":
      return new FonnteProvider(config);
    case "custom":
      return new CustomWebhookProvider(config);
    default:
      return new MockWhatsAppProvider();
  }
}

export const whatsappProvider = createProvider();