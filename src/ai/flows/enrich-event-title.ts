// src/ai/flows/enrich-event-title.ts
'use server';
/**
 * @fileOverview Enriches a generic event title using GenAI to provide a more descriptive and informative title.
 *
 * - enrichEventTitle - A function that enriches the event title.
 * - EnrichEventTitleInput - The input type for the enrichEventTitle function.
 * - EnrichEventTitleOutput - The return type for the enrichEventTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnrichEventTitleInputSchema = z.object({
  title: z.string().describe('The generic title of the event to enrich.'),
  description: z.string().optional().describe('The description of the event.'),
  startDate: z.date().describe('The start date of the event.'),
});

export type EnrichEventTitleInput = z.infer<typeof EnrichEventTitleInputSchema>;

const EnrichEventTitleOutputSchema = z.object({
  enrichedTitle: z.string().describe('The enriched title of the event.'),
});

export type EnrichEventTitleOutput = z.infer<typeof EnrichEventTitleOutputSchema>;

export async function enrichEventTitle(input: EnrichEventTitleInput): Promise<EnrichEventTitleOutput> {
  return enrichEventTitleFlow(input);
}

const enrichEventTitlePrompt = ai.definePrompt({
  name: 'enrichEventTitlePrompt',
  input: {schema: EnrichEventTitleInputSchema},
  output: {schema: EnrichEventTitleOutputSchema},
  prompt: `You are an expert in creating descriptive and informative event titles.

  Given a generic event title, description, and start date, your goal is to enrich the title to be more specific and useful.
  Consider the context provided by the description and start date to create a title that clearly communicates the purpose and details of the event.

  Here's the event information:
  Title: {{{title}}}
  Description: {{{description}}}
  Start Date: {{{startDate}}}

  Please provide an enriched title that is more descriptive and informative than the original title.
  If the title is already descriptive, return it as is.
  `,
});

const enrichEventTitleFlow = ai.defineFlow(
  {
    name: 'enrichEventTitleFlow',
    inputSchema: EnrichEventTitleInputSchema,
    outputSchema: EnrichEventTitleOutputSchema,
  },
  async input => {
    const {output} = await enrichEventTitlePrompt(input);
    return output!;
  }
);
