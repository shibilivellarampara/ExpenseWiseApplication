
'use client';

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { FileUp, Loader2, CheckCircle, Settings, ArrowRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { UserProfile, Category, Account } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/currencies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, writeBatch, increment } from 'firebase/firestore';

type RowData = { [key: string]: any };
type ColumnMapping = {
    date: string | null;
    amount: string | null;
    description: string | null;
    category: string | null;
    type: string | null; // For cashbook credit/debit
};

const TEMPLATES: { [key: string]: ColumnMapping } = {
    'default': { date: 'Date', amount: 'Amount', description: 'Description', category: 'Category', type: null },
    'cashbook': { date: 'Date', amount: 'Amount', description: 'Description', category: 'Category', type: 'Type' },
    'spendee': { date: 'Date', amount: 'Amount', description: 'Notes', category: 'Category', type: null },
};


export function ExcelImporter() {
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Map, 3: Preview & Import
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    
    const [rawData, setRawData] = useState<RowData[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    
    const [template, setTemplate] = useState<string>('default');
    const [mapping, setMapping] = useState<ColumnMapping>(TEMPLATES.default);
    
    const { toast } = useToast();

    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const currencySymbol = getCurrencySymbol(userProfile?.defaultCurrency);

    const accountsQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/accounts`) : null, [user, firestore]);
    const categoriesQuery = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/categories`) : null, [user, firestore]);
    
    const { data: accounts } = useCollection<Account>(accountsQuery);
    const { data: categories } = useCollection<Category>(categoriesQuery);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const selectedFile = event.target.files[0];
            if (selectedFile) {
                setFile(selectedFile);
                handleFileParse(selectedFile);
            }
        }
    };

    const handleFileParse = (fileToParse: File) => {
        setIsParsing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<RowData>(worksheet, {
                    header: 1, // Get raw array of arrays
                    raw: false,
                    dateNF: 'yyyy-mm-dd'
                });
                
                if (json.length < 2) throw new Error("File must contain a header row and at least one data row.");

                const foundHeaders = json[0] as string[];
                const jsonData = XLSX.utils.sheet_to_json<RowData>(worksheet, {
                    raw: false,
                    dateNF: 'yyyy-mm-dd',
                });
                
                setHeaders(foundHeaders);
                setRawData(jsonData);
                setStep(2);
                
                toast({
                    title: 'File Uploaded',
                    description: `Found ${jsonData.length} records. Please map the columns.`,
                });

            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Parsing Error', description: error.message });
                resetState();
            } finally {
                setIsParsing(false);
            }
        };
        reader.onerror = () => {
            toast({ variant: 'destructive', title: 'File Read Error' });
            setIsParsing(false);
        };
        reader.readAsBinaryString(fileToParse);
    };

    const handleTemplateChange = (newTemplate: string) => {
        setTemplate(newTemplate);
        if (newTemplate !== 'custom') {
            setMapping(TEMPLATES[newTemplate]);
        }
    };
    
    const handleMappingChange = (field: keyof ColumnMapping, header: string) => {
        setTemplate('custom');
        setMapping(prev => ({ ...prev, [field]: header }));
    };

    const processedData = useMemo(() => {
        if (!mapping.date || !mapping.amount) return [];
        return rawData.map((row, index) => {
            const dateValue = row[mapping.date!];
            let date = new Date(dateValue);
            if(isNaN(date.getTime())){
                // Attempt to parse Excel date serial number
                if(typeof dateValue === 'number' && dateValue > 0) {
                   date = XLSX.SSF.parse_date_code(dateValue);
                } else {
                   date = new Date(); // Fallback
                }
            }
            
            const amount = parseFloat(row[mapping.amount!]);
            const description = mapping.description ? row[mapping.description] : `Imported Transaction #${index + 1}`;
            const categoryName = mapping.category ? row[mapping.category] : 'Other';

            let type: 'income' | 'expense' = 'expense';
            if (template === 'cashbook' && mapping.type && row[mapping.type]?.toLowerCase() === 'cash in') {
                type = 'income';
            }

            return {
                date,
                amount,
                description,
                categoryName,
                type
            };
        }).filter(item => !isNaN(item.amount));
    }, [rawData, mapping, template]);

    const handleImport = async () => {
        if (processedData.length === 0 || !user || !firestore || !accounts || !categories) {
            toast({ variant: 'destructive', title: 'Import Failed', description: 'No valid data to import or required user data not loaded.' });
            return;
        }

        setIsImporting(true);

        try {
            const batch = writeBatch(firestore);
            const expensesCol = collection(firestore, `users/${user.uid}/expenses`);
            const defaultAccount = accounts.find(a => a.type === 'cash') || accounts[0];
            if (!defaultAccount) {
                throw new Error("No default cash account found. Please create one first.");
            }

            const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
            const otherCategoryId = categoryMap.get('other');

            processedData.forEach(item => {
                const expenseRef = doc(expensesCol);
                const categoryId = categoryMap.get(item.categoryName?.toLowerCase()) || otherCategoryId;
                
                batch.set(expenseRef, {
                    id: expenseRef.id,
                    userId: user.uid,
                    type: item.type,
                    amount: item.amount,
                    description: item.description,
                    date: item.date,
                    accountId: defaultAccount.id,
                    categoryId: categoryId,
                    createdAt: new Date(),
                    tagIds: [],
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
        setHeaders([]);
        setTemplate('default');
        setMapping(TEMPLATES.default);
    }
    
    const MappingField = ({ field, label }: { field: keyof ColumnMapping, label: string }) => (
         <div className="grid grid-cols-2 items-center gap-4">
            <p className="font-medium">{label}</p>
            <Select value={mapping[field] || ''} onValueChange={(value) => handleMappingChange(field, value)}>
                <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="">-- Not Mapped --</SelectItem>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <Card>
             <CardHeader>
                <CardTitle className="font-headline">Step {step}: {
                    step === 1 ? 'Upload File' : step === 2 ? 'Map Columns' : 'Preview & Import'
                }</CardTitle>
                <CardDescription>
                    {step === 1 && 'Upload an Excel or CSV file. Supported formats: .xlsx, .csv.'}
                    {step === 2 && 'Match your file\'s columns to the required expense fields.'}
                    {step === 3 && `Review the processed data. Transactions will be imported into your default 'Cash' account.`}
                </CardDescription>
            </CardHeader>
             <CardContent className="space-y-4">
                {step === 1 && (
                     <div className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 flex flex-col items-center justify-center text-center">
                        <FileUp className="w-12 h-12 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">Drag & drop your file here or click to browse</p>
                        <Input id="file-upload" type="file" accept=".xlsx, .csv" onChange={handleFileChange} className="hidden" />
                        <Button variant="outline" className="mt-4" onClick={() => document.getElementById('file-upload')?.click()} disabled={isParsing}>
                            {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Browse File'}
                        </Button>
                         {file && <p className="mt-2 text-sm font-medium">{file.name}</p>}
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-sm font-medium">Use a Template (Optional)</label>
                             <Select value={template} onValueChange={handleTemplateChange}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Select a template" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Default Template</SelectItem>
                                    <SelectItem value="cashbook">Cashbook App</SelectItem>
                                    <SelectItem value="spendee">Spendee App</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-4 rounded-lg border p-4">
                            <MappingField field="date" label="Date*" />
                            <MappingField field="amount" label="Amount*" />
                            <MappingField field="description" label="Description" />
                            <MappingField field="category" label="Category" />
                            {template === 'cashbook' && <MappingField field="type" label="Transaction Type" />}
                        </div>
                        <Button onClick={() => setStep(3)} disabled={!mapping.date || !mapping.amount}>
                            Next: Preview Data <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )}
                {step === 3 && (
                     <div>
                        <h3 className="text-lg font-semibold mb-2">Preview Processed Data</h3>
                         <div className="max-h-80 overflow-y-auto border rounded-md">
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
                                            <TableCell className="text-right">{row.type === 'income' ? '+' : '-'}{currencySymbol}{Number(row.amount).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </div>
                         <p className="text-sm text-muted-foreground mt-2">Showing first 10 of {processedData.length} records.</p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                 {(step === 2 || step === 3) && (
                    <Button variant="outline" onClick={resetState}>Start Over</Button>
                 )}
                 {step === 3 && (
                    <Button onClick={handleImport} disabled={isImporting || processedData.length === 0} className="">
                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Import {processedData.length > 0 ? `${processedData.length} Records` : ''}
                    </Button>
                 )}
            </CardFooter>
        </Card>
    );
}
