const SEARCH_URL = "https://api.search.tinyfish.ai";
const FETCH_URL = "https://api.fetch.tinyfish.ai";

export interface TinyFishSearchResult {
  position: number;
  siteName: string;
  title: string;
  snippet: string;
  url: string;
}

export interface TinyFishPage {
  url: string;
  title: string;
  text: string;
}

export type TinyFishFailure = "missing_key" | "auth" | "forbidden" | "rate_limit" | "timeout" | "unavailable";

function failureForStatus(status: number): TinyFishFailure {
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limit";
  return "unavailable";
}

async function tinyFishFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("timeout");
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("timeout");
    }
    throw new Error("unavailable");
  }
}

function readSearchResults(body: unknown): TinyFishSearchResult[] {
  if (!body || typeof body !== "object" || !("results" in body) || !Array.isArray(body.results)) {
    return [];
  }
  const results: TinyFishSearchResult[] = [];
  for (const item of body.results) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.url !== "string" || typeof record.title !== "string") continue;
    let parsed: URL;
    try {
      parsed = new URL(record.url);
    } catch {
      continue;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;
    results.push({
      position: typeof record.position === "number" ? record.position : results.length + 1,
      siteName: typeof record.site_name === "string" ? record.site_name : parsed.hostname,
      title: record.title.trim(),
      snippet: typeof record.snippet === "string" ? record.snippet : "",
      url: parsed.toString(),
    });
  }
  return results;
}

export async function searchTinyFish(query: string): Promise<TinyFishSearchResult[] | TinyFishFailure> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) return "missing_key";

  const url = new URL(SEARCH_URL);
  url.searchParams.set("query", query.slice(0, 300));
  url.searchParams.set("purpose", "Find a trustworthy page listing this packaged food's ingredients and nutrition");
  url.searchParams.set("language", "en");
  url.searchParams.set(
    "exclude_domains",
    "pinterest.com,facebook.com,instagram.com,tiktok.com,youtube.com,quora.com,reddit.com",
  );

  const response = await tinyFishFetch(
    url.toString(),
    { headers: { "X-API-Key": apiKey } },
    15000,
  );
  if (!response.ok) {
    console.error("TinyFish search failed:", response.status);
    return failureForStatus(response.status);
  }
  const body: unknown = await response.json().catch(() => null);
  return readSearchResults(body);
}

export async function fetchTinyFishPage(pageUrl: string): Promise<TinyFishPage | TinyFishFailure> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) return "missing_key";

  const response = await tinyFishFetch(
    FETCH_URL,
    {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls: [pageUrl],
        format: "markdown",
        ttl: 0,
        per_url_timeout_ms: 20000,
        purpose: "Read ingredients and nutrition from a packaged food page to compare with a label photo",
      }),
    },
    25000,
  );
  if (!response.ok) {
    console.error("TinyFish fetch failed:", response.status);
    return failureForStatus(response.status);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!body || typeof body !== "object" || !("results" in body) || !Array.isArray(body.results)) {
    return "unavailable";
  }
  const page = body.results.find(
    (item): item is Record<string, unknown> => !!item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string",
  );
  if (!page || typeof page.text !== "string" || !page.text.trim()) return "unavailable";
  return {
    url: typeof page.url === "string" ? page.url : pageUrl,
    title: typeof page.title === "string" && page.title.trim() ? page.title.trim() : pageUrl,
    text: page.text.slice(0, 12000),
  };
}
