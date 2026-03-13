type Logger = (...args: unknown[]) => void;

export function installGlobalErrorGuards(log: Logger): void {
  window.addEventListener('error', (event) => {
    if (!shouldHandleError(event.message, event.error)) return;
    event.preventDefault();
    log('>>', 'window error intercepted', {
      message: event.message,
      error: event.error instanceof Error ? event.error.message : String(event.error ?? '')
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (!shouldHandleError('', event.reason)) return;
    event.preventDefault();
    log('>>', 'unhandled rejection intercepted', {
      reason: event.reason instanceof Error ? event.reason.message : String(event.reason ?? '')
    });
  });
}

function shouldHandleError(message: string, reason: unknown): boolean {
  const combined = `${message} ${reason instanceof Error ? reason.message : String(reason ?? '')}`.toLowerCase();
  return combined.includes('vtt') || combined.includes('collector') || combined.includes('subtitle');
}
