import type { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
};

export type Expense = {
  id?: string;
  category: string;
  amount: number;
  description: string;
  date: Date;
  createdAt: Timestamp;
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
