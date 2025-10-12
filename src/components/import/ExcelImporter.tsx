
'use client';

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { FileUp, Loader2, CheckCircle, ArrowRight, ListChecks, FileCheck2, AlertTriangle, Sparkles, Pilcrow } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from "@/firebase";
import { doc } from 'firebase/firestore';
import { UserProfile, Category, Account, Tag } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/currencies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { collection, writeBatch, increment } from 'firebase/firestore';
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import * as LucideIcons from 'lucide-react';
import { cn } from "@/lib/utils";


type RowData = { [key: string]: any };
type ColumnMapping = {
    date: string;
    amount: string;
    description: string;
    category: string;
    type?: string | null; // For cashbook credit/debit
    tags?: string | null; // Optional tags column
};

const TEMPLATES: { [key: string]: { name: string, mapping: ColumnMapping, description: string } } = {
    'default': { 
        name: 'Default Template',
        mapping: { date: 'Date', amount: 'Amount', description: 'Description', category: 'Category', tags: 'Tags' },
        description: "A standard file with columns for Date, Amount, Description, Category, and Tags."
    },
    'cashbook': { 
        name: 'Cashbook App',
        mapping: { date: 'Date', amount: 'Amount', description: 'Description', category: 'Category', type: 'Type' },
        description: "For exports from the Cashbook app, with a 'Type' column for 'Cash In'/'Cash Out'."
    },
    'spendee': { 
        name: 'Spendee App',
        mapping: { date: 'Date', amount: 'Amount', description: 'Notes', category: 'Category', tags: 'Tags' },
        description: "For exports from the Spendee app, using 'Notes' for description."
    },
};


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

                // Validation
                const expectedMapping = TEMPLATES[template].mapping;
                const missingColumns = Object.values(expectedMapping).filter(col => col && !headers.includes(col));
                if (missingColumns.length > 0) {
                    throw new Error(`The following required columns are missing for the selected template: ${missingColumns.join(', ')}`);
                }
                
                const jsonData = XLSX.utils.sheet_to_json<RowData>(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });
                setRawData(jsonData);

                // --- Detect New Categories and Tags ---
                const existingCategoryNames = new Set(existingCategories?.map(c => c.name.toLowerCase()));
                const existingTagNames = new Set(existingTags?.map(t => t.name.toLowerCase()));
                const foundNewCategories = new Set<string>();
                const foundNewTags = new Set<string>();

                jsonData.forEach(row => {
                    const categoryName = row[expectedMapping.category];
                    if (categoryName && !existingCategoryNames.has(categoryName.toLowerCase())) {
                        foundNewCategories.add(categoryName);
                    }
                    if (expectedMapping.tags) {
                        const tagsString = row[expectedMapping.tags];
                        if (tagsString) {
                            const tags = tagsString.split(',').map((t: string) => t.trim());
                            tags.forEach((tagName: string) => {
                                if (tagName && !existingTagNames.has(tagName.toLowerCase())) {
                                    foundNewTags.add(tagName);
                                }
                            });
                        }
                    }
                });

                setNewCategories(Array.from(foundNewCategories));
                setNewTags(Array.from(foundNewTags));
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

    const processedData = useMemo(() => {
        if (rawData.length === 0 || !template) return [];
        const mapping = TEMPLATES[template].mapping;
        return rawData.map((row) => {
            const dateValue = row[mapping.date];
            let date = dateValue instanceof Date ? dateValue : new Date(dateValue);
            if(isNaN(date.getTime())){
                if(typeof dateValue === 'number' && dateValue > 0) {
                   date = XLSX.SSF.parse_date_code(dateValue);
                } else {
                   date = new Date();
                }
            }
            
            const amount = parseFloat(row[mapping.amount]);
            const description = row[mapping.description] || 'Imported Transaction';
            const categoryName = row[mapping.category] || 'Other';
            const tags = mapping.tags && row[mapping.tags] ? row[mapping.tags].split(',').map((t: string) => t.trim()) : [];

            let type: 'income' | 'expense' = 'expense';
            if (mapping.type && row[mapping.type]?.toLowerCase().includes('in')) {
                type = 'income';
            }

            return { date, amount, description, categoryName, tags, type };
        }).filter(item => !isNaN(item.amount));
    }, [rawData, template]);

    const handleImport = async () => {
        if (processedData.length === 0 || !user || !firestore || !accounts || !existingCategories || !existingTags) return;
        setIsImporting(true);

        try {
            const batch = writeBatch(firestore);
            
            // --- Create New Categories and Tags First ---
            const newCategoryRefs = new Map<string, string>();
            const newTagRefs = new Map<string, string>();
            const categoriesCol = collection(firestore, `users/${user.uid}/categories`);
            const tagsCol = collection(firestore, `users/${user.uid}/tags`);

            for (const catName of newCategories) {
                const catRef = doc(categoriesCol);
                batch.set(catRef, { id: catRef.id, name: catName, icon: 'Shapes', userId: user.uid });
                newCategoryRefs.set(catName.toLowerCase(), catRef.id);
            }
            for (const tagName of newTags) {
                const tagRef = doc(tagsCol);
                batch.set(tagRef, { id: tagRef.id, name: tagName, icon: 'Tag', userId: user.uid });
                newTagRefs.set(tagName.toLowerCase(), tagRef.id);
            }
            
            // --- Prepare for transactions ---
            const expensesCol = collection(firestore, `users/${user.uid}/expenses`);
            const defaultAccount = accounts.find(a => a.type === 'cash') || accounts[0];
            if (!defaultAccount) throw new Error("No default cash account found. Please create one first.");

            const categoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]));
            const tagMap = new Map(existingTags.map(t => [t.name.toLowerCase(), t.id]));

            processedData.forEach(item => {
                const expenseRef = doc(expensesCol);
                
                const categoryId = categoryMap.get(item.categoryName?.toLowerCase()) || newCategoryRefs.get(item.categoryName?.toLowerCase());
                const tagIds = item.tags.map((tagName: string) => tagMap.get(tagName.toLowerCase()) || newTagRefs.get(tagName.toLowerCase())).filter(Boolean);
                
                batch.set(expenseRef, {
                    id: expenseRef.id,
                    userId: user.uid,
                    type: item.type,
                    amount: item.amount,
                    description: item.description,
                    date: item.date,
                    accountId: defaultAccount.id,
                    categoryId: categoryId,
                    tagIds: tagIds,
                    createdAt: new Date(),
                });

                const amountChange = item.type === 'income' ? item.amount : -item.amount;
                batch.update(doc(firestore, `users/${user.uid}/accounts`, defaultAccount.id), {
                    balance: increment(amountChange)
                });
            });

            await batch.commit();
            
            toast({
                title: 'Import Successful',
                description: `${processedData.length} expenses were added to your '${defaultAccount.name}' account.`,
            });
            resetState();
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Import Error', description: error.message });
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
    }

    const renderIcon = (iconName: string | undefined, className?: string) => {
        if (!iconName) return <Pilcrow className={cn("h-4 w-4 text-muted-foreground", className)} />;
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent className={cn("h-4 w-4", className)} /> : <Pilcrow className={cn("h-4 w-4", className)} />;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Step {step}: {
                    step === 1 ? 'Select Template' : step === 2 ? 'Upload File' : step === 3 ? 'Review New Items' : 'Confirm & Import'
                }</CardTitle>
                <CardDescription>
                    {step === 1 && 'Choose a template that matches your file format.'}
                    {step === 2 && `Ready to upload a file for the '${TEMPLATES[template]?.name}' template.`}
                    {step === 3 && 'We found some new items in your file. Review them before importing.'}
                    {step === 4 && `A summary of your import. Ready to add ${processedData.length} transactions.`}
                </CardDescription>
            </CardHeader>
             <CardContent className="space-y-4">
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
                     <div className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 flex flex-col items-center justify-center text-center">
                        <FileUp className="w-12 h-12 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">Drag & drop your file or click to browse</p>
                        <Input id="file-upload" type="file" accept=".xlsx, .csv" onChange={(e) => e.target.files && handleFileParseAndValidate(e.target.files[0])} className="hidden" />
                        <Button variant="outline" className="mt-4" onClick={() => document.getElementById('file-upload')?.click()} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Browse File'}
                        </Button>
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
                             <h4 className="font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-yellow-500"/> New Categories to be Created ({newCategories.length})</h4>
                            {newCategories.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {newCategories.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}
                                </div>
                            ) : <p className="text-sm text-muted-foreground">No new categories found.</p>}
                        </div>
                         <div className="rounded-lg border p-4 space-y-2">
                             <h4 className="font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-yellow-500"/> New Tags to be Created ({newTags.length})</h4>
                            {newTags.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {newTags.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                                </div>
                            ) : <p className="text-sm text-muted-foreground">No new tags found.</p>}
                        </div>
                    </div>
                )}
                 {step === 4 && (
                     <div>
                        <h3 className="text-lg font-semibold mb-2">Final Preview</h3>
                         <div className="max-h-60 overflow-y-auto border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedData.slice(0, 10).map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{row.date.toLocaleDateString()}</TableCell>
                                            <TableCell>{row.description}</TableCell>
                                            <TableCell>{row.categoryName}</TableCell>
                                            <TableCell className={`text-right font-medium ${row.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                                                {row.type === 'income' ? '+' : '-'}{currencySymbol}{Number(row.amount).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </div>
                         <p className="text-sm text-muted-foreground mt-2">Showing first 10 of {processedData.length} total records to be imported.</p>
                         <div className="mt-4 rounded-lg border bg-muted/50 p-4">
                             <p className="text-sm text-muted-foreground">All transactions will be imported into the account: <span className="font-semibold text-foreground">{accounts?.find(a => a.type === 'cash')?.name || accounts?.[0].name}</span></p>
                         </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : resetState()} disabled={isProcessing || isImporting}>
                    Back
                </Button>
                 <div>
                    {step === 1 && (
                        <Button onClick={() => setStep(2)} disabled={!template}>
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                    {step === 2 && (
                         <Button onClick={() => file && handleFileParseAndValidate(file)} disabled={!file || isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
                            Validate &amp; Review
                        </Button>
                    )}
                    {step === 3 && (
                        <Button onClick={() => setStep(4)} disabled={validationError !== null}>
                             Next: Final Confirmation <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                    {step === 4 && (
                        <Button onClick={handleImport} disabled={isImporting || processedData.length === 0}>
                            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}
                            Confirm &amp; Import {processedData.length > 0 ? `${processedData.length} Records` : ''}
                        </Button>
                    )}
                 </div>
            </CardFooter>
        </Card>
    );
}

    