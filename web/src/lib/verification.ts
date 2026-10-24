import { z } from "zod";

export const verificationVersion = "2026-10-24";
export const verificationProfile = z
  .object({
    legalName: z.string().trim().max(200),
    tradingName: z.string().trim().max(200),
    contactName: z.string().trim().max(200),
    phone: z.string().trim().max(40),
    email: z
      .string()
      .trim()
      .max(200)
      .refine(
        (v) => !v || z.email().safeParse(v).success,
        "Enter a valid email address.",
      ),
    country: z.literal("KE"),
    businessType: z.string().trim().max(100),
    businessAddress: z.string().trim().max(400),
    registrationStatus: z.enum(["registered", "unregistered", "in_progress"]),
    registrationNumber: z.string().trim().max(100),
    yearsTrading: z.number().int().min(0).max(100),
    employees: z.number().int().min(1).max(100000),
    revenueBand: z.enum([
      "prefer_not_to_say",
      "under_50000",
      "50000_250000",
      "250000_1000000",
      "over_1000000",
    ]),
    tools: z
      .array(
        z.enum([
          "Sales",
          "Stock",
          "Customers",
          "Suppliers",
          "Reports",
          "Funding",
        ]),
      )
      .max(6),
    declaration: z.boolean(),
  })
  .strict();
export type VerificationProfile = z.infer<typeof verificationProfile>;
export type VerificationRecord = {
  status: "draft" | "submitted";
  profile: VerificationProfile;
  consent_version: string | null;
  consented_at: string | null;
  updated_at: string;
};
export const emptyVerification = (
  initial: Partial<VerificationProfile> = {},
): VerificationProfile => ({
  legalName: "",
  tradingName: "",
  contactName: "",
  phone: "",
  email: "",
  country: "KE",
  businessType: "Retail shop",
  businessAddress: "",
  registrationStatus: "unregistered",
  registrationNumber: "",
  yearsTrading: 0,
  employees: 1,
  revenueBand: "prefer_not_to_say",
  tools: ["Sales", "Stock"],
  declaration: false,
  ...initial,
});
export function verificationMissing(profile: VerificationProfile) {
  const missing: string[] = [];
  for (const [key, label] of [
    ["legalName", "Legal business or owner name"],
    ["tradingName", "Business name"],
    ["contactName", "Owner contact name"],
    ["phone", "Contact phone"],
    ["email", "Contact email"],
    ["businessType", "Business type"],
    ["businessAddress", "Business address"],
  ] as const)
    if (!profile[key].trim()) missing.push(label);
  if (
    profile.registrationStatus === "registered" &&
    !profile.registrationNumber.trim()
  )
    missing.push("Business registration number");
  if (
    profile.phone &&
    (!/^\+?[\d\s().-]{7,30}$/.test(profile.phone) ||
      profile.phone.replace(/\D/g, "").length < 7 ||
      profile.phone.replace(/\D/g, "").length > 15)
  )
    missing.push("Valid contact phone");
  if (!profile.declaration) missing.push("Owner declaration");
  return missing;
}
export const africanMarkets = [
  "Algeria",
  "Angola",
  "Benin",
  "Botswana",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cameroon",
  "Central African Republic",
  "Chad",
  "Comoros",
  "Congo",
  "Côte d’Ivoire",
  "Democratic Republic of the Congo",
  "Djibouti",
  "Egypt",
  "Equatorial Guinea",
  "Eritrea",
  "Eswatini",
  "Ethiopia",
  "Gabon",
  "Gambia",
  "Ghana",
  "Guinea",
  "Guinea-Bissau",
  "Lesotho",
  "Liberia",
  "Libya",
  "Madagascar",
  "Malawi",
  "Mali",
  "Mauritania",
  "Mauritius",
  "Morocco",
  "Mozambique",
  "Namibia",
  "Niger",
  "Nigeria",
  "Rwanda",
  "São Tomé and Príncipe",
  "Senegal",
  "Seychelles",
  "Sierra Leone",
  "Somalia",
  "South Africa",
  "South Sudan",
  "Sudan",
  "Tanzania",
  "Togo",
  "Tunisia",
  "Uganda",
  "Zambia",
  "Zimbabwe",
];
