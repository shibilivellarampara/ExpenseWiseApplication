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
    const formatForInput = (date: Date | null | undefined): string => {
        if (!date) return '';
        // Ensure it's a valid date before formatting
        if (isNaN(new Date(date).getTime())) return '';

        const d = new Date(date);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
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
