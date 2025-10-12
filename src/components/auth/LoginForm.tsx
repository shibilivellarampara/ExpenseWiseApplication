
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, getAuth } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React from 'react';


const formSchema = z.object({
  loginId: z.string().min(1, { message: 'This field is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});


export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const auth = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loginId: '',
      password: '',
    },
  });

  useEffect(() => {
    // This effect can be used to handle redirect results if needed in the future.
    if (!auth) return;
    // getRedirectResult(auth).catch(handleLoginError);
  }, [auth]);


    const handleLoginError = (error: any) => {
        let title = "Whoops!";
        let description = "Something went wrong on our end. Please try again in a bit.";

        if (error.code) {
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    title = "Whoops!";
                    description = "Hmm, that password isn't correct. Forgetting things a lot lately?";
                    break;
                case 'auth/invalid-email':
                    title = "Is that an email?";
                    description = "That doesn't look like a valid email address. Let's try that again.";
                    break;
                case 'auth/too-many-requests':
                    title = "Easy there, tiger!";
                    description = "You've tried to log in too many times. Take a break and try again later.";
                    break;
                case 'auth/invalid-phone-number':
                    title = "Mysterious Number";
                    description = "That phone number seems to be from another dimension. Is it correct?";
                    break;
                case 'auth/popup-closed-by-user':
                    title = "Sign-In Canceled";
                    description = "You closed the sign-in window. Give it another try when you're ready!";
                    break;
                case 'auth/operation-not-supported':
                     title = "Login Error";
                     description = "Phone number and password login is not supported in this configuration. Please contact support.";
                     break;
                default:
                    title = "An Unexpected Quest!";
                    description = error.message || "Something unexpected happened. Let's give it another shot.";
                    break;
            }
        }
        
        toast({ variant: 'destructive', title: title, description: description });
    }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    if (!auth) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not configured correctly.' });
        setIsLoading(false);
        return;
    }

    try {
        // Since Firebase doesn't directly support phone+password, we treat the loginId as email.
        // The signup flow ensures that the email is constructed from the phone number.
        const loginIdentifier = loginMethod === 'phone' ? `${values.loginId}@phone.local` : values.loginId;
        await signInWithEmailAndPassword(auth, loginIdentifier, values.password);
        toast({ title: 'Success!', description: 'You are now signed in.' });
        router.push('/dashboard');
    } catch (error: any) {
        handleLoginError(error);
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
            handleLoginError(error);
        } finally {
            setIsGoogleLoading(false);
        }
    }

  async function handleForgotPassword() {
    if (!auth || !forgotPasswordEmail) {
      toast({ variant: 'destructive', title: 'Email Required', description: 'Please enter your email address.' });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotPasswordEmail);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your inbox for instructions to reset your password.',
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
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
                </TabsContent>
                
                 <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                    <FormItem>
                        <div className="flex justify-between items-center">
                            <FormLabel>Password</FormLabel>
                            <Button
                                type="button"
                                variant="link"
                                className="h-auto p-0 text-sm"
                                onClick={() => setShowForgotPassword(true)}
                            >
                                Forgot Password?
                            </Button>
                        </div>
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

                <Button type="submit" className="w-full" disabled={isLoading || !auth}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
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
          {isGoogleLoading || isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 74.8C307.7 99.8 280.7 86 248 86c-84.3 0-152.3 67.8-152.3 151.4s68 151.4 152.3 151.4c99.2 0 129.1-81.5 133.7-118.8H248v-94.2h239.1c2.3 12.7 3.9 26.1 3.9 40.2z"></path></svg>}
          Google
        </Button>
        </div>
        
         <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Forgot Password</DialogTitle>
                    <DialogDescription>Enter your email address and we'll send you a link to reset your password.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                    <Input
                        id="forgot-email"
                        type="email"
                        placeholder="name@example.com"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowForgotPassword(false)}>Cancel</Button>
                    <Button onClick={handleForgotPassword} disabled={isLoading || !forgotPasswordEmail}>
                        {isLoading ? <Loader2 className="animate-spin" /> : "Send Reset Link"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
