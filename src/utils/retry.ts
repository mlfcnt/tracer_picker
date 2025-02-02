type RetryOptions = {
  maxAttempts?: number;
  delay?: number;
  onRetry?: (attempt: number, error: Error) => void;
};

export const retry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    delay = 1000,
    onRetry = (attempt, error) =>
      console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, error.message),
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) break;

      onRetry(attempt, lastError);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};
