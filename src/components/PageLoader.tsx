'use client';

import { AppLoader } from '@/components/AppLoader';

export function PageLoader() {
  return (
    <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
      <AppLoader message="Loading page..." />
    </div>
  );
}
