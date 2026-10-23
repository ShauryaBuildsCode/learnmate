export class RunTimeoutError extends Error {
  constructor(ms: number) {
    super(
      `Your code ran for more than ${ms / 1000} seconds and was stopped. Check for an infinite loop.`,
    );
    this.name = "RunTimeoutError";
  }
}

/** Rejects with RunTimeoutError after `ms`, running `onTimeout` first so callers can kill the work. */
export function withTimeout<T>(work: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new RunTimeoutError(ms));
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export const RUN_TIMEOUT_MS = 5000;
export const MAX_OUTPUT_CHARS = 20000;

export function clip(text: string): string {
  return text.length > MAX_OUTPUT_CHARS
    ? `${text.slice(0, MAX_OUTPUT_CHARS)}\n…output truncated`
    : text;
}
