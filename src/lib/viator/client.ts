import type { ActivityProduct, ActivitySearchRequest, ActivitySearchResponse } from "@/types/activities";

const VIATOR_ACCEPT = "application/json;version=2.0";
const DEFAULT_LANGUAGE = "en-US";
const DEFAULT_CURRENCY = "GBP";
const VIATOR_TIMEOUT_MS = 10_000;
const VIATOR_TIMEOUT_RETRIES = 10;
const VIATOR_RATE_LIMIT_RETRIES = 10;
const VIATOR_RETRY_BASE_DELAY_MS = 300;
const VIATOR_RATE_LIMIT_BASE_DELAY_MS = 1_000;
const VIATOR_RETRY_MAX_DELAY_MS = 30_000;

type ViatorEnvironment = "sandbox" | "production";

function getViatorEnvironment(): ViatorEnvironment {
  return process.env.VIATOR_ENV === "production" ? "production" : "sandbox";
}

function getViatorBaseUrl(): string {
  const configured = process.env.VIATOR_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  return getViatorEnvironment() === "production"
    ? "https://api.viator.com/partner"
    : "https://api.sandbox.viator.com/partner";
}

function getViatorApiKey(): string {
  const env = getViatorEnvironment();
  const key =
    env === "production"
      ? process.env.VIATOR_PRODUCTION_API_KEY || process.env.VIATOR_API_KEY
      : process.env.VIATOR_SANDBOX_API_KEY || process.env.VIATOR_API_KEY;

  if (!key?.trim()) {
    throw new Error("Missing Viator API key. Set VIATOR_SANDBOX_API_KEY or VIATOR_PRODUCTION_API_KEY.");
  }

  return key
    .trim()
    .replace(/^sandbox:/i, "")
    .replace(/^production\s+key:/i, "")
    .trim();
}

function timeoutRetryCount(): number {
  const configured = Number(process.env.VIATOR_TIMEOUT_RETRIES);
  if (Number.isFinite(configured) && configured >= 0) return Math.min(10, Math.floor(configured));
  return VIATOR_TIMEOUT_RETRIES;
}

function rateLimitRetryCount(): number {
  const configured = Number(process.env.VIATOR_RATE_LIMIT_RETRIES);
  if (Number.isFinite(configured) && configured >= 0) return Math.min(10, Math.floor(configured));
  return VIATOR_RATE_LIMIT_RETRIES;
}

function retryDelayMs(attemptIndex: number, baseDelayMs = VIATOR_RETRY_BASE_DELAY_MS): number {
  const exponential = baseDelayMs * 2 ** Math.max(0, attemptIndex - 1);
  const jitter = Math.floor(Math.random() * 150);
  return Math.min(VIATOR_RETRY_MAX_DELAY_MS, exponential + jitter);
}

