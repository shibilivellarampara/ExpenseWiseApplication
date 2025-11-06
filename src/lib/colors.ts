
type ColorInfo = {
  light: { bg: string; text: string };
  dark: { bg: string; text: string };
};

export const COLORS: ColorInfo[] = [
  { light: { bg: '24.6 95% 90%', text: '24.6 95% 30%' }, dark: { bg: '24.6 35% 20%', text: '24.6 95% 80%' } }, // Orange
  { light: { bg: '142.1 76% 92%', text: '142.1 76% 25%' }, dark: { bg: '142.1 30% 22%', text: '142.1 76% 85%' } }, // Green
  { light: { bg: '262.1 83% 92%', text: '262.1 83% 45%' }, dark: { bg: '262.1 40% 25%', text: '262.1 83% 88%' } }, // Violet
  { light: { bg: '346.8 77% 91%', text: '346.8 77% 40%' }, dark: { bg: '346.8 35% 23%', text: '346.8 77% 86%' } }, // Rose
  { light: { bg: '217.2 91% 91%', text: '217.2 91% 40%' }, dark: { bg: '217.2 45% 24%', text: '217.2 91% 87%' } }, // Blue
  { light: { bg: '47.9 95% 88%', text: '47.9 95% 30%' }, dark: { bg: '47.9 40% 21%', text: '47.9 95% 82%' } }, // Amber
  { light: { bg: '172.8 82% 90%', text: '172.8 82% 28%' }, dark: { bg: '172.8 40% 20%', text: '172.8 82% 84%' } }, // Teal
  { light: { bg: '312.4 81% 93%', text: '312.4 81% 50%' }, dark: { bg: '312.4 38% 26%', text: '312.4 81% 90%' } }, // Fuchsia
  { light: { bg: '73.4 95% 90%', text: '73.4 95% 30%' }, dark: { bg: '73.4 35% 22%', text: '73.4 95% 85%' } }, // Lime
  { light: { bg: '197.6 91% 90%', text: '197.6 91% 35%' }, dark: { bg: '197.6 45% 23%', text: '197.6 91% 88%' } }, // Sky
  { light: { bg: '0 84% 91%', text: '0 84% 40%' }, dark: { bg: '0 40% 24%', text: '0 84% 87%' } }, // Red
  { light: { bg: '220 13% 91%', text: '220 13% 31%' }, dark: { bg: '220 13% 25%', text: '220 13% 88%' } }, // Slate (for contrast)
];

// Simplified array of HSL color strings for charts
export const CHART_COLORS: string[] = [
    "hsl(24.6, 95%, 53%)", // Orange
    "hsl(142.1, 76%, 36%)", // Green
    "hsl(262.1, 83%, 58%)", // Violet
    "hsl(346.8, 77%, 49%)", // Rose
    "hsl(217.2, 91%, 59%)", // Blue
    "hsl(47.9, 96%, 53%)",  // Amber
    "hsl(172.8, 82%, 38%)", // Teal
    "hsl(312.4, 81%, 63%)", // Fuchsia
    "hsl(73.4, 95%, 43%)",  // Lime
    "hsl(197.6, 91%, 48%)", // Sky
    "hsl(0, 84%, 60%)",    // Red
    "hsl(220, 13%, 47%)"   // Slate
];
