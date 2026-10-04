import type { Store } from './types';

export function addDemoInvitation(
  data: Store,
  input: { token: string; name: string; phone: string; message: string; customerId?: string },
): Store {
  if (data.invitations.some((invitation) => invitation.token === input.token)) return data;
  const selected = input.customerId
    ? data.customers.find((customer) => customer.id === input.customerId)
    : undefined;
  const existing =
    selected ??
    (input.phone ? data.customers.find((customer) => customer.phone === input.phone) : undefined);
  const customerId = existing?.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    ...data,
    customers: existing
      ? data.customers
      : [
          {
            id: customerId,
            businessId: data.business.id,
            name: input.name.trim() || 'Klant via link',
            phone: input.phone,
            createdAt: now,
          },
          ...data.customers,
        ],
    invitations: [
      {
        id: crypto.randomUUID(),
        customerId,
        businessId: data.business.id,
        token: input.token,
        status: 'sent',
        sentAt: now,
        message: input.message,
      },
      ...data.invitations,
    ],
  };
}
