import type { EditOp } from '../../../doc/ops.ts';

export async function postOps(slideId: string, ops: EditOp[]): Promise<void> {
  const res = await fetch(`/__deck/${encodeURIComponent(slideId)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ops }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(detail.error ?? `HTTP ${res.status}`);
  }
}
