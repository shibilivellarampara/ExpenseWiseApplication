
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, updateProfile, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { doc, setDoc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { defaultCategories, defaultAccounts, defaultTags } from '@/lib/defaults';
import { UserProfile } from '@/lib/types';
import PhoneInput, { isPossiblePhoneNumber } from 'react-phone-number-input';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp';

const emailSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  phoneNumber: z.string().optional(),
});

const phoneSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phoneNumber: z.string().refine(isPossiblePhoneNumber, { message: "Please enter a valid phone number." }),
  email: z.string().optional(),
  password: z.string().optional(),
});


export function SignUpForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
  const auth = useAuth();
  const firestore = useFirestore();

  // Phone Auth State
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  
  const form = useForm<z.infer<typeof emailSchema> | z.infer<typeof phoneSchema>>({
    resolver: (data, context, options) => {
        if (signupMethod === 'email') {
            return zodResolver(emailSchema)(data, context, options);
        }
        return zodResolver(phoneSchema)(data, context, options);
    },
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phoneNumber: '',
    },
  });

  // Initialize reCAPTCHA for phone update
  useEffect(() => {
    if (auth && recaptchaContainerRef.current && !recaptchaVerifier.current) {
        recaptchaVerifier.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
            'size': 'invisible',
        });
        recaptchaVerifier.current.render();
    }
  }, [auth]);
  

  const provisionNewUser = async (user: import('firebase/auth').User, name: string, email?: string, phoneNumber?: string) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const userDocRef = doc(firestore, 'users', user.uid);
    const newUserProfile: Partial<UserProfile> = {
      id: user.uid,
      name: name,
      email: email || null,
      photoURL: user.photoURL,
      phoneNumber: phoneNumber || null,
      createdAt: serverTimestamp() as any, 
      defaultCurrency: 'INR',
      expenseFieldSettings: { isCategoryRequired: true, isDescriptionRequired: false, isTagRequired: false },
      dashboardSettings: { useCategoryColorsInChart: true },
    };
    batch.set(userDocRef, newUserProfile);
    
    // Add defaults
    const categoriesRef = collection(firestore, `users/${user.uid}/categories`);
    defaultCategories.forEach(category => {
        const categoryDoc = doc(categoriesRef);
        batch.set(categoryDoc, { ...category, userId: user.uid, id: categoryDoc.id });
    });
    const accountsRef = collection(firestore, `users/${user.uid}/accounts`);
    defaultAccounts.forEach(pm => {
        const pmDoc = doc(accountsRef);
        batch.set(pmDoc, { ...pm, userId: user.uid, id: pmDoc.id });
    });
    const tagsRef = collection(firestore, `users/${user.uid}/tags`);
    defaultTags.forEach(tag => {
        const tagDoc = doc(tagsRef);
        batch.set(tagDoc, { ...tag, userId: user.uid, id: tagDoc.id });
    });

    await batch.commit();
  }

  async function handleEmailSubmit(values: z.infer<typeof emailSchema>) {
    setIsLoading(true);
    if (!auth || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not configured correctly.'});
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: values.name });
      await provisionNewUser(user, values.name, values.email, values.phoneNumber);

      toast({ title: 'Account created!', description: "You're all set. Please log in to continue." });
      router.push('/login');
    } catch (error: any) {
        let userMessage = 'There was a problem with your request.';
        if (error.code === 'auth/email-already-in-use') {
            userMessage = 'This email is already in use. Please log in or use a different one.';
        }
        toast({ variant: 'destructive', title: 'Sign-up failed.', description: userMessage });
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePhoneSubmit(values: z.infer<typeof phoneSchema>) {
    if (!auth || !recaptchaVerifier.current) {
        toast({ variant: "destructive", title: "Error", description: "Authentication service not ready." });
        return;
    }
    setIsLoading(true);
    try {
        const result = await signInWithPhoneNumber(auth, values.phoneNumber, recaptchaVerifier.current);
        setConfirmationResult(result);
        setShowOtpDialog(true);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to send code.', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  async function handleOtpVerification() {
      const values = form.getValues();
      if (!confirmationResult || !otp || !values.name || !values.phoneNumber) return;
      setIsLoading(true);
      try {
          const userCredential = await confirmationResult.confirm(otp);
          const user = userCredential.user;
          await updateProfile(user, { displayName: values.name });
          await provisionNewUser(user, values.name, values.email, values.phoneNumber);

          setShowOtpDialog(false);
          toast({ title: "Account created!", description: "You're all set and have been logged in." });
          router.push('/dashboard');
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Verification failed.', description: error.message });
      } finally {
          setIsLoading(false);
          setOtp('');
      }
  }

  return (
    <>
        <div ref={recaptchaContainerRef}></div>
        <Tabs defaultValue="email" className="w-full" onValueChange={(value) => {
            setSignupMethod(value as 'email' | 'phone');
            form.reset();
        }}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email & Password</TabsTrigger>
                <TabsTrigger value="phone">Phone & OTP</TabsTrigger>
            </TabsList>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(signupMethod === 'email' ? handleEmailSubmit : handlePhoneSubmit)} className="space-y-4 pt-4">
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
                    <TabsContent value="email" className="space-y-4 m-0">
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
                    </TabsContent>
                    <TabsContent value="phone" className="space-y-4 m-0">
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
                                        defaultCountry="IN"
                                        value={field.value || ""}
                                        onChange={field.onChange}
                                        className="flex items-center w-full"
                                        countrySelectProps={{
                                            className: "h-10 rounded-md rounded-r-none border border-r-0 border-input bg-background px-2"
                                        }}
                                        inputComponent={React.forwardRef<HTMLInputElement>((props, ref) => <Input {...props} ref={ref as React.Ref<HTMLInputElement>} className="!rounded-l-none" />)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </TabsContent>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {signupMethod === 'email' ? 'Create Account' : 'Send Verification Code'}
                    </Button>
                </form>
            </Form>
        </Tabs>
        <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enter Verification Code</DialogTitle>
                    <DialogDescription>Please enter the 6-digit code sent to your phone.</DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-4">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </div>
                <DialogFooter>
                    <Button onClick={handleOtpVerification} disabled={isLoading || otp.length < 6}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verify & Create Account
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
