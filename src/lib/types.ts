
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
  };
  dashboardSettings?: {
    useCategoryColorsInChart?: boolean;
    show5YearView?: boolean;
  };
  createdAt?: Timestamp;
  sharedExpenseIds?: string[];
  isAdmin?: boolean;
};

export type Category = {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  userId: string;
};

export type Account = {
  id: string;
  name: string;
  type: 'bank' | 'credit_card' | 'wallet' | 'cash';
  balance: number;
  limit?: number; // For credit cards
  icon: string; // lucide-react icon name
  userId: string;
  status: 'active' | 'inactive';
}

export type Tag = {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  userId: string;
}

export type Expense = {
  id: string;
  userId: string; // The user who created the expense
  type: 'expense' | 'income';
  amount: number;
  description?: string;
  date: Timestamp | Date; // Firestore Timestamp on read, Date on write
  createdAt: Timestamp;
  accountId: string;
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
  memberIds: string[];
  joinId?: string; // 6-character unique code for joining
  createdAt: Timestamp;
  members?: UserProfile[]; // populated on the client
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
