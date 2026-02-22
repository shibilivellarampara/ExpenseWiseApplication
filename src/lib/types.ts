
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
    showSavingsTrendChart?: boolean;
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

export type ExpenseSyncPreference = {
  disabled?: boolean;
};

export type Expense = {
  id: string;
  userId: string;
  type: 'expense' | 'income';
  amount: number;
  description?: string;
  date: Timestamp;
  createdAt: Timestamp;
  accountId: string;
  categoryId?: string;
  tagIds?: string[];
  runningBalance?: number;
  syncPreferences?: Record<string, ExpenseSyncPreference>; // walletId -> preference
};

export type EnrichedExpense = Omit<Expense, 'categoryId' | 'accountId' | 'tagIds' | 'date'> & {
  category?: Category;
  account?: Account;
  tags: Tag[];
  user?: UserProfile;
  date: Date;
};

// --- Family Wallet Types ---

export type FamilyWallet = {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Timestamp;
};

export type FamilyMemberRole = 'owner' | 'member';

export type FamilyMember = {
  userId: string;
  role: FamilyMemberRole;
  displayName: string;
  joinedAt: Timestamp;
};

export type FamilyTransactionOrigin = 'manual' | 'auto';

export type FamilyTransaction = {
  id: string;
  walletId: string;
  amount: number;
  type: 'expense' | 'income';
  description?: string;
  categoryId: string;
  authorId: string;
  authorName: string;
  date: Timestamp;
  createdAt: Timestamp;
  origin: FamilyTransactionOrigin;
  sourceUserId?: string;
  sourceTransactionId?: string;
};

export type EnrichedFamilyTransaction = Omit<FamilyTransaction, 'date' | 'createdAt'> & {
  date: Date;
  createdAt: Date;
  category?: Category;
  runningBalance?: number;
};

export type AutoTag = {
  id: string;
  tagName: string;
  normalizedName: string;
  createdBy: string;
  createdAt: Timestamp;
};

export type FamilyInvite = {
  code: string;
  walletId: string;
  walletName: string;
  role: FamilyMemberRole;
  expiresAt: Timestamp;
  createdBy: string;
};

export type UserMembership = {
  walletId: string;
  walletName: string;
  joinedAt: Timestamp;
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

export type AssetType = 'savings_cash' | 'mutual_funds' | 'stocks_equity' | 'fixed_income' | 'retirement' | 'digital_assets' | 'gold' | 'private_equity' | 'other';

export type Asset = {
    id: string;
    userId: string;
    assetType: AssetType;
    name: string;
    investedAmount: number;
    currentValue: number;
    quantity?: number;
    startDate?: Timestamp;
    notes?: string;
    lastUpdated: Timestamp;
    isFromAccount?: boolean; // Custom property
};

export type EnrichedAsset = Omit<Asset, 'startDate' | 'lastUpdated'> & {
    startDate?: Date;
    lastUpdated: Date;
};

export interface TagStat {
    name: string;
    amount: number;
    percentage: number;
}

export interface CategoryStat {
    id: string;
    name: string;
    icon?: string;
    amount: number;
    count: number;
    percentage: number;
    tags: TagStat[];
}
