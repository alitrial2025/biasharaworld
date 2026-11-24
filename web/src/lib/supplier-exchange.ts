export type RequestedLine = { item: string; unit: string; quantity: number };
export type OfferedLine = RequestedLine & { unitMinor: number };
export type CatalogueLine = Omit<OfferedLine, "quantity">;
export type SupplierProfile = {
  business_id: string; display_name: string; visible: boolean;
  coverage: string; terms: string; lead_days: number; minimum_minor: number; catalogue: CatalogueLine[];
};
export const exchangeStatus = {
  requested: "Quote requested", quoted: "Quote ready", ordered: "Purchase order confirmed",
  dispatched: "Dispatched", disputed: "Delivery discrepancy", received: "Received",
  invoiced: "Invoice due", paid: "Buyer recorded payment", cancelled: "Cancelled", declined: "Declined",
} as const;
export const exchangeAction = {
  quote: "Share quote", decline: "Decline request", accept: "Confirm purchase order", cancel: "Cancel request",
  dispatch: "Share dispatch details", receive: "Confirm receipt", dispute: "Report discrepancy",
  invoice: "Share invoice", record_payment: "Record payment",
} as const;
export type ExchangeAction = keyof typeof exchangeAction;
export type SupplierExchange = {
  id: string; buyer_name: string; supplier_name: string; side: "buyer" | "supplier"; version: number;
  status: keyof typeof exchangeStatus; updated_at: string; requested_lines: RequestedLine[]; offered_lines: OfferedLine[] | null;
  quote_minor: number | null; delivery_fee_minor: number | null; invoice_reference: string | null; due_on: string | null;
  actions: ExchangeAction[];
};
export type ExchangeEvent = {
  action: ExchangeAction | "request"; recorded_at: string; side: "buyer" | "supplier";
  note: string; dispatchReference?: string; proofReference?: string; paymentReference?: string;
};
export type ExchangeWorkspace = {
  profile: SupplierProfile | null; suppliers: SupplierProfile[]; nextSupplier: string | null;
  exchanges: SupplierExchange[]; nextPage: number | null; verified: boolean;
};
