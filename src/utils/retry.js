export async function retry(operation, { retries = 3, baseDelayMs = 1000, shouldRetry = () => true, onRetry = () => {} } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try { return await operation(attempt); } catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error)) break;
      const delay = baseDelayMs * 2 ** attempt;
      onRetry(error, attempt + 1, delay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
