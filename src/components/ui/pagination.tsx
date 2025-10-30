
'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface PaginationProps {
    onLoadMore: () => void;
    isLoading: boolean;
    hasMore: boolean;
}

export function Pagination({ onLoadMore, isLoading, hasMore }: PaginationProps) {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (isLoading || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onLoadMore();
                }
            },
            {
                rootMargin: '200px', // Pre-load content 200px before it enters the viewport
            }
        );

        observerRef.current = observer;
        const currentSentinel = sentinelRef.current;

        if (currentSentinel) {
            observer.observe(currentSentinel);
        }

        return () => {
            if (currentSentinel) {
                observer.unobserve(currentSentinel);
            }
        };
    }, [isLoading, hasMore, onLoadMore]);

    if (!hasMore && !isLoading) {
        return (
            <div className="text-center text-muted-foreground text-sm py-8">
                You've reached the end of the list.
            </div>
        );
    }
    
    return (
        <div ref={sentinelRef} className="flex justify-center py-8">
             {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading more...</span>
                </div>
            )}
        </div>
    );
}