function retryAfterDelayMs(response: Response, attemptIndex: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(VIATOR_RETRY_MAX_DELAY_MS, seconds * 1000);
    const dateMs = Date.parse(retryAfter);
    if (Number.isFinite(dateMs)) return Math.min(VIATOR_RETRY_MAX_DELAY_MS, Math.max(0, dateMs - Date.now()));
  }
  return retryDelayMs(attemptIndex, VIATOR_RATE_LIMIT_BASE_DELAY_MS);
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || /timed?\s*out|aborted/i.test(error.message));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function viatorFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const maxTimeoutRetries = init.signal ? 0 : timeoutRetryCount();
  const maxRateLimitRetries = init.signal ? 0 : rateLimitRetryCount();
  let lastTimeoutError: unknown;
  let rateLimitAttempts = 0;

  for (let attempt = 0; attempt <= maxTimeoutRetries + maxRateLimitRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VIATOR_TIMEOUT_MS);

    try {
      const response = await fetch(`${getViatorBaseUrl()}${path}`, {
        ...init,
        signal: init.signal || controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: VIATOR_ACCEPT,
          "Accept-Language": process.env.VIATOR_ACCEPT_LANGUAGE || DEFAULT_LANGUAGE,
          "exp-api-key": getViatorApiKey(),
          ...(init.headers || {}),
        },
      });

      if (response.status === 429 && rateLimitAttempts < maxRateLimitRetries) {
        rateLimitAttempts += 1;
        clearTimeout(timeout);
        await delay(retryAfterDelayMs(response, rateLimitAttempts));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          `Viator request failed: ${response.status} ${response.statusText}${
            errorBody ? ` ${JSON.stringify(errorBody)}` : ""
          }`
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (!isTimeoutError(error) || attempt >= maxTimeoutRetries) throw error;
      lastTimeoutError = error;
      await delay(retryDelayMs(attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastTimeoutError instanceof Error ? lastTimeoutError : new Error("Viator request timed out.");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getImageUrl(product: Record<string, unknown>): string | undefined {
  const images = Array.isArray(product.images) ? product.images : [];
  const first = asRecord(images[0]);
  const variants = Array.isArray(first.variants) ? first.variants : [];
  const variant = variants
    .map(asRecord)
    .sort((a, b) => Number(b.width || 0) - Number(a.width || 0))[0];
  return String(variant?.url || first.url || "").trim() || undefined;
}

function getDuration(product: Record<string, unknown>): string | undefined {
  const duration = asRecord(product.duration);
  const fixed = Number(duration.fixedDurationInMinutes || duration.fixedValueInMinutes || 0);
  const from = Number(duration.variableDurationFromMinutes || duration.fromMinutes || 0);
  const to = Number(duration.variableDurationToMinutes || duration.toMinutes || 0);

  const formatMinutes = (minutes: number) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours && mins) return `${hours}h ${mins}m`;
    if (hours) return `${hours}h`;
    return `${mins}m`;
  };

  if (fixed) return formatMinutes(fixed);
  if (from && to) return `${formatMinutes(from)} - ${formatMinutes(to)}`;
  if (from) return `From ${formatMinutes(from)}`;
  return undefined;
}

function isFutureOrTodayDate(value: string | undefined): value is string {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return date.getTime() >= todayUtc;
}

function mapProduct(product: unknown): ActivityProduct | null {
  const row = asRecord(product);
  const productCode = String(row.productCode || row.code || "").trim();
  const title = String(row.title || "").trim();
  if (!productCode || !title) return null;

  const pricing = asRecord(row.pricing);
  const summary = asRecord(pricing.summary);
  const fromPrice = Number(summary.fromPrice || summary.fromPriceBeforeDiscount || 0);
  const reviews = asRecord(row.reviews);
  const combinedAverageRating = Number(reviews.combinedAverageRating || reviews.averageRating || 0);
  const totalReviews = Number(reviews.totalReviews || reviews.combinedTotalReviews || 0);

  return {
    productCode,
    title,
    description: String(row.description || row.shortDescription || "").trim() || undefined,
    imageUrl: getImageUrl(row),
    duration: getDuration(row),
    rating: Number.isFinite(combinedAverageRating) && combinedAverageRating > 0 ? combinedAverageRating : undefined,
    reviewCount: Number.isFinite(totalReviews) && totalReviews > 0 ? totalReviews : undefined,
    price: Number.isFinite(fromPrice) && fromPrice > 0 ? fromPrice : undefined,
    currency: String(summary.currency || pricing.currency || "").trim() || undefined,
    flags: Array.isArray(row.flags) ? row.flags.map(String) : [],
    webUrl: String(row.productUrl || row.webURL || row.webUrl || "").trim() || undefined,
  };
}

async function findDestinationId(destinationName: string): Promise<string | undefined> {
  const response = await viatorFetch<{ destinations?: unknown[] }>("/destinations");
  const normalized = destinationName.trim().toLowerCase();
  const destinations = Array.isArray(response.destinations) ? response.destinations.map(asRecord) : [];

  const exact = destinations.find((destination) => {
    const name = String(destination.destinationName || destination.name || "").trim().toLowerCase();
    return name === normalized;
  });
  const fuzzy =
    exact ||
    destinations.find((destination) => {
      const name = String(destination.destinationName || destination.name || "").trim().toLowerCase();
      return Boolean(name) && (normalized.includes(name) || name.includes(normalized));
    });

  return fuzzy ? String(fuzzy.destinationId || fuzzy.id || "").trim() || undefined : undefined;
}

export async function searchViatorActivities(input: ActivitySearchRequest): Promise<ActivitySearchResponse> {
  const currency = (input.currency || DEFAULT_CURRENCY).toUpperCase();
  const destinationId = input.destinationId || (await findDestinationId(input.destinationName));
  const count = Math.max(1, Math.min(24, Number(input.count || 12)));

  const filtering: Record<string, unknown> = {
    includeAutomaticTranslations: true,
    confirmationType: "INSTANT",
  };
  if (destinationId) filtering.destination = destinationId;
  const hasUsableDateRange =
    isFutureOrTodayDate(input.startDate) &&
    isFutureOrTodayDate(input.endDate) &&
    new Date(`${input.endDate}T00:00:00Z`).getTime() >= new Date(`${input.startDate}T00:00:00Z`).getTime();

  if (hasUsableDateRange) {
    filtering.startDate = input.startDate;
    filtering.endDate = input.endDate;
  }

  const buildBody = (nextFiltering: Record<string, unknown>) => ({
    filtering: nextFiltering,
    sorting: { sort: "TRAVELER_RATING", order: "DESCENDING" },
    pagination: { start: 1, count },
    currency,
  });

  const searchProducts = (nextFiltering: Record<string, unknown>) => viatorFetch<{ products?: unknown[]; totalCount?: number }>("/products/search", {
    method: "POST",
    body: JSON.stringify(buildBody(nextFiltering)),
  });

  const response = await searchProducts(filtering);

  const products = (Array.isArray(response.products) ? response.products : []).map(mapProduct).filter(Boolean) as ActivityProduct[];

  return {
    destinationId,
    destinationName: input.destinationName,
    products,
    rawCount: response.totalCount,
  };
}

export async function getViatorProduct(productCode: string): Promise<ActivityProduct | null> {
  const product = await viatorFetch<unknown>(`/products/${encodeURIComponent(productCode)}`);
  return mapProduct(product);
}
