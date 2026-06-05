import type { EditOp } from '../../../doc/ops.ts';

export type FlushState = 'idle' | 'saving' | 'error';

export type Flusher = {
  enqueue: (ops: EditOp[]) => void;
  flushNow: () => void;
  dispose: () => void;
};

const MAX_BACKOFF = 5000;

export function createOpFlusher(opts: {
  flush: (ops: EditOp[]) => Promise<void>;
  onState: (state: FlushState, error?: string) => void;
  delayMs?: number;
  setTimer?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (t: ReturnType<typeof setTimeout>) => void;
}): Flusher {
  const delay = opts.delayMs ?? 400;
  const set = opts.setTimer ?? setTimeout;
  const clr = opts.clearTimer ?? clearTimeout;
  let pending: EditOp[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let disposed = false;
  let failures = 0;

  const run = async () => {
    if (inFlight || pending.length === 0 || disposed) return;
    const batch = pending;
    pending = [];
    inFlight = true;
    opts.onState('saving');
    try {
      await opts.flush(batch);
      inFlight = false;
      failures = 0;
      if (pending.length > 0) schedule(delay);
      else opts.onState('idle');
    } catch (e) {
      pending = [...batch, ...pending];
      inFlight = false;
      failures += 1;
      opts.onState('error', e instanceof Error ? e.message : String(e));
      scheduleIn(Math.min(delay * 2 ** failures, MAX_BACKOFF));
    }
  };

  const scheduleIn = (ms: number) => {
    if (timer) clr(timer);
    timer = set(() => {
      timer = null;
      void run();
    }, ms);
  };

  const schedule = (ms: number = delay) => scheduleIn(ms);

  return {
    enqueue(ops) {
      if (disposed || ops.length === 0) return;
      pending.push(...ops);
      schedule();
    },
    flushNow() {
      if (timer) {
        clr(timer);
        timer = null;
      }
      void run();
    },
    // Does NOT flush on dispose — React StrictMode double-invokes effects and
    // auto-flushing here would re-send ops that were already in-flight.
    dispose() {
      disposed = true;
      if (timer) clr(timer);
    },
  };
}
