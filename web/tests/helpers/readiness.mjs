import assert from "node:assert/strict";

/** Dummy readiness details used only by disposable integration-test businesses. */
export const readinessProfile = {
  legalName: "Temporary test owner",
  tradingName: "Disposable test business",
  contactName: "Temporary test owner",
  phone: "+254700123456",
  email: "owner@example.com",
  country: "KE",
  businessType: "Retail shop",
  businessAddress: "Nairobi",
  registrationStatus: "unregistered",
  registrationNumber: "",
  yearsTrading: 1,
  employees: 1,
  revenueBand: "prefer_not_to_say",
  tools: ["Sales", "Stock", "Funding"],
  declaration: true,
};

/** Complete readiness through the real owner API and reload the access snapshot. */
export async function submitReadiness(base, token, businessId, overrides = {}) {
  const headers = {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  };
  const response = await fetch(
    base + "/api/verification?businessId=" + businessId,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        businessId,
        profile: { ...readinessProfile, ...overrides },
        submit: true,
      }),
    },
  );
  const saved = await response.json();
  assert.equal(response.status, 200, JSON.stringify(saved));
  assert.equal(saved.verification.status, "submitted");
  assert.equal(saved.providerConfigured, false);
  const refreshed = await fetch(
    base + "/api/workspace?businessId=" + businessId,
    { headers },
  );
  const result = await refreshed.json();
  assert.equal(refreshed.status, 200, JSON.stringify(result));
  assert.equal(result.workspace.businessId, businessId);
  assert.equal(result.workspace.access.featuresUnlocked, true);
  assert.equal(result.workspace.access.identityStatus, "provider_pending");
  return result.workspace;
}
