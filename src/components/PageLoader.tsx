'use client';

import { AppLoader } from '@/components/AppLoader';

export function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <AppLoader />
    </div>
  );
}
