'use client';

import { useUser, useFirestore, useStorage, useAuth } from "@/firebase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Loader2, Upload } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export function ProfileForm() {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const auth = useAuth();
    const avatarImage = PlaceHolderImages.find((img) => img.id === 'avatar');
    
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const [name, setName] = useState(user?.displayName || '');
    // photoURL state now holds the local preview or the remote URL
    const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
    // This new state will hold the file object to be uploaded
    const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1 && names[1]) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };
    
    // Updated to show an instant preview
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        // Create a local URL for instant preview
        const localImageUrl = URL.createObjectURL(file);
        setPhotoURL(localImageUrl);
        setNewAvatarFile(file); // Store the file for later upload
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user || !firestore || !auth.currentUser) return;

        setIsLoading(true);
        
        let finalPhotoURL = user.photoURL || '';

        // Check if a new avatar file was selected
        if (newAvatarFile) {
            setIsUploading(true);
            try {
                const storageRef = ref(storage, `avatars/${user.uid}/${newAvatarFile.name}`);
                const uploadResult = await uploadBytes(storageRef, newAvatarFile);
                finalPhotoURL = await getDownloadURL(uploadResult.ref);
                setNewAvatarFile(null); // Clear the file after upload
            } catch (error: any) {
                toast({ variant: "destructive", title: "Upload Failed", description: error.message });
                setIsLoading(false);
                setIsUploading(false);
                return; // Stop if upload fails
            }
            setIsUploading(false);
        }

        try {
            await updateProfile(auth.currentUser, {
                displayName: name,
                photoURL: finalPhotoURL,
            });

            const userDocRef = doc(firestore, 'users', user.uid);
            // Use setDoc with merge to be safe
            await setDoc(userDocRef, {
                name: name,
                photoURL: finalPhotoURL,
            }, { merge: true });

            // Update the local state to the final URL
            if(finalPhotoURL) setPhotoURL(finalPhotoURL);
            
            toast({ title: "Profile Updated", description: "Your changes have been saved." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error updating profile", description: error.message });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="h-full">
             <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="font-headline">Profile Details</CardTitle>
                    <CardDescription>Update your personal information here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 flex-grow">
                    <div className="flex items-center gap-6">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={photoURL || avatarImage?.imageUrl} alt={name || 'User'} />
                            <AvatarFallback>{getInitials(name)}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                             <Label>Profile Picture</Label>
                             <Input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange}
                                className="hidden" 
                                accept="image/*"
                             />
                             <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Upload from Gallery
                             </Button>
                             <p className="text-xs text-muted-foreground">Recommended: Square image, under 2MB.</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={user?.email || ''} disabled />
                    </div>
                </CardContent>
                <CardFooter className="border-t pt-6 flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isUploading ? 'Uploading...' : 'Save Changes'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

    