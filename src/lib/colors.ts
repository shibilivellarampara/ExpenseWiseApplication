
type ColorInfo = {
  light: { bg: string; text: string };
  dark: { bg: string; text: string };
};

// Fintech-aligned color palette for dynamic badges
export const COLORS: ColorInfo[] = [
  { light: { bg: '210 80% 95%', text: '210 80% 30%' }, dark: { bg: '210 40% 20%', text: '210 80% 85%' } }, // Blue
  { light: { bg: '180 45% 95%', text: '180 45% 30%' }, dark: { bg: '180 45% 20%', text: '180 45% 85%' } }, // Teal/Green
  { light: { bg: '30 90% 95%', text: '30 90% 40%' }, dark: { bg: '30 80% 22%', text: '30 80% 85%' } },     // Orange/Amber
  { light: { bg: '220 25% 94%', text: '220 25% 30%' }, dark: { bg: '220 25% 25%', text: '220 15% 80%' } }, // Muted Navy
  { light: { bg: '210 50% 95%', text: '210 50% 35%' }, dark: { bg: '210 30% 22%', text: '210 50% 88%' } }, // Softer Blue
  { light: { bg: '170 35% 94%', text: '170 35% 30%' }, dark: { bg: '170 30% 20%', text: '170 35% 85%' } }, // Muted Green
  { light: { bg: '40 80% 95%', text: '40 80% 45%' }, dark: { bg: '40 60% 23%', text: '40 80% 88%' } },     // Softer Amber
  { light: { bg: '220 15% 92%', text: '220 15% 40%' }, dark: { bg: '220 15% 30%', text: '220 15% 85%' } }, // Slate
  { light: { bg: '190 60% 94%', text: '190 60% 30%' }, dark: { bg: '190 40% 22%', text: '190 60% 85%' } }, // Teal-Blue
  { light: { bg: '350 80% 96%', text: '350 80% 50%' }, dark: { bg: '350.5 50% 25%', text: '350 80% 88%' } }, // Soft Red/Orange
  { light: { bg: '260 50% 95%', text: '260 50% 40%' }, dark: { bg: '260 30% 25%', text: '260 50% 85%' } }, // Muted Purple
  { light: { bg: '230 20% 93%', text: '230 20% 35%' }, dark: { bg: '230 15% 28%', text: '230 20% 82%' } }, // Desaturated Blue
];


// Simplified array of HSL color strings for charts, aligned with Fintech theme
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
