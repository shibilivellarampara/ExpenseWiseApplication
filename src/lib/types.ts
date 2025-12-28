

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


// --- V2 Shared Expense Types ---

export type SharedLedger = {
    id: string;
    name: string;
    ownerId: string;
    memberIds: string[];
    inviteCode: string;
    memberSharedTags: Record<string, string>; // e.g. { "uid1": "tagId123" }
};

export type SharedCategory = {
    id: string;
    ledgerId: string;
    name: string;
    icon: string;
};

export type SharedTag = {
    id: string;
    ledgerId: string;
    name: string;
    icon: string;
};

export type SharedTransaction = {
    id: string;
    ledgerId: string;
    createdBy: string; // UID of member who added it
    type: 'expense' | 'income';
    amount: number;
    description: string;
    date: Timestamp;
    createdAt: Timestamp;
    // References to shared categories/tags within the top-level collections
    categoryId?: string;
    tagIds?: string[];
    source: 'manual' | 'automatic';
    sourceExpenseId?: string; // ID of the original personal expense if source is 'automatic'
};

export type EnrichedSharedTransaction = Omit<SharedTransaction, 'categoryId' | 'tagIds' | 'date' | 'createdAt'> & {
  category?: SharedCategory;
  tags: SharedTag[];
  member?: UserProfile; // The user who added the transaction
  date: Date;
  createdAt: Date;
};

    

    