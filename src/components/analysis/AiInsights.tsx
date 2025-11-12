'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Bot, Lightbulb, TrendingUp } from "lucide-react";

interface AiInsightsProps {
    onGenerate: () => void;
    analysis: any;
    isLoading: boolean;
    hasData: boolean;
}

export function AiInsights({ onGenerate, analysis, isLoading, hasData }: AiInsightsProps) {
    if (!hasData) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <Bot className="h-12 w-12 mb-4" />
                <h3 className="font-semibold">No Data to Analyze</h3>
                <p className="text-sm">Add some transactions for the selected period, then come back to get your AI-powered insights.</p>
            </div>
        )
    }
    
    return (
        <div className="space-y-6">
            {!analysis && !isLoading && (
                <div className="flex flex-col items-center justify-center text-center p-8">
                    <Sparkles className="h-12 w-12 text-yellow-500 mb-4" />
                    <h3 className="font-semibold">Ready for your analysis?</h3>
                    <p className="text-sm text-muted-foreground mb-4">Click the button to have AI review your spending and provide insights.</p>
                    <Button onClick={onGenerate}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Insights
                    </Button>
                </div>
            )}

            {isLoading && (
                <div className="space-y-6">
                     <div className="space-y-2">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-6 w-2/5" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            )}

            {analysis && !isLoading && (
                 <div className="space-y-6">
                    <div>
                        <h4 className="font-semibold text-lg mb-2 flex items-center gap-2"><Bot className="h-5 w-5 text-primary"/> Financial Summary</h4>
                        <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                    </div>

                    <div>
                        <h4 className="font-semibold text-lg mb-2 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary"/> Top Spending Categories</h4>
                        <ul className="space-y-3">
                            {analysis.topCategories.map((cat: any, index: number) => (
                                <li key={index} className="text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">{cat.category}:</span> {cat.percentage.toFixed(1)}% of total spending.
                                </li>
                            ))}
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold text-lg mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary"/> Savings Suggestions</h4>
                        <ul className="space-y-3 list-disc pl-5">
                            {analysis.savingsSuggestions.map((suggestion: string, index: number) => (
                                <li key={index} className="text-sm text-muted-foreground">{suggestion}</li>
                            ))}
                        </ul>
                    </div>
                    <Button onClick={onGenerate} variant="outline" size="sm" className="w-full">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Regenerate
                    </Button>
                </div>
            )}
        </div>
    );
}
