'use client';

import { Input } from '@/components/ui/input';
import { FormControl } from '@/components/ui/form';

export function DateTimePicker({ field }: { field: any }) {
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateValue = e.target.value;
        // The input gives a string, so we convert it to a Date object
        field.onChange(new Date(dateValue));
    };

    // Format the date from the form state into 'YYYY-MM-DDTHH:mm' for the input
    const formatForInput = (date: Date): string => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    return (
        <FormControl>
            <Input
                type="datetime-local"
                value={formatForInput(field.value)}
                onChange={handleDateChange}
            />
        </FormControl>
    );
}
