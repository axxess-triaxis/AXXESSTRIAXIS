// A seeded multi-tenant corpus larger than the golden set. Each vector is a golden embedding plus noise, so
// it clusters the way real text does; uniform random vectors would make every search equally hard and
// unlike anything retrieval sees. Synthetic: it shows how the indexes behave, not answer quality.

import type { BenchmarkRequest, VectorRow } from "./exactSearch";

export type ScaleTenant = { id: string; kind: "large" | "medium" | "small"; documentIds: string[] };
export type ScaleCorpus = { rows: VectorRow[]; tenants: ScaleTenant[] };

// One tenant holds most of the table and several hold almost nothing: the case where filtering after an
// approximate search can run out of candidates.
const TENANT_SHARES = [0.9, 0.05, 0.03, 0.004, 0.004, 0.004, 0.004, 0.004];
const CHUNKS_PER_DOCUMENT = 4;
const NOISE = 0.03;
const REQUESTS_PER_GROUP = 25;
const SHORT_LIST = 3;
const LONG_LIST = 500;
// limit * 10 in tenantRagWorkflow.ts, with the route's limit of 5.
const CANDIDATE_LIMIT = 50;

/** mulberry32: small, seeded, and the same on every platform. */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seededUuid(random: () => number) {
  const hex = Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16));
  hex[12] = "4";
  hex[16] = "8";
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].map((part) => part.join("")).join("-");
}

function perturb(base: ArrayLike<number>, random: () => number) {
  const vector = Array.from(base, (value) => {
    const radius = Math.sqrt(-2 * Math.log(1 - random()));
    return value + NOISE * radius * Math.cos(2 * Math.PI * random());
  });
  const norm = Math.hypot(...vector);
  return Float32Array.from(vector, (value) => value / norm);
}

export function buildScaleCorpus(base: ArrayLike<number>[], size: number, seed: number): ScaleCorpus {
  const random = seededRandom(seed);
  const rows: VectorRow[] = [];
  const tenants: ScaleTenant[] = [];
  TENANT_SHARES.forEach((share, index) => {
    const tenant: ScaleTenant = { id: seededUuid(random), kind: share > 0.5 ? "large" : share > 0.01 ? "medium" : "small", documentIds: [] };
    const others = TENANT_SHARES.slice(1).reduce((sum, value) => sum + Math.round(value * size), 0);
    const count = index === 0 ? size - others : Math.round(share * size);
    for (let chunk = 0; chunk < count; chunk += 1) {
      if (chunk % CHUNKS_PER_DOCUMENT === 0) tenant.documentIds.push(seededUuid(random));
      rows.push({
        id: seededUuid(random),
        organizationId: tenant.id,
        documentId: tenant.documentIds[tenant.documentIds.length - 1],
        vector: perturb(base[Math.floor(random() * base.length)], random),
      });
    }
    tenants.push(tenant);
  });
  return { rows, tenants };
}

/** `probe` lists one document of another tenant, which only the organization filter can keep out. */
export function buildScaleRequests(corpus: ScaleCorpus, queryBase: ArrayLike<number>[], seed: number): BenchmarkRequest[] {
  const random = seededRandom(seed + 1);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const large = corpus.tenants.filter((tenant) => tenant.kind === "large");
  const small = corpus.tenants.filter((tenant) => tenant.kind === "small");
  const groups: Array<[string, ScaleTenant[], number]> = [
    ["large-short", large, SHORT_LIST],
    ["large-long", large, LONG_LIST],
    ["small-short", small, SHORT_LIST],
    ["small-long", small, LONG_LIST],
    ["probe", small, LONG_LIST],
  ];
  return groups.flatMap(([group, tenants, length]) =>
    Array.from({ length: REQUESTS_PER_GROUP }, (_, index) => {
      const tenant = pick(tenants);
      const start = Math.floor(random() * Math.max(1, tenant.documentIds.length - length + 1));
      const documentIds = tenant.documentIds.slice(start, start + length);
      if (group === "probe") documentIds.push(pick(large[0].documentIds));
      return {
        id: `${group}-${index + 1}`,
        group,
        organizationId: tenant.id,
        documentIds,
        vector: Array.from(perturb(pick(queryBase), random)),
        limit: CANDIDATE_LIMIT,
      };
    }));
}
