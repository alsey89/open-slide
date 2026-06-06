import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { EditOp } from '../../../doc/ops.ts';
import { createOpFlusher } from './op-flusher.ts';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('batches enqueued ops and flushes once after the delay', async () => {
  const flush = vi.fn<(ops: EditOp[]) => Promise<void>>(async () => {});
  const states: string[] = [];
  const f = createOpFlusher({ flush, onState: (s) => states.push(s), delayMs: 400 });
  f.enqueue([{ kind: 'set-deck-title', title: 'a' }]);
  f.enqueue([{ kind: 'set-deck-title', title: 'b' }]);
  expect(flush).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(400);
  expect(flush).toHaveBeenCalledOnce();
  expect(flush.mock.calls[0][0]).toHaveLength(2);
  expect(states).toContain('saving');
  expect(states.at(-1)).toBe('idle');
});

test('on flush error, automatically retries after backoff without a new enqueue', async () => {
  const flush = vi.fn<(ops: EditOp[]) => Promise<void>>(async () => {
    throw new Error('boom');
  });
  const states: string[] = [];
  let lastErr = '';
  const f = createOpFlusher({
    flush,
    onState: (s, e) => {
      states.push(s);
      if (e) lastErr = e;
    },
    delayMs: 100,
  });

  f.enqueue([{ kind: 'set-deck-title', title: 'a' }]);
  await vi.advanceTimersByTimeAsync(100);
  expect(states.at(-1)).toBe('error');
  expect(lastErr).toBe('boom');
  expect(flush).toHaveBeenCalledOnce();

  // Make the 2nd attempt succeed — no new enqueue needed
  flush.mockImplementationOnce(async () => {});

  // Backoff after failures=1 is min(100 * 2^1, 5000) = 200ms
  await vi.advanceTimersByTimeAsync(200);
  expect(flush).toHaveBeenCalledTimes(2);
  expect(flush.mock.calls[1][0]).toHaveLength(1);
  expect(states.at(-1)).toBe('idle');
});

test('flushNow() triggers an immediate flush before the debounce elapses', async () => {
  const flush = vi.fn<(ops: EditOp[]) => Promise<void>>(async () => {});
  const f = createOpFlusher({ flush, onState: () => {}, delayMs: 400 });
  f.enqueue([{ kind: 'set-deck-title', title: 'a' }]);
  expect(flush).not.toHaveBeenCalled();

  f.flushNow();
  await vi.advanceTimersByTimeAsync(0);
  expect(flush).toHaveBeenCalledOnce();
});

test('dispose stops pending flush and does not auto-flush', async () => {
  const flush = vi.fn(async () => {});
  const f = createOpFlusher({ flush, onState: () => {}, delayMs: 200 });
  f.enqueue([{ kind: 'set-deck-title', title: 'a' }]);
  f.dispose();
  await vi.advanceTimersByTimeAsync(500);
  expect(flush).not.toHaveBeenCalled();
});

test('backoff resets after a success — second failure cycle also retries', async () => {
  let callCount = 0;
  const flush = vi.fn<(ops: EditOp[]) => Promise<void>>(async () => {
    callCount += 1;
    // fail on calls 1 and 3, succeed on 2 and 4
    if (callCount === 1 || callCount === 3) throw new Error('transient');
  });
  const f = createOpFlusher({ flush, onState: () => {}, delayMs: 100 });

  // First failure → success cycle
  f.enqueue([{ kind: 'set-deck-title', title: 'a' }]);
  await vi.advanceTimersByTimeAsync(100); // triggers call 1 (fail)
  await vi.advanceTimersByTimeAsync(200); // backoff 200ms → call 2 (succeed)
  expect(flush).toHaveBeenCalledTimes(2);

  // Second failure → success cycle — failures should have reset, so backoff is 200ms again
  f.enqueue([{ kind: 'set-deck-title', title: 'b' }]);
  await vi.advanceTimersByTimeAsync(100); // triggers call 3 (fail)
  await vi.advanceTimersByTimeAsync(200); // backoff 200ms → call 4 (succeed)
  expect(flush).toHaveBeenCalledTimes(4);
});
