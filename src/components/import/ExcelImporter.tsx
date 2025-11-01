
'use client';

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { FileUp, Loader2, CheckCircle, ArrowRight, ListChecks, FileCheck2, AlertTriangle, Sparkles, Pilcrow, ArrowLeft, Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from "@/firebase";
import { doc } from 'firebase/firestore';
import { UserProfile, Category, Account, Tag } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/currencies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { collection, writeBatch, increment, addDoc, getDocs, query, where, doc as firestoreDoc, setDoc } from 'firebase/firestore';
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import * as LucideIcons from 'lucide-react';
import { cn } from "@/lib/utils";
import { Progress } from "../ui/progress";
import { Checkbox } from "../ui/checkbox";
import Link from "next/link";


type RowData = { [key: string]: any };
type ColumnMapping = {
    date: string;
    time?: string | null;
    description: string;
    category: string;
    tags?: string | null;
    mode?: string | null; // For account
    // For cashbook style
    cashIn?: string | null;
    cashOut?: string | null;
    // For default style
    amount?: string | null;
};

const TEMPLATES: { [key: string]: { name: string, mapping: ColumnMapping, description: string } } = {
    'default': {
        name: 'Default Template',
        mapping: { date: 'Date', time: 'Time', amount: 'Amount', description: 'Description', category: 'Category', tags: 'Tags', mode: 'Account' },
        description: "Standard: Date, Time, Amount, Description, etc."
    },
    'cashbook': {
        name: 'Cashbook App',
        mapping: { date: 'Date', time: 'Time', description: 'Remark', category: 'Category', cashIn: 'Cash In', cashOut: 'Cash Out', mode: 'Mode' },
        description: "For Cashbook app exports."
    },
    'spendee': {
        name: 'Spendee App',
        mapping: { date: 'Date', time: 'Time', amount: 'Amount', description: 'Notes', category: 'Category', tags: 'Tags', mode: 'Wallet' },
        description: "For Spendee exports."
    },
    'custom_detailed': {
        name: 'Custom Detailed',
        mapping: { date: 'Date', time: 'Time', description: 'Old Description', category: 'Category', tags: 'Tags', cashIn: 'CASH IN', cashOut: 'CASH OUT', mode: 'ACCOUNT'},
        description: "For detailed sheets with separate cash in/out."
    },
};

type AccountAction = {
    action: 'create' | 'map';
    targetId?: string; // only if action is 'map'
    type?: Account['type']; // only if action is 'create'
}
type AccountMapping = { [key:string]: AccountAction };


export function ExcelImporter() {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [template, setTemplate] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const [rawData, setRawData] = useState<RowData[]>([]);
    const [validationError, setValidationError] = useState<string | null>(null);

    const [newCategories, setNewCategories] = useState<string[]>([]);
    const [newTags, setNewTags] = useState<string[]>([]);
    const [newAccounts, setNewAccounts] = useState<string[]>([]);
    
    const [selectedAccountsToImport, setSelectedAccountsToImport] = useState<string[]>([]);


    const [accountMappings, setAccountMappings] = useState<AccountMapping>({});
    
    const [importAccountId, setImportAccountId] = useState<string>(''); // For single account import
    const [importedCount, setImportedCount] = useState(0);
    const [importComplete, setImportComplete] = useState(false);

    const { toast } = useToast();

    const { user } = useUser();
    const firestore = useFirestore();

    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [user, firestore]);
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [user, firestore]);
    const tagsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/tags`) : null, [user, firestore]);

    const { data: accounts } = useCollection<Account>(accountsQuery);
    const { data: existingCategories } = useCollection<Category>(categoriesQuery);
    const { data: existingTags } = useCollection<Tag>(tagsQuery);

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);


    useEffect(() => {
        if (newAccounts.length > 0) {
            const initialMappings: AccountMapping = {};
            newAccounts.forEach(accName => {
                initialMappings[accName] = { action: 'create', type: 'bank' };
            });
            setAccountMappings(initialMappings);
            setSelectedAccountsToImport(newAccounts); // By default, select all new accounts for import
        }
    }, [newAccounts]);


    const handleFileParseAndValidate = (fileToParse: File) => {
        if (!template) {
            toast({ variant: 'destructive', title: 'Template not selected', description: 'Please select a template first.' });
            return;
        }
        setIsProcessing(true);
        setValidationError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const headers = (XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false })[0] || []);

                const expectedMapping = TEMPLATES[template].mapping;
                // Dynamically build the list of required columns from the selected template's mapping
                const requiredColumns = Object.entries(expectedMapping)
                    .filter(([key, value]) => value && (key === 'date' || key === 'description' || key === 'category' || key === 'amount' || key === 'cashIn' || key === 'cashOut'))
                    .map(([, value]) => value);


                const missingColumns = requiredColumns.filter(col => col && !headers.includes(col));

                if (missingColumns.length > 0) {
                    throw new Error(`The following required columns are missing for the selected template: ${missingColumns.join(', ')}`);
                }

                const jsonData = XLSX.utils.sheet_to_json<RowData>(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });
                setRawData(jsonData);

                const existingCategoryNames = new Set(existingCategories?.map(c => c.name.toLowerCase()));
                const existingTagNames = new Set(existingTags?.map(t => t.name.toLowerCase()));
                const existingAccountNames = new Set(accounts?.map(a => a.name.toLowerCase()));
                
                const foundNewCategories = new Set<string>();
                const foundNewTags = new Set<string>();
                const foundNewAccounts = new Set<string>();

                jsonData.forEach(row => {
                    const categoryName = row[expectedMapping.category];
                    if (categoryName && !existingCategoryNames.has(String(categoryName).toLowerCase())) {
                        foundNewCategories.add(String(categoryName));
                    }
                    if (expectedMapping.tags) {
                        const tagsString = row[expectedMapping.tags];
                        if (tagsString) {
                            const tags = String(tagsString).split(',').map((t: string) => t.trim());
                            tags.forEach((tagName: string) => {
                                if (tagName && !existingTagNames.has(tagName.toLowerCase())) {
                                    foundNewTags.add(tagName);
                                }
                            });
                        }
                    }
                    if (expectedMapping.mode) {
                        const accountName = row[expectedMapping.mode];
                        if(accountName && !existingAccountNames.has(String(accountName).toLowerCase())){
                            foundNewAccounts.add(String(accountName));
                        }
                    }
                });

                setNewCategories(Array.from(foundNewCategories));
                setNewTags(Array.from(foundNewTags));
                setNewAccounts(Array.from(foundNewAccounts));
                setFile(fileToParse);
                setStep(3);

            } catch (error: any) {
                toast({ variant: 'destructive', title: 'File Error', description: error.message });
                setFile(null);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.onerror = () => {
            toast({ variant: 'destructive', title: 'File Read Error' });
            setIsProcessing(false);
        };
        reader.readAsBinaryString(fileToParse);
    };

    const allProcessedData = useMemo(() => {
        if (rawData.length === 0 || !template) return [];
        const mapping = TEMPLATES[template].mapping;
        
        return rawData.map((row) => {
            const dateValue = row[mapping.date];
            let datePart: Date;

            // Handle Excel's numeric date format or string format
            if (typeof dateValue === 'number') {
                const parsed = XLSX.SSF.parse_date_code(dateValue);
                datePart = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, 0, 0, 0));
            } else if (dateValue instanceof Date) {
                datePart = new Date(Date.UTC(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate()));
            } else if (typeof dateValue === 'string') {
                const parsedDate = new Date(dateValue + 'T00:00:00Z'); // Assume UTC to avoid timezone shifts
                if (!isNaN(parsedDate.getTime())) {
                    datePart = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));
                } else {
                    datePart = new Date(); // Fallback
                }
            } else {
                datePart = new Date(); // Fallback
            }

            if (isNaN(datePart.getTime())) {
                datePart = new Date(); // Final fallback for invalid dates
            }

            let finalDate = datePart;

            if (mapping.time && row[mapping.time]) {
                const timeValue = row[mapping.time];
                if (timeValue instanceof Date) { 
                    finalDate.setUTCHours(timeValue.getUTCHours(), timeValue.getUTCMinutes(), timeValue.getUTCSeconds());
                } else if (typeof timeValue === 'number') { 
                    const secondsInDay = timeValue * 86400;
                    const hours = Math.floor(secondsInDay / 3600);
                    const minutes = Math.floor((secondsInDay % 3600) / 60);
                    const seconds = Math.round(secondsInDay % 60);
                    finalDate.setUTCHours(hours, minutes, seconds);
                } else if (typeof timeValue === 'string') {
                    const timeMatch = timeValue.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
                    if (timeMatch) {
                        let [_, hoursStr, minutesStr, secondsStr, ampm] = timeMatch;
                        let hours = parseInt(hoursStr, 10);
                        const minutes = parseInt(minutesStr, 10);
                        const seconds = secondsStr ? parseInt(secondsStr, 10) : 0;
                        if (ampm && ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
                        if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
                        finalDate.setUTCHours(hours, minutes, seconds);
                    }
                }
            }

            const description = row[mapping.description] || 'Imported Transaction';
            const categoryName = row[mapping.category] || 'Other';
            const tags = mapping.tags && row[mapping.tags] ? String(row[mapping.tags]).split(',').map((t: string) => t.trim()) : [];
            const accountName = mapping.mode ? row[mapping.mode] : null;
            
            let amount = 0;
            let type: 'income' | 'expense' = 'expense';

            if (mapping.cashIn && mapping.cashOut) {
                const cashIn = parseFloat(row[mapping.cashIn]);
                const cashOut = parseFloat(row[mapping.cashOut]);
                if (!isNaN(cashIn) && cashIn > 0) {
                    amount = cashIn;
                    type = 'income';
                } else if (!isNaN(cashOut) && cashOut > 0) {
                    amount = cashOut;
                    type = 'expense';
                }
            } else if (mapping.amount) {
                const parsedAmount = parseFloat(String(row[mapping.amount]).replace(/[^0-9.-]+/g,""));
                if (!isNaN(parsedAmount)) {
                    amount = Math.abs(parsedAmount);
                    type = parsedAmount < 0 ? 'expense' : 'income';
                }
            }
            
            return { date: finalDate, amount, description, categoryName, tags, type, accountName };
        }).filter(item => !isNaN(item.amount) && item.amount > 0);
    }, [rawData, template]);

    const processedData = useMemo(() => {
        if (!template) return [];
        // If there's an account column in the template, filter by selected accounts
        if (TEMPLATES[template].mapping.mode) {
             return allProcessedData.filter(item => selectedAccountsToImport.includes(item.accountName));
        }
        // Otherwise, just return all data (for imports into a single chosen account)
        return allProcessedData;
    }, [allProcessedData, selectedAccountsToImport, template]);


    const handleImport = async () => {
        if (processedData.length === 0 || !user || !firestore || !accounts || !existingCategories || !existingTags) return;
        setIsImporting(true);
        setImportedCount(0);
        setImportComplete(false);
    
        const BATCH_SIZE = 499; // Firestore batch limit is 500
        const totalBatches = Math.ceil(processedData.length / BATCH_SIZE);
        const mapping = TEMPLATES[template].mapping;
    
        try {
            // --- 1. Create new categories, tags, and accounts in a preliminary batch ---
            const preliminaryBatch = writeBatch(firestore);
            const newCategoryRefs = new Map<string, string>();
            const newTagRefs = new Map<string, string>();
            const newAccountRefs = new Map<string, { id: string; type: Account['type'] }>();
            
            const categoriesCol = collection(firestore, `users/${user.uid}/categories`);
            const tagsCol = collection(firestore, `users/${user.uid}/tags`);
            const accountsCol = collection(firestore, `users/${user.uid}/accounts`);
    
            newCategories.forEach(catName => {
                const catRef = firestoreDoc(categoriesCol);
                preliminaryBatch.set(catRef, { id: catRef.id, name: catName, icon: 'Shapes', userId: user.uid });
                newCategoryRefs.set(catName.toLowerCase(), catRef.id);
            });
    
            newTags.forEach(tagName => {
                const tagRef = firestoreDoc(tagsCol);
                preliminaryBatch.set(tagRef, { id: tagRef.id, name: tagName, icon: 'Tag', userId: user.uid });
                newTagRefs.set(tagName.toLowerCase(), tagRef.id);
            });
    
            Object.keys(accountMappings).forEach(accName => {
                if (selectedAccountsToImport.includes(accName)) {
                    const mappingInfo = accountMappings[accName];
                    if (mappingInfo.action === 'create') {
                        const accRef = firestoreDoc(accountsCol);
                        const accountType = mappingInfo.type || 'bank';
                        preliminaryBatch.set(accRef, { id: accRef.id, name: accName, icon: 'Landmark', type: accountType, balance: 0, status: 'active', userId: user.uid });
                        newAccountRefs.set(accName.toLowerCase(), { id: accRef.id, type: accountType });
                    }
                }
            });
            await preliminaryBatch.commit();
    
            // --- 2. Build comprehensive maps for all items (existing + new) ---
            const allAccounts: Account[] = [
                ...(accounts || []),
                ...Array.from(newAccountRefs.entries()).map(([name, { id, type }]) => ({ id, name, type, balance: 0, userId: user.uid, status: 'active', icon: 'Landmark' }))
            ];
            const accountMap = new Map(allAccounts.map(a => [a.name.toLowerCase(), a]));
            
            const allCategories: Category[] = [...(existingCategories || []), ...Array.from(newCategoryRefs.entries()).map(([name, id]) => ({ id, name, icon: 'Shapes', userId: user.uid }))];
            const categoryMap = new Map(allCategories.map(c => [c.name.toLowerCase(), c.id]));
    
            const allTags: Tag[] = [...(existingTags || []), ...Array.from(newTagRefs.entries()).map(([name, id]) => ({ id, name, icon: 'Tag', userId: user.uid }))];
            const tagMap = new Map(allTags.map(t => [t.name.toLowerCase(), t.id]));
            
            const chosenAccountId = importAccountId || allAccounts.find(a => a.type === 'cash')?.id || allAccounts[0]?.id;
    
            // --- 3. Process transactions in chunks ---
            for (let i = 0; i < totalBatches; i++) {
                const batch = writeBatch(firestore);
                const chunk = processedData.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
                const balanceChanges = new Map<string, number>();
    
                chunk.forEach(item => {
                    const expensesCol = collection(firestore, `users/${user.uid}/expenses`);
                    const expenseRef = firestoreDoc(expensesCol);
    
                    const categoryId = categoryMap.get(String(item.categoryName)?.toLowerCase());
                    const tagIds = item.tags.map((tagName: string) => tagMap.get(tagName.toLowerCase())).filter(Boolean) as string[];
    
                    let finalAccountId: string | undefined = chosenAccountId;
                    let accountForTx: Account | undefined;
    
                    if (mapping.mode && item.accountName) {
                        const accNameLower = String(item.accountName).toLowerCase();
                        const mappingAction = accountMappings[item.accountName];
    
                        if (mappingAction?.action === 'map' && mappingAction.targetId) {
                            finalAccountId = mappingAction.targetId;
                        } else {
                            finalAccountId = accountMap.get(accNameLower)?.id;
                        }
                    }
                    accountForTx = allAccounts.find(a => a.id === finalAccountId);
                    
                    if (!finalAccountId || !accountForTx) return;
    
                    batch.set(expenseRef, {
                        id: expenseRef.id, userId: user.uid, type: item.type, amount: item.amount,
                        description: item.description, date: item.date, accountId: finalAccountId,
                        categoryId: categoryId, tagIds: tagIds, createdAt: new Date(),
                    });
                    
                    const change = accountForTx.type === 'credit_card'
                        ? (item.type === 'expense' ? item.amount : -item.amount)
                        : (item.type === 'income' ? item.amount : -item.amount);
                    balanceChanges.set(finalAccountId, (balanceChanges.get(finalAccountId) || 0) + change);
                });
    
                balanceChanges.forEach((change, accId) => {
                    const accountRef = firestoreDoc(firestore, `users/${user.uid}/accounts`, accId);
                    batch.update(accountRef, { balance: increment(change) });
                });
    
                await batch.commit();
                setImportedCount(prev => prev + chunk.length);
            }
    
            toast({
                title: 'Import Successful',
                description: `${processedData.length} expenses were added.`,
            });
            setImportComplete(true);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Import Error', description: error.message });
            setImportComplete(false);
        } finally {
            setIsImporting(false);
        }
    };
    

    const resetState = () => {
        setStep(1);
        setFile(null);
        setRawData([]);
        setValidationError(null);
        setTemplate('');
        setNewCategories([]);
        setNewTags([]);
        setNewAccounts([]);
        setAccountMappings({});
        setImportAccountId('');
        setImportedCount(0);
        setImportComplete(false);
    }

    const renderIcon = (iconName: string | undefined, className?: string) => {
        if (!iconName) return <Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className={cn("h-4 w-4", className)} /> : <Pilcrow className={cn("h-4 w-4", className)} />;
    };
    
    const handleAccountMappingChange = (accountName: string, value: string) => {
        if(value === 'create_new') {
            setAccountMappings(prev => ({ ...prev, [accountName]: { ...prev[accountName], action: 'create' } }));
        } else {
             setAccountMappings(prev => ({ ...prev, [accountName]: { ...prev[accountName], action: 'map', targetId: value } }));
        }
    }

     const handleAccountTypeChange = (accountName: string, type: Account['type']) => {
        setAccountMappings(prev => ({
            ...prev,
            [accountName]: {
                ...prev[accountName],
                action: 'create', // Ensure action is 'create'
                type: type,
            }
        }));
    };
    
    const handleAccountSelectionChange = (accountName: string) => {
        setSelectedAccountsToImport(prev => 
            prev.includes(accountName)
                ? prev.filter(name => name !== accountName)
                : [...prev, accountName]
        );
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Step {step}: {
                    step === 1 ? 'Select Template' : step === 2 ? 'Upload File' : step === 3 ? 'Review & Map New Items' : 'Confirm & Import'
                }</CardTitle>
                <CardDescription>
                    {step === 1 && 'Choose a template that matches your file format.'}
                    {step === 2 && `Ready to upload a file.`}
                    {step === 3 && 'We found some new items in your file. Review and map them before importing.'}
                    {step === 4 && (importComplete ? 'Import complete!' : `A summary of your import. Ready to add ${processedData.length} transactions.`)}
                </CardDescription>
            </CardHeader>
             <CardContent className="space-y-4">
                 {importComplete ? (
                    <div className="flex flex-col items-center justify-center text-center p-8">
                        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                        <h3 className="text-xl font-semibold">Import Successful</h3>
                        <p className="text-muted-foreground mt-2">{importedCount} transactions have been added to your records.</p>
                        <div className="flex gap-2 mt-6">
                             <Button onClick={resetState} variant="outline">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Import Another File
                            </Button>
                             <Button asChild>
                                <Link href="/expenses">
                                    <Send className="mr-2 h-4 w-4" />
                                    Go to Transactions
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : isImporting ? (
                     <div className="space-y-2">
                        <Label>Importing transactions...</Label>
                        <Progress value={(importedCount / (processedData.length || 1)) * 100} />
                        <p className="text-sm text-muted-foreground text-center">{importedCount} of {processedData.length} imported.</p>
                    </div>
                ) : (
                    <>
                        {step === 1 && (
                            <div>
                                <Label>Import Template</Label>
                                <Select value={template} onValueChange={setTemplate}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a template..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(TEMPLATES).map(([key, {name, description}]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{name}</span>
                                                    <span className="text-xs text-muted-foreground">{description}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="rounded-md border bg-muted/50 p-3">
                                    <p className="text-sm font-medium text-muted-foreground">Selected Template: <span className="font-semibold text-foreground">{TEMPLATES[template]?.name}</span></p>
                                </div>
                                <div className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 flex flex-col items-center justify-center text-center">
                                    <FileUp className="w-12 h-12 text-muted-foreground" />
                                    <p className="mt-4 text-muted-foreground">Drag & drop your file or click to browse</p>
                                    <Input id="file-upload" type="file" accept=".xlsx, .csv" onChange={(e) => e.target.files && handleFileParseAndValidate(e.target.files[0])} className="hidden" />
                                    <Button variant="outline" className="mt-4" onClick={() => document.getElementById('file-upload')?.click()} disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Browse File'}
                                    </Button>
                                </div>
                            </div>
                        )}
                        {step === 3 && (
                            <div className="space-y-6">
                                {validationError && (
                                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                                            <div>
                                                <h4 className="font-semibold">Validation Failed</h4>
                                                <p className="text-sm">{validationError}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="rounded-lg border p-4 space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-yellow-500"/> New Categories ({newCategories.length})</h4>
                                    {newCategories.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {newCategories.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}
                                        </div>
                                    ) : <p className="text-sm text-muted-foreground">No new categories found. Existing categories will be used.</p>}
                                    <p className="text-xs text-muted-foreground pt-1">New categories will be created automatically.</p>
                                </div>
                                <div className="rounded-lg border p-4 space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-yellow-500"/> New Tags ({newTags.length})</h4>
                                    {newTags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {newTags.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                                        </div>
                                    ) : <p className="text-sm text-muted-foreground">No new tags found. Existing tags will be used.</p>}
                                    <p className="text-xs text-muted-foreground pt-1">New tags will be created automatically.</p>
                                </div>
                                {newAccounts.length > 0 && (
                                    <div className="rounded-lg border p-4 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-yellow-500"/> New Accounts ({newAccounts.length})</h4>
                                            <div className="flex gap-2">
                                                <Button variant="link" size="sm" onClick={() => setSelectedAccountsToImport(newAccounts)}>Select All</Button>
                                                <Button variant="link" size="sm" onClick={() => setSelectedAccountsToImport([])}>Deselect All</Button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Select accounts to import and map them to existing accounts, or create new ones.</p>
                                        {newAccounts.map(accName => (
                                            <div key={accName} className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-4 gap-y-2">
                                                <Checkbox
                                                    id={`select-acc-${accName}`}
                                                    checked={selectedAccountsToImport.includes(accName)}
                                                    onCheckedChange={() => handleAccountSelectionChange(accName)}
                                                />
                                                <Label htmlFor={`select-acc-${accName}`} className="truncate font-medium">{accName}</Label>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                <div className="flex gap-2">
                                                    <Select 
                                                        onValueChange={(value) => handleAccountMappingChange(accName, value)}
                                                        defaultValue="create_new"
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="create_new">Create New Account</SelectItem>
                                                            {accounts?.filter(a => a.status === 'active').map(existingAcc => (
                                                                <SelectItem key={existingAcc.id} value={existingAcc.id}>Merge with "{existingAcc.name}"</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {accountMappings[accName]?.action === 'create' && (
                                                        <Select
                                                            onValueChange={(value) => handleAccountTypeChange(accName, value as Account['type'])}
                                                            defaultValue="bank"
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="bank">Bank</SelectItem>
                                                                <SelectItem value="credit_card">Credit Card</SelectItem>
                                                                <SelectItem value="wallet">Wallet</SelectItem>
                                                                <SelectItem value="cash">Cash</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {step === 4 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Final Preview</h3>

                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    {!TEMPLATES[template]?.mapping.mode && (
                                        <div className="space-y-2">
                                            <Label htmlFor="import-account">Import into Account</Label>
                                            <Select onValueChange={setImportAccountId} defaultValue={importAccountId}>
                                                <SelectTrigger id="import-account">
                                                    <SelectValue placeholder="Select an account..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {accounts?.filter(a => a.status === 'active').map(acc => (
                                                        <SelectItem key={acc.id} value={acc.id}>
                                                            <div className="flex items-center gap-2">
                                                                {renderIcon(acc.icon)}
                                                                {acc.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                <div className="max-h-60 overflow-y-auto border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Account</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {processedData.slice(0, 10).map((row, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{row.date.toLocaleString()}</TableCell>
                                                    <TableCell>{row.description}</TableCell>
                                                    <TableCell>{row.accountName || "Default"}</TableCell>
                                                    <TableCell className={`text-right font-medium ${row.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                                                        {row.type === 'income' ? '+' : '-'}{currencySymbol}{Number(row.amount).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">Showing first 10 of {processedData.length} total records to be imported.</p>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                 <Button 
                    variant="outline" 
                    onClick={() => step > 1 ? setStep(step - 1) : resetState()} 
                    disabled={isProcessing || isImporting}
                    className={cn(importComplete && "hidden")}
                >
                    Back
                </Button>
                 <div className={cn(importComplete && "w-full flex justify-center")}>
                    {step === 1 && (
                        <Button onClick={() => setStep(2)} disabled={!template}>
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                    {step === 2 && (
                         <Button onClick={() => document.getElementById('file-upload')?.click()} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Browse File'}
                        </Button>
                    )}
                    {step === 3 && (
                        <Button onClick={() => setStep(4)} disabled={validationError !== null}>
                             Next: Final Confirmation <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                    {step === 4 && (
                        <Button 
                            onClick={handleImport} 
                            disabled={isImporting || processedData.length === 0 || (!TEMPLATES[template]?.mapping.mode && !importAccountId)}
                             className={cn(importComplete && "hidden")}
                        >
                            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}
                            Confirm & Import {processedData.length > 0 ? `${processedData.length} Records` : ''}
                        </Button>
                    )}
                 </div>
            </CardFooter>
        </Card>
    );
}
