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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"


const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const phoneSchema = z.object({
    phone: z.string().min(10, { message: 'Please enter a valid phone number with country code.'}),
});

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const auth = useAuth();
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
        phone: '',
    },
  });

  // Initialize reCAPTCHA
  useEffect(() => {
    if (auth && !recaptchaVerifier.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
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
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: 'Firebase is not configured correctly.',
        });
        setIsLoading(false);
        return;
    }
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: 'Success!',
        description: 'You are now signed in.',
      });
      router.push('/dashboard');
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

  async function onPhoneSubmit(values: z.infer<typeof phoneSchema>) {
    setIsPhoneLoading(true);
    if (!auth || !recaptchaVerifier.current) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not configured correctly.' });
        setIsPhoneLoading(false);
        return;
    }
    try {
        const result = await signInWithPhoneNumber(auth, values.phone, recaptchaVerifier.current);
        setConfirmationResult(result);
        setShowPhoneInput(false);
        setShowOtpInput(true);
        toast({ title: 'Verification code sent!', description: `A code has been sent to ${values.phone}.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Phone Sign-In Failed', description: error.message });
        // Reset reCAPTCHA if it fails
        if (recaptchaVerifier.current) {
            recaptchaVerifier.current.render().then((widgetId) => {
                // @ts-ignore
                grecaptcha.reset(widgetId);
            });
        }
    } finally {
        setIsPhoneLoading(false);
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          <Button type="submit" className="w-full" disabled={isLoading || !auth}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In with Email
          </Button>
        </form>
      </Form>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
       <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading || !auth}>
          {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 74.8C307.7 99.8 280.7 86 248 86c-84.3 0-152.3 67.8-152.3 151.4s68 151.4 152.3 151.4c99.2 0 129.1-81.5 133.7-118.8H248v-94.2h239.1c2.3 12.7 3.9 26.1 3.9 40.2z"></path></svg>}
          Google
        </Button>
        <Button variant="outline" className="w-full" onClick={() => setShowPhoneInput(true)} disabled={isPhoneLoading || !auth}>
            Sign in with Phone
        </Button>
        </div>

        <Dialog open={showPhoneInput} onOpenChange={setShowPhoneInput}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Sign in with Phone Number</DialogTitle>
                    <DialogDescription>Enter your phone number with country code to receive a verification code.</DialogDescription>
                </DialogHeader>
                <Form {...phoneForm}>
                    <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                         <FormField
                            control={phoneForm.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="+1 123 456 7890" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" className="w-full" disabled={isPhoneLoading}>
                                {isPhoneLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Code
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        
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

        <div id="recaptcha-container"></div>
    </div>
  );
}
