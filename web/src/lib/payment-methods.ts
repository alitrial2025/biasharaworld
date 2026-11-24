export const paymentMethods = { card: "Card", mobile_money: "M-Pesa", bank_transfer: "Bank transfer" } as const;
export type PaymentChannel = keyof typeof paymentMethods;
export type ProviderPaymentMethod = (typeof paymentMethods)[PaymentChannel];
