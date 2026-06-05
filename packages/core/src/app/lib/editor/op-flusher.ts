import type { EditOp } from '../../../doc/ops.ts';

export type FlushState = 'idle' | 'saving' | 'error';

export type Flusher = {
  enqueue: (ops: EditOp[]) => void;
  dispose: () => void;
};

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

  const run = async () => {
    if (inFlight || pending.length === 0 || disposed) return;
    const batch = pending;
    pending = [];
    inFlight = true;
    opts.onState('saving');
    try {
      await opts.flush(batch);
      inFlight = false;
      if (pending.length > 0) schedule();
      else opts.onState('idle');
    } catch (e) {
      // Put the batch back so a later enqueue/flush retries it.
      pending = [...batch, ...pending];
      inFlight = false;
      opts.onState('error', e instanceof Error ? e.message : String(e));
    }
  };

  const schedule = () => {
    if (timer) clr(timer);
    timer = set(() => {
      timer = null;
      void run();
    }, delay);
  };

  return {
    enqueue(ops) {
      if (disposed || ops.length === 0) return;
      pending.push(...ops);
      schedule();
    },
    dispose() {
      disposed = true;
      if (timer) clr(timer);
    },
  };
}
