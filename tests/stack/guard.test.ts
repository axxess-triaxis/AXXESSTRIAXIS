import { describe, expect, it } from "vitest";
import { assertStaging, loadStackConfig, type StackConfig } from "./guard";

const staging: StackConfig = {
  axxessUrl: "https://staging.triaxisventures.com",
  busArn: "arn:aws:events:ap-southeast-2:227214487086:event-bus/still-staging",
  adapterFailureQueueUrl: "https://sqs.ap-southeast-2.amazonaws.com/227214487086/still-staging-AdapterFailureQueue-abc",
  callismaticFunction: "callismatic-staging-AppFunction-abc",
  omnidamusFunction: "omnidamus-staging-OmnidamusFunction-abc",
  omnidamusSmsTopicArn: "arn:aws:sns:us-east-1:227214487086:omnidamus-staging-SmsInboundTopic-abc",
};

describe("assertStaging", () => {
  it("accepts a fully staging configuration", () => {
    expect(() => assertStaging(staging)).not.toThrow();
  });

  it.each<[string, Partial<StackConfig>]>([
    ["landing", { axxessUrl: "https://landing.triaxisventures.com" }],
    ["investor", { axxessUrl: "https://investor.triaxisventures.com" }],
    ["lite", { axxessUrl: "https://lite.triaxisventures.com" }],
    ["a host containing the staging host", { axxessUrl: "https://staging.triaxisventures.com.evil.example" }],
    ["a non-URL", { axxessUrl: "staging" }],
    ["the production bus", { busArn: "arn:aws:events:ap-southeast-2:227214487086:event-bus/still" }],
    ["a production queue", { adapterFailureQueueUrl: "https://sqs.ap-southeast-2.amazonaws.com/227214487086/still-AdapterFailureQueue-abc" }],
    ["the production Callismatic function", { callismaticFunction: "callismatic" }],
    ["a production Omnidamus function", { omnidamusFunction: "omnidamus-OmnidamusFunction-abc" }],
    ["a production SMS topic", { omnidamusSmsTopicArn: "arn:aws:sns:us-east-1:227214487086:omnidamus-SmsInboundTopic-abc" }],
  ])("refuses %s", (_name, override) => {
    expect(() => assertStaging({ ...staging, ...override })).toThrow(/Refusing to run outside staging/);
  });
});

describe("loadStackConfig", () => {
  it("names every missing variable and refuses to guess", () => {
    expect(() => loadStackConfig({})).toThrow(/STACK_AXXESS_URL.*STACK_OMNIDAMUS_SMS_TOPIC_ARN/);
  });

  it("applies the guard to what it loads", () => {
    expect(() =>
      loadStackConfig({
        STACK_AXXESS_URL: "https://landing.triaxisventures.com",
        STACK_BUS_ARN: staging.busArn,
        STACK_ADAPTER_FAILURE_QUEUE_URL: staging.adapterFailureQueueUrl,
        STACK_CALLISMATIC_FUNCTION: staging.callismaticFunction,
        STACK_OMNIDAMUS_FUNCTION: staging.omnidamusFunction,
        STACK_OMNIDAMUS_SMS_TOPIC_ARN: staging.omnidamusSmsTopicArn,
      }),
    ).toThrow(/AXXESS host is landing/);
  });
});
