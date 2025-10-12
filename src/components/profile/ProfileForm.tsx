
'use client';

import { useUser, useFirestore, useStorage, useAuth, useDoc, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, Upload, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateProfile, RecaptchaVerifier, updatePhoneNumber, PhoneAuthProvider, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Separator } from "../ui/separator";
import { UserProfile } from "@/lib/types";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { AvatarList } from "./Avatars";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";

const currencies = ["USD", "EUR", "JPY", "GBP", "INR"];

export function ProfileForm() {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const auth = useAuth();
    const [isOpen, setIsOpen] = useState(true);

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();
    
    const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);

    const [nameInput, setNameInput] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState<string>('');
    const [tempDisplayPhotoUrl, setTempDisplayPhotoUrl] = useState<string | null>(null);


    useEffect(() => {
        if (userProfile) {
            setNameInput(userProfile.name ?? '');
            setTempDisplayPhotoUrl(userProfile.photoURL ?? null);
            setSelectedCurrency(userProfile.defaultCurrency || 'INR');
        }
    }, [userProfile]);


    // State for phone number update
    const [showPhoneDialog, setShowPhoneDialog] = useState(false);
    const [showOtpDialog, setShowOtpDialog] = useState(false);
    const [newPhoneNumber, setNewPhoneNumber] = useState<string | undefined>("");
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<any>(null);
    const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);
    
    // State for email update
    const [showEmailDialog, setShowEmailDialog] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');


    const fileInputRef = useRef<HTMLInputElement>(null);

     // Initialize reCAPTCHA for phone update
    useEffect(() => {
        if (showPhoneDialog && auth && recaptchaContainerRef.current && !recaptchaVerifier.current) {
            recaptchaVerifier.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
                'size': 'invisible',
            });
            recaptchaVerifier.current.render();
        }
    }, [showPhoneDialog, auth]);


    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        const localImageUrl = URL.createObjectURL(file);
        setTempDisplayPhotoUrl(localImageUrl);
        setNewAvatarFile(file);
    };

    const handleAvatarSelect = (svgString: string) => {
        const dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
        setTempDisplayPhotoUrl(dataUrl);
        setNewAvatarFile(null);
    }

    const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user || !firestore || !auth?.currentUser) return;

        setIsLoading(true);
        
        let finalPhotoURL = userProfile?.photoURL ?? null;

        if (tempDisplayPhotoUrl && tempDisplayPhotoUrl !== (userProfile?.photoURL ?? null)) {
            // If a new file was uploaded, handle the upload process
            if (newAvatarFile) {
                setIsUploading(true);
                try {
                    const storageRef = ref(storage, `avatars/${user.uid}/${newAvatarFile.name}`);
                    const uploadResult = await uploadBytes(storageRef, newAvatarFile);
                    finalPhotoURL = await getDownloadURL(uploadResult.ref);
                    setNewAvatarFile(null); 
                } catch (error: any) {
                    toast({ variant: "destructive", title: "Upload Failed", description: error.message });
                    setIsLoading(false);
                    setIsUploading(false);
                    return;
                }
                setIsUploading(false);
            } else if(tempDisplayPhotoUrl.startsWith('data:image/svg+xml')) {
                 finalPhotoURL = tempDisplayPhotoUrl;
            }
        }


        try {
             // Update Firebase Auth profile
            await updateProfile(auth.currentUser, {
                displayName: nameInput,
                photoURL: finalPhotoURL,
            });

            // Data to be saved in Firestore
            const userProfileData: Partial<UserProfile> = {
                name: nameInput,
                defaultCurrency: selectedCurrency,
            };

            if (finalPhotoURL !== null) {
                userProfileData.photoURL = finalPhotoURL;
            }

            // Update Firestore document non-blockingly
            const userDocRef = doc(firestore, 'users', user.uid);
            setDocumentNonBlocking(userDocRef, userProfileData, { merge: true });
            
            toast({ title: "Profile Updated", description: "Your changes have been saved." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error updating profile", description: error.message });
        } finally {
            setIsLoading(false);
        }
    }

    const handleSendPhoneVerification = async () => {
        if (!auth?.currentUser || !recaptchaVerifier.current || !newPhoneNumber) return;
        setIsLoading(true);
        try {
            const phoneProvider = new PhoneAuthProvider(auth);
            const verificationId = await phoneProvider.verifyPhoneNumber(
                newPhoneNumber,
                recaptchaVerifier.current
            );
            setConfirmationResult({ verificationId });
            setShowPhoneDialog(false);
            setShowOtpDialog(true);
            toast({ title: "Verification code sent!" });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Failed to send code", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtpAndUpdatePhone = async () => {
        if (!auth?.currentUser || !confirmationResult || !otp) return;
        setIsLoading(true);
        try {
            const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otp);
            await updatePhoneNumber(auth.currentUser, credential);
            
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, { phoneNumber: newPhoneNumber }, { merge: true });

            toast({ title: "Phone Number Updated!" });
            setShowOtpDialog(false);
            setNewPhoneNumber('');
            setOtp('');

        } catch (error: any) {
            toast({ variant: "destructive", title: "Phone Update Failed", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEmailUpdate = async () => {
        if (!user || !auth?.currentUser || !newEmail || !currentPassword) {
            toast({ variant: "destructive", title: "Missing fields", description: "Please enter new email and current password." });
            return;
        }

        setIsLoading(true);

        try {
            // Re-authenticate the user
            const credential = EmailAuthProvider.credential(user.email!, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);

            // Update email in Firebase Auth
            await updateEmail(auth.currentUser, newEmail);

            // Update email in Firestore
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, { email: newEmail }, { merge: true });
            
            toast({ title: "Email Updated", description: "Your email has been successfully updated." });
            setShowEmailDialog(false);
            setNewEmail('');
            setCurrentPassword('');

        } catch (error: any) {
            toast({ variant: "destructive", title: "Email Update Failed", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const currentPhoto = tempDisplayPhotoUrl ?? userProfile?.photoURL;
    
    const displayCurrency = selectedCurrency || userProfile?.defaultCurrency;

    if (isProfileLoading) {
        return (
            <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold font-headline">Profile Details</h3>
                </CardHeader>
                <CardContent className="space-y-4 flex items-center justify-center py-10">
                    <Loader2 className="mx-auto animate-spin" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-fit">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
             <form onSubmit={handleProfileSubmit}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
                        <div>
                            <h3 className="text-lg font-semibold font-headline">Profile Details</h3>
                            <CardDescription>Update your personal information here.</CardDescription>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Profile Picture</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button type="button" className="relative h-24 w-24 rounded-full">
                                    <Avatar className="h-24 w-24">
                                        <AvatarImage src={currentPhoto ?? undefined} alt={nameInput || 'User'} />
                                        <AvatarFallback>{getInitials(nameInput)}</AvatarFallback>
                                    </Avatar>
                                     <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white text-xs font-semibold rounded-full opacity-0 hover:opacity-100 transition-opacity">
                                        Change
                                    </div>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <h4 className="font-medium leading-none">Change Avatar</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Upload a custom photo or select a pre-designed avatar.
                                    </p>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isLoading}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload from Gallery
                                    </Button>
                                    <Input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange}
                                        className="hidden" 
                                        accept="image/*"
                                    />
                                    <Separator />
                                    <div className="grid grid-cols-4 gap-2">
                                        {AvatarList.map((AvatarItem, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleAvatarSelect(AvatarItem.svgString)}
                                                className={cn(
                                                    "rounded-full p-1 ring-2 ring-transparent hover:ring-primary focus:ring-primary focus:outline-none transition-all",
                                                    currentPhoto === `data:image/svg+xml;base64,${btoa(AvatarItem.svgString)}` && "ring-primary ring-offset-2"
                                                )}
                                            >
                                               <div className="w-16 h-16 rounded-full overflow-hidden">
                                                    <AvatarItem.component />
                                               </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} disabled={isLoading} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="defaultCurrency">Default Currency</Label>
                        <Select onValueChange={setSelectedCurrency} value={displayCurrency} disabled={isLoading}>
                            <SelectTrigger id="defaultCurrency">
                                <SelectValue placeholder="Select a currency" />
                            </SelectTrigger>
                            <SelectContent>
                                {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                         <div className="flex items-center gap-2">
                            <Input id="email" type="email" value={userProfile?.email || ''} disabled />
                            <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline">Edit</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Update Email</DialogTitle>
                                        <DialogDescription>Enter a new email and your current password to make this change.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <Input 
                                            placeholder="New email address" 
                                            type="email"
                                            value={newEmail} 
                                            onChange={(e) => setNewEmail(e.target.value)}
                                        />
                                        <Input 
                                            placeholder="Current password" 
                                            type="password"
                                            value={currentPassword} 
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleEmailUpdate} disabled={isLoading}>
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Save Changes
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="flex items-center gap-2">
                            <Input id="phone" type="tel" value={userProfile?.phoneNumber || 'Not provided'} disabled />
                            <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline">Edit</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Update Phone Number</DialogTitle>
                                        <DialogDescription>Enter your new phone number with country code. A verification code will be sent.</DialogDescription>
                                    </DialogHeader>
                                     <PhoneInput
                                        international
                                        defaultCountry="IN"
                                        placeholder="Enter phone number"
                                        value={newPhoneNumber}
                                        onChange={setNewPhoneNumber}
                                        className="mt-2"
                                    />
                                    <DialogFooter>
                                        <Button onClick={handleSendPhoneVerification} disabled={isLoading}>
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Send Code
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t pt-6 flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isUploading ? 'Uploading...' : 'Save Changes'}
                    </Button>
                </CardFooter>
                </CollapsibleContent>
            </form>
             <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enter Verification Code</DialogTitle>
                        <DialogDescription>Please enter the 6-digit code sent to {newPhoneNumber}.</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center">
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
                        <Button onClick={handleVerifyOtpAndUpdatePhone} disabled={isLoading || otp.length < 6}>
                             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Verify and Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div ref={recaptchaContainerRef}></div>
            </Collapsible>
        </Card>
    );
}
