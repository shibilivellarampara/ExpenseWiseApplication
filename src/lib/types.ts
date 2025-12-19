

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
  sharedExpenseIds?: string[];
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
};

export type Account = {
  id: string;
  name: string;
  type: 'bank' | 'credit_card' | 'wallet' | 'cash';
  balance: number;
  limit?: number; // For credit cards
  billingDate?: number; // Day of the month (1-31) for credit cards
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
  accountId?: string;
  categoryId?: string;
  tagIds?: string[];
  sharedExpenseId?: string;
  runningBalance?: number;
};

export type EnrichedExpense = Omit<Expense, 'categoryId' | 'accountId' | 'tagIds' | 'date'> & {
  category?: Category;
  account?: Account;
  tags: Tag[];
  user?: UserProfile;
  date: Date; // Ensure date is always a Date object
};


export type SharedExpense = {
  id: string;
  name: string;
  ownerId: string;
  joinId?: string; // 6-character unique code for joining
  createdAt: Timestamp;
}

export type Contribution = {
    id: string;
    totalAmount: number;
    description: string;
    userId: string;
    date: Timestamp;
    paidById: string;
    contributorShares: {
        userId: string;
        share: number;
    }[];
};


export type EnrichedContribution = Omit<Contribution, 'date' | 'paidById' | 'contributorShares'> & {
    date: Date;
    paidBy?: UserProfile;
    contributors?: (Partial<UserProfile> & { share: number })[];
}


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

    