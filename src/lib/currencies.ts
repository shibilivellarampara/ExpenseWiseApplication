const currencySymbols: { [key: string]: string } = {
    USD: '$', // United States Dollar
    EUR: '€', // Euro
    JPY: '¥', // Japanese Yen
    GBP: '£', // British Pound Sterling
    INR: '₹', // Indian Rupee
    AUD: 'A$', // Australian Dollar
    CAD: 'C$', // Canadian Dollar
    CHF: 'CHF', // Swiss Franc
    CNY: '¥', // Chinese Yuan
    SEK: 'kr', // Swedish Krona
    NZD: 'NZ$', // New Zealand Dollar
};
  
export function getCurrencySymbol(currencyCode: string = 'USD'): string {
    return currencySymbols[currencyCode] || '$';
}
