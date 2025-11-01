
// Default categories for new users
export const defaultCategories = [
  { name: 'Food', icon: 'Utensils' },
  { name: 'Transport', icon: 'Car' },
  { name: 'Shopping', icon: 'ShoppingBag' },
  { name: 'Utilities', icon: 'Receipt' },
  { name: 'Entertainment', icon: 'PartyPopper' },
  { name: 'Health', icon: 'HeartPulse' },
  { name: 'Credit Limit Upgrade', icon: 'TrendingUp' },
  { name: 'Credit Card Payment', icon: 'Landmark' },
  { name: 'Other', icon: 'MoreHorizontal' },
];

// Default accounts for new users
export const defaultAccounts = [
  { name: 'Cash', icon: 'Wallet', type: 'cash', balance: 0, status: 'active' },
];

// Default tags for new users
export const defaultTags = [
  { name: 'Business', icon: 'Briefcase' },
  { name: 'Personal', icon: 'User' },
  { name: 'Travel', icon: 'Plane' },
  { name: 'Reimbursable', icon: 'Undo2' },
  { name: 'Gift', icon: 'Gift' },
  { name: 'Subscription', icon: 'Repeat' },
];

// Available icons for categories
export const availableIcons = [
  "Utensils", "Car", "ShoppingBag", "Receipt", "PartyPopper", "HeartPulse",
  "Home", "Plane", "Book", "Gift", "Film", "Shirt", "Gamepad2", "Bus", "Train",
  "Briefcase", "Coffee", "Droplets", "Pizza", "GraduationCap", "PawPrint",
  "Wallet", "CreditCard", "Landmark", "Tag", "Ticket", "User", "IndianRupee",
  "Contact", "Undo2", "Repeat", "MoreHorizontal", "Banknote", "Coins", "TrendingUp"
];

// This is a legacy export and can be removed in the future
export const defaultPaymentMethods = [
  { name: 'Cash', icon: 'Wallet' },
  { name: 'Credit Card', icon: 'CreditCard' },
  { name: 'Debit Card', icon: 'Contact' },
  { name: 'UPI', icon: 'IndianRupee' },
  { name: 'Bank Transfer', icon: 'Landmark' },
];
