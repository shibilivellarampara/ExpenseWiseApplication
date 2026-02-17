
'use client';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

/**
 * A centralized icon renderer to optimize build performance.
 * This avoids namespace imports in large components.
 */
export const renderIcon = (iconName: string | undefined, className?: string) => {
  if (!iconName) return <LucideIcons.Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
  
  // Use specific key access to allow for tree-shaking and better Turbopack performance
  const IconComponent = (LucideIcons as any)[iconName];
  
  return IconComponent ? 
    <IconComponent className={cn("h-4 w-4 text-muted-foreground", className)} /> : 
    <LucideIcons.Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
};
