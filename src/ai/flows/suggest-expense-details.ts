'use server';
/**
 * @fileOverview An AI flow to suggest expense details based on user input.
 *
 * - suggestExpenseDetails - A function that suggests category, tags, and account based on a description.
 * - SuggestExpenseDetailsInput - The input type for the suggestExpenseDetails function.
 * - SuggestExpenseDetailsOutput - The return type for the suggestExpenseDetails function.
 */

import { ai } from '@/ai/genkit';
import {
    SuggestExpenseDetailsInputSchema,
    SuggestExpenseDetailsOutputSchema,
    type SuggestExpenseDetailsInput,
    type SuggestExpenseDetailsOutput
} from '@/ai/schemas';

const suggestionPrompt = ai.definePrompt({
    name: 'expenseSuggestionPrompt',
    input: { schema: SuggestExpenseDetailsInputSchema },
    output: { schema: SuggestExpenseDetailsOutputSchema },
    prompt: `You are an expert financial assistant. Based on the user's expense description, your task is to suggest the most relevant category, account, and any applicable tags from the provided lists. You should also provide a concise, cleaned-up version of the description.

Available Categories (id, name):
{{#each categories}}
- {{id}}, {{name}}
{{/each}}

Available Tags (id, name):
{{#each tags}}
- {{id}}, {{name}}
{{/each}}

Available Accounts (id, name):
{{#each accounts}}
- {{id}}, {{name}}
{{/each}}

User's Description:
"{{{description}}}"

Rules:
1.  **Category:** Choose the ONE most appropriate category ID from the list.
2.  **Account:** Choose the ONE most likely account ID the user would use for this type of transaction.
3.  **Tags:** Choose ANY relevant tag IDs from the list. It can be zero, one, or multiple.
4.  **Description:** Refine the user's description to be clear and concise. For example, "coffee at starbucks with jane" could become "Coffee at Starbucks with Jane". Capitalize correctly and make it readable.
5.  If you cannot make a confident suggestion for a field, omit it from the output. The IDs you return MUST exist in the lists provided.
`,
});

const suggestExpenseDetailsFlow = ai.defineFlow(
    {
        name: 'suggestExpenseDetailsFlow',
        inputSchema: SuggestExpenseDetailsInputSchema,
        outputSchema: SuggestExpenseDetailsOutputSchema,
    },
    async (input) => {
        const { output } = await suggestionPrompt(input);
        return output!;
    }
);


export async function suggestExpenseDetails(input: SuggestExpenseDetailsInput): Promise<SuggestExpenseDetailsOutput> {
    // This is the wrapper function that the client-side code will call.
    return suggestExpenseDetailsFlow(input);
}
