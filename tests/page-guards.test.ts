import { describe, expect, it, vi } from 'vitest';
import { installGlobalErrorGuards } from '../src/lib/page-guards';

describe('installGlobalErrorGuards', () => {
  it('logs matching window errors and prevents default handling', () => {
    const log = vi.fn();
    installGlobalErrorGuards(log);

    const event = new ErrorEvent('error', {
      message: 'vtt collector failed',
      cancelable: true
    });

    window.dispatchEvent(event);

    expect(log).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('logs matching unhandled rejections and prevents default handling', () => {
    const log = vi.fn();
    installGlobalErrorGuards(log);

    const event = new Event('unhandledrejection', { cancelable: true }) as Event & {
      promise: Promise<void>;
      reason: Error;
    };
    event.promise = Promise.resolve();
    event.reason = new Error('collector rejection');

    window.dispatchEvent(event);

    expect(log).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });
});
