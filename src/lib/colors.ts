type ColorInfo = {
  light: { bg: string; text: string };
  dark: { bg: string; text: string };
};

// A vibrant, professional palette for generating dynamic badge colors.
// Refined to match high-quality fintech standards: light background with darker, high-contrast same-hue text.
export const COLORS: ColorInfo[] = [
  { light: { bg: '210 80% 96%', text: '210 80% 40%' }, dark: { bg: '210 40% 20%', text: '210 80% 85%' } },   // Blue (Shopping)
  { light: { bg: '280 70% 96%', text: '280 70% 45%' }, dark: { bg: '280 40% 25%', text: '280 70% 88%' } },   // Purple (Flipkart)
  { light: { bg: '345 80% 96%', text: '345 80% 45%' }, dark: { bg: '345 50% 25%', text: '345 80% 88%' } },   // Pink/Red (Sweet Home)
  { light: { bg: '160 60% 96%', text: '160 60% 35%' }, dark: { bg: '160 45% 20%', text: '160 45% 85%' } },   // Green (Refund)
  { light: { bg: '220 15% 94%', text: '220 15% 40%' }, dark: { bg: '220 25% 25%', text: '220 15% 80%' } },   // Slate/Gray (Transfer)
  { light: { bg: '30 90% 96%', text: '30 90% 40%' }, dark: { bg: '30 80% 22%', text: '30 80% 85%' } },       // Orange/Amber
  { light: { bg: '190 70% 96%', text: '190 70% 40%' }, dark: { bg: '190 40% 22%', text: '190 60% 85%' } },   // Cyan/Teal
  { light: { bg: '260 60% 96%', text: '260 60% 45%' }, dark: { bg: '260 30% 25%', text: '260 50% 85%' } },   // Indigo
];


// Simplified array of HSL color strings for charts, aligned with Tailwind CSS variables
export const CHART_COLORS: string[] = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-6))",
    "hsl(var(--chart-7))",
    "hsl(var(--chart-8))",
    "hsl(var(--chart-9))",
    "hsl(var(--chart-10))",
    "hsl(var(--chart-11))",
    "hsl(var(--chart-12))"
];
