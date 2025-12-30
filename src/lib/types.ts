'use client';
import type { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  id: string; // Firebase Auth UID
  email: string | null;
  name: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  defaultCurrency?: string;
  expenseFieldSettings?: {
    isDescriptionRequired?: boolean;
    isTagRequired?: boolean;
    isCategoryRequired?: boolean;
    visibleFields?: ('description' | 'accountId' | 'categoryId' | 'tagIds')[];
    defaultAccountId?: string;
  };
  dashboardSettings?: {
    useCategoryColorsInChart?: boolean;
    show5YearView?: boolean;
    isAiSuggestionEnabled?: boolean;
    transactionViewMode?: 'normal' | 'compact';
    transactionGrouping?: 'daily' | 'monthly';
  };
  analysisSettings?: {
    excludedCategoryIds?: string[];
    showAdjustedTotal?: boolean;
    showNormalTotal?: boolean;
    showCategoryTable?: boolean;
    showTrendChart?: boolean;
    showCategoryBarChart?: boolean;
    showTagPieChart?: boolean;
    showIncomePieChart?: boolean;
    showAiInsights?: boolean;
  };
  transactionFieldOrder?: ('description' | 'accountId' | 'categoryId' | 'tagIds')[];
  createdAt?: Timestamp;
  isAdmin?: boolean;
};

export type Category = {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  userId: string;
  status?: 'active' | 'inactive';
};

export type CardDetails = {
  cardNickname?: string;
  last4Digits?: string;
  cardholderName?: string;
  expiryMonth?: number;
  expiryYear?: number;
  network?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'rupay' | 'other';
  statementDate?: number; // Day of month (1-31)
};

export type Account = {
  id: string;
  name: string;
  type: 'bank' | 'credit_card' | 'wallet' | 'cash';
  balance: number;
  limit?: number; // For credit cards
  billingDate?: number; // Payment Due Date (day of month, 1-31) for credit cards
  icon: string; // lucide-react icon name
  userId: string;
  status: 'active' | 'inactive';
  cardDetails?: CardDetails;
}

export type Tag = {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  userId: string;
  status?: 'active' | 'inactive';
}

export type Expense = {
  id: string;
  userId: string; // The user who created the expense
  type: 'expense' | 'income';
  amount: number;
  description?: string;
  date: Timestamp;
  createdAt: Timestamp;
  accountId: string;
  categoryId?: string;
  tagIds?: string[];
  runningBalance?: number;
};

export type EnrichedExpense = Omit<Expense, 'categoryId' | 'accountId' | 'tagIds' | 'date'> & {
  category?: Category;
  account?: Account;
  tags: Tag[];
  user?: UserProfile;
  date: Date; // Ensure date is always a Date object
};


export type Debt = {
  id: string;
  userId: string;
  personName: string;
  amount: number;
  type: 'lent' | 'borrowed';
  description?: string;
  date: Timestamp;
  status: 'pending' | 'settled';
  settledAt?: Timestamp;
};

export type EnrichedDebt = Omit<Debt, 'date' | 'settledAt'> & {
  date: Date;
  settledAt?: Date;
};


export type EnrichedDebtWithBalance = EnrichedDebt & {
  runningBalance?: number;
};

export type RecurringExpense = {
    id: string;
    userId: string;
    name: string;
    amount: number;
    type: 'expense' | 'income';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: Timestamp;
    nextDueDate: Timestamp;
    lastCreatedDate?: Timestamp;
    categoryId?: string;
    accountId?: string;
    tagIds?: string[];
    description?: string;
    status: 'active' | 'paused';
};

export type EnrichedRecurringExpense = Omit<RecurringExpense, 'startDate' | 'nextDueDate' | 'lastCreatedDate' | 'categoryId' | 'accountId'> & {
    startDate: Date;
    nextDueDate: Date;
    lastCreatedDate?: Date;
    category?: Category;
    account?: Account;
};

export type AssetType = 'savings_cash' | 'mutual_funds' | 'stocks_equity' | 'fixed_income' | 'retirement' | 'digital_assets' | 'other';

export type Asset = {
    id: string;
    userId: string;
    assetType: AssetType;
    name: string;
    investedAmount: number;
    currentValue: number;
    quantity?: number;
    startDate?: Timestamp;
    maturityDate?: Timestamp;
    notes?: string;
    lastUpdated: Timestamp;
    isFromAccount?: boolean; // Custom property
};

export type EnrichedAsset = Omit<Asset, 'startDate' | 'maturityDate' | 'lastUpdated'> & {
    startDate?: Date;
    maturityDate?: Date;
    lastUpdated: Date;
};
