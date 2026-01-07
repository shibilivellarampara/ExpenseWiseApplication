
'use client';

import { Input } from '@/components/ui/input';
import { FormControl } from '@/components/ui/form';

// Helper to convert local string from input to a real Date object
const toDate = (dateString: string) => {
  if (!dateString) return new Date();
  
  // The input type="datetime-local" gives a string like "2024-08-22T15:30"
  // This format is directly parsable by the Date constructor, which correctly
  // interprets it in the user's local timezone.
  const date = new Date(dateString);

  // Check if the parsed date is valid
  if (isNaN(date.getTime())) {
    console.error("Invalid date string provided:", dateString);
    return new Date(); // Fallback to now
  }
  
  return date;
};


export function DateTimePicker({ field }: { field: any }) {
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateValue = e.target.value;
        // The input gives a string, so we convert it to a Date object
        field.onChange(toDate(dateValue));
    };

    // Format the date from the form state into 'YYYY-MM-DDTHH:mm' for the input
    const formatForInput = (date: Date | null | undefined): string => {
        if (!date) return '';
        if (isNaN(new Date(date).getTime())) return '';

        const d = new Date(date);
        
        // Using local time components to build the string avoids timezone shifts
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
