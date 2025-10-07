import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to generate a color from a string
export const generateColorFromString = (str: string): { backgroundColor: string, textColor: string } => {
    if (!str) {
        // Return a default color for undefined/null/empty strings
        const defaultHue = 0;
        return {
            backgroundColor: `hsl(${defaultHue}, 70%, 90%)`,
            textColor: `hsl(${defaultHue}, 70%, 25%)`
        };
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    const backgroundColor = `hsl(${hue}, 70%, 80%)`; // Lighter background
    const textColor = `hsl(${hue}, 90%, 15%)`; // Darker text
    return { backgroundColor, textColor };
};
