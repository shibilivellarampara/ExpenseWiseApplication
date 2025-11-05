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

    // Generate more vibrant colors by adjusting saturation and lightness.
    // Light mode: High saturation, medium-light background.
    // Dark mode: Higher saturation and lightness for the background to stand out.
    return `bg-[hsl(${hue},90%,88%)] text-[hsl(${hue},60%,30%)] dark:bg-[hsl(${hue},30%,30%)] dark:text-[hsl(${hue},80%,90%)]`;
};
