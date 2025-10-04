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
  createdAt?: Timestamp;
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
}

export type Tag = {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  userId: string;
}

export type Expense = {
  id: string;
  userId: string;
  type: 'expense' | 'income';
  amount: number;
  description?: string;
  date: Timestamp | Date; // Firestore Timestamp on read, Date on write
  createdAt: Timestamp;
  accountId: string;
  categoryId?: string; // Only for expenses
  tagId?: string;
};

export type EnrichedExpense = Omit<Expense, 'categoryId' | 'accountId' | 'tagId'> & {
  id: string;
  category?: Category;
  account?: Account;
  tag?: Tag;
  date: Date; // Ensure date is always a Date object for the UI
};


export type Contribution = {
  id: string;
  userId: string; // User who created this entry
  totalAmount: number;
  description: string;
  date: Timestamp | Date;
  paidById: string; // UID of the user who paid
  contributorShares: {
    userId: string;
    share: number;
  }[];
  createdAt: Timestamp;
};

export type EnrichedContribution = Omit<Contribution, 'date'> & {
  date: Date;
  paidBy?: UserProfile;
  contributors?: (UserProfile & { share: number })[];
}

// This is a legacy type, replaced by Account
export type PaymentMethod = {
  id: string;
  name:string;
  icon: string; // lucide-react icon name
  userId: string;
}
