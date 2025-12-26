import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { COLORS } from "./colors";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to generate a style object with CSS variables from a string
export const generateColorStyle = (str: string): React.CSSProperties => {
    if (!str) {
        // Fallback to a neutral style if string is empty
        return {} as React.CSSProperties;
    }

    // Simple hash function to get a consistent index from a string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Use the hash to pick a color from the predefined list
    const color = COLORS[Math.abs(hash % COLORS.length)];

    // Return a style object with CSS variables
    return {
        '--badge-bg-light': `hsl(${color.light.bg})`,
        '--badge-text-light': `hsl(${color.light.text})`,
        '--badge-bg-dark': `hsl(${color.dark.bg})`,
        '--badge-text-dark': `hsl(${color.dark.text})`,
    } as React.CSSProperties;
};


export const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};
