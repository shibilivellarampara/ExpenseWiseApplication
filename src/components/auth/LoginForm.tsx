'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const formSchema = z.object({
  loginId: z.string().min(1, { message: 'This field is required.' }),
  password: z.string().optional(),
});


export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const auth = useAuth();
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loginId: '',
      password: '',
    },
  });

  // Initialize reCAPTCHA
  useEffect(() => {
    if (auth && recaptchaContainerRef.current && !recaptchaVerifier.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved, allow sign-in
        }
      });
    }
  }, [auth]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    if (!auth) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not configured correctly.' });
        setIsLoading(false);
        return;
    }

    if (loginMethod === 'email') {
        if (!values.password) {
            form.setError('password', { type: 'manual', message: 'Password is required for email login.' });
            setIsLoading(false);
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, values.loginId, values.password);
            toast({ title: 'Success!', description: 'You are now signed in.' });
            router.push('/dashboard');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    } else if (loginMethod === 'phone') {
        if (!recaptchaVerifier.current) {
            toast({ variant: 'destructive', title: 'Error', description: 'reCAPTCHA not initialized.' });
            setIsLoading(false);
            return;
        }
        try {
            const result = await signInWithPhoneNumber(auth, values.loginId, recaptchaVerifier.current);
            setConfirmationResult(result);
            setShowOtpInput(true);
            toast({ title: 'Verification code sent!', description: `A code has been sent to ${values.loginId}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Phone Sign-In Failed', description: error.message });
             if (recaptchaVerifier.current) {
                // @ts-ignore
                grecaptcha.reset(recaptchaVerifier.current.widgetId);
            }
        } finally {
            setIsLoading(false);
        }
    } else {
        toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a valid email or phone number.' });
        setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    if (!auth) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not configured correctly.' });
        setIsGoogleLoading(false);
        return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: 'Success!', description: 'You are now signed in with Google.' });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Google Sign-In Failed', description: error.message || 'Could not sign in with Google.' });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function handleOtpSubmit(otp: string) {
    if (!confirmationResult) return;
    setIsLoading(true);
    try {
        await confirmationResult.confirm(otp);
        toast({ title: 'Success!', description: 'You are now signed in.' });
        router.push('/dashboard');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'OTP Verification Failed', description: error.message });
    } finally {
        setIsLoading(false);
        setShowOtpInput(false);
    }
  }


  return (
    <div className="space-y-4">
      <Tabs defaultValue="email" className="w-full" onValueChange={(value) => setLoginMethod(value as 'email' | 'phone')}>
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Phone</TabsTrigger>
        </TabsList>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <TabsContent value="email" className="space-y-4 m-0">
                    <FormField
                        control={form.control}
                        name="loginId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="name@example.com" {...field} type="email"/>
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
                </TabsContent>

                <TabsContent value="phone" className="space-y-4 m-0">
                    <FormField
                        control={form.control}
                        name="loginId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                                <PhoneInput
                                    international
                                    defaultCountry="IN"
                                    placeholder="Enter phone number"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </TabsContent>

                <Button type="submit" className="w-full" disabled={isLoading || !auth}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loginMethod === 'phone' ? 'Send Verification Code' : 'Sign In'}
                </Button>
            </form>
        </Form>
      </Tabs>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
       <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading || !auth}>
          {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 74.8C307.7 99.8 280.7 86 248 86c-84.3 0-152.3 67.8-152.3 151.4s68 151.4 152.3 151.4c99.2 0 129.1-81.5 133.7-118.8H248v-94.2h239.1c2.3 12.7 3.9 26.1 3.9 40.2z"></path></svg>}
          Google
        </Button>
        </div>
        
        <Dialog open={showOtpInput} onOpenChange={setShowOtpInput}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enter Verification Code</DialogTitle>
                    <DialogDescription>Please enter the 6-digit code sent to your phone.</DialogDescription>
                </DialogHeader>
                <div className="flex justify-center">
                    <InputOTP maxLength={6} onComplete={handleOtpSubmit}>
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
                 {isLoading && <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin" />}
            </DialogContent>
        </Dialog>

        <div ref={recaptchaContainerRef}></div>
    </div>
  );
}
