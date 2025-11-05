import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { COLORS } from "./colors";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to generate Tailwind CSS classes from a string
export const generateColorClasses = (str: string): string => {
    if (!str) {
        return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200";
    }

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash % COLORS.length);
    return COLORS[index];
};
