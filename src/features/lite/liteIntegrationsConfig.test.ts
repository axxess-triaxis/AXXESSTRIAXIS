import { describe, expect, it } from "vitest";
import { getConnectorContract } from "../../services/integrations/connectorContract";
import { isLiteAllowedConnectorProvider, liteConnectorProviderIds } from "./liteIntegrationsConfig";

// Lite Settings real-modules pass (2026-08-27): proves the hardcoded Lite connector list stays
// within the doctrine doc's 10-15 hard limit and every id is a real, valid ConnectorProviderId --
// catching a typo or a since-renamed provider id, which a plain hardcoded array can't catch itself.
describe("liteIntegrationsConfig", () => {
  it("stays within the 10-15 connector hard limit from the navigation contract", () => {
    expect(liteConnectorProviderIds.length).toBeGreaterThanOrEqual(10);
    expect(liteConnectorProviderIds.length).toBeLessThanOrEqual(15);
  });

  it("every listed id is a real, currently-valid connector contract", () => {
    for (const id of liteConnectorProviderIds) {
      expect(getConnectorContract(id)).toBeDefined();
    }
  });

  it("correctly narrows to only the Lite-allowed set", () => {
    expect(isLiteAllowedConnectorProvider("gmail")).toBe(true);
    expect(isLiteAllowedConnectorProvider("linear")).toBe(false);
    expect(isLiteAllowedConnectorProvider("salesforce")).toBe(false);
  });
});
