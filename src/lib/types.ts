import type { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  paymentMethods?: string[];
  tags?: string[];
  defaultCurrency?: string;
};

export type Expense = {
  id?: string;
  category: string;
  amount: number;
  description: string;
  date: Timestamp | Date; // Allow both Timestamp from Firestore and Date object for forms
  createdAt: Timestamp;
  userId: string;
  paymentMethod: string;
  tag?: string;
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

    