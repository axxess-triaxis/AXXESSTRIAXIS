import { getIntegrationHealth } from "../services/integrations/pluginRegistry";

export function useLiveIntegrationHealth() {
  return getIntegrationHealth();
}

