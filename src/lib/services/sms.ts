export interface SmsProvider {
  send(input: { to: string; message: string }): Promise<{ providerId: string }>;
}
// Replace this adapter with a SERVER-SIDE Twilio integration. Never expose credentials in the browser.
export const mockSmsProvider: SmsProvider = {
  async send() {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return { providerId: `mock-${crypto.randomUUID()}` };
  },
};
