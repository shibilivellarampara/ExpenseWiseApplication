'use client';

import { useUser } from '@/firebase';
import { Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Logo() {
  const { user } = useUser();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isAppPage = pathname.startsWith('/dashboard') || pathname.startsWith('/expenses') || pathname.startsWith('/contributions') || pathname.startsWith('/import') || pathname.startsWith('/profile');

  // If user is logged in (and not on an auth page), link to dashboard.
  // Otherwise, link to the homepage.
  const href = user && !isAuthPage ? '/dashboard' : '/';
  
  // For the sidebar logo, we always want to go to dashboard.
  const finalHref = isAppPage ? '/dashboard' : href;

  return (
    <Link href={finalHref} className="flex items-center gap-2" prefetch={false}>
      <Wallet className="h-7 w-7 text-primary" />
      <span className="text-xl font-headline font-semibold text-gray-800">ExpenseWise</span>
    </Link>
  );
}
