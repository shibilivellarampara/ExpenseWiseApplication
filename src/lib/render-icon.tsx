
'use client';
import * as LucideIcons from 'lucide-react';
import { cn } from './utils';
import React from 'react';

export const renderIcon = (iconName: string | undefined, className?: string) => {
  if (!iconName) return <LucideIcons.Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent ? <IconComponent className={cn("h-4 w-4 text-muted-foreground", className)} /> : <LucideIcons.Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
};
