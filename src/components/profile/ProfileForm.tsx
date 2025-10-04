'use client';

import { useUser, useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "firebase/auth";
import { doc } from "firebase/firestore";

export function ProfileForm() {
    const { user } = useUser();
    const firestore = useFirestore();
    const avatarImage = PlaceHolderImages.find((img) => img.id === 'avatar');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const [name, setName] = useState(user?.displayName || '');
    const [photoURL, setPhotoURL] = useState(user?.photoURL || '');

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user || !firestore) return;

        setIsLoading(true);
        try {
            await updateProfile(user, {
                displayName: name,
                photoURL: photoURL,
            });

            const userDocRef = doc(firestore, 'users', user.uid);
            updateDocumentNonBlocking(userDocRef, {
                name: name,
                photoURL: photoURL,
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
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={photoURL || avatarImage?.imageUrl} alt={name || 'User'} />
                            <AvatarFallback>{getInitials(name)}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 flex-grow">
                             <Label htmlFor="avatar-url">Profile Picture URL</Label>
                             <Input 
                                id="avatar-url" 
                                type="text" 
                                value={photoURL}
                                onChange={(e) => setPhotoURL(e.target.value)}
                                placeholder="https://example.com/image.png"
                             />
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
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}