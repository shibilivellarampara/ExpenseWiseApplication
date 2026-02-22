'use client';

import { FamilyWallet, FamilyMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, UserPlus, Shield, User, Info, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { AutoTagSettings } from "./AutoTagSettings";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    const [showSettingsSheet, setShowSettingsSheet] = useState(false);
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
                    <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(true)} className="rounded-full h-9 border-primary/20 text-primary hover:bg-primary/5">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full h-9 w-9 bg-muted/50 hover:bg-muted"
                        onClick={() => setShowSettingsSheet(true)}
                    >
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

            {/* Invite Dialog */}
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogContent className="rounded-[24px]">
                    <DialogHeader>
                        <DialogTitle className="font-headline">Invite Family Members</DialogTitle>
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
                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Generate 7-Day Invite Code
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Wallet Settings Sheet */}
            <Sheet open={showSettingsSheet} onOpenChange={setShowSettingsSheet}>
                <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 rounded-l-[32px] border-none shadow-2xl">
                    <SheetHeader className="p-6 pb-4 shrink-0">
                        <SheetTitle className="font-headline text-xl">Wallet Settings</SheetTitle>
                        <SheetDescription>Configure synchronization and manage members.</SheetDescription>
                    </SheetHeader>
                    
                    <ScrollArea className="flex-1 px-6">
                        <div className="space-y-8 pb-10">
                            {/* Wallet Info (Read Only for now) */}
                            <div className="p-4 rounded-[24px] bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Info className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{wallet.name}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Wallet Reference: {wallet.id}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">{wallet.description || "No description provided."}</p>
                            </div>

                            <Separator />

                            {/* Auto-Tag Synchronization */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-primary" />
                                    <h3 className="text-base font-bold font-headline">Auto-Sync Triggers</h3>
                                </div>
                                <AutoTagSettings walletId={wallet.id} />
                            </div>
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
    );
}
