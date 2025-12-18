
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PageSettingsDialogProps {
  children: React.ReactNode;
  title: string;
  description: string;
  SettingsComponent: React.ComponentType<any>;
}

export function PageSettingsDialog({ children, title, description, SettingsComponent }: PageSettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <SettingsComponent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
