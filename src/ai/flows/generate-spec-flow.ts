/**
 * @fileOverview A flow to generate a functional specification for a data pipeline.
 */

export interface GenerateSpecInput {
  nodes: any[];
  connectors: any[];
}

export interface GenerateSpecOutput {
  specification: string;
}

export async function generatePipelineSpec(input: GenerateSpecInput): Promise<GenerateSpecOutput> {
  const response = await fetch('/api/generate-spec', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nodes: input.nodes, connectors: input.connectors }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}
