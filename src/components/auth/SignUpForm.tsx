
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, setDoc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { defaultCategories, defaultAccounts, defaultTags } from '@/lib/defaults';
import { UserProfile } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export function SignUpForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    if (!auth || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: 'Firebase is not configured correctly.',
        });
        setIsLoading(false);
        return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: values.name,
      });

      // --- Batch write for new user setup ---
      const batch = writeBatch(firestore);

      // 1. Create user profile document
      const userDocRef = doc(firestore, 'users', user.uid);
      const newUserProfile: Partial<UserProfile> = {
        id: user.uid,
        name: values.name,
        email: values.email.toLowerCase(),
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        createdAt: serverTimestamp() as any, // Cast because serverTimestamp is a sentinel value
        defaultCurrency: 'INR',
        expenseFieldSettings: {
          isCategoryRequired: true,
          isDescriptionRequired: false,
          isTagRequired: false,
        },
        dashboardSettings: {
          useCategoryColorsInChart: true,
        },
      };
      batch.set(userDocRef, newUserProfile);
      
      // 2. Add default categories
      const categoriesRef = collection(firestore, `users/${user.uid}/categories`);
      defaultCategories.forEach(category => {
          const categoryDoc = doc(categoriesRef);
          batch.set(categoryDoc, { ...category, userId: user.uid });
      });

      // 3. Add default accounts
      const accountsRef = collection(firestore, `users/${user.uid}/accounts`);
      defaultAccounts.forEach(pm => {
          const pmDoc = doc(accountsRef);
          batch.set(pmDoc, { ...pm, userId: user.uid });
      });

      // 4. Add default tags
      const tagsRef = collection(firestore, `users/${user.uid}/tags`);
      defaultTags.forEach(tag => {
          const tagDoc = doc(tagsRef);
          batch.set(tagDoc, { ...tag, userId: user.uid });
      });

      // Commit the batch
      await batch.commit();
      // --- End batch write ---

      toast({
        title: 'Account created!',
        description: "You're all set. Please log in to continue.",
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'There was a problem with your request.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </form>
    </Form>
  );
}
