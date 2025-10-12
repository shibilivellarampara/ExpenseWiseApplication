
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
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { doc, setDoc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { defaultCategories, defaultAccounts, defaultTags } from '@/lib/defaults';
import { UserProfile } from '@/lib/types';
import PhoneInput, { isPossiblePhoneNumber } from 'react-phone-number-input';
import React from 'react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }).optional().or(z.literal('')),
  phoneNumber: z.string().refine(value => isPossiblePhoneNumber(value), { message: "Please enter a valid phone number." }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
}).refine(data => data.email || data.phoneNumber, {
    message: "Either email or phone number is required.",
    path: ["email"],
});


export function SignUpForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
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
    
    // We create a fake email for phone-based sign-ups to work with Firebase Auth
    const finalEmail = values.email || `${values.phoneNumber}@phone.local`;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, values.password);
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
        email: values.email || null, // Store real email if provided
        photoURL: user.photoURL,
        phoneNumber: values.phoneNumber, // Always store phone number
        createdAt: serverTimestamp() as any, 
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
          batch.set(categoryDoc, { ...category, userId: user.uid, id: categoryDoc.id });
      });

      // 3. Add default accounts
      const accountsRef = collection(firestore, `users/${user.uid}/accounts`);
      defaultAccounts.forEach(pm => {
          const pmDoc = doc(accountsRef);
          batch.set(pmDoc, { ...pm, userId: user.uid, id: pmDoc.id });
      });

      // 4. Add default tags
      const tagsRef = collection(firestore, `users/${user.uid}/tags`);
      defaultTags.forEach(tag => {
          const tagDoc = doc(tagsRef);
          batch.set(tagDoc, { ...tag, userId: user.uid, id: tagDoc.id });
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
        let userMessage = 'There was a problem with your request.';
        if (error.code === 'auth/email-already-in-use') {
            userMessage = 'This email or phone number is already in use. Please log in or use a different one.';
        }
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: userMessage,
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
            name="phoneNumber"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                    <PhoneInput
                        international
                        withCountryCallingCode
                        value={field.value || ""}
                        onChange={field.onChange}
                        countrySelectProps={{
                            className: "PhoneInputCountry"
                        }}
                        inputComponent={React.forwardRef<HTMLInputElement>((props, ref) => <Input {...props} ref={ref as React.Ref<HTMLInputElement>} className="PhoneInputInput" />)}
                    />
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
              <FormLabel>Email (Optional)</FormLabel>
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
                <div className="relative">
                    <Input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="••••••••" 
                        {...field} 
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                        onClick={() => setShowPassword(prev => !prev)}
                    >
                        {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                </div>
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
