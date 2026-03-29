
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pilcrow, Merge } from 'lucide-react';
import { Category, Tag, Account } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { availableIcons } from '@/lib/defaults';
import * as LucideIcons from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MergeItemsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children?: React.ReactNode;
    items: (Category | Tag | Account)[];
    itemType: 'Category' | 'Tag' | 'Account';
    onMerge: (target: { id: string } | { name: string; icon: string, type?: Account['type'] }) => Promise<void>;
    isSaving: boolean;
}

export function MergeItemsDialog({ open, onOpenChange, children, items, itemType, onMerge, isSaving }: MergeItemsDialogProps) {
    const [mergeOption, setMergeOption] = useState<'existing' | 'new'>('existing');
    const [targetId, setTargetId] = useState<string>(items[0]?.id || '');
    const [newName, setNewName] = useState('');
    const [newIcon, setNewIcon] = useState(itemType === 'Category' ? 'Shapes' : 'Tag');
    const [newAccountType, setNewAccountType] = useState<Account['type']>('bank');


    const renderIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className="h-5 w-5" /> : <Pilcrow className="h-5 w-5" />;
    };

    const handleMergeClick = () => {
        if (mergeOption === 'existing') {
            onMerge({ id: targetId });
        } else {
            if (!newName) return;
             if (itemType === 'Account') {
                onMerge({ name: newName, icon: newIcon, type: newAccountType });
            } else {
                onMerge({ name: newName, icon: newIcon });
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Merge {itemType}s</DialogTitle>
                    <DialogDescription>
                        All transactions associated with the selected {itemType.toLowerCase()}s will be updated. The old {itemType.toLowerCase()}s will be deleted. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <RadioGroup value={mergeOption} onValueChange={(value) => setMergeOption(value as 'existing' | 'new')}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="existing" id="merge-existing" />
                            <Label htmlFor="merge-existing">Merge into one of the selected {itemType.toLowerCase()}s</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="new" id="merge-new" />
                            <Label htmlFor="merge-new">Merge into a new {itemType.toLowerCase()}</Label>
                        </div>
                    </RadioGroup>

                    {mergeOption === 'existing' ? (
                        <RadioGroup value={targetId} onValueChange={setTargetId} className="pl-6 pt-2 space-y-2">
                            {items.map(item => (
                                <div key={item.id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={item.id} id={`target-${item.id}`} />
                                    <Label htmlFor={`target-${item.id}`} className="font-normal flex items-center gap-2">
                                        {renderIcon(item.icon)}
                                        {item.name}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    ) : (
                        <div className="pl-6 pt-2 space-y-2">
                            <Input
                                placeholder={`New ${itemType} Name`}
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                        {renderIcon(newIcon)}
                                        <span className="ml-2">{newIcon}</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto grid grid-cols-5 gap-2">
                                    {availableIcons.map(iconName => (
                                        <Button key={iconName} variant="ghost" size="icon" onClick={() => setNewIcon(iconName)}>
                                            {renderIcon(iconName)}
                                        </Button>
                                    ))}
                                </PopoverContent>
                            </Popover>
                             {itemType === 'Account' && (
                                <Select onValueChange={(value) => setNewAccountType(value as Account['type'])} defaultValue={newAccountType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select account type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bank">Bank Account</SelectItem>
                                        <SelectItem value="credit_card">Credit Card</SelectItem>
                                        <SelectItem value="wallet">Digital Wallet</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleMergeClick} disabled={isSaving || (mergeOption === 'new' && !newName)}>
                        {isSaving ? <Loader2 className="animate-spin" /> : <Merge className="mr-2 h-4 w-4" />}
                        Confirm Merge
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
