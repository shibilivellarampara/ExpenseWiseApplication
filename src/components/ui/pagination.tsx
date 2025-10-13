
'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface PaginationProps {
    onLoadMore: () => void;
    isLoading: boolean;
    hasMore: boolean;
}

export function Pagination({ onLoadMore, isLoading, hasMore }: PaginationProps) {
    if (!hasMore) {
        return (
            <div className="text-center text-muted-foreground text-sm py-8">
                You've reached the end of the list.
            </div>
        );
    }
    
    return (
        <div className="flex justify-center py-4">
            <Button
                onClick={onLoadMore}
                disabled={isLoading}
                variant="outline"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                    </>
                ) : "Load More"}
            </Button>
        </div>
    );
}

