'use server';
/**
 * @fileOverview A flow to architect a pipeline scaffold from a business requirement.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ArchitectInputSchema = z.object({
  requirement: z.string().describe('The business requirement or objective for the data pipeline.'),
});
export type ArchitectInput = z.infer<typeof ArchitectInputSchema>;

const ArchitectOutputSchema = z.object({
  nodes: z.array(z.object({
    name: z.string(),
    type: z.enum(['source', 'transformation', 'destination', 'dataset']),
    description: z.string(),
    operationType: z.string().optional(),
    x: z.number(),
    y: z.number(),
  })).describe('List of suggested nodes for the pipeline.'),
  connectors: z.array(z.object({
    fromIndex: z.number(),
    toIndex: z.number(),
  })).describe('List of suggested connections between nodes.'),
});
export type ArchitectOutput = z.infer<typeof ArchitectOutputSchema>;

const prompt = ai.definePrompt({
  name: 'architectPipelinePrompt',
  input: { schema: ArchitectInputSchema },
  output: { schema: ArchitectOutputSchema },
  prompt: `You are an expert Data Architect for Palantir Foundry.
The user will provide a business requirement for a data pipeline.
Your task is to propose a high-level visual scaffold of nodes (Sources, Transformations, Destinations) to meet this requirement.

Requirement: {{{requirement}}}

Please provide:
1. A logical set of source datasets.
2. The transformation steps (joins, filters, aggregations).
3. The final target destination.

Position the nodes on a 2D canvas (X from 0 to 1000, Y from 0 to 600) to create a clean, left-to-right flow.
Return the structure as a JSON object with nodes and connectors (using array indices).`,
});

export async function architectPipeline(input: ArchitectInput): Promise<ArchitectOutput> {
  const flow = ai.defineFlow(
    {
      name: 'architectPipelineFlow',
      inputSchema: ArchitectInputSchema,
      outputSchema: ArchitectOutputSchema,
    },
    async (input) => {
      const { output } = await prompt(input);
      return output!;
    }
  );
  return flow(input);
}
