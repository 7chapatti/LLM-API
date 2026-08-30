function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err) {
  const status = err?.status ?? err?.response?.status;
  if (err?.name === 'APIConnectionTimeoutError' || err?.code === 'ETIMEDOUT') return true;
  if (status === 429) return true;
  if (typeof status === 'number' && status >= 500 && status < 600) return true;
  return false;
}

function retryAfterMs(err) {
  const header = err?.headers?.['retry-after'] ?? err?.response?.headers?.['retry-after'];
  if (!header) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds * 1000 : null;
}

async function withRetry(fn, { maxAttempts = 3 } = {}) {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (err) {
      if (attempt >= maxAttempts || !isRetryable(err)) throw err;

      const obeyed = retryAfterMs(err);
      const waitMs = obeyed ?? (1000 * 2 ** (attempt - 1) + Math.random() * 250); // 1s, 2s, 4s + jitter

      console.log(`retryable error on attempt ${attempt}, waiting ${Math.round(waitMs)}ms`);
      await sleep(waitMs);
    }
  }
}

module.exports = { withRetry, isRetryable };
