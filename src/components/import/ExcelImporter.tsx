'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { FileUp, Loader2, CheckCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

type ExpenseRow = {
    Date: string | number;
    Category: string;
    Amount: number;
    Description: string;
};

export function ExcelImporter() {
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [parsedData, setParsedData] = useState<ExpenseRow[]>([]);
    const { toast } = useToast();

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
                const json = XLSX.utils.sheet_to_json<ExpenseRow>(worksheet, {
                    raw: false, // Use formatted text
                    dateNF: 'yyyy-mm-dd', // Specify date format
                });
                
                // Validate required columns
                if (json.length > 0) {
                    const firstRow = json[0];
                    if (!('Date' in firstRow && 'Category' in firstRow && 'Amount' in firstRow && 'Description' in firstRow)) {
                        throw new Error("File must contain 'Date', 'Category', 'Amount', and 'Description' columns.");
                    }
                }
                
                setParsedData(json);
                toast({
                    title: 'File Parsed',
                    description: `${json.length} records found. Please review and click import.`,
                });
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Parsing Error',
                    description: error.message || 'Could not parse the file. Please check format and column headers.',
                });
                setParsedData([]);
                setFile(null);
            } finally {
                setIsParsing(false);
            }
        };
        reader.onerror = () => {
             toast({
                variant: 'destructive',
                title: 'File Read Error',
                description: 'Could not read the selected file.',
            });
            setIsParsing(false);
        }
        reader.readAsBinaryString(fileToParse);
    };

    const handleImport = async () => {
        if (parsedData.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Data',
                description: 'There is no data to import.',
            });
            return;
        }

        setIsImporting(true);
        // Here you would call a server action to save the data to Firestore
        // For example: await importExpensesAction(parsedData);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsImporting(false);
        
        toast({
            title: 'Import Successful',
            description: `${parsedData.length} expenses were added successfully.`,
        });

        // Reset state
        setFile(null);
        setParsedData([]);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Upload your file</CardTitle>
                <CardDescription>Supported formats: .xlsx, .csv. Columns should be: Date, Category, Amount, Description.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 flex flex-col items-center justify-center text-center">
                    <FileUp className="w-12 h-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Drag & drop your file here or click to browse</p>
                    <Input id="file-upload" type="file" accept=".xlsx, .csv" onChange={handleFileChange} className="hidden" />
                    <Button variant="outline" className="mt-4" onClick={() => document.getElementById('file-upload')?.click()} disabled={isParsing}>
                        {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Browse File'}
                    </Button>
                     {file && <p className="mt-2 text-sm font-medium">{file.name}</p>}
                </div>
               
                {parsedData.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Preview Data</h3>
                         <div className="max-h-60 overflow-y-auto border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parsedData.slice(0, 5).map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{String(row.Date)}</TableCell>
                                            <TableCell>{row.Category}</TableCell>
                                            <TableCell>{row.Description}</TableCell>
                                            <TableCell className="text-right">${Number(row.Amount).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </div>
                         <p className="text-sm text-muted-foreground mt-2">Showing first 5 of {parsedData.length} records.</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleImport} disabled={isImporting || parsedData.length === 0} className="w-full">
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Import {parsedData.length > 0 ? `${parsedData.length} Records` : ''}
                </Button>
            </CardFooter>
        </Card>
    );
}
