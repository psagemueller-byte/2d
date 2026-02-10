'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function CreateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Create page error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h2 className="text-2xl font-bold">Etwas ist schiefgelaufen</h2>
      <p className="mt-3 text-muted">
        Beim Laden der Seite ist ein Fehler aufgetreten. Bitte versuche es erneut.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Erneut versuchen</Button>
        <Button
          variant="ghost"
          onClick={() => {
            sessionStorage.removeItem('roomvision-create');
            window.location.reload();
          }}
        >
          Zurücksetzen
        </Button>
      </div>
    </div>
  );
}
