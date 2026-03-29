
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
    prompt: `You are an expert financial assistant. Your goal is to intelligently complete the transaction details based on the information provided by the user.

Here is the information available:
- User's Description: "{{{description}}}"
- Selected Category: "{{{selectedCategoryName}}}"
- Selected Tags: "{{{selectedTagNames}}}"

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

**Your Tasks:**

1.  **Suggest Missing Fields:** Based on all the context (description, category, tags), suggest the most likely values for any fields that are currently empty.
    -   **Category:** If not already selected, choose the ONE most appropriate category ID.
    -   **Account:** Suggest the ONE most likely account ID.
    -   **Tags:** Suggest ANY relevant tag IDs.

2.  **Generate a Better Description:** Based on all available information (what the user typed, the category, and the tags), create a refined, clear, and concise description. For example, if the description is "coffee" and the category is "Food & Drink", a good suggestion would be "Coffee". If the description is "uber home" and category is "Transport", suggest "Uber ride home".

**Rules:**
- Prioritize the user's explicit selections. Only suggest values for fields that are empty.
- The IDs you return MUST exist in the lists provided.
- If you cannot make a confident suggestion for a field, omit it from the output.
`,
});

const suggestExpenseDetailsFlow = ai.defineFlow(
    {
        name: 'suggestExpenseDetailsFlow',
        inputSchema: SuggestExpenseDetailsInputSchema,
        outputSchema: SuggestExpenseDetailsOutputSchema,
    },
    async (input) => {
        try {
            const { output } = await suggestionPrompt(input);
            return output!;
        } catch (error) {
            console.error("Error in suggestExpenseDetailsFlow:", error);
            // Return an empty object or a specific error structure if the flow fails
            return {};
        }
    }
);


export async function suggestExpenseDetails(input: SuggestExpenseDetailsInput): Promise<SuggestExpenseDetailsOutput> {
    // This is the wrapper function that the client-side code will call.
    return suggestExpenseDetailsFlow(input);
}
