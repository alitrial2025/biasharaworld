import directory from "./industry-catalog/tools.json";
import catalog from "./industry-catalog/workspaces.json";

export type IndustryField = {
  key: string;
  label: string;
  type: "text" | "date" | "datetime" | "count" | "money" | "reference";
  module?: string;
  optional?: boolean;
};
export type IndustryModule = {
  id: string;
  label: string;
  name: string;
  fields: IndustryField[];
  flow: Record<string, string[]>;
};
export type Industry = {
  id: string;
  label: string;
  tools: string[];
  modules: IndustryModule[];
  aliases: string[];
};
export type IndustryRecord = {
  id: string;
  module: string;
  name: string;
  values: Record<string, string | number>;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  code?: string;
};
export const industries: Industry[] = catalog as unknown as Industry[];

export function industryFor(value: string) {
  const key = value.trim().toLowerCase();
  return (
    industries.find((industry) =>
      [industry.id, industry.label, ...industry.aliases].some(
        (label) => label.toLowerCase() === key,
      ),
    ) ?? industries.find((industry) => industry.id === "general")!
  );
}

export function workspaceTools(industry: Industry) {
  return [
    ...new Set([
      ...(industry.modules.length ? ["industry"] : []),
      ...industry.tools,
      "documents",
      "expenses",
      "reports",
    ]),
  ].slice(0, 7);
}

export function workspaceCanUse(
  slug: string,
  industry: Industry,
  role: string,
) {
  return (
    slug !== "industry" ||
    (industry.modules.length > 0 &&
      (["Owner", "Manager"].includes(role) ||
        (industry.id === "entertainment" && role === "Cashier")))
  );
}

export const workspaceDirectory = directory.map(([slug, label, keywords]) => ({
  slug,
  label,
  keywords,
}));
export function workspaceLabel(slug: string) {
  return workspaceDirectory.find((tool) => tool.slug === slug)?.label ?? slug;
}

export function searchWorkspace(
  industry: Industry,
  role: string,
  query: string,
) {
  const term = query.trim().toLowerCase();
  const primary = workspaceTools(industry);
  if (!term)
    return primary
      .filter((slug) => workspaceCanUse(slug, industry, role))
      .map((slug) => ({ slug, label: workspaceLabel(slug) }));
  const modules =
    workspaceCanUse("industry", industry, role) && role !== "Cashier"
      ? industry.modules
          .filter((module) =>
            `${module.label} ${module.name} ${module.fields.map((field) => field.label).join(" ")}`
              .toLowerCase()
              .includes(term),
          )
          .map((module) => ({
            slug: `industry?module=${module.id}`,
            label: module.label,
          }))
      : [];
  return [
    ...modules,
    ...workspaceDirectory.filter(
      (tool) =>
        workspaceCanUse(tool.slug, industry, role) &&
        `${tool.label} ${tool.slug === "industry" ? industry.label : tool.keywords}`
          .toLowerCase()
          .includes(term),
    ),
  ];
}

export function industryActionReference(
  module: string,
  status: string,
  values: IndustryRecord["values"],
) {
  if (
    (status === "Received" &&
      ["rent", "premiums"].includes(module) &&
      !values.payment) ||
    (module === "tickets" && status === "Issued" && Number(values.amount) > 0)
  )
    return "Payment reference";
  if (module === "dispatch" && status === "Delivered" && !values.proof)
    return "Proof of delivery";
  return "";
}

export const ticketBars: Record<string, string> = {
  0: "nnnwwnwnn",
  1: "wnnwnnnnw",
  2: "nnwwnnnnw",
  3: "wnwwnnnnn",
  4: "nnnwwnnnw",
  5: "wnnwwnnnn",
  6: "nnwwwnnnn",
  7: "nnnwnnwnw",
  8: "wnnwnnwnn",
  9: "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  "*": "nwnnwnwnn",
};
