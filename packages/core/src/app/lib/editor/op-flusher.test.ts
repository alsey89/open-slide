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

test('on flush error, reports error and keeps ops for retry', async () => {
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
  // next enqueue retries the kept batch + new op
  flush.mockImplementationOnce(async () => {});
  f.enqueue([{ kind: 'set-deck-title', title: 'b' }]);
  await vi.advanceTimersByTimeAsync(100);
  expect(flush).toHaveBeenCalledTimes(2);
  expect(flush.mock.calls[1][0]).toHaveLength(2);
  expect(states.at(-1)).toBe('idle');
});

test('dispose stops pending flush', async () => {
  const flush = vi.fn(async () => {});
  const f = createOpFlusher({ flush, onState: () => {}, delayMs: 200 });
  f.enqueue([{ kind: 'set-deck-title', title: 'a' }]);
  f.dispose();
  await vi.advanceTimersByTimeAsync(500);
  expect(flush).not.toHaveBeenCalled();
});
