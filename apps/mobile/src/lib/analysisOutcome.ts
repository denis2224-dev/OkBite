export type AnalysisOutcome<T> =
  | { status: 'completed'; result: T }
  | { status: 'pending'; retryAllowed: false; completion: Promise<T> };

// Keep the same request available to the caller; a deadline is not a failure.
export async function waitForAnalysis<T>(completion: Promise<T>): Promise<AnalysisOutcome<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pending = new Promise<AnalysisOutcome<T>>((resolve) => {
    timer = setTimeout(
      () => resolve({ status: 'pending', retryAllowed: false, completion }),
      55000,
    );
  });
  try {
    return await Promise.race([
      completion.then((result) => ({ status: 'completed' as const, result })),
      pending,
    ]);
  } finally {
    clearTimeout(timer);
  }
}
