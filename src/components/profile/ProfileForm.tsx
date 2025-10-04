'use client';

import { useUser, useFirestore, updateDocumentNonBlocking, useStorage } from "@/firebase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Loader2, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "firebase/auth";
import { doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export function ProfileForm() {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const avatarImage = PlaceHolderImages.find((img) => img.id === 'avatar');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();
    const [name, setName] = useState(user?.displayName || '');
    const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `avatars/${user.uid}/${file.name}`);
            const uploadResult = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(uploadResult.ref);
            
            setPhotoURL(downloadURL);
            toast({ title: "Image Uploaded", description: "Your new profile picture is ready. Click 'Save Changes' to apply it." });

        } catch (error: any) {
             toast({ variant: "destructive", title: "Upload Failed", description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user || !firestore) return;

        setIsLoading(true);
        try {
            // Use current state values for update
            const newName = name;
            const newPhotoURL = photoURL;
            
            await updateProfile(user, {
                displayName: newName,
                photoURL: newPhotoURL,
            });

            const userDocRef = doc(firestore, 'users', user.uid);
            updateDocumentNonBlocking(userDocRef, {
                name: newName,
                photoURL: newPhotoURL,
            });

            toast({ title: "Profile Updated", description: "Your changes have been saved." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="max-w-2xl">
             <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle className="font-headline">Profile Details</CardTitle>
                    <CardDescription>Update your personal information here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                                disabled={isUploading}
                            >
                                 {isUploading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                 ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                 )}
                                Upload from Gallery
                             </Button>
                             <p className="text-xs text-muted-foreground">Recommended: Square image, under 2MB.</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={user?.email || ''} disabled />
                    </div>
                </CardContent>
                <CardFooter className="border-t pt-6 flex justify-end">
                    <Button type="submit" disabled={isLoading || isUploading}>
                        {(isLoading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
