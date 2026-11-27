import { describe, expect, it, vi } from "vitest";
import type { Document } from "../../../domain";
import { buildRagIngestionRecordEnriched, chunkBySentences } from "./enrichedIngestion";
import { buildRagIngestionRecord, chunkInstitutionalText } from "./ingestionPipeline";

const document = {
  id: "doc-1",
  organizationId: "org-1",
  name: "audit.txt",
  title: "Audit closure note",
  description: "Audit observation with management response",
  classification: "internal",
  visibility: "organization",
} as unknown as Document;

const body = "Audit observation for Kamrup district. Management response received from District Hospital. Closure is due 2026-12-01.";

describe("chunkBySentences", () => {
  it("never splits a sentence and respects the word budget", () => {
    const chunks = chunkBySentences(["one two three.", "four five.", "six seven eight nine."], 5);
    expect(chunks).toEqual(["one two three. four five.", "six seven eight nine."]);
  });

  it("keeps an over-long sentence whole", () => {
    expect(chunkBySentences(["a b c d e f g."], 3)).toEqual(["a b c d e f g."]);
  });

  it("falls back to the placeholder when empty", () => {
    expect(chunkBySentences([], 5)).toEqual(chunkInstitutionalText(""));
  });
});

describe("buildRagIngestionRecordEnriched", () => {
  it("matches today's output exactly when OpenNLP returns nothing (flag off)", async () => {
    const result = await buildRagIngestionRecordEnriched(document, body, async () => null);
    expect(result.nlpSource).toBe("local");
    expect(result.record).toEqual(buildRagIngestionRecord(document, body));
    expect(result.chunks).toEqual(chunkInstitutionalText(body));
  });

  it("uses OpenNLP sentences for chunks and adds entity tags", async () => {
    const enrich = vi.fn(async () => ({
      sentences: ["Audit observation for Kamrup district.", "Management response received from District Hospital.", "Closure is due 2026-12-01."],
      tokensCount: 18,
      entities: { people: [], organizations: ["District Hospital"], locations: ["Kamrup"], dates: ["2026-12-01"], money: [] },
      modelVersions: { sentdetect: "test" },
    }));
    const result = await buildRagIngestionRecordEnriched(document, body, enrich);
    expect(enrich).toHaveBeenCalledWith(body);
    expect(result.nlpSource).toBe("opennlp");
    expect(result.chunks).toEqual([body]);
    expect(result.record.chunkCount).toBe(1);
    expect(result.record.tags).toContain("district-hospital");
    expect(result.record.tags).toContain("kamrup");
    expect(result.record.classification).toBe(buildRagIngestionRecord(document, body).classification);
  });
});
