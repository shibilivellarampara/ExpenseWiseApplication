'use client';

import { Loader2 } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading page...</p>
      </div>
    </div>
  );
}
