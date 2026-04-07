import Anthropic from "@anthropic-ai/sdk"

const RETRYABLE_STATUSES = [529, 503]
const BACKOFF_MS = [1000, 2000, 4000] // 3 retries: 1s, 2s, 4s

/**
 * Wraps an Anthropic API call with exponential backoff retry logic.
 * Retries only on 529 (overloaded) and 503 (service unavailable).
 * Throws "AI_OVERLOADED" on final failure from a retryable status so
 * callers can surface a user-friendly message.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  label = "ai"
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const status = err instanceof Anthropic.APIError ? err.status : null
      const retryable = status !== null && RETRYABLE_STATUSES.includes(status)

      if (!retryable || attempt === BACKOFF_MS.length) break

      const delay = BACKOFF_MS[attempt]
      console.warn(
        `[${label}] attempt ${attempt + 1} failed with ${status} — retrying in ${delay}ms`
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // Surface a typed error for overloaded/unavailable so routes can return 503
  const finalStatus =
    lastError instanceof Anthropic.APIError ? lastError.status : null
  if (finalStatus && RETRYABLE_STATUSES.includes(finalStatus)) {
    throw new Error("AI_OVERLOADED")
  }

  throw lastError
}
