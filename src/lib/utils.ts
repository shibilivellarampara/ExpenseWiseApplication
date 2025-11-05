import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to generate Tailwind CSS classes from a string
export const generateColorClasses = (str: string): string => {
    if (!str) {
        return "bg-slate-200 text-slate-800";
    }

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;

    // This is a reliable way to generate distinct colors.
    // Light mode: High saturation, very light background.
    // Dark mode: Lower saturation, dark background.
    return `bg-[hsl(${hue},90%,96%)] text-[hsl(${hue},70%,35%)] dark:bg-[hsl(${hue},30%,20%)] dark:text-[hsl(${hue},70%,85%)]`;
};
