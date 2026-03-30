'use server';
/**
 * @fileOverview A flow to generate a functional specification for a data pipeline.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSpecInputSchema = z.object({
  nodes: z.array(z.any()),
  connectors: z.array(z.any()),
});
export type GenerateSpecInput = z.infer<typeof GenerateSpecInputSchema>;

const GenerateSpecOutputSchema = z.object({
  specification: z.string().describe('The generated functional specification in Markdown format.'),
});
export type GenerateSpecOutput = z.infer<typeof GenerateSpecOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateSpecPrompt',
  input: { schema: z.object({ nodes: z.string(), connectors: z.string() }) },
  output: { schema: GenerateSpecOutputSchema },
  prompt: `You are an expert Data Architect and Technical Writer. 
Your task is to write a professional Functional Specification for a data pipeline designed in a visual tool.

Below is the JSON representation of the pipeline:
Nodes: {{{nodes}}}
Connectors: {{{connectors}}}

Please structure the specification as follows:
1. **Executive Summary**: A brief overview of what this pipeline accomplishes.
2. **Data Sources**: List all source nodes, their systems, and locations.
3. **Logic \u0026 Transformations**: Detailed step-by-step description of the transformations (filters, joins, aggregations, etc.). Explain the business logic clearly.
4. **Data Destinations**: Where the data ends up.
5. **Schema Evolution**: Note how the fields change through the pipeline.

Use professional, clear, and concise technical English. Return the result in clean Markdown.`,
});

export async function generatePipelineSpec(input: GenerateSpecInput): Promise<GenerateSpecOutput> {
  const flow = ai.defineFlow(
    {
      name: 'generateSpecFlow',
      inputSchema: GenerateSpecInputSchema,
      outputSchema: GenerateSpecOutputSchema,
    },
    async (input) => {
      const { output } = await prompt({
        nodes: JSON.stringify(input.nodes),
        connectors: JSON.stringify(input.connectors),
      });
      return output!;
    }
  );
  return flow(input);
}
