
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeProvider } from 'next-themes';
import Script from 'next/script';
import pkg from '../../package.json';

const appVersion = pkg.version;

export const metadata: Metadata = {
  title: 'ExpenseWise',
  description: 'Manage your expenses with ease.',
  manifest: `/manifest.json?v=${appVersion}`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ExpenseWise',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="ExpenseWise" />
        <link rel="manifest" href={`/manifest.json?v=${appVersion}`} />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <Script src="https://apis.google.com/js/api.js" async defer />
      </head>
      <body className={cn('font-body antialiased min-h-screen select-none')}>
        <ThemeProvider
          attribute="class"
          defaultTheme="fintech"
          enableSystem
          themes={['light', 'dark', 'chat', 'fintech', 'dark-fintech']}
        >
            <FirebaseClientProvider>
              {children}
            </FirebaseClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
