import { useMemo } from 'react';
import { createDevHost } from './dev-host.ts';
import { EditorShell } from './editor-shell.tsx';

export function EditorRoot({ slideId }: { slideId: string }) {
  const host = useMemo(() => createDevHost(), []);
  return <EditorShell host={host} deckId={slideId} />;
}
