import catalog from "../../../shared/industry-catalog.json";
export type IndustryField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "datetime" | "select";
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
};
export type IndustryWorkflow = {
  id: string;
  label: string;
  singular: string;
  description: string;
  statuses: string[];
  terminalStatuses: string[];
  fields: IndustryField[];
  amountLabel?: string;
  reservation?: {
    resourceField: string;
    startField: string;
    endField: string;
    pool: string;
  };
};
export type Industry = {
  id: string;
  label: string;
  description: string;
  aliases: string[];
  recommendedTools: string[];
  labels: { catalog: string; customers: string; operations: string };
  workflows: IndustryWorkflow[];
};
export const industries = catalog as Industry[];
export function resolveIndustry(value: string): Industry {
  const normalized = value.trim().toLocaleLowerCase();
  return (
    industries.find((item) =>
      [item.id, item.label, ...item.aliases].some(
        (alias) => alias.toLocaleLowerCase() === normalized,
      ),
    ) || industries.find((item) => item.id === "retail")!
  );
}
export function workflowFor(
  industryId: string,
  workflowId: string,
): IndustryWorkflow | undefined {
  return industries
    .find((item) => item.id === industryId)
    ?.workflows.find((item) => item.id === workflowId);
}
export type IndustryPayment = {
  id: string;
  action: "payment" | "refund";
  amountMinor: number;
  method: string;
  reference: string;
  at: string;
  userId: string;
};
export type IndustryRecord = {
  id: string;
  business_id: string;
  industry_id: string;
  workflow_id: string;
  revision: number;
  title: string;
  customer: string;
  status: string;
  fields: Record<string, string>;
  amount_minor: number;
  paid_minor: number;
  payments: IndustryPayment[];
  history: { action: string; at: string; userId: string; status: string }[];
  archived: boolean;
  created_at: string;
  updated_at: string;
};
