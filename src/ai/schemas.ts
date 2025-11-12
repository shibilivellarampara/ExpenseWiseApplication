
import { z } from 'genkit';

export const SuggestExpenseDetailsInputSchema = z.object({
  description: z.string().describe('The user-provided description of the expense.'),
  categories: z.array(z.object({ id: z.string(), name: z.string() })).describe('List of available expense categories.'),
  tags: z.array(z.object({ id: z.string(), name: z.string() })).describe('List of available expense tags.'),
  accounts: z.array(z.object({ id: z.string(), name: z.string() })).describe('List of available financial accounts.'),
});
export type SuggestExpenseDetailsInput = z.infer<typeof SuggestExpenseDetailsInputSchema>;

export const SuggestExpenseDetailsOutputSchema = z.object({
  categoryId: z.string().optional().describe('The suggested category ID for the expense.'),
  tagIds: z.array(z.string()).optional().describe('An array of suggested tag IDs for the expense.'),
  accountId: z.string().optional().describe('The suggested account ID for the expense.'),
  description: z.string().optional().describe('A cleaned-up or improved version of the expense description.'),
});
export type SuggestExpenseDetailsOutput = z.infer<typeof SuggestExpenseDetailsOutputSchema>;


// --- Schemas for Expense Analysis Flow ---

export const ExpenseForAnalysisSchema = z.object({
    type: z.enum(['expense', 'income']),
    amount: z.number(),
    description: z.string().optional(),
    date: z.string().describe('ISO 8601 date string'),
    category: z.string().optional(),
    account: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

export const AnalyzeExpensesInputSchema = z.object({
  expenses: z.array(ExpenseForAnalysisSchema).describe('A list of enriched expense objects for the period.'),
});
export type AnalyzeExpensesInput = z.infer<typeof AnalyzeExpensesInputSchema>;

export const AnalyzeExpensesOutputSchema = z.object({
  summary: z.string().describe("A brief, easy-to-understand summary of the user's overall financial activity."),
  topCategories: z.array(z.object({
    category: z.string().describe("The name of the spending category."),
    amount: z.number().describe("The total amount spent in this category."),
    percentage: z.number().describe("The percentage of total expenses this category represents."),
  })).describe("A list of the top 2-3 spending categories."),
  savingsSuggestions: z.array(z.string()).describe("A list of 2-3 actionable and realistic savings suggestions."),
});
export type AnalyzeExpensesOutput = z.infer<typeof AnalyzeExpensesOutputSchema>;
