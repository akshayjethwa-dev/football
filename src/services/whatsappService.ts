/**
 * Provider-agnostic WhatsApp integration abstraction service.
 * Supports Meta Cloud API, Gupshup API, and mock simulation behaviors.
 */

export interface WhatsAppService {
  /**
   * Sends a structured template message to a registered phone number.
   * Template parameters / dynamic content can be provided in `variables`.
   */
  sendTemplateMessage(
    recipientPhone: string,
    templateNameOrId: string,
    variables: string[]
  ): Promise<{ success: boolean; messageId: string; response: any }>;

  /**
   * Sends a raw free-form text message where template-based restriction is not active.
   */
  sendTextMessage(
    recipientPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; response: any }>;

  /**
   * Sends bulk template messages to multiple recipients with custom parameters for each.
   */
  sendBulkTemplateMessage(
    recipients: string[],
    templateNameOrId: string,
    variablesPerRecipient: string[][]
  ): Promise<Array<{ recipientPhone: string; success: boolean; messageId?: string; error?: string }>>;
}

/**
 * 1. Meta Cloud Business API Implementation
 */
export class MetaCloudWhatsAppProvider implements WhatsAppService {
  private apiUrl: string;
  private apiToken: string;
  private phoneNumberId: string;

  constructor(config: { apiKey?: string; apiBaseUrl?: string; senderId?: string }) {
    // Meta Cloud API relies on WhatsApp Phone Number ID and System User Access Tokens
    this.apiToken = config.apiKey || process.env.WHATSAPP_API_TOKEN || '';
    this.phoneNumberId = config.senderId || process.env.WHATSAPP_SENDER_PHONE_NUMBER_ID || '';
    this.apiUrl = config.apiBaseUrl || process.env.WHATSAPP_API_URL || `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
  }

  async sendTemplateMessage(
    recipientPhone: string,
    templateNameOrId: string,
    variables: string[]
  ): Promise<{ success: boolean; messageId: string; response: any }> {
    if (!this.apiToken || !this.phoneNumberId) {
      console.warn('[WhatsAppService] Meta API Credentials missing. Falling back to local logging.');
      return this.fallbackMockResponse(recipientPhone, `Template: ${templateNameOrId} with variables: ${JSON.stringify(variables)}`);
    }

    // Standardize recipient phone format (must be numeric with country code, e.g., 14155552671)
    const formattedPhone = recipientPhone.replace(/\D/g, '');

    // Payload configured specifically for Meta Cloud API
    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateNameOrId,
        language: { code: 'en_US' }, // Default language code, configurable
        components: [
          {
            type: 'body',
            parameters: variables.map(v => ({ type: 'text', text: v }))
          }
        ]
      }
    };

    try {
      // PROD CONFIG: Ensure endpoint and headers are validated in meta developers panel
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Meta Cloud API message transmission failed');
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id || 'meta-msg-id',
        response: data
      };
    } catch (err: any) {
      console.error('[WhatsAppService] Meta sendTemplateMessage error:', err);
      throw err;
    }
  }

  async sendTextMessage(
    recipientPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; response: any }> {
    if (!this.apiToken || !this.phoneNumberId) {
      return this.fallbackMockResponse(recipientPhone, text);
    }

    const formattedPhone = recipientPhone.replace(/\D/g, '');
    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: { body: text }
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Meta Cloud API raw message failed');
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id || 'meta-msg-id',
        response: data
      };
    } catch (err: any) {
      console.error('[WhatsAppService] Meta sendTextMessage error:', err);
      throw err;
    }
  }

  async sendBulkTemplateMessage(
    recipients: string[],
    templateNameOrId: string,
    variablesPerRecipient: string[][]
  ): Promise<Array<{ recipientPhone: string; success: boolean; messageId?: string; error?: string }>> {
    const results = [];
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const variables = variablesPerRecipient[i] || [];
      try {
        const res = await this.sendTemplateMessage(recipient, templateNameOrId, variables);
        results.push({ recipientPhone: recipient, success: true, messageId: res.messageId });
      } catch (err: any) {
        results.push({ recipientPhone: recipient, success: false, error: err.message || String(err) });
      }
    }
    return results;
  }

  private fallbackMockResponse(phone: string, msg: string) {
    const fakeId = `mock-meta-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    console.log(`[WhatsAppService SIMULATION] Meta Cloud API: Sent message to ${phone}. Content: "${msg}"`);
    return {
      success: true,
      messageId: fakeId,
      response: { simulated: true, phone, content: msg }
    };
  }
}

/**
 * 2. Gupshup API Implementation
 */
export class GupshupWhatsAppProvider implements WhatsAppService {
  private apiUrl: string;
  private apiKey: string;
  private senderName: string;

  constructor(config: { apiKey?: string; apiBaseUrl?: string; senderId?: string }) {
    this.apiKey = config.apiKey || process.env.GUPSHUP_API_KEY || '';
    this.senderName = config.senderId || process.env.GUPSHUP_SENDER_NAME || '';
    this.apiUrl = config.apiBaseUrl || process.env.GUPSHUP_API_URL || 'https://api.gupshup.io/sm/api/v1/msg';
  }

