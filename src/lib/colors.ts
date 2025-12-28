
type ColorInfo = {
  light: { bg: string; text: string };
  dark: { bg: string; text: string };
};

// A vibrant, professional palette for generating dynamic badge colors.
// This palette is designed to work well across all themes, including the Fintech theme.
export const COLORS: ColorInfo[] = [
  { light: { bg: '210 80% 95%', text: '210 80% 30%' }, dark: { bg: '210 40% 20%', text: '210 80% 85%' } },   // Blue
  { light: { bg: '180 45% 95%', text: '180 45% 30%' }, dark: { bg: '180 45% 20%', text: '180 45% 85%' } },   // Teal
  { light: { bg: '30 90% 95%', text: '30 90% 40%' }, dark: { bg: '30 80% 22%', text: '30 80% 85%' } },       // Orange
  { light: { bg: '300 70% 95%', text: '300 70% 40%' }, dark: { bg: '300 40% 25%', text: '300 70% 88%' } },   // Purple
  { light: { bg: '120 40% 95%', text: '120 40% 30%' }, dark: { bg: '120 30% 20%', text: '120 40% 85%' } },   // Green
  { light: { bg: '350 80% 96%', text: '350 80% 50%' }, dark: { bg: '350 50% 25%', text: '350 80% 88%' } },   // Red/Pink
  { light: { bg: '40 80% 95%', text: '40 80% 45%' }, dark: { bg: '40 60% 23%', text: '40 80% 88%' } },       // Yellow/Gold
  { light: { bg: '260 50% 95%', text: '260 50% 40%' }, dark: { bg: '260 30% 25%', text: '260 50% 85%' } },   // Indigo
  { light: { bg: '190 60% 94%', text: '190 60% 30%' }, dark: { bg: '190 40% 22%', text: '190 60% 85%' } },   // Cyan
  { light: { bg: '0 80% 96%', text: '0 80% 50%' }, dark: { bg: '0 50% 25%', text: '0 80% 88%' } },           // Bright Red
  { light: { bg: '220 25% 94%', text: '220 25% 30%' }, dark: { bg: '220 25% 25%', text: '220 15% 80%' } },   // Muted Navy
  { light: { bg: '230 20% 93%', text: '230 20% 35%' }, dark: { bg: '230 15% 28%', text: '230 20% 82%' } },   // Slate
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
