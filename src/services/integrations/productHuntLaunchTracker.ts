// AXXESS Launch tracker: the live Product Hunt numbers for Triaxis's own listing, shown only to the
// platform operator through /api/admin/pilot-portfolio. Same not-configured/ok/error shape as
// sentryProjectHealth.ts: check the token before any network call, never fabricate a number.
//
// Fields come from Product Hunt's published schema (github.com/producthunt/producthunt-api,
// schema.graphql, read 2026-11-07), which has no daily or weekly rank on Post. Not yet checked
// against a live response, because no token was available while building this.

const PRODUCT_HUNT_GRAPHQL_URL = "https://api.producthunt.com/v2/api/graphql";
const DEFAULT_POST_SLUG = "axxess-triaxis";
const REQUEST_TIMEOUT_MS = 10_000;

const LAUNCH_QUERY = `query AxxessLaunch($slug: String!) {
  post(slug: $slug) { name votesCount commentsCount reviewsRating featuredAt }
}`;

export type ProductHuntLaunchHealthResult =
  | { status: "not-configured"; provider: "none" }
  | { status: "ok"; provider: "product-hunt"; post: string; votes: number; comments: number; reviewsRating: number; featuredOn: string }
  | { status: "error"; provider: "product-hunt"; error: string };

type LaunchResponse = {
  data?: {
    post?: {
      name: string;
      votesCount: number;
      commentsCount: number;
      reviewsRating: number;
      featuredAt: string | null;
    } | null;
  };
  errors?: Array<{ message?: string }>;
};

function failure(error: string): ProductHuntLaunchHealthResult {
  console.error("[productHuntLaunchTracker] request failed", { error });
  return { status: "error", provider: "product-hunt", error };
}

export async function fetchProductHuntLaunchHealth(): Promise<ProductHuntLaunchHealthResult> {
  const token = process.env.PRODUCT_HUNT_DEVELOPER_TOKEN;
  if (!token) return { status: "not-configured", provider: "none" };
  const slug = process.env.PRODUCT_HUNT_POST_SLUG || DEFAULT_POST_SLUG;

  try {
    const response = await fetch(PRODUCT_HUNT_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: LAUNCH_QUERY, variables: { slug } }),
      cache: "no-store",
      // This runs beside the other health checks on one request, so a slow API must not hold them up.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return failure(`Product Hunt request failed with ${response.status}`);

    const payload = await response.json() as LaunchResponse;
    if (payload.errors?.length) {
      return failure(`Product Hunt returned an error: ${payload.errors[0]?.message ?? "unknown"}`);
    }
    const post = payload.data?.post;
    if (!post) return failure(`No Product Hunt post found for slug "${slug}"`);

    return {
      status: "ok",
      provider: "product-hunt",
      post: post.name,
      votes: post.votesCount,
      comments: post.commentsCount,
      reviewsRating: post.reviewsRating,
      featuredOn: post.featuredAt ? post.featuredAt.slice(0, 10) : "not featured",
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Unknown error");
  }
}
