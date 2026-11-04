// Refuses to run the cross-product end-to-end test against anything but staging. The test
// creates tasks and starts conversations, so a production value here would do real work.

export const STAGING_AXXESS_HOST = "staging.triaxisventures.com";

export type StackConfig = {
  axxessUrl: string;
  busArn: string;
  adapterFailureQueueUrl: string;
  callismaticFunction: string;
  omnidamusFunction: string;
  omnidamusSmsTopicArn: string;
};

const ENV_NAMES: Record<keyof StackConfig, string> = {
  axxessUrl: "STACK_AXXESS_URL",
  busArn: "STACK_BUS_ARN",
  adapterFailureQueueUrl: "STACK_ADAPTER_FAILURE_QUEUE_URL",
  callismaticFunction: "STACK_CALLISMATIC_FUNCTION",
  omnidamusFunction: "STACK_OMNIDAMUS_FUNCTION",
  omnidamusSmsTopicArn: "STACK_OMNIDAMUS_SMS_TOPIC_ARN",
};

export function assertStaging(config: StackConfig): void {
  const problems: string[] = [];
  let host = "";
  try {
    host = new URL(config.axxessUrl).host;
  } catch {
    problems.push("the AXXESS URL is not a URL");
  }
  if (host && host !== STAGING_AXXESS_HOST) problems.push(`the AXXESS host is ${host}`);
  if (!config.busArn.endsWith(":event-bus/still-staging")) problems.push("the bus is not still-staging");
  if (!config.adapterFailureQueueUrl.includes("/still-staging-")) problems.push("the failure queue is not in still-staging");
  if (!config.callismaticFunction.startsWith("callismatic-staging-")) problems.push("the Callismatic function is not in callismatic-staging");
  if (!config.omnidamusFunction.startsWith("omnidamus-staging-")) problems.push("the Omnidamus function is not in omnidamus-staging");
  if (!/:omnidamus-staging-[^:]+$/.test(config.omnidamusSmsTopicArn)) problems.push("the SMS topic is not in omnidamus-staging");
  if (problems.length) throw new Error(`Refusing to run outside staging: ${problems.join("; ")}`);
}

export function loadStackConfig(env: Record<string, string | undefined> = process.env): StackConfig {
  const config = {} as StackConfig;
  const missing: string[] = [];
  for (const [field, name] of Object.entries(ENV_NAMES) as [keyof StackConfig, string][]) {
    const value = env[name]?.trim();
    if (value) config[field] = value;
    else missing.push(name);
  }
  if (missing.length) throw new Error(`Missing ${missing.join(", ")}`);
  assertStaging(config);
  return config;
}

// The address alone is not enough: a domain connected to Production answers on the staging host
// while its code points at the production database.
export const STAGING_SUPABASE_REF = "qpbeoslikcosfytwuguf";
export const PRODUCTION_SUPABASE_REF = "vnliomnfabaicvvvfwia";

export function assertStagingBundle(scripts: string[]): void {
  if (scripts.some((script) => script.includes(PRODUCTION_SUPABASE_REF))) {
    throw new Error("Refusing to run outside staging: the site's code points at the production Supabase project");
  }
  if (!scripts.some((script) => script.includes(STAGING_SUPABASE_REF))) {
    throw new Error("Refusing to run outside staging: the site's code does not point at the staging Supabase project");
  }
}
