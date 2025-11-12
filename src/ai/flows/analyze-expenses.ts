'use server';
/**
 * @fileOverview An AI flow to analyze user expenses and provide insights.
 *
 * - analyzeExpenses - A function that provides a financial summary and savings suggestions.
 * - AnalyzeExpensesInput - The input type for the analyzeExpenses function.
 * - AnalyzeExpensesOutput - The return type for the analyzeExpenses function.
 */

import { ai } from '@/ai/genkit';
import {
    AnalyzeExpensesInputSchema,
    AnalyzeExpensesOutputSchema,
    type AnalyzeExpensesInput,
    type AnalyzeExpensesOutput
} from '@/ai/schemas';

const analysisPrompt = ai.definePrompt({
    name: 'expenseAnalysisPrompt',
    input: { schema: AnalyzeExpensesInputSchema },
    output: { schema: AnalyzeExpensesOutputSchema },
    prompt: `You are a friendly and insightful financial analyst. Your goal is to help a user understand their spending habits and find opportunities to save money. You will be given a list of their recent transactions.

Analyze the provided expense data and generate a concise, helpful financial analysis.

**Analysis Rules:**

1.  **Summary:** Write a brief, easy-to-understand summary of the user's overall financial activity for the period. Mention the total income, total expenses, and the resulting net cash flow.
2.  **Top Spending Categories:** Identify the top 2-3 spending categories. For each, mention the total amount spent and what percentage of total expenses it represents.
3.  **Savings Suggestions:** Based on the spending patterns, provide 2-3 actionable and realistic suggestions for how the user could save money. The suggestions should be specific and directly related to the data provided. Be encouraging and not judgmental.

Here is the list of transactions to analyze:
{{#each expenses}}
- **Type:** {{type}}
- **Amount:** {{amount}}
- **Date:** {{date}}
- **Description:** {{description}}
- **Category:** {{category}}
- **Account:** {{account}}
- **Tags:** {{#each tags}}{{.}}, {{/each}}
---
{{/each}}
`,
});

const analyzeExpensesFlow = ai.defineFlow(
    {
        name: 'analyzeExpensesFlow',
        inputSchema: AnalyzeExpensesInputSchema,
        outputSchema: AnalyzeExpensesOutputSchema,
    },
    async (input) => {
        // If there are no expenses, return a default empty state
        if (input.expenses.length === 0) {
            return {
                summary: "You don't have any transaction data for this period. Add some expenses to get your analysis!",
                topCategories: [],
                savingsSuggestions: []
            };
        }

        const { output } = await analysisPrompt(input);
        return output!;
    }
);

/**
 * Analyzes a user's expenses and returns a financial summary and savings advice.
 * @param {AnalyzeExpensesInput} input - The list of user's expenses to analyze.
 * @returns {Promise<AnalyzeExpensesOutput>} A promise that resolves to the analysis output.
 */
export async function analyzeExpenses(input: AnalyzeExpensesInput): Promise<AnalyzeExpensesOutput> {
    return analyzeExpensesFlow(input);
}
