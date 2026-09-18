'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search, ListFilter, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderIcon } from '@/lib/render-icon';
import { SharedSpaceMember, SharedCategory, SharedTag } from '@/lib/types';

export type SharedFilters = {
  paidBy: string[];
  categories: string[];
  tags: string[];
  searchQuery: string;
};

export const DEFAULT_SHARED_FILTERS: SharedFilters = { paidBy: [], categories: [], tags: [], searchQuery: '' };

interface SharedExpensesFiltersProps {
  filters: SharedFilters;
  onFiltersChange: (filters: SharedFilters) => void;
  members: SharedSpaceMember[];
  categories: SharedCategory[];
  tags: SharedTag[];
  currentUid?: string;
}

export function SharedExpensesFilters({ filters, onFiltersChange, members, categories, tags, currentUid }: SharedExpensesFiltersProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const togglePaidBy = (uid: string) => {
    const next = filters.paidBy.includes(uid) ? filters.paidBy.filter((id) => id !== uid) : [...filters.paidBy, uid];
    onFiltersChange({ ...filters, paidBy: next });
  };

  const toggleInArray = (field: 'categories' | 'tags', id: string) => {
    const current = filters[field];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onFiltersChange({ ...filters, [field]: next });
  };

  const activeFilterCount = useMemo(
    () => filters.paidBy.length + filters.categories.length + filters.tags.length,
    [filters]
  );

  const clearFilters = () => onFiltersChange(DEFAULT_SHARED_FILTERS);

  const memberName = (uid: string) => (uid === currentUid ? 'You' : members.find((m) => m.uid === uid)?.displayName || 'Member');
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || 'Category';
  const tagName = (id: string) => tags.find((t) => t.id === id)?.name || 'Tag';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shared expenses..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 gap-2 rounded-xl shrink-0">
              <ListFilter className="h-4 w-4" />
              {activeFilterCount > 0 && <Badge variant="secondary" className="h-5 px-1.5">{activeFilterCount}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-4" align="end">
            {members.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Paid By</Label>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <button
                      key={m.uid}
                      type="button"
                      onClick={() => togglePaidBy(m.uid)}
                      className={cn(
                        'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                        filters.paidBy.includes(m.uid)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-transparent border-input hover:bg-muted'
                      )}
                    >
                      {m.uid === currentUid ? 'You' : m.displayName || 'Member'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {categories.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Category</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <Checkbox id={`shared-filter-cat-${c.id}`} checked={filters.categories.includes(c.id)} onCheckedChange={() => toggleInArray('categories', c.id)} />
                      <Label htmlFor={`shared-filter-cat-${c.id}`} className="text-sm font-normal flex items-center gap-2">
                        {renderIcon(c.icon, 'h-3.5 w-3.5')} {c.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Tag</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {tags.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <Checkbox id={`shared-filter-tag-${t.id}`} checked={filters.tags.includes(t.id)} onCheckedChange={() => toggleInArray('tags', t.id)} />
                      <Label htmlFor={`shared-filter-tag-${t.id}`} className="text-sm font-normal flex items-center gap-2">
                        {renderIcon(t.icon, 'h-3.5 w-3.5')} {t.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="w-full gap-2" onClick={clearFilters}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset All
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {filters.paidBy.map((uid) => (
            <Badge key={`paidby-${uid}`} variant="secondary" className="gap-1 shrink-0">
              {memberName(uid)}
              <button type="button" onClick={() => togglePaidBy(uid)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {filters.categories.map((id) => (
            <Badge key={`cat-${id}`} variant="secondary" className="gap-1 shrink-0">
              {categoryName(id)}
              <button type="button" onClick={() => toggleInArray('categories', id)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {filters.tags.map((id) => (
            <Badge key={`tag-${id}`} variant="secondary" className="gap-1 shrink-0">
              {tagName(id)}
              <button type="button" onClick={() => toggleInArray('tags', id)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