  async sendTemplateMessage(
    recipientPhone: string,
    templateNameOrId: string,
    variables: string[]
  ): Promise<{ success: boolean; messageId: string; response: any }> {
    if (!this.apiKey || !this.senderName) {
      console.warn('[WhatsAppService] Gupshup Credentials missing. Falling back to local logging.');
      return this.fallbackMockResponse(recipientPhone, `Template: ${templateNameOrId} with parameters: ${JSON.stringify(variables)}`);
    }

    const formattedPhone = recipientPhone.replace(/\D/g, '');

    // Gupshup dynamic payload format (JSON urlencoded or application/json in dynamic messaging APIs)
    const payload = new URLSearchParams();
    payload.append('channel', 'whatsapp');
    payload.append('source', this.senderName);
    payload.append('destination', formattedPhone);
    payload.append('message', JSON.stringify({
      type: 'template',
      template: {
        id: templateNameOrId,
        params: variables
      }
    }));

    try {
      // PROD CONFIG: Ensure Gupshup authenticated endpoints
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apikey': this.apiKey
        },
        body: payload.toString()
      });

      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Gupshup API transmission failed');
      }

      return {
        success: true,
        messageId: data.messageId || 'gupshup-msg-id',
        response: data
      };
    } catch (err: any) {
      console.error('[WhatsAppService] Gupshup sendTemplateMessage error:', err);
      throw err;
    }
  }

  async sendTextMessage(
    recipientPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; response: any }> {
    if (!this.apiKey || !this.senderName) {
      return this.fallbackMockResponse(recipientPhone, text);
    }

    const formattedPhone = recipientPhone.replace(/\D/g, '');
    const payload = new URLSearchParams();
    payload.append('channel', 'whatsapp');
    payload.append('source', this.senderName);
    payload.append('destination', formattedPhone);
    payload.append('message', JSON.stringify({
      type: 'text',
      text: text
    }));

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apikey': this.apiKey
        },
        body: payload.toString()
      });

      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Gupshup API text error');
      }

      return {
        success: true,
        messageId: data.messageId || 'gupshup-msg-id',
        response: data
      };
    } catch (err: any) {
      console.error('[WhatsAppService] Gupshup sendTextMessage error:', err);
      throw err;
    }
  }

  async sendBulkTemplateMessage(
    recipients: string[],
    templateNameOrId: string,
    variablesPerRecipient: string[][]
  ): Promise<Array<{ recipientPhone: string; success: boolean; messageId?: string; error?: string }>> {
    const results = [];
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const variables = variablesPerRecipient[i] || [];
      try {
        const res = await this.sendTemplateMessage(recipient, templateNameOrId, variables);
        results.push({ recipientPhone: recipient, success: true, messageId: res.messageId });
      } catch (err: any) {
        results.push({ recipientPhone: recipient, success: false, error: err.message || String(err) });
      }
    }
    return results;
  }

  private fallbackMockResponse(phone: string, msg: string) {
    const fakeId = `mock-gupshup-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    console.log(`[WhatsAppService SIMULATION] Gupshup API: Sent message to ${phone}. Content: "${msg}"`);
    return {
      success: true,
      messageId: fakeId,
      response: { simulated: true, phone, content: msg }
    };
  }
}

/**
 * 3. Mock Sandbox/Simulation Provider for instant local dev feedback
 */
export class MockWhatsAppProvider implements WhatsAppService {
  async sendTemplateMessage(
    recipientPhone: string,
    templateNameOrId: string,
    variables: string[]
  ): Promise<{ success: boolean; messageId: string; response: any }> {
    const messageId = `mock-temp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const mockContent = `[TEMPLATE: ${templateNameOrId}] Variables: ${variables.join(' | ')}`;
    console.log(`[WhatsApp Service Sandbox] Sending Template to ${recipientPhone}: ${mockContent}`);
    return {
      success: true,
      messageId,
      response: { simulated: true, recipientPhone, templateNameOrId, variables, timestamp: new Date().toISOString() }
    };
  }

  async sendTextMessage(
    recipientPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; response: any }> {
    const messageId = `mock-txt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    console.log(`[WhatsApp Service Sandbox] Sending Raw Text to ${recipientPhone}: "${text}"`);
    return {
      success: true,
      messageId,
      response: { simulated: true, recipientPhone, text, timestamp: new Date().toISOString() }
    };
  }

  async sendBulkTemplateMessage(
    recipients: string[],
    templateNameOrId: string,
    variablesPerRecipient: string[][]
  ): Promise<Array<{ recipientPhone: string; success: boolean; messageId?: string; error?: string }>> {
    return recipients.map((phone, i) => {
      const vars = variablesPerRecipient[i] || [];
      return {
        recipientPhone: phone,
        success: true,
        messageId: `mock-bulk-${Date.now()}-${i}-${Math.floor(Math.random() * 100)}`
      };
    });
  }
}

/**
 * Factory resolver to obtain configured WhatsApp service based on env variables.
 */
export function getWhatsAppService(): WhatsAppService {
  const provider = process.env.WHATSAPP_PROVIDER || '';

  if (provider.toLowerCase() === 'meta') {
    return new MetaCloudWhatsAppProvider({});
  } else if (provider.toLowerCase() === 'gupshup') {
    return new GupshupWhatsAppProvider({});
  }

  // Fallback default is the robust simulation provider
  return new MockWhatsAppProvider();
}
