export const retry = async (
  fn: () => Promise<void>,
  options: {
    maxAttempts: number;
    delay: number;
    onRetry: (attempt: number) => void;
  }
) => {
  const { maxAttempts, delay, onRetry } = options;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      await fn();
      return;
    } catch (error) {
      attempts++;
      if (attempts < maxAttempts) {
        onRetry(attempts);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
};
