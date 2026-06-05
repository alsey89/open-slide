import { afterEach, expect, test, vi } from 'vitest';
import { postOps } from './edit-client.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

test('POSTs ops to /__deck/:id and resolves on ok', async () => {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await postOps('my-deck', [{ kind: 'set-deck-title', title: 'X' }]);
  expect(fetchMock).toHaveBeenCalledOnce();
  const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  const [url, init] = call;
  expect(url).toBe('/__deck/my-deck');
  expect(JSON.parse(init.body as string)).toEqual({
    ops: [{ kind: 'set-deck-title', title: 'X' }],
  });
});

test('throws with server error message on non-ok', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ ok: false, error: 'slide not found: nope' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;
  await expect(postOps('d', [{ kind: 'remove-slide', slideId: 'nope' }])).rejects.toThrow(
    'slide not found: nope',
  );
});
