
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share, PlusSquare, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import Image from 'next/image';

const IOSInstallInstructions = () => (
    <div className="space-y-4 text-center">
        <DialogHeader>
            <DialogTitle>Install on iOS</DialogTitle>
            <DialogDescription>Follow these steps to add ExpenseWise to your Home Screen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 p-4">
             <div className="flex flex-col items-center gap-2">
                <p className="font-medium">1. Tap the Share button</p>
                 <div className="w-24 h-16 bg-muted rounded-md flex items-center justify-center">
                    <Share className="w-8 h-8 text-primary" />
                </div>
            </div>
             <div className="flex flex-col items-center gap-2">
                <p className="font-medium">2. Tap 'Add to Home Screen'</p>
                 <div className="w-24 h-16 bg-muted rounded-md flex items-center justify-center">
                    <PlusSquare className="w-8 h-8 text-primary" />
                </div>
            </div>
        </div>
    </div>
);


export function A2HSInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (installed)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(standalone);

    if (standalone) return; // Don't show prompt if already installed

    // Detect iOS
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Listen for the beforeinstallprompt event (for Android/Chromium)
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
    } else {
      console.log('User dismissed the A2HS prompt');
    }
    setInstallPrompt(null); // Hide the button after the prompt is shown
  };
  
  // Do not render anything if the app is already installed or if there's no way to prompt
  if (isStandalone || (!installPrompt && !isIOS)) {
    return null;
  }
  
  return (
    <Card className="my-4 bg-muted/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Download className="w-5 h-5 text-primary" />
          Install ExpenseWise App
        </CardTitle>
        <CardDescription>
          For faster access and offline support, add ExpenseWise to your home screen.
        </CardDescription>
      </CardHeader>
      <CardContent>
         {installPrompt && !isIOS && (
          <Button onClick={handleInstallClick} className="w-full">
            Add to Home Screen
          </Button>
        )}
        {isIOS && (
          <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <Info className="mr-2 h-4 w-4" />
                    How to Install on iOS
                </Button>
            </DialogTrigger>
            <DialogContent>
                <IOSInstallInstructions />
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
