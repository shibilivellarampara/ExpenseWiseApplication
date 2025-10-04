import type { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  id: string; // Firebase Auth UID
  email: string | null;
  name: string | null;
  photoURL: string | null;
  defaultCurrency?: string;
  createdAt: Timestamp;
};

export type Category = {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  userId: string;
};

export type PaymentMethod = {
  id: string;
  name:string;
  userId: string;
}

export type Tag = {
  id: string;
  name: string;
  userId: string;
}

export type Expense = {
  id: string;
  userId: string;
  amount: number;
  description: string;
  date: Timestamp | Date; // Firestore Timestamp on read, Date on write
  createdAt: Timestamp;
  categoryId: string;
  paymentMethodId: string;
  tagId?: string;
};

export type EnrichedExpense = Omit<Expense, 'categoryId' | 'paymentMethodId' | 'tagId'> & {
  id: string;
  category?: Category;
  paymentMethod?: PaymentMethod;
  tag?: Tag;
  date: Date; // Ensure date is always a Date object for the UI
};


export type Contribution = {
  id?: string;
  totalAmount: number;
  description: string;
  date: Date;
  paidBy: string;
  contributors: {
    userId: string;
    name: string;
    amount: number;
  }[];
  createdAt: Timestamp;
};
