
'use client';

import { FamilyWallet, FamilyMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, UserPlus, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";

interface WalletHeaderProps {
    wallet: FamilyWallet;
    membership: FamilyMember;
}

export function WalletHeader({ wallet, membership }: WalletHeaderProps) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);

    const handleGenerateInvite = async () => {
        if (!user) return;
        setIsGenerating(true);
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        try {
            await setDoc(doc(firestore, 'invites', code), {
                code,
                walletId: wallet.id,
                walletName: wallet.name,
                role: 'member',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                createdBy: user.uid
            });
            setInviteCode(code);
            toast({ title: "Invite Code Generated" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed to generate code" });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => router.push('/family-wallet')} className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(true)} className="rounded-full h-9 border-primary/20 text-primary">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </div>
            </div>

            <div className="px-1">
                <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold font-headline">{wallet.name}</h1>
                    <Badge variant="secondary" className="h-5 text-[10px] uppercase font-bold px-2 rounded-full border-none bg-primary/10 text-primary">
                        {membership.role === 'owner' ? <Shield className="h-2.5 w-2.5 mr-1 inline" /> : <User className="h-2.5 w-2.5 mr-1 inline" />}
                        {membership.role}
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{wallet.description || "Shared family ledger"}</p>
            </div>

            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogContent className="rounded-[24px]">
                    <DialogHeader>
                        <DialogTitle>Invite Family Members</DialogTitle>
                        <DialogDescription>Share this code with your family to let them join this wallet.</DialogDescription>
                    </DialogHeader>
                    <div className="py-6 flex flex-col items-center gap-4">
                        {inviteCode ? (
                            <div className="bg-muted p-6 rounded-2xl w-full text-center">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Share this code</p>
                                <span className="text-4xl font-mono font-bold tracking-[0.3em] text-primary">{inviteCode}</span>
                            </div>
                        ) : (
                            <Button onClick={handleGenerateInvite} disabled={isGenerating} className="w-full h-12 rounded-xl">
                                {isGenerating ? "Generating..." : "Generate 7-Day Invite Code"}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
