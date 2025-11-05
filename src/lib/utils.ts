import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { COLORS } from "./colors";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to generate a style object with CSS variables from a string
export const generateColorStyle = (str: string): React.CSSProperties => {
    if (!str) {
        return {
            '--badge-bg-light': 'hsl(220, 14.3%, 95.8%)',
            '--badge-text-light': 'hsl(222.2, 84%, 4.9%)',
            '--badge-bg-dark': 'hsl(222.2, 84%, 4.9%)',
            '--badge-text-dark': 'hsl(210, 40%, 98%)',
        } as React.CSSProperties;
    }

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const color = COLORS[Math.abs(hash % COLORS.length)];

    return {
        '--badge-bg-light': `hsl(${color.light.bg})`,
        '--badge-text-light': `hsl(${color.light.text})`,
        '--badge-bg-dark': `hsl(${color.dark.bg})`,
        '--badge-text-dark': `hsl(${color.dark.text})`,
    } as React.CSSProperties;
};
