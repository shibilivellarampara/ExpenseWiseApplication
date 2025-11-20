
'use client';

import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { Category, UserProfile } from "@/lib/types";
import { collection, doc } from "firebase/firestore";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Loader2, ChevronDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import * as LucideIcons from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from "@/lib/utils";
import { AnalysisSettingsContent } from "./AnalysisSettingsContent";

export function AnalysisSettings() {
    const [isOpen, setIsOpen] = useState(false);
   
    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                     <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4">
                        <div>
                            <h3 className="text-base font-semibold font-headline">Analysis Settings</h3>
                            <CardDescription className="text-sm">Customize which categories to exclude.</CardDescription>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0 p-4">
                       <AnalysisSettingsContent />
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
