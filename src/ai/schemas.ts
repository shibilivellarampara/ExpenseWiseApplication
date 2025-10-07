
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
