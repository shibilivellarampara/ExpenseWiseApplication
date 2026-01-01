
'use client';

import { useUser } from '@/firebase';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export function Logo() {
  const { user } = useUser();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isAppPage = !isAuthPage;

  // If user is logged in (and not on an auth page), link to dashboard.
  // Otherwise, link to the homepage.
  const href = user && !isAppPage ? '/dashboard' : '/';
  
  // For the sidebar logo, we always want to go to dashboard.
  const finalHref = isAppPage ? '/dashboard' : href;

  return (
    <Link href={finalHref} className="flex items-center gap-2" prefetch={false}>
      <Image src="/circlelogo50.png" alt="ExpenseWise Logo" width={28} height={28} className="h-7 w-7" />
      <span className="text-xl font-headline font-semibold text-foreground">ExpenseWise</span>
      {process.env.NODE_ENV === 'development' && (
        <Badge variant="destructive" className="text-xs self-center">dev</Badge>
      )}
    </Link>
  );
}
