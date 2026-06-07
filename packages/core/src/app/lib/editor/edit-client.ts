import type { EditOp } from '../../../doc/ops.ts';
import type { DesignSystem } from '../design';

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

export async function postSaveTheme(name: string, design: DesignSystem): Promise<{ id: string }> {
  const res = await fetch('/__themes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, design }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(detail.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as { id: string };
}
