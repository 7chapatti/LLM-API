function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function isRetryable(error) {
  const status = error?.status ?? error?.response?.status;
  return error?.name === 'APIConnectionTimeoutError' || error?.code === 'ETIMEDOUT' || status === 429 || (status >= 500 && status < 600);
}

function retryAfterMs(error) {
  const value = error?.headers?.['retry-after'] ?? error?.response?.headers?.['retry-after'];
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const dateMs = Date.parse(value);
  return Number.isNaN(dateMs) ? null : Math.max(0, dateMs - Date.now());
}

async function withRetry(operation, { maxAttempts = 3 } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try { return await operation(); }
    catch (error) {
      if (attempt >= maxAttempts || !isRetryable(error)) throw error;
      const waitMs = retryAfterMs(error) ?? (1000 * 2 ** (attempt - 1) + Math.random() * 250);
      await sleep(waitMs);
    }
  }
}
module.exports = { withRetry, isRetryable };
